/**
 * LicenseGuard - Cryptographic Engine
 * RSA-PSS with SHA-256, Deterministic Canonicalization, Private Key Encryption
 * VTU BCS703 Cryptography and Network Security
 */

import crypto from 'node:crypto';
import type { LicensePayload, AppFileEntry, SignedAppManifest } from '../types/license.ts';

const MASTER_KEYSTORE_SECRET = process.env.KEYSTORE_PASSPHRASE || 'LicenseGuard-VTU-BCS703-SecurityMaster2026';

/**
 * Encrypt a private key PEM at rest using AES-256-GCM with a PBKDF2 derived key
 */
export function encryptPrivateKey(privateKeyPem: string, passphrase = MASTER_KEYSTORE_SECRET): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine salt, iv, tag, and ciphertext
  const payload = {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    ciphertext: encrypted.toString('base64'),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt an encrypted private key string at rest
 */
export function decryptPrivateKey(encryptedJsonStr: string, passphrase = MASTER_KEYSTORE_SECRET): string {
  try {
    const payload = JSON.parse(encryptedJsonStr);
    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const tag = Buffer.from(payload.tag, 'hex');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');

    const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Failed to decrypt private key. Invalid master passphrase or corrupted key data.');
  }
}

/**
 * Generate an RSA public/private key pair (2048, 3072, or 4096 bits)
 * Encrypted at rest using AES-256-GCM.
 */
export function generateRSAKeyPair(keySize: 2048 | 3072 | 4096 = 2048): {
  publicKeyPem: string;
  privateKeyPem: string;
  encryptedPrivateKey: string;
  fingerprint: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: keySize,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const fingerprint = computeKeyFingerprint(publicKey);
  const encryptedPrivateKey = encryptPrivateKey(privateKey);

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    encryptedPrivateKey,
    fingerprint,
  };
}

/**
 * Compute SHA-256 fingerprint of a public key in uppercase hex with colons
 */
export function computeKeyFingerprint(publicKeyPem: string): string {
  const cleanPem = publicKeyPem
    .replace(/-----BEGIN[ A-Z0-9_-]+-----/g, '')
    .replace(/-----END[ A-Z0-9_-]+-----/g, '')
    .replace(/\s+/g, '');

  const hash = crypto.createHash('sha256').update(cleanPem).digest('hex');
  return hash.match(/.{1,2}/g)?.join(':').toUpperCase() || hash.toUpperCase();
}

/**
 * Deterministic JSON serialization:
 * - Recursively sorts object keys alphabetically
 * - Uses exact separators ',' and ':' without whitespace
 * - Encodes consistently as UTF-8
 */
export function canonicalizePayload(payload: unknown): string {
  if (payload === null || typeof payload !== 'object') {
    return JSON.stringify(payload);
  }

  if (Array.isArray(payload)) {
    return '[' + payload.map(canonicalizePayload).join(',') + ']';
  }

  const keys = Object.keys(payload as Record<string, unknown>).sort();
  const entries: string[] = [];

  for (const key of keys) {
    const val = (payload as Record<string, unknown>)[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalizePayload(val)}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

/**
 * Compute SHA-256 digest of arbitrary text or canonical string
 */
export function computeSha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Sign payload using RSA-PSS padding with SHA-256 hash algorithm
 * Salt length is set to MAX_SIGN (matching RFC 8017 / OpenSSL / Python cryptography PSS default)
 */
export function signPayload(
  payload: LicensePayload | Record<string, unknown>,
  privateKeyPem: string
): {
  canonicalString: string;
  sha256Digest: string;
  signatureB64: string;
} {
  const canonicalString = canonicalizePayload(payload);
  const sha256Digest = computeSha256(canonicalString);
  const buffer = Buffer.from(canonicalString, 'utf8');

  const signature = crypto.sign(
    'sha256',
    buffer,
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
    }
  );

  return {
    canonicalString,
    sha256Digest,
    signatureB64: signature.toString('base64'),
  };
}

/**
 * Verify RSA-PSS signature against canonical payload using publisher's public key
 */
export function verifySignature(
  payload: LicensePayload | Record<string, unknown>,
  signatureB64: string,
  publicKeyPem: string
): {
  isValid: boolean;
  computedSha256: string;
  error?: string;
} {
  try {
    const canonicalString = canonicalizePayload(payload);
    const computedSha256 = computeSha256(canonicalString);
    const dataBuffer = Buffer.from(canonicalString, 'utf8');
    const signatureBuffer = Buffer.from(signatureB64, 'base64');

    const isValid = crypto.verify(
      'sha256',
      dataBuffer,
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
      },
      signatureBuffer
    );

    return {
      isValid,
      computedSha256,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      computedSha256: '',
      error: message,
    };
  }
}

/**
 * Application Integrity Scanner:
 * Generate a digitally signed release manifest for application files
 */
export function signApplicationManifest(params: {
  appName: string;
  appId: string;
  version: string;
  publisherId: string;
  keyId: string;
  files: AppFileEntry[];
  privateKeyPem: string;
}): SignedAppManifest {
  const manifestData = {
    schema_version: 1,
    app_name: params.appName,
    app_id: params.appId,
    version: params.version,
    publisher_id: params.publisherId,
    key_id: params.keyId,
    created_at: new Date().toISOString(),
    files: params.files.sort((a, b) => a.relative_path.localeCompare(b.relative_path)),
  };

  const canonical = canonicalizePayload(manifestData);
  const digest = computeSha256(canonical);
  const buffer = Buffer.from(canonical, 'utf8');

  const signature = crypto.sign(
    'sha256',
    buffer,
    {
      key: params.privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
    }
  );

  return {
    ...manifestData,
    manifest_digest: digest,
    signature_b64: signature.toString('base64'),
  };
}

/**
 * Verify signed application manifest against publisher public key
 */
export function verifyApplicationManifest(
  manifest: SignedAppManifest,
  publicKeyPem: string
): { isValid: boolean; digest: string; error?: string } {
  try {
    const { manifest_digest, signature_b64, ...dataOnly } = manifest;
    const canonical = canonicalizePayload(dataOnly);
    const computedDigest = computeSha256(canonical);
    const dataBuffer = Buffer.from(canonical, 'utf8');
    const signatureBuffer = Buffer.from(signature_b64, 'base64');

    const isValid = crypto.verify(
      'sha256',
      dataBuffer,
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
      },
      signatureBuffer
    );

    return {
      isValid,
      digest: computedDigest,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      digest: '',
      error: message,
    };
  }
}

/**
 * Generate formatted commercial license key: LG-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(licenseId: string, digest: string): string {
  const clean = (licenseId.replace(/[^A-Z0-9]/gi, '') + digest).toUpperCase();
  const part1 = clean.substring(0, 4).padEnd(4, 'X');
  const part2 = clean.substring(4, 8).padEnd(4, 'Y');
  const part3 = clean.substring(8, 12).padEnd(4, 'Z');
  const part4 = clean.substring(12, 16).padEnd(4, '9');
  return `LG-${part1}-${part2}-${part3}-${part4}`;
}

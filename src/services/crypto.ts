/**
 * LicenseGuard - Cryptographic Engine
 * Standard RSA-PSS with SHA-256 and Deterministic Canonicalization
 * VTU BCS703 Cryptography and Network Security
 */

import crypto from 'node:crypto';
import type { LicensePayload } from '../types/license.ts';

/**
 * Generate a cryptographically authentic RSA key pair (2048 or 4096 bits)
 * Encoded in standard PEM formats (PKCS#8 Private, SPKI Public)
 */
export function generateRSAKeyPair(keySize: 2048 | 4096 = 2048): {
  publicKeyPem: string;
  privateKeyPem: string;
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

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    fingerprint,
  };
}

/**
 * Compute SHA-256 fingerprint of a public key in uppercase hex with colons
 */
export function computeKeyFingerprint(publicKeyPem: string): string {
  // Normalize key by stripping headers, footers and whitespace
  const cleanPem = publicKeyPem
    .replace(/-----BEGIN[ A-Z0-9_-]+-----/g, '')
    .replace(/-----END[ A-Z0-9_-]+-----/g, '')
    .replace(/\s+/g, '');

  const hash = crypto.createHash('sha256').update(cleanPem).digest('hex');
  return hash.match(/.{1,2}/g)?.join(':').toUpperCase() || hash.toUpperCase();
}

/**
 * Canonicalize payload object into a deterministic JSON string.
 * Digital signatures verify binary streams; non-deterministic JSON keys
 * cause spurious verification failures.
 */
export function canonicalizePayload(payload: LicensePayload | Record<string, unknown>): string {
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = (payload as Record<string, unknown>)[key];
    if (val !== undefined) {
      sortedObj[key] = val;
    }
  }

  return JSON.stringify(sortedObj);
}

/**
 * Compute SHA-256 digest of arbitrary text or canonical string
 */
export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Sign payload using RSA-PSS padding with SHA-256 hash algorithm
 * Salt length is set to MAX_SIGN (matching OpenSSL / Python cryptography PSS default)
 */
export function signPayload(
  payload: LicensePayload,
  privateKeyPem: string
): {
  canonicalString: string;
  sha256Digest: string;
  signatureB64: string;
} {
  const canonicalString = canonicalizePayload(payload);
  const sha256Digest = computeSha256(canonicalString);

  // Digital signature is computed over the UTF-8 bytes of the canonical payload
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
  payload: LicensePayload,
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

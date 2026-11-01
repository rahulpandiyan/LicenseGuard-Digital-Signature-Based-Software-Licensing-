/**
 * LicenseGuard - In-Memory / File-Persisted Database Layer
 * VTU BCS703 Cryptography and Network Security
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  Product,
  PublisherKey,
  LicenseRecord,
  ActivationRecord,
  VerificationLog,
  DeviceProfile,
  LicenseType,
} from '../types/license.ts';
import { generateRSAKeyPair, signPayload, generateLicenseKey } from './crypto.ts';

const DB_FILE_PATH = path.resolve(process.cwd(), '.licenseguard_db.json');

interface DatabaseSchema {
  products: Product[];
  publisher_keys: PublisherKey[];
  licenses: LicenseRecord[];
  activations: ActivationRecord[];
  verification_history: VerificationLog[];
}

export const SIMULATED_DEVICES: DeviceProfile[] = [
  {
    device_id: 'DEV-WIN11-WORKSTATION',
    device_name: 'Workstation-Win11-Pro',
    os: 'Windows 11 Enterprise 23H2 (x86_64)',
    hardware_hash: 'HW-7A9B-4C1E-92D0-AA14',
    ip_address: '192.168.1.104',
  },
  {
    device_id: 'DEV-MACBOOK-M3',
    device_name: 'Dev-MacBook-Pro-M3',
    os: 'macOS Sonoma 14.5 (Apple Silicon ARM64)',
    hardware_hash: 'HW-11D9-C55E-9901-EE83',
    ip_address: '192.168.1.145',
  },
  {
    device_id: 'DEV-UBUNTU-SERVER',
    device_name: 'Prod-Kube-Node-01',
    os: 'Ubuntu 24.04 LTS Kernel 6.8.0',
    hardware_hash: 'HW-44A2-9988-E1F7-CC42',
    ip_address: '10.0.4.52',
  },
  {
    device_id: 'DEV-DOCKER-CONTAINER',
    device_name: 'Simulated-Sandbox-Node',
    os: 'Alpine Linux 3.19 (Containerized VM)',
    hardware_hash: 'HW-9021-FF33-D711-BB99',
    ip_address: '172.17.0.4',
  },
];

let db: DatabaseSchema = {
  products: [],
  publisher_keys: [],
  licenses: [],
  activations: [],
  verification_history: [],
};

/**
 * Save database snapshot to disk
 */
function persistDb() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist db to disk:', e);
  }
}

/**
 * Initialize database with pre-configured cryptographic keys, products, and sample licenses
 */
export function initDatabase(): void {
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
      db = JSON.parse(data);
      console.log('Loaded existing LicenseGuard database from disk.');
      return;
    } catch (e) {
      console.warn('Could not parse existing database, re-seeding defaults:', e);
    }
  }

  console.log('Seeding initial LicenseGuard cryptographic database...');

  // 1. Seed Publisher Keys (Trusted Official CA vs Rogue Attacker CA)
  const trustedPair = generateRSAKeyPair(2048);
  const roguePair = generateRSAKeyPair(2048);

  const trustedKey: PublisherKey = {
    key_id: 'KEY-OFFICIAL-CA-V1',
    name: 'LicenseGuard Official CA / Publisher v1.0',
    key_size: 2048,
    fingerprint: trustedPair.fingerprint,
    public_key_pem: trustedPair.publicKeyPem,
    private_key_pem: trustedPair.privateKeyPem,
    is_trusted: true,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  const rogueKey: PublisherKey = {
    key_id: 'KEY-ROGUE-ATTACKER-V1',
    name: 'Untrusted Rogue Corp CA (Untrusted Attacker)',
    key_size: 2048,
    fingerprint: roguePair.fingerprint,
    public_key_pem: roguePair.publicKeyPem,
    private_key_pem: roguePair.privateKeyPem,
    is_trusted: false,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  db.publisher_keys = [trustedKey, rogueKey];

  // 2. Seed Software Products
  db.products = [
    {
      id: 'PRD-SENTINEL-PRO',
      name: 'Sentinel Antivirus Enterprise',
      code: 'SENTINEL-EP',
      version: 'v4.2.0',
      category: 'Cybersecurity & Endpoint Protection',
      description: 'Next-gen heuristic malware defense with kernel telemetry for corporate workstations.',
      default_max_activations: 3,
      created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
    },
    {
      id: 'PRD-DEVSTUDIO-ULT',
      name: 'DevStudio IDE Ultimate',
      code: 'DEVSTUDIO-ULT',
      version: 'v2026.1',
      category: 'Developer Tools & Compilers',
      description: 'Unified cryptographic development suite with built-in disassembler and AST profiler.',
      default_max_activations: 2,
      created_at: new Date('2026-01-06T00:00:00Z').toISOString(),
    },
    {
      id: 'PRD-CLOUDSHIELD-GW',
      name: 'CloudShield API Security Gateway',
      code: 'CLOUDSHIELD-GW',
      version: 'v3.1.4',
      category: 'Network & Cloud Infrastructure',
      description: 'Zero-trust mTLS proxy with deep packet inspection and automated token verification.',
      default_max_activations: 5,
      created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
    },
  ];

  // 3. Helper to issue and sign a sample license
  function issueSampleLicense(
    licenseId: string,
    customerName: string,
    customerEmail: string,
    product: Product,
    type: LicenseType,
    issueDateStr: string,
    expiryDateStr: string,
    maxActivations: number,
    signingKey: PublisherKey,
    revocationReason?: string
  ): LicenseRecord {
    const payload = {
      license_id: licenseId,
      customer_name: customerName,
      customer_email: customerEmail,
      product_id: product.id,
      product_name: product.name,
      license_type: type,
      issue_date: issueDateStr,
      expiry_date: expiryDateStr,
      max_activations: maxActivations,
      publisher_id: signingKey.name,
      key_id: signingKey.key_id,
      license_status: revocationReason ? ('REVOKED' as const) : ('ACTIVE' as const),
    };

    const signed = signPayload(payload, signingKey.private_key_pem!);
    const formattedKey = generateLicenseKey(licenseId, signed.sha256Digest);

    const record: LicenseRecord = {
      schema_version: '1.0.0',
      license_payload: payload,
      sha256_digest: signed.sha256Digest,
      signature_b64: signed.signatureB64,
      key_id: signingKey.key_id,
      publisher_fingerprint: signingKey.fingerprint,
      formatted_license_key: formattedKey,
      current_activations: 0,
      created_at: issueDateStr,
    };

    if (revocationReason) {
      record.revocation = {
        revoked_at: new Date().toISOString(),
        reason: revocationReason,
      };
    }

    return record;
  }

  // Pre-seed sample licenses:
  const lic1 = issueSampleLicense(
    'LIC-2026-9810A',
    'Dr. Alan Turing',
    'alan.turing@cambridge.ac.uk',
    db.products[0],
    'Yearly',
    '2026-02-01T00:00:00Z',
    '2027-02-01T00:00:00Z',
    3,
    trustedKey
  );

  const lic2 = issueSampleLicense(
    'LIC-2026-4421B',
    'Ada Lovelace',
    'ada.lovelace@analytics.org',
    db.products[1],
    'Lifetime',
    '2026-01-15T00:00:00Z',
    'LIFETIME',
    2,
    trustedKey
  );

  const lic3 = issueSampleLicense(
    'LIC-2025-1109E',
    'Rear Admiral Grace Hopper',
    'grace.hopper@navy.mil',
    db.products[0],
    'Monthly',
    '2025-08-01T00:00:00Z',
    '2025-09-01T00:00:00Z', // Expired
    1,
    trustedKey
  );

  const lic4 = issueSampleLicense(
    'LIC-2026-7733R',
    'Kevin Mitnick',
    'kevin.m@security-research.org',
    db.products[2],
    'Yearly',
    '2026-01-20T00:00:00Z',
    '2027-01-20T00:00:00Z',
    5,
    trustedKey,
    'Suspected key leakage on unauthorized darknet market'
  );

  db.licenses = [lic1, lic2, lic3, lic4];

  // 4. Seed an initial activation for lic1 on Win11
  db.activations.push({
    id: 'ACT-9810-WIN11-01',
    license_id: lic1.license_payload.license_id,
    device_id: SIMULATED_DEVICES[0].device_id,
    device_name: SIMULATED_DEVICES[0].device_name,
    os: SIMULATED_DEVICES[0].os,
    hardware_hash: SIMULATED_DEVICES[0].hardware_hash,
    ip_address: SIMULATED_DEVICES[0].ip_address,
    activated_at: new Date('2026-02-02T10:14:00Z').toISOString(),
    status: 'ACTIVE',
  });
  lic1.current_activations = 1;

  // 5. Seed some initial verification audit logs
  db.verification_history.push({
    id: 'LOG-VER-001',
    timestamp: new Date('2026-02-02T10:13:58Z').toISOString(),
    license_id: lic1.license_payload.license_id,
    product_name: lic1.license_payload.product_name,
    customer_name: lic1.license_payload.customer_name,
    device_id: SIMULATED_DEVICES[0].device_id,
    verdict: 'VALID LICENCE',
    signature_valid: true,
    sha256_digest: lic1.sha256_digest,
    details: 'Initial genuine activation on Workstation-Win11-Pro. RSA-PSS SHA-256 integrity passed.',
  });

  persistDb();
}

// ---- Data Access Operations ----

export function getStats() {
  const totalProducts = db.products.length;
  const totalLicenses = db.licenses.length;
  
  const now = new Date();
  let activeLicenses = 0;
  let expiredLicenses = 0;
  let revokedLicenses = 0;

  for (const lic of db.licenses) {
    if (lic.revocation) {
      revokedLicenses++;
    } else if (lic.license_payload.expiry_date !== 'LIFETIME' && new Date(lic.license_payload.expiry_date) < now) {
      expiredLicenses++;
    } else {
      activeLicenses++;
    }
  }

  const activeActivations = db.activations.filter(a => a.status === 'ACTIVE').length;
  const successfulVerifications = db.verification_history.filter(h => h.verdict === 'VALID LICENCE').length;
  const failedVerifications = db.verification_history.filter(h => h.verdict !== 'VALID LICENCE').length;

  return {
    totalProducts,
    totalLicenses,
    activeLicenses,
    expiredLicenses,
    revokedLicenses,
    activeActivations,
    successfulVerifications,
    failedVerifications,
  };
}

export function getAllProducts(): Product[] {
  return [...db.products];
}

export function getProductById(id: string): Product | undefined {
  return db.products.find(p => p.id === id);
}

export function addProduct(product: Omit<Product, 'id' | 'created_at'>): Product {
  const newProduct: Product = {
    id: `PRD-${product.code.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
    ...product,
    created_at: new Date().toISOString(),
  };
  db.products.push(newProduct);
  persistDb();
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) return undefined;
  db.products[index] = { ...db.products[index], ...updates };
  persistDb();
  return db.products[index];
}

export function getAllKeys(includePrivate = false): PublisherKey[] {
  return db.publisher_keys.map(k => {
    if (includePrivate) return { ...k };
    const { private_key_pem, ...pubOnly } = k;
    return pubOnly as PublisherKey;
  });
}

export function getKeyById(keyId: string): PublisherKey | undefined {
  return db.publisher_keys.find(k => k.key_id === keyId);
}

export function addPublisherKey(name: string, keySize: 2048 | 4096 = 2048, isTrusted = true): PublisherKey {
  const pair = generateRSAKeyPair(keySize);
  const keyId = `KEY-${Date.now().toString(36).toUpperCase()}-${keySize}`;
  const newKey: PublisherKey = {
    key_id: keyId,
    name,
    key_size: keySize,
    fingerprint: pair.fingerprint,
    public_key_pem: pair.publicKeyPem,
    private_key_pem: pair.privateKeyPem,
    is_trusted: isTrusted,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  db.publisher_keys.unshift(newKey);
  persistDb();
  return newKey;
}

export function getAllLicenses(): LicenseRecord[] {
  return [...db.licenses];
}

export function getLicenseByIdOrKey(identifier: string): LicenseRecord | undefined {
  const clean = identifier.trim();
  return db.licenses.find(l => 
    l.license_payload.license_id.toLowerCase() === clean.toLowerCase() ||
    l.formatted_license_key.toLowerCase() === clean.toLowerCase()
  );
}

export function issueLicense(params: {
  customer_name: string;
  customer_email: string;
  product_id: string;
  license_type: LicenseType;
  max_activations: number;
  key_id?: string;
  custom_expiry?: string;
}): LicenseRecord {
  const product = getProductById(params.product_id);
  if (!product) throw new Error(`Product not found: ${params.product_id}`);

  // Select key (default to active trusted key)
  const publisherKey = params.key_id 
    ? getKeyById(params.key_id) 
    : db.publisher_keys.find(k => k.is_trusted && k.is_active);

  if (!publisherKey || !publisherKey.private_key_pem) {
    throw new Error('No valid publisher private key available for signing.');
  }

  const now = new Date();
  const issueDateStr = now.toISOString();
  let expiryDateStr = 'LIFETIME';

  if (params.custom_expiry) {
    expiryDateStr = params.custom_expiry;
  } else if (params.license_type === 'Free Trial') {
    const exp = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    expiryDateStr = exp.toISOString();
  } else if (params.license_type === 'Monthly') {
    const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expiryDateStr = exp.toISOString();
  } else if (params.license_type === 'Yearly') {
    const exp = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    expiryDateStr = exp.toISOString();
  }

  const licenseId = `LIC-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const payload = {
    license_id: licenseId,
    customer_name: params.customer_name.trim(),
    customer_email: params.customer_email.trim(),
    product_id: product.id,
    product_name: product.name,
    license_type: params.license_type,
    issue_date: issueDateStr,
    expiry_date: expiryDateStr,
    max_activations: params.max_activations,
    publisher_id: publisherKey.name,
    key_id: publisherKey.key_id,
    license_status: 'ACTIVE' as const,
  };

  const signed = signPayload(payload, publisherKey.private_key_pem);
  const formattedKey = generateLicenseKey(licenseId, signed.sha256Digest);

  const newRecord: LicenseRecord = {
    schema_version: '1.0.0',
    license_payload: payload,
    sha256_digest: signed.sha256Digest,
    signature_b64: signed.signatureB64,
    key_id: publisherKey.key_id,
    publisher_fingerprint: publisherKey.fingerprint,
    formatted_license_key: formattedKey,
    current_activations: 0,
    created_at: issueDateStr,
  };

  db.licenses.unshift(newRecord);
  persistDb();
  return newRecord;
}

export function revokeLicense(licenseId: string, reason: string): LicenseRecord {
  const lic = getLicenseByIdOrKey(licenseId);
  if (!lic) throw new Error(`License not found: ${licenseId}`);

  lic.revocation = {
    revoked_at: new Date().toISOString(),
    reason: reason || 'Administrative revocation',
  };
  lic.license_payload.license_status = 'REVOKED';

  // Also deactivate any active device sessions for this license
  for (const act of db.activations) {
    if (act.license_id === lic.license_payload.license_id) {
      act.status = 'DEACTIVATED';
    }
  }
  lic.current_activations = 0;

  persistDb();
  return lic;
}

export function getAllActivations(): ActivationRecord[] {
  return [...db.activations];
}

export function activateDevice(licenseId: string, device: DeviceProfile): ActivationRecord {
  const lic = getLicenseByIdOrKey(licenseId);
  if (!lic) throw new Error('License not found');

  // Check if this device is already actively activated
  const existing = db.activations.find(
    a => a.license_id === lic.license_payload.license_id && 
         a.device_id === device.device_id && 
         a.status === 'ACTIVE'
  );

  if (existing) {
    return existing;
  }

  // Check limit
  const activeCount = db.activations.filter(
    a => a.license_id === lic.license_payload.license_id && a.status === 'ACTIVE'
  ).length;

  if (activeCount >= lic.license_payload.max_activations) {
    throw new Error(`Activation quota exceeded: ${activeCount}/${lic.license_payload.max_activations} devices already registered.`);
  }

  const newActivation: ActivationRecord = {
    id: `ACT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    license_id: lic.license_payload.license_id,
    device_id: device.device_id,
    device_name: device.device_name,
    os: device.os,
    hardware_hash: device.hardware_hash,
    ip_address: device.ip_address,
    activated_at: new Date().toISOString(),
    status: 'ACTIVE',
  };

  db.activations.unshift(newActivation);
  lic.current_activations = activeCount + 1;
  persistDb();
  return newActivation;
}

export function deactivateDevice(activationId: string): boolean {
  const act = db.activations.find(a => a.id === activationId);
  if (!act) return false;
  act.status = 'DEACTIVATED';

  // Recalculate license active count
  const lic = getLicenseByIdOrKey(act.license_id);
  if (lic) {
    lic.current_activations = db.activations.filter(
      a => a.license_id === lic.license_payload.license_id && a.status === 'ACTIVE'
    ).length;
  }

  persistDb();
  return true;
}

export function getVerificationHistory(): VerificationLog[] {
  return [...db.verification_history];
}

export function logVerification(log: Omit<VerificationLog, 'id' | 'timestamp'>): VerificationLog {
  const newLog: VerificationLog = {
    id: `VER-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  db.verification_history.unshift(newLog);
  if (db.verification_history.length > 100) {
    db.verification_history = db.verification_history.slice(0, 100);
  }
  persistDb();
  return newLog;
}

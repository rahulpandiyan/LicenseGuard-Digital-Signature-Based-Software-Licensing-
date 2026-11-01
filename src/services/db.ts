/**
 * LicenseGuard - Persistent Relational Database Layer
 * VTU BCS703 Cryptography and Network Security
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  Product,
  Customer,
  Publisher,
  PublisherKey,
  LicenseRecord,
  LicensePayload,
  ActivationRecord,
  RevocationRecord,
  VerificationLog,
  DeviceProfile,
  LicenseType,
  SignedAppManifest,
  AppFileEntry,
} from '../types/license.ts';
import {
  generateRSAKeyPair,
  signPayload,
  generateLicenseKey,
  decryptPrivateKey,
  signApplicationManifest,
  computeSha256,
} from './crypto.ts';

const DB_FILE_PATH = path.resolve(process.cwd(), '.licenseguard_db.json');

interface DatabaseSchema {
  publishers: Publisher[];
  publisher_keys: PublisherKey[];
  products: Product[];
  customers: Customer[];
  licenses: LicenseRecord[];
  activations: ActivationRecord[];
  revocations: RevocationRecord[];
  verification_history: VerificationLog[];
  app_manifests: SignedAppManifest[];
  installed_app_files: Record<string, AppFileEntry[]>;
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
  publishers: [],
  publisher_keys: [],
  products: [],
  customers: [],
  licenses: [],
  activations: [],
  revocations: [],
  verification_history: [],
  app_manifests: [],
  installed_app_files: {},
};

/**
 * Save database snapshot to disk
 */
function persistDb() {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to persist database:', e);
  }
}

/**
 * Initialize database with trusted publishers, encrypted keys, products, customers, and manifests
 */
export function initDatabase(): void {
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const loaded = JSON.parse(data);
      if (loaded.publishers && loaded.publishers.length > 0) {
        db = loaded;
        console.log('Loaded existing LicenseGuard database from disk.');
        return;
      }
    } catch (e) {
      console.warn('Could not parse database, re-seeding:', e);
    }
  }

  console.log('Seeding initial LicenseGuard cryptographic database...');

  // 1. Seed Publishers (Trusted Root vs Untrusted Rogue)
  const officialPublisher: Publisher = {
    publisher_id: 'PUB-001',
    name: 'LicenseGuard Official Software Systems',
    organization: 'LicenseGuard Cryptographic Authority',
    website: 'https://licenseguard.sec.vtu.edu',
    is_trusted: true,
    status: 'ACTIVE',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  const roguePublisher: Publisher = {
    publisher_id: 'PUB-ROGUE',
    name: 'Untrusted Rogue Cracker Syndicate',
    organization: 'Underground Keygen Group',
    website: 'http://darknet-keygen.onion',
    is_trusted: false,
    status: 'UNTRUSTED',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  db.publishers = [officialPublisher, roguePublisher];

  // 2. Generate RSA Keypairs
  const trustedPair = generateRSAKeyPair(2048);
  const roguePair = generateRSAKeyPair(2048);

  const trustedKey: PublisherKey = {
    key_id: 'KEY-001',
    publisher_id: officialPublisher.publisher_id,
    name: 'LicenseGuard Root Production Key 2026',
    key_size: 2048,
    fingerprint: trustedPair.fingerprint,
    public_key_pem: trustedPair.publicKeyPem,
    encrypted_private_key_pem: trustedPair.encryptedPrivateKey,
    is_trusted: true,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  const rogueKey: PublisherKey = {
    key_id: 'KEY-ROGUE-01',
    publisher_id: roguePublisher.publisher_id,
    name: 'Rogue Attacker Untrusted Key',
    key_size: 2048,
    fingerprint: roguePair.fingerprint,
    public_key_pem: roguePair.publicKeyPem,
    encrypted_private_key_pem: roguePair.encryptedPrivateKey,
    is_trusted: false,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };

  db.publisher_keys = [trustedKey, rogueKey];

  // 3. Seed Software Products
  db.products = [
    {
      id: 'PROD-001',
      name: 'Sentinel Antivirus Enterprise',
      code: 'SENTINEL-EP',
      version: 'v4.2.0',
      category: 'Cybersecurity & Endpoint Protection',
      description: 'Next-generation heuristic behavioral defense with kernel telemetry for enterprise endpoints.',
      default_max_activations: 3,
      supported_features: ['realtime_scanner', 'edr_telemetry', 'cloud_heuristics', 'network_firewall'],
      created_at: new Date('2026-01-05T00:00:00Z').toISOString(),
    },
    {
      id: 'PROD-002',
      name: 'DevStudio IDE Ultimate',
      code: 'DEVSTUDIO-ULT',
      version: 'v2026.1',
      category: 'Developer Tools & Compilers',
      description: 'Unified cryptographic development suite with built-in disassembler and AST profiler.',
      default_max_activations: 2,
      supported_features: ['debugger', 'disassembler', 'ast_profiler', 'team_sync'],
      created_at: new Date('2026-01-06T00:00:00Z').toISOString(),
    },
    {
      id: 'PROD-003',
      name: 'CloudShield API Security Gateway',
      code: 'CLOUDSHIELD-GW',
      version: 'v3.1.4',
      category: 'Network & Cloud Infrastructure',
      description: 'Zero-trust mTLS proxy with deep packet inspection and automated token verification.',
      default_max_activations: 5,
      supported_features: ['mtls_enforcement', 'ddos_protection', 'jwt_validator', 'rate_limiting'],
      created_at: new Date('2026-01-10T00:00:00Z').toISOString(),
    },
  ];

  // 4. Seed Customers
  db.customers = [
    {
      id: 'CUST-001',
      name: 'Dr. Alan Turing',
      email: 'alan.turing@cambridge.ac.uk',
      organization: 'Cambridge Cybernetics Lab',
      created_at: new Date('2026-01-12T00:00:00Z').toISOString(),
    },
    {
      id: 'CUST-002',
      name: 'Ada Lovelace',
      email: 'ada.lovelace@analytics.org',
      organization: 'Analytical Engines Institute',
      created_at: new Date('2026-01-15T00:00:00Z').toISOString(),
    },
    {
      id: 'CUST-003',
      name: 'Rear Admiral Grace Hopper',
      email: 'grace.hopper@navy.mil',
      organization: 'Department of Computing',
      created_at: new Date('2026-01-18T00:00:00Z').toISOString(),
    },
    {
      id: 'CUST-004',
      name: 'Kevin Mitnick',
      email: 'kevin.m@security-research.org',
      organization: 'Defcon Research Corp',
      created_at: new Date('2026-01-20T00:00:00Z').toISOString(),
    },
  ];

  // Helper to issue signed license
  function seedLicense(
    licenseId: string,
    customer: Customer,
    product: Product,
    type: LicenseType,
    issuedAt: string,
    notBefore: string,
    expiresAt: string,
    maxActivations: number,
    features: string[],
    signingKey: PublisherKey,
    revocationReason?: string
  ): LicenseRecord {
    const rawPriv = decryptPrivateKey(signingKey.encrypted_private_key_pem!);
    const payload = {
      schema_version: 1,
      license_id: licenseId,
      publisher_id: signingKey.publisher_id,
      key_id: signingKey.key_id,
      product_id: product.id,
      customer_id: customer.id,
      customer_name: customer.name,
      license_type: type,
      issued_at: issuedAt,
      not_before: notBefore,
      expires_at: expiresAt,
      max_activations: maxActivations,
      features,
    };

    const signed = signPayload(payload, rawPriv);
    const formattedKey = generateLicenseKey(licenseId, signed.sha256Digest);

    const record: LicenseRecord = {
      schema_version: 1,
      license_payload: payload,
      sha256_digest: signed.sha256Digest,
      signature_b64: signed.signatureB64,
      key_id: signingKey.key_id,
      publisher_id: signingKey.publisher_id,
      publisher_fingerprint: signingKey.fingerprint,
      formatted_license_key: formattedKey,
      current_activations: 0,
      created_at: issuedAt,
    };

    if (revocationReason) {
      const revRecord: RevocationRecord = {
        license_id: licenseId,
        revoked_at: new Date().toISOString(),
        reason: revocationReason,
        revoked_by: 'Security Officer (Audit #940)',
      };
      record.revocation = revRecord;
      db.revocations.push(revRecord);
    }

    return record;
  }

  // 5. Seed Licenses
  const lic1 = seedLicense(
    'LG-2026-00124',
    db.customers[0],
    db.products[0],
    'professional',
    '2026-02-01T10:00:00Z',
    '2026-02-01T10:00:00Z',
    '2027-02-01T10:00:00Z', // 1 year active
    3,
    ['realtime_scanner', 'cloud_heuristics'],
    trustedKey
  );

  const lic2 = seedLicense(
    'LG-2026-00892',
    db.customers[1],
    db.products[1],
    'lifetime',
    '2026-01-15T12:00:00Z',
    '2026-01-15T12:00:00Z',
    'LIFETIME',
    2,
    ['debugger', 'disassembler', 'ast_profiler'],
    trustedKey
  );

  const lic3 = seedLicense(
    'LG-2025-00441',
    db.customers[2],
    db.products[0],
    'trial',
    '2025-08-01T09:00:00Z',
    '2025-08-01T09:00:00Z',
    '2025-09-01T09:00:00Z', // Past date -> Expired!
    1,
    ['realtime_scanner'],
    trustedKey
  );

  const lic4 = seedLicense(
    'LG-2026-00773',
    db.customers[3],
    db.products[2],
    'enterprise',
    '2026-01-20T14:00:00Z',
    '2026-01-20T14:00:00Z',
    '2027-01-20T14:00:00Z',
    5,
    ['mtls_enforcement', 'ddos_protection', 'jwt_validator'],
    trustedKey,
    'Suspected key leakage on unauthorized darknet market' // Revoked!
  );

  db.licenses = [lic1, lic2, lic3, lic4];

  // 6. Seed an Initial Activation Record
  db.activations.push({
    id: 'ACT-00124-WIN11-01',
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

  // 7. Seed Application Integrity Scanner Protected Files & Signed Manifest
  const rawPriv = decryptPrivateKey(trustedKey.encrypted_private_key_pem!);
  const sampleAppFiles: AppFileEntry[] = [
    {
      relative_path: 'bin/sentinel_daemon.exe',
      sha256: computeSha256('SENTINEL_DAEMON_BINARY_V42_AUTHENTIC_2026'),
      size_bytes: 4194304,
      file_type: 'executable',
    },
    {
      relative_path: 'lib/scanner_engine.dll',
      sha256: computeSha256('SCANNER_ENGINE_DYNAMIC_LIBRARY_V42_AUTHENTIC'),
      size_bytes: 8388608,
      file_type: 'library',
    },
    {
      relative_path: 'config/rules.json',
      sha256: computeSha256('{"ruleset":"v4.2","strict_heuristics":true}'),
      size_bytes: 1024,
      file_type: 'configuration',
    },
    {
      relative_path: 'signatures/heuristics.dat',
      sha256: computeSha256('MALWARE_SIGNATURE_DATASET_BLOCK_ALPHA_2026'),
      size_bytes: 2097152,
      file_type: 'resource',
    },
  ];

  const appManifest = signApplicationManifest({
    appName: 'Sentinel Antivirus Enterprise',
    appId: 'PROD-001',
    version: 'v4.2.0',
    publisherId: officialPublisher.publisher_id,
    keyId: trustedKey.key_id,
    files: sampleAppFiles,
    privateKeyPem: rawPriv,
  });

  db.app_manifests = [appManifest];
  // Installed files initially match manifest
  db.installed_app_files['PROD-001'] = JSON.parse(JSON.stringify(sampleAppFiles));

  // 8. Seed Initial Audit Log
  db.verification_history.push({
    id: 'LOG-VER-001',
    timestamp: new Date('2026-02-02T10:13:58Z').toISOString(),
    license_id: lic1.license_payload.license_id,
    product_name: 'Sentinel Antivirus Enterprise',
    customer_name: lic1.license_payload.customer_name,
    device_id: SIMULATED_DEVICES[0].device_id,
    verdict: 'VALID LICENCE',
    signature_valid: true,
    sha256_digest: lic1.sha256_digest,
    details: 'Initial authentic six-stage verification passed. Seat 1/3 allocated on Workstation-Win11-Pro.',
  });

  persistDb();
}

// ---- Data Access Operations ----

export function getStats() {
  const totalProducts = db.products.length;
  const totalLicenses = db.licenses.length;
  const totalPublishers = db.publishers.length;
  const totalCustomers = db.customers.length;

  const now = new Date();
  let activeLicenses = 0;
  let expiredLicenses = 0;
  let revokedLicenses = 0;

  for (const lic of db.licenses) {
    const isRevoked = db.revocations.some(r => r.license_id === lic.license_payload.license_id);
    if (isRevoked) {
      revokedLicenses++;
    } else if (lic.license_payload.expires_at !== 'LIFETIME' && new Date(lic.license_payload.expires_at) < now) {
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
    totalPublishers,
    totalCustomers,
    activeLicenses,
    expiredLicenses,
    revokedLicenses,
    activeActivations,
    successfulVerifications,
    failedVerifications,
  };
}

// Products
export function getAllProducts(): Product[] {
  return [...db.products];
}

export function getProductById(id: string): Product | undefined {
  return db.products.find(p => p.id === id);
}

export function addProduct(product: Omit<Product, 'id' | 'created_at'>): Product {
  const id = `PROD-${Date.now().toString().slice(-4)}`;
  const newProduct: Product = {
    id,
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

// Customers
export function getAllCustomers(): Customer[] {
  return [...db.customers];
}

export function addCustomer(data: Omit<Customer, 'id' | 'created_at'>): Customer {
  const id = `CUST-${Date.now().toString().slice(-4)}`;
  const newCust: Customer = {
    id,
    ...data,
    created_at: new Date().toISOString(),
  };
  db.customers.push(newCust);
  persistDb();
  return newCust;
}

// Publishers
export function getAllPublishers(): Publisher[] {
  return [...db.publishers];
}

export function getPublisherById(id: string): Publisher | undefined {
  return db.publishers.find(p => p.publisher_id === id);
}

// Publisher Keys
export function getAllKeys(includePrivate = false): PublisherKey[] {
  return db.publisher_keys.map(k => {
    if (includePrivate) {
      try {
        const rawPriv = k.encrypted_private_key_pem ? decryptPrivateKey(k.encrypted_private_key_pem) : undefined;
        return { ...k, private_key_pem: rawPriv };
      } catch {
        return { ...k };
      }
    }
    const { encrypted_private_key_pem, ...pubOnly } = k;
    return pubOnly as PublisherKey;
  });
}

export function getKeyById(keyId: string): PublisherKey | undefined {
  return db.publisher_keys.find(k => k.key_id === keyId);
}

export function getPrivateKeyPem(keyId: string): string | null {
  const keyRecord = getKeyById(keyId);
  if (!keyRecord || !keyRecord.encrypted_private_key_pem) return null;
  return decryptPrivateKey(keyRecord.encrypted_private_key_pem);
}

export function registerPublisherKey(params: {
  publisher_id: string;
  name: string;
  key_size: 2048 | 3072 | 4096;
  is_trusted: boolean;
}): PublisherKey {
  const pair = generateRSAKeyPair(params.key_size);
  const keyId = `KEY-${Date.now().toString(36).toUpperCase()}`;

  const newKey: PublisherKey = {
    key_id: keyId,
    publisher_id: params.publisher_id,
    name: params.name,
    key_size: params.key_size,
    fingerprint: pair.fingerprint,
    public_key_pem: pair.publicKeyPem,
    encrypted_private_key_pem: pair.encryptedPrivateKey,
    is_trusted: params.is_trusted,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  db.publisher_keys.unshift(newKey);
  persistDb();
  return newKey;
}

// Licenses
export function getAllLicenses(): LicenseRecord[] {
  return [...db.licenses];
}

export function getLicenseByIdOrKey(identifier: string): LicenseRecord | undefined {
  const clean = identifier.trim().toLowerCase();
  return db.licenses.find(l => 
    l.license_payload.license_id.toLowerCase() === clean ||
    l.formatted_license_key.toLowerCase() === clean
  );
}

export function issueLicense(params: {
  customer_id: string;
  product_id: string;
  publisher_id: string;
  key_id: string;
  license_type: LicenseType;
  max_activations: number;
  features?: string[];
  custom_expiry?: string;
}): LicenseRecord {
  const product = getProductById(params.product_id);
  if (!product) throw new Error(`Product not found: ${params.product_id}`);

  const customer = db.customers.find(c => c.id === params.customer_id);
  if (!customer) throw new Error(`Customer not found: ${params.customer_id}`);

  const keyRecord = getKeyById(params.key_id);
  if (!keyRecord || !keyRecord.encrypted_private_key_pem) {
    throw new Error(`Key not found or private key unavailable: ${params.key_id}`);
  }

  const rawPrivKey = decryptPrivateKey(keyRecord.encrypted_private_key_pem);

  const now = new Date();
  const issuedAt = now.toISOString();
  const notBefore = issuedAt;
  let expiresAt = 'LIFETIME';

  if (params.custom_expiry) {
    expiresAt = params.custom_expiry;
  } else if (params.license_type === 'trial') {
    expiresAt = new Date(now.getTime() + 14 * 86400000).toISOString();
  } else if (params.license_type === 'monthly') {
    expiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();
  } else if (params.license_type === 'yearly' || params.license_type === 'professional') {
    expiresAt = new Date(now.getTime() + 365 * 86400000).toISOString();
  } else if (params.license_type === 'enterprise') {
    expiresAt = new Date(now.getTime() + 3 * 365 * 86400000).toISOString();
  }

  const licenseId = `LG-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const payload: LicensePayload = {
    schema_version: 1,
    license_id: licenseId,
    publisher_id: keyRecord.publisher_id,
    key_id: keyRecord.key_id,
    product_id: product.id,
    customer_id: customer.id,
    customer_name: customer.name,
    license_type: params.license_type,
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    max_activations: params.max_activations,
    features: params.features || product.supported_features || ['core'],
  };

  const signed = signPayload(payload, rawPrivKey);
  const formattedKey = generateLicenseKey(licenseId, signed.sha256Digest);

  const newRecord: LicenseRecord = {
    schema_version: 1,
    license_payload: payload,
    sha256_digest: signed.sha256Digest,
    signature_b64: signed.signatureB64,
    key_id: keyRecord.key_id,
    publisher_id: keyRecord.publisher_id,
    publisher_fingerprint: keyRecord.fingerprint,
    formatted_license_key: formattedKey,
    current_activations: 0,
    created_at: issuedAt,
  };

  db.licenses.unshift(newRecord);
  persistDb();
  return newRecord;
}

// Licence Revocation List (LRL)
export function getRevocationList(): RevocationRecord[] {
  return [...db.revocations];
}

export function isLicenseRevoked(licenseId: string): RevocationRecord | undefined {
  return db.revocations.find(r => r.license_id.toLowerCase() === licenseId.toLowerCase());
}

export function revokeLicense(licenseId: string, reason: string, revokedBy = 'Administrator'): LicenseRecord {
  const lic = getLicenseByIdOrKey(licenseId);
  if (!lic) throw new Error(`License not found: ${licenseId}`);

  const existing = isLicenseRevoked(lic.license_payload.license_id);
  if (!existing) {
    const revRecord: RevocationRecord = {
      license_id: lic.license_payload.license_id,
      revoked_at: new Date().toISOString(),
      reason: reason || 'Administrative revocation on LRL',
      revoked_by: revokedBy,
    };
    db.revocations.push(revRecord);
    lic.revocation = revRecord;

    // Deactivate active device sessions
    for (const act of db.activations) {
      if (act.license_id === lic.license_payload.license_id) {
        act.status = 'DEACTIVATED';
      }
    }
    lic.current_activations = 0;
    persistDb();
  }

  return lic;
}

// Activations
export function getAllActivations(): ActivationRecord[] {
  return [...db.activations];
}

export function activateDevice(licenseId: string, device: DeviceProfile): ActivationRecord {
  const lic = getLicenseByIdOrKey(licenseId);
  if (!lic) throw new Error('License not found');

  // Transaction safety: check if already active on this device
  const existing = db.activations.find(
    a => a.license_id === lic.license_payload.license_id && 
         a.device_id === device.device_id && 
         a.status === 'ACTIVE'
  );

  if (existing) {
    return existing;
  }

  // Check seat quota
  const activeCount = db.activations.filter(
    a => a.license_id === lic.license_payload.license_id && a.status === 'ACTIVE'
  ).length;

  if (activeCount >= lic.license_payload.max_activations) {
    throw new Error(`Activation quota exceeded: ${activeCount}/${lic.license_payload.max_activations} seats registered.`);
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

  const lic = getLicenseByIdOrKey(act.license_id);
  if (lic) {
    lic.current_activations = db.activations.filter(
      a => a.license_id === lic.license_payload.license_id && a.status === 'ACTIVE'
    ).length;
  }

  persistDb();
  return true;
}

// Verification History
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

// Application Integrity Scanner Data Access
export function getAppManifests(): SignedAppManifest[] {
  return [...db.app_manifests];
}

export function getInstalledAppFiles(appId: string): AppFileEntry[] {
  return db.installed_app_files[appId] || [];
}

export function updateInstalledAppFiles(appId: string, files: AppFileEntry[]) {
  db.installed_app_files[appId] = files;
  persistDb();
}

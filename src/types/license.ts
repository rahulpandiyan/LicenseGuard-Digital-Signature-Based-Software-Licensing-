/**
 * LicenseGuard - Type Definitions
 * VTU BCS703 Cryptography and Network Security
 * Digital Signature-Based Software Licensing and Activation System
 */

export type LicenseType = 
  | 'trial' 
  | 'monthly' 
  | 'yearly' 
  | 'lifetime' 
  | 'professional' 
  | 'enterprise';

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';

export type VerificationVerdict = 
  | 'VALID LICENCE'
  | 'INVALID SIGNATURE'
  | 'UNKNOWN OR UNTRUSTED PUBLISHER'
  | 'LICENCE EXPIRED'
  | 'LICENCE NOT YET VALID'
  | 'LICENCE REVOKED'
  | 'ACTIVATION LIMIT EXCEEDED'
  | 'INVALID LICENCE FORMAT';

export interface Product {
  id: string; // e.g. "PROD-001"
  name: string;
  code: string;
  version: string;
  category: string;
  description: string;
  default_max_activations: number;
  supported_features: string[];
  created_at: string;
}

export interface Customer {
  id: string; // e.g. "CUST-001"
  name: string;
  email: string;
  organization: string;
  created_at: string;
}

export interface Publisher {
  publisher_id: string; // e.g. "PUB-001"
  name: string;
  organization: string;
  website: string;
  is_trusted: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'UNTRUSTED';
  created_at: string;
}

export interface PublisherKey {
  key_id: string; // e.g. "KEY-001"
  publisher_id: string; // e.g. "PUB-001"
  name: string;
  key_size: number; // 2048, 3072, 4096
  fingerprint: string; // SHA-256 hex string with colons
  public_key_pem: string;
  encrypted_private_key_pem?: string; // Encrypted at rest with PBKDF2 + AES-256-GCM
  private_key_pem?: string; // Unencrypted (available in memory or lab)
  is_trusted: boolean;
  is_active: boolean;
  created_at: string;
  rotated_at?: string;
}

/**
 * Standardized, versioned, deterministic JSON licence payload
 */
export interface LicensePayload {
  schema_version: number; // 1
  license_id: string; // e.g. "LG-2026-00124"
  publisher_id: string; // e.g. "PUB-001"
  key_id: string; // e.g. "KEY-001"
  product_id: string; // e.g. "PROD-001"
  customer_id: string; // e.g. "CUST-001"
  customer_name: string; // e.g. "Dr. Alan Turing"
  license_type: LicenseType;
  issued_at: string; // ISO UTC
  not_before: string; // ISO UTC
  expires_at: string; // ISO UTC or "LIFETIME"
  max_activations: number;
  features: string[];
}

export interface SignedLicenseFile {
  schema_version: number;
  license_payload: LicensePayload;
  sha256_digest: string;
  signature_b64: string;
  key_id: string;
  publisher_id: string;
  publisher_fingerprint: string;
  formatted_license_key: string;
}

export interface RevocationRecord {
  license_id: string;
  revoked_at: string;
  reason: string;
  revoked_by: string;
}

export interface LicenseRecord extends SignedLicenseFile {
  current_activations: number;
  created_at: string;
  revocation?: RevocationRecord;
}

export interface DeviceProfile {
  device_id: string;
  device_name: string;
  os: string;
  hardware_hash: string;
  ip_address: string;
}

export interface ActivationRecord {
  id: string;
  license_id: string;
  device_id: string;
  device_name: string;
  os: string;
  hardware_hash: string;
  ip_address: string;
  activated_at: string;
  status: 'ACTIVE' | 'DEACTIVATED';
}

/**
 * Six-Stage Verification Engine Result
 */
export interface VerificationResult {
  verdict: VerificationVerdict;
  success: boolean;
  stages: {
    // Stage 1: Canonical Serialization & Schema
    stage1_canonical_valid: boolean;
    canonical_payload_json: string;

    // Stage 2: SHA-256 Hashing
    stage2_hash_valid: boolean;
    sha256_computed: string;
    sha256_expected: string;

    // Stage 3: RSA-PSS Digital Signature Verification
    stage3_signature_valid: boolean;
    signature_algorithm: string;
    key_found: boolean;
    key_trusted: boolean;
    publisher_id: string;
    publisher_name: string;
    key_fingerprint: string;

    // Stage 4: Licence Validity & Temporal Window
    stage4_validity_passed: boolean;
    is_not_yet_valid: boolean;
    is_expired: boolean;
    not_before: string;
    expires_at: string;

    // Stage 5: Licence Revocation List (LRL) Check
    stage5_lrl_passed: boolean;
    is_revoked: boolean;
    revocation_reason?: string;

    // Stage 6: Device Activation Quota Verification
    stage6_quota_passed: boolean;
    current_activations: number;
    max_activations: number;
    is_device_already_active: boolean;
  };
  license_payload?: LicensePayload;
  device?: DeviceProfile;
  academic_explanation: string;
  diagnostic_details: string[];
}

export interface VerificationLog {
  id: string;
  timestamp: string;
  license_id: string;
  product_name: string;
  customer_name: string;
  device_id: string;
  verdict: VerificationVerdict;
  signature_valid: boolean;
  sha256_digest: string;
  details: string;
}

// ---- Application Integrity Scanner Types ----

export interface AppFileEntry {
  relative_path: string;
  sha256: string;
  size_bytes: number;
  file_type: 'executable' | 'library' | 'configuration' | 'resource';
}

export interface SignedAppManifest {
  schema_version: number;
  app_name: string;
  app_id: string;
  version: string;
  publisher_id: string;
  key_id: string;
  created_at: string;
  files: AppFileEntry[];
  manifest_digest: string;
  signature_b64: string;
}

export interface IntegrityScanResult {
  status: 
    | 'INTEGRITY_VERIFIED' 
    | 'APPLICATION_INTEGRITY_FAILED' 
    | 'MISSING_FILE_DETECTED' 
    | 'UNEXPECTED_FILE_DETECTED' 
    | 'INVALID_MANIFEST_SIGNATURE' 
    | 'UNKNOWN_PUBLISHER';
  success: boolean;
  app_name: string;
  app_version: string;
  publisher_id: string;
  key_id: string;
  manifest_signature_valid: boolean;
  files_scanned: number;
  files_intact: number;
  modified_files: Array<{
    path: string;
    expected_sha256: string;
    actual_sha256: string;
    size_bytes: number;
  }>;
  missing_files: string[];
  unexpected_files: string[];
  academic_explanation: string;
  diagnostic_log: string[];
}

export interface LabTestStep {
  step_number: number;
  actor: string;
  action: string;
  crypto_process: string;
  state_data: string;
  badge: 'success' | 'danger' | 'warning' | 'info';
  badge_label: string;
}

export interface LabTestScenario {
  id: number;
  title: string;
  description: string;
  threat_concept: string;
  expected_verdict: string;
  setup_summary: string;
  steps: LabTestStep[];
  actual_verdict: string;
  passed: boolean;
  crypto_status: 'VALID' | 'INVALID' | 'UNTRUSTED_KEY';
  business_status: 'AUTHORIZED' | 'DENIED_EXPIRED' | 'DENIED_REVOKED' | 'DENIED_QUOTA' | 'DENIED_TAMPERED' | 'DENIED_MISSING_FILE';
  academic_takeaway: string;
}

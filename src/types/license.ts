/**
 * LicenseGuard - Type Definitions
 * VTU BCS703 Cryptography and Network Security
 */

export type LicenseType = 'Free Trial' | 'Monthly' | 'Yearly' | 'Lifetime';

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'TAMPERED';

export type VerificationVerdict = 
  | 'VALID LICENCE'
  | 'INVALID SIGNATURE'
  | 'LICENCE EXPIRED'
  | 'LICENCE REVOKED'
  | 'ACTIVATION LIMIT EXCEEDED'
  | 'UNKNOWN PUBLISHER KEY'
  | 'INVALID LICENCE FORMAT';

export interface Product {
  id: string;
  name: string;
  code: string;
  version: string;
  category: string;
  description: string;
  default_max_activations: number;
  created_at: string;
}

export interface PublisherKey {
  key_id: string;
  name: string;
  key_size: number;
  fingerprint: string;
  public_key_pem: string;
  private_key_pem?: string; // Private key only visible in Key Management, never in customer portal
  is_trusted: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LicensePayload {
  license_id: string;
  customer_name: string;
  customer_email: string;
  product_id: string;
  product_name: string;
  license_type: LicenseType;
  issue_date: string;
  expiry_date: string; // ISO 8601 or 'LIFETIME'
  max_activations: number;
  publisher_id: string;
  key_id: string;
  license_status: LicenseStatus;
}

export interface SignedLicenseFile {
  schema_version: string;
  license_payload: LicensePayload;
  sha256_digest: string;
  signature_b64: string;
  key_id: string;
  publisher_fingerprint: string;
  formatted_license_key: string;
}

export interface LicenseRecord extends SignedLicenseFile {
  current_activations: number;
  created_at: string;
  revocation?: {
    revoked_at: string;
    reason: string;
  };
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

export interface VerificationResult {
  verdict: VerificationVerdict;
  success: boolean;
  stages: {
    format_valid: boolean;
    sha256_computed: string;
    sha256_expected: string;
    signature_valid: boolean;
    signature_algorithm: string;
    expiry_valid: boolean;
    is_expired: boolean;
    crl_check_passed: boolean;
    is_revoked: boolean;
    activation_limit_passed: boolean;
    current_activations: number;
    max_activations: number;
    key_trusted: boolean;
    publisher_name: string;
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
  expected_verdict: VerificationVerdict;
  setup_summary: string;
  steps: LabTestStep[];
  actual_verdict: VerificationVerdict;
  passed: boolean;
  academic_takeaway: string;
}

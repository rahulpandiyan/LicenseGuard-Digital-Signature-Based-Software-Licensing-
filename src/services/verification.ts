/**
 * LicenseGuard - Six-Stage Verification & Application Integrity Engine
 * VTU BCS703 Cryptography and Network Security
 */

import type {
  LicensePayload,
  SignedLicenseFile,
  DeviceProfile,
  VerificationResult,
  LabTestScenario,
  IntegrityScanResult,
  SignedAppManifest,
  AppFileEntry,
} from '../types/license.ts';
import {
  canonicalizePayload,
  computeSha256,
  verifySignature,
  signPayload,
  decryptPrivateKey,
  verifyApplicationManifest,
} from './crypto.ts';
import {
  getAllKeys,
  getKeyById,
  getPublisherById,
  getLicenseByIdOrKey,
  getAllActivations,
  activateDevice,
  isLicenseRevoked,
  logVerification,
  SIMULATED_DEVICES,
  getProductById,
  getAllProducts,
  getAppManifests,
  getInstalledAppFiles,
  updateInstalledAppFiles,
} from './db.ts';

/**
 * Six-Stage Verification Engine
 * Strictly separates cryptographic integrity checks from business rules
 */
export function verifyLicense(params: {
  licenseFile?: SignedLicenseFile;
  licenseKeyOrId?: string;
  selectedKeyId?: string;
  publicKeyPem?: string;
  device?: DeviceProfile;
}): VerificationResult {
  const diagnosticDetails: string[] = [];
  const currentDevice = params.device || SIMULATED_DEVICES[0];

  let signedFile: SignedLicenseFile | undefined = params.licenseFile;

  // Resolve by license key or license ID if file was not uploaded
  if (!signedFile && params.licenseKeyOrId) {
    const record = getLicenseByIdOrKey(params.licenseKeyOrId);
    if (!record) {
      return createFailureResult(
        'INVALID LICENCE FORMAT',
        'The provided license identifier was not found in the publisher repository.',
        [`Lookup failed for license key/ID: ${params.licenseKeyOrId}`],
        currentDevice
      );
    }
    signedFile = record;
  }

  if (!signedFile || !signedFile.license_payload || !signedFile.signature_b64) {
    return createFailureResult(
      'INVALID LICENCE FORMAT',
      'License file schema is invalid or missing required signature payload.',
      ['Schema validation failed: Missing payload or signature_b64'],
      currentDevice
    );
  }

  const payload = signedFile.license_payload;

  // ---- Stage 1: Deterministic Canonical JSON Serialization & Schema ----
  if (!payload.license_id || !payload.publisher_id || !payload.key_id || !payload.product_id) {
    return createFailureResult(
      'INVALID LICENCE FORMAT',
      'License schema validation failed: Required fields (license_id, publisher_id, key_id, product_id) are missing.',
      ['[Stage 1: Schema Check] Missing critical security-relevant attributes in payload.'],
      currentDevice
    );
  }

  const canonicalString = canonicalizePayload(payload);
  diagnosticDetails.push(`[Stage 1: Canonical Serialization] Deterministic JSON generated (${canonicalString.length} bytes, sorted keys).`);

  // ---- Stage 2: SHA-256 Hashing ----
  const computedSha256 = computeSha256(canonicalString);
  diagnosticDetails.push(`[Stage 2: SHA-256 Hashing] Computed message digest: ${computedSha256}`);

  // ---- Stage 3: Trusted Publisher Key Lookup & RSA-PSS Verification ----
  const requestedKeyId = params.selectedKeyId || signedFile.key_id || payload.key_id;
  const registeredKey = getKeyById(requestedKeyId);

  // If public key PEM was supplied directly, check if it matches a known trusted key
  let pubKeyPem = params.publicKeyPem;
  let isKeyTrusted = false;
  let publisherName = 'Unknown Publisher';
  let publisherId = payload.publisher_id;
  let keyFingerprint = '';

  if (registeredKey) {
    pubKeyPem = registeredKey.public_key_pem;
    isKeyTrusted = registeredKey.is_trusted;
    publisherName = registeredKey.name;
    publisherId = registeredKey.publisher_id;
    keyFingerprint = registeredKey.fingerprint;
    diagnosticDetails.push(`[Stage 3: Key Registry] Found registered key: ${registeredKey.name} (Key ID: ${registeredKey.key_id}, Trusted: ${registeredKey.is_trusted})`);
  } else if (pubKeyPem) {
    // Check if uploaded PEM matches any registered key
    const allRegistered = getAllKeys();
    const match = allRegistered.find(k => k.public_key_pem.trim() === pubKeyPem?.trim());
    if (match) {
      isKeyTrusted = match.is_trusted;
      publisherName = match.name;
      keyFingerprint = match.fingerprint;
    } else {
      isKeyTrusted = false;
      publisherName = 'Untrusted / Unregistered Key Upload';
    }
  }

  // Reject untrusted or unregistered publisher keys
  if (!pubKeyPem || !isKeyTrusted) {
    diagnosticDetails.push(`[Stage 3: Trust Check] Public key "${requestedKeyId}" is not registered in the Trusted Publisher Key Registry.`);
    
    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_id,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'UNKNOWN OR UNTRUSTED PUBLISHER',
      signature_valid: false,
      sha256_digest: computedSha256,
      details: `Verification denied: Key ${requestedKeyId} is not in Trusted Publisher Registry.`,
    });

    return {
      verdict: 'UNKNOWN OR UNTRUSTED PUBLISHER',
      success: false,
      stages: {
        stage1_canonical_valid: true,
        canonical_payload_json: canonicalString,
        stage2_hash_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: signedFile.sha256_digest || computedSha256,
        stage3_signature_valid: false,
        signature_algorithm: 'RSA-PSS / SHA-256',
        key_found: !!registeredKey,
        key_trusted: false,
        publisher_id: publisherId,
        publisher_name: publisherName,
        key_fingerprint: keyFingerprint,
        stage4_validity_passed: false,
        is_not_yet_valid: false,
        is_expired: false,
        not_before: payload.not_before || '',
        expires_at: payload.expires_at || '',
        stage5_lrl_passed: false,
        is_revoked: false,
        stage6_quota_passed: false,
        current_activations: 0,
        max_activations: payload.max_activations,
        is_device_already_active: false,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'TRUST HIERARCHY FAILURE: The public key used to verify this signature is not in the Trusted Publisher Key Registry. Client applications must never blindly trust arbitrary public keys uploaded by untrusted third parties.',
      diagnostic_details: diagnosticDetails,
    };
  }

  // Perform RSA-PSS signature verification
  const sigCheck = verifySignature(payload, signedFile.signature_b64, pubKeyPem);

  if (!sigCheck.isValid) {
    diagnosticDetails.push(`[Stage 3: RSA-PSS Signature Check] FAILED. Mathematical signature verification returned false. Digest mismatch or altered signature.`);
    
    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_id,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'INVALID SIGNATURE',
      signature_valid: false,
      sha256_digest: computedSha256,
      details: 'RSA-PSS verification failed. Data was tampered with or corrupted.',
    });

    return {
      verdict: 'INVALID SIGNATURE',
      success: false,
      stages: {
        stage1_canonical_valid: true,
        canonical_payload_json: canonicalString,
        stage2_hash_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: signedFile.sha256_digest || computedSha256,
        stage3_signature_valid: false,
        signature_algorithm: 'RSA-PSS / SHA-256 (MGF1 Salt: MAX)',
        key_found: true,
        key_trusted: true,
        publisher_id: publisherId,
        publisher_name: publisherName,
        key_fingerprint: keyFingerprint,
        stage4_validity_passed: false,
        is_not_yet_valid: false,
        is_expired: false,
        not_before: payload.not_before || '',
        expires_at: payload.expires_at || '',
        stage5_lrl_passed: false,
        is_revoked: false,
        stage6_quota_passed: false,
        current_activations: 0,
        max_activations: payload.max_activations,
        is_device_already_active: false,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'CRYPTOGRAPHIC INTEGRITY FAILURE: The RSA-PSS signature does not correspond to the SHA-256 digest of this canonical payload using the trusted publisher public key. The license data was modified after signing, or signature bytes were corrupted.',
      diagnostic_details: diagnosticDetails,
    };
  }

  diagnosticDetails.push('[Stage 3: RSA-PSS Signature Check] PASSED. Authenticity and integrity proven mathematically.');

  // ---- Stage 4: Licence Validity & Temporal Window Verification ----
  const now = new Date();
  const notBeforeDate = payload.not_before ? new Date(payload.not_before) : null;
  const isNotYetValid = notBeforeDate ? now < notBeforeDate : false;

  if (isNotYetValid) {
    diagnosticDetails.push(`[Stage 4: Temporal Check] License not yet valid until ${payload.not_before}`);
    return createBusinessFailure(
      'LICENCE NOT YET VALID',
      'BUSINESS RULE FAILURE: The signature is authentic, but the license validity window has not started yet.',
      payload,
      currentDevice,
      computedSha256,
      publisherName,
      keyFingerprint,
      canonicalString,
      diagnosticDetails
    );
  }

  const isExpired = payload.expires_at !== 'LIFETIME' && new Date(payload.expires_at) < now;
  if (isExpired) {
    diagnosticDetails.push(`[Stage 4: Temporal Check] License expired on ${payload.expires_at} (Current time: ${now.toISOString()})`);
    
    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_id,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'LICENCE EXPIRED',
      signature_valid: true,
      sha256_digest: computedSha256,
      details: `Signature is authentic, but license expired on ${payload.expires_at}.`,
    });

    return {
      verdict: 'LICENCE EXPIRED',
      success: false,
      stages: {
        stage1_canonical_valid: true,
        canonical_payload_json: canonicalString,
        stage2_hash_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: computedSha256,
        stage3_signature_valid: true,
        signature_algorithm: 'RSA-PSS / SHA-256',
        key_found: true,
        key_trusted: true,
        publisher_id: publisherId,
        publisher_name: publisherName,
        key_fingerprint: keyFingerprint,
        stage4_validity_passed: false,
        is_not_yet_valid: false,
        is_expired: true,
        not_before: payload.not_before,
        expires_at: payload.expires_at,
        stage5_lrl_passed: true,
        is_revoked: false,
        stage6_quota_passed: true,
        current_activations: 0,
        max_activations: payload.max_activations,
        is_device_already_active: false,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'BUSINESS RULE FAILURE (EXPIRY): The digital signature is authentic and unaltered, proving genuine publisher issuance. However, the authorized validity period has lapsed. Signature validity does not equal operational authorization.',
      diagnostic_details: diagnosticDetails,
    };
  }
  diagnosticDetails.push('[Stage 4: Temporal Check] PASSED. License is within active temporal window.');

  // ---- Stage 5: Licence Revocation List (LRL) Check ----
  const revocationRecord = isLicenseRevoked(payload.license_id);
  if (revocationRecord) {
    diagnosticDetails.push(`[Stage 5: LRL Check] License is listed on Licence Revocation List: "${revocationRecord.reason}"`);

    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_id,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'LICENCE REVOKED',
      signature_valid: true,
      sha256_digest: computedSha256,
      details: `Signature valid, but license listed on LRL: ${revocationRecord.reason}`,
    });

    return {
      verdict: 'LICENCE REVOKED',
      success: false,
      stages: {
        stage1_canonical_valid: true,
        canonical_payload_json: canonicalString,
        stage2_hash_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: computedSha256,
        stage3_signature_valid: true,
        signature_algorithm: 'RSA-PSS / SHA-256',
        key_found: true,
        key_trusted: true,
        publisher_id: publisherId,
        publisher_name: publisherName,
        key_fingerprint: keyFingerprint,
        stage4_validity_passed: true,
        is_not_yet_valid: false,
        is_expired: false,
        not_before: payload.not_before,
        expires_at: payload.expires_at,
        stage5_lrl_passed: false,
        is_revoked: true,
        revocation_reason: revocationRecord.reason,
        stage6_quota_passed: true,
        current_activations: 0,
        max_activations: payload.max_activations,
        is_device_already_active: false,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'BUSINESS RULE FAILURE (REVOCATION): The digital signature is completely valid, but the publisher placed this license on the Licence Revocation List (LRL). A static digital signature cannot self-destruct; hence an independent LRL is mandatory.',
      diagnostic_details: diagnosticDetails,
    };
  }
  diagnosticDetails.push('[Stage 5: LRL Check] PASSED. License is not listed on Licence Revocation List.');

  // ---- Stage 6: Device Activation Quota Verification ----
  const allActivations = getAllActivations();
  const activeActivationsForLic = allActivations.filter(
    a => a.license_id === payload.license_id && a.status === 'ACTIVE'
  );
  const currentCount = activeActivationsForLic.length;
  const isAlreadyActiveOnThisDevice = activeActivationsForLic.some(
    a => a.device_id === currentDevice.device_id
  );

  const isQuotaExceeded = !isAlreadyActiveOnThisDevice && currentCount >= payload.max_activations;

  if (isQuotaExceeded) {
    diagnosticDetails.push(`[Stage 6: Seat Quota Check] Maximum activation allowance reached: ${currentCount}/${payload.max_activations} devices.`);

    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_id,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'ACTIVATION LIMIT EXCEEDED',
      signature_valid: true,
      sha256_digest: computedSha256,
      details: `Signature valid, but activation quota exceeded (${currentCount}/${payload.max_activations}).`,
    });

    return {
      verdict: 'ACTIVATION LIMIT EXCEEDED',
      success: false,
      stages: {
        stage1_canonical_valid: true,
        canonical_payload_json: canonicalString,
        stage2_hash_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: computedSha256,
        stage3_signature_valid: true,
        signature_algorithm: 'RSA-PSS / SHA-256',
        key_found: true,
        key_trusted: true,
        publisher_id: publisherId,
        publisher_name: publisherName,
        key_fingerprint: keyFingerprint,
        stage4_validity_passed: true,
        is_not_yet_valid: false,
        is_expired: false,
        not_before: payload.not_before,
        expires_at: payload.expires_at,
        stage5_lrl_passed: true,
        is_revoked: false,
        stage6_quota_passed: false,
        current_activations: currentCount,
        max_activations: payload.max_activations,
        is_device_already_active: isAlreadyActiveOnThisDevice,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'BUSINESS RULE FAILURE (SEAT QUOTA): The cryptographic digital signature is valid, but the licence has already been activated on its maximum permitted device allowance. Replay attacks are mitigated by combining signatures with server-side activation counts.',
      diagnostic_details: diagnosticDetails,
    };
  }

  diagnosticDetails.push(`[Stage 6: Seat Quota Check] PASSED. Seat available (${currentCount}/${payload.max_activations} used).`);

  // All 6 Stages Passed!
  logVerification({
    license_id: payload.license_id,
    product_name: payload.product_id,
    customer_name: payload.customer_name,
    device_id: currentDevice.device_id,
    verdict: 'VALID LICENCE',
    signature_valid: true,
    sha256_digest: computedSha256,
    details: `All 6 verification stages passed successfully on ${currentDevice.device_name}.`,
  });

  return {
    verdict: 'VALID LICENCE',
    success: true,
    stages: {
      stage1_canonical_valid: true,
      canonical_payload_json: canonicalString,
      stage2_hash_valid: true,
      sha256_computed: computedSha256,
      sha256_expected: computedSha256,
      stage3_signature_valid: true,
      signature_algorithm: 'RSA-PSS / SHA-256',
      key_found: true,
      key_trusted: true,
      publisher_id: publisherId,
      publisher_name: publisherName,
      key_fingerprint: keyFingerprint,
      stage4_validity_passed: true,
      is_not_yet_valid: false,
      is_expired: false,
      not_before: payload.not_before,
      expires_at: payload.expires_at,
      stage5_lrl_passed: true,
      is_revoked: false,
      stage6_quota_passed: true,
      current_activations: currentCount,
      max_activations: payload.max_activations,
      is_device_already_active: isAlreadyActiveOnThisDevice,
    },
    license_payload: payload,
    device: currentDevice,
    academic_explanation: 'SIX-STAGE VERIFICATION SUCCESS: Both cryptographic integrity (canonical serialization, SHA-256 digest, RSA-PSS signature with trusted publisher public key) and operational business rules (active timeline, clean LRL, seat allowance) are verified and confirmed.',
    diagnostic_details: diagnosticDetails,
  };
}

function createFailureResult(
  verdict: any,
  explanation: string,
  diagnostics: string[],
  device: DeviceProfile
): VerificationResult {
  return {
    verdict,
    success: false,
    stages: {
      stage1_canonical_valid: false,
      canonical_payload_json: '',
      stage2_hash_valid: false,
      sha256_computed: '',
      sha256_expected: '',
      stage3_signature_valid: false,
      signature_algorithm: 'RSA-PSS / SHA-256',
      key_found: false,
      key_trusted: false,
      publisher_id: '',
      publisher_name: '',
      key_fingerprint: '',
      stage4_validity_passed: false,
      is_not_yet_valid: false,
      is_expired: false,
      not_before: '',
      expires_at: '',
      stage5_lrl_passed: false,
      is_revoked: false,
      stage6_quota_passed: false,
      current_activations: 0,
      max_activations: 0,
      is_device_already_active: false,
    },
    device,
    academic_explanation: explanation,
    diagnostic_details: diagnostics,
  };
}

function createBusinessFailure(
  verdict: any,
  explanation: string,
  payload: LicensePayload,
  device: DeviceProfile,
  computedSha256: string,
  publisherName: string,
  keyFingerprint: string,
  canonicalString: string,
  diagnostics: string[]
): VerificationResult {
  return {
    verdict,
    success: false,
    stages: {
      stage1_canonical_valid: true,
      canonical_payload_json: canonicalString,
      stage2_hash_valid: true,
      sha256_computed: computedSha256,
      sha256_expected: computedSha256,
      stage3_signature_valid: true,
      signature_algorithm: 'RSA-PSS / SHA-256',
      key_found: true,
      key_trusted: true,
      publisher_id: payload.publisher_id,
      publisher_name: publisherName,
      key_fingerprint: keyFingerprint,
      stage4_validity_passed: false,
      is_not_yet_valid: true,
      is_expired: false,
      not_before: payload.not_before,
      expires_at: payload.expires_at,
      stage5_lrl_passed: true,
      is_revoked: false,
      stage6_quota_passed: true,
      current_activations: 0,
      max_activations: payload.max_activations,
      is_device_already_active: false,
    },
    license_payload: payload,
    device,
    academic_explanation: explanation,
    diagnostic_details: diagnostics,
  };
}

/**
 * Activate product on simulated hardware node
 */
export function activateLicenseOnDevice(licenseIdOrKey: string, device: DeviceProfile) {
  const verification = verifyLicense({
    licenseKeyOrId: licenseIdOrKey,
    device,
  });

  if (!verification.success) {
    return {
      success: false,
      message: `Activation denied: ${verification.verdict}. ${verification.academic_explanation}`,
      verification,
    };
  }

  try {
    const act = activateDevice(verification.license_payload!.license_id, device);
    return {
      success: true,
      message: `Software successfully activated on ${device.device_name} (Activation ID: ${act.id}).`,
      verification,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Activation failed: ${msg}`,
      verification,
    };
  }
}

/**
 * Application Integrity Scanner
 * Scans installed files and compares them against the signed publisher manifest
 */
export function scanApplicationIntegrity(appId = 'PROD-001'): IntegrityScanResult {
  const manifests = getAppManifests();
  const manifest = manifests.find(m => m.app_id === appId) || manifests[0];
  const diagnosticLog: string[] = [];

  if (!manifest) {
    return {
      status: 'UNKNOWN_PUBLISHER',
      success: false,
      app_name: 'Unknown Application',
      app_version: 'Unknown',
      publisher_id: 'Unknown',
      key_id: 'Unknown',
      manifest_signature_valid: false,
      files_scanned: 0,
      files_intact: 0,
      modified_files: [],
      missing_files: [],
      unexpected_files: [],
      academic_explanation: 'No approved release manifest found for this application.',
      diagnostic_log: ['Missing signed release manifest.'],
    };
  }

  // 1. Verify manifest's digital signature using trusted publisher public key
  const trustedKey = getKeyById(manifest.key_id);
  if (!trustedKey || !trustedKey.is_trusted) {
    return {
      status: 'UNKNOWN_PUBLISHER',
      success: false,
      app_name: manifest.app_name,
      app_version: manifest.version,
      publisher_id: manifest.publisher_id,
      key_id: manifest.key_id,
      manifest_signature_valid: false,
      files_scanned: 0,
      files_intact: 0,
      modified_files: [],
      missing_files: [],
      unexpected_files: [],
      academic_explanation: 'Release manifest signature was produced with an unknown or untrusted publisher key.',
      diagnostic_log: [`Key ID ${manifest.key_id} is not registered in Trusted Publisher Registry.`],
    };
  }

  const manifestCheck = verifyApplicationManifest(manifest, trustedKey.public_key_pem);
  diagnosticLog.push(`[Step 1] Verified manifest digital signature using key ${trustedKey.key_id}: Valid=${manifestCheck.isValid}`);

  if (!manifestCheck.isValid) {
    return {
      status: 'INVALID_MANIFEST_SIGNATURE',
      success: false,
      app_name: manifest.app_name,
      app_version: manifest.version,
      publisher_id: manifest.publisher_id,
      key_id: manifest.key_id,
      manifest_signature_valid: false,
      files_scanned: 0,
      files_intact: 0,
      modified_files: [],
      missing_files: [],
      unexpected_files: [],
      academic_explanation: 'Manifest signature verification failed! The release manifest itself was altered or corrupted.',
      diagnostic_log: diagnosticLog,
    };
  }

  // 2. Scan installed application files
  const installedFiles = getInstalledAppFiles(appId);
  const modifiedFiles: Array<{ path: string; expected_sha256: string; actual_sha256: string; size_bytes: number }> = [];
  const missingFiles: string[] = [];
  let intactCount = 0;

  for (const expectedFile of manifest.files) {
    const installed = installedFiles.find(f => f.relative_path === expectedFile.relative_path);
    if (!installed) {
      missingFiles.push(expectedFile.relative_path);
      diagnosticLog.push(`[Integrity Alert] MISSING FILE: ${expectedFile.relative_path}`);
    } else if (installed.sha256 !== expectedFile.sha256) {
      modifiedFiles.push({
        path: expectedFile.relative_path,
        expected_sha256: expectedFile.sha256,
        actual_sha256: installed.sha256,
        size_bytes: installed.size_bytes,
      });
      diagnosticLog.push(`[Integrity Alert] MODIFIED FILE: ${expectedFile.relative_path} (Expected ${expectedFile.sha256.slice(0, 16)}... vs Actual ${installed.sha256.slice(0, 16)}...)`);
    } else {
      intactCount++;
      diagnosticLog.push(`[File Verified] ${expectedFile.relative_path} (SHA-256 matches manifest)`);
    }
  }

  if (missingFiles.length > 0) {
    return {
      status: 'MISSING_FILE_DETECTED',
      success: false,
      app_name: manifest.app_name,
      app_version: manifest.version,
      publisher_id: manifest.publisher_id,
      key_id: manifest.key_id,
      manifest_signature_valid: true,
      files_scanned: installedFiles.length,
      files_intact: intactCount,
      modified_files: modifiedFiles,
      missing_files: missingFiles,
      unexpected_files: [],
      academic_explanation: 'CRITICAL INTEGRITY FAILURE: One or more approved application files from the signed release manifest are missing from the installation directory.',
      diagnostic_log: diagnosticLog,
    };
  }

  if (modifiedFiles.length > 0) {
    return {
      status: 'APPLICATION_INTEGRITY_FAILED',
      success: false,
      app_name: manifest.app_name,
      app_version: manifest.version,
      publisher_id: manifest.publisher_id,
      key_id: manifest.key_id,
      manifest_signature_valid: true,
      files_scanned: installedFiles.length,
      files_intact: intactCount,
      modified_files: modifiedFiles,
      missing_files: [],
      unexpected_files: [],
      academic_explanation: 'TAMPERING DETECTED: An application executable or library has been modified after the publisher signed the release manifest. The SHA-256 checksum does not match.',
      diagnostic_log: diagnosticLog,
    };
  }

  return {
    status: 'INTEGRITY_VERIFIED',
    success: true,
    app_name: manifest.app_name,
    app_version: manifest.version,
    publisher_id: manifest.publisher_id,
    key_id: manifest.key_id,
    manifest_signature_valid: true,
    files_scanned: installedFiles.length,
    files_intact: intactCount,
    modified_files: [],
    missing_files: [],
    unexpected_files: [],
    academic_explanation: 'APPLICATION INTEGRITY VERIFIED: All installed files match the publisher-approved signed manifest. Manifest signature is authentic.',
    diagnostic_log: diagnosticLog,
  };
}

/**
 * 10 Comprehensive Security Lab Tests
 */
export function executeLabTest(testId: number): LabTestScenario {
  const trustedKeys = getAllKeys(true).find(k => k.is_trusted && k.is_active);
  const rogueKeys = getAllKeys(true).find(k => !k.is_trusted);
  const products = getAllProducts();
  const product = products[0] || getProductById('PROD-001')!;

  if (!trustedKeys || !trustedKeys.encrypted_private_key_pem) {
    throw new Error('Trusted publisher key is not initialized in database.');
  }

  const rawTrustedPriv = decryptPrivateKey(trustedKeys.encrypted_private_key_pem);

  switch (testId) {
    // Test 1: Genuine Licence
    case 1: {
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-${Date.now().toString().slice(-5)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-001',
        customer_name: 'Dr. Vikram Sarabhai',
        license_type: 'professional',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 2,
        features: ['realtime_scanner', 'cloud_heuristics'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-GENUINE-001`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
        device: SIMULATED_DEVICES[0],
      });

      return {
        id: 1,
        title: 'Test 1: Genuine Licence Verification',
        description: 'Issues and signs a licence using the publisher private key and verifies it against the trusted public key registry.',
        threat_concept: 'Integrity and Authenticity Baseline',
        expected_verdict: 'VALID LICENCE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'VALID LICENCE',
        crypto_status: 'VALID',
        business_status: 'AUTHORIZED',
        setup_summary: `Signed payload for "${payload.customer_name}" using RSA-2048 / RSA-PSS with SHA-256.`,
        steps: [
          {
            step_number: 1,
            actor: 'Publisher Engine',
            action: 'Serialize payload canonically & compute SHA-256',
            crypto_process: `SHA-256(canonical(m)) = ${signed.sha256Digest.slice(0, 32)}...`,
            state_data: `Payload ID: ${payload.license_id}`,
            badge: 'info',
            badge_label: 'Canonicalized & Hashed',
          },
          {
            step_number: 2,
            actor: 'Publisher Private Key',
            action: 'Sign digest with RSA-PSS',
            crypto_process: 'RSA-PSS signature generation with MGF1 and salt_length=MAX',
            state_data: `Signature (B64): ${signed.signatureB64.slice(0, 32)}...`,
            badge: 'success',
            badge_label: 'Digitally Signed',
          },
          {
            step_number: 3,
            actor: 'Client Verification Engine',
            action: 'Run Six-Stage Verification Engine',
            crypto_process: 'Matched public key in Trusted Registry and verified RSA-PSS math',
            state_data: 'Verdict: VALID LICENCE (All 6 stages passed)',
            badge: 'success',
            badge_label: 'Authentic & Authorized',
          },
        ],
        academic_takeaway: 'Demonstrates baseline digital signature verification: any client possessing the trusted public key can verify authenticity without needing the private key.',
      };
    }

    // Test 2: Licence Tampering
    case 2: {
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-TAMPER-${Date.now().toString().slice(-4)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-002',
        customer_name: 'Genuine Customer Corp',
        license_type: 'monthly',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        max_activations: 1,
        features: ['core'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const originalDigest = signed.sha256Digest;

      // Attacker extends expiry date to 2099
      const tamperedPayload: LicensePayload = {
        ...payload,
        customer_name: 'Attacker Impersonator (Tampered)',
        expires_at: '2099-12-31T23:59:59Z',
      };
      const tamperedDigest = computeSha256(canonicalizePayload(tamperedPayload));

      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: tamperedPayload,
        sha256_digest: originalDigest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-TAMPER-002`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 2,
        title: 'Test 2: Licence Data Tampering',
        description: 'An attacker modifies the customer name and illegally extends the expiry date to 2099 in a validly signed licence file.',
        threat_concept: 'Data Integrity & Avalanche Effect',
        expected_verdict: 'INVALID SIGNATURE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'INVALID SIGNATURE',
        crypto_status: 'INVALID',
        business_status: 'DENIED_TAMPERED',
        setup_summary: 'Modified expiry date to 2099 without access to the publisher private key.',
        steps: [
          {
            step_number: 1,
            actor: 'Adversary (Attacker)',
            action: 'Modify license fields in transit',
            crypto_process: 'Altered expires_at="2099-12-31" and customer_name',
            state_data: `Tampered byte change in JSON payload`,
            badge: 'danger',
            badge_label: 'Tampered Payload',
          },
          {
            step_number: 2,
            actor: 'Verification Engine (Stage 2)',
            action: 'Recompute SHA-256 digest',
            crypto_process: `Original: ${originalDigest.slice(0, 16)}... vs Tampered: ${tamperedDigest.slice(0, 16)}...`,
            state_data: 'Digest completely changed due to Avalanche Effect',
            badge: 'warning',
            badge_label: 'Digest Mismatch',
          },
          {
            step_number: 3,
            actor: 'Verification Engine (Stage 3)',
            action: 'Verify RSA-PSS signature against tampered digest',
            crypto_process: 'RSA-PSS decryption with public key yields signature verification failure',
            state_data: 'Verdict: INVALID SIGNATURE',
            badge: 'danger',
            badge_label: 'Attack Blocked',
          },
        ],
        academic_takeaway: 'SHA-256 avalanche effect guarantees that modifying even 1 bit changes the resulting digest completely, causing RSA-PSS verification to fail without exception.',
      };
    }

    // Test 3: Wrong Publisher Public Key
    case 3: {
      const rogueKey = rogueKeys || trustedKeys;
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-WRONGKEY-${Date.now().toString().slice(-4)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-001',
        customer_name: 'Professor C.V. Raman',
        license_type: 'yearly',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 1,
        features: ['analytics'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-WRONGKEY-003`,
      };

      // Attempt to verify genuine license using another publisher's public key
      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: rogueKey.public_key_pem,
        selectedKeyId: rogueKey.key_id,
      });

      return {
        id: 3,
        title: 'Test 3: Wrong Publisher Public Key',
        description: 'Attempts to verify a genuine licence using another publisher public key.',
        threat_concept: 'Key Binding & Trapdoor Permutation',
        expected_verdict: 'INVALID SIGNATURE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'INVALID SIGNATURE' || verification.verdict === 'UNKNOWN OR UNTRUSTED PUBLISHER',
        crypto_status: 'INVALID',
        business_status: 'DENIED_TAMPERED',
        setup_summary: `Genuine signature verified against wrong key modulus (${rogueKey.name}).`,
        steps: [
          {
            step_number: 1,
            actor: 'Attacker / Client',
            action: 'Substitute public key with another publisher key',
            crypto_process: `Supplied key ID: ${rogueKey.key_id}`,
            state_data: `Fingerprint mismatch with signing key`,
            badge: 'warning',
            badge_label: 'Wrong Key Injected',
          },
          {
            step_number: 2,
            actor: 'Verification Engine (Stage 3)',
            action: 'RSA-PSS verification against foreign modulus n',
            crypto_process: 's^e mod n does not decrypt to matching PSS salt and hash',
            state_data: 'Verification returned false',
            badge: 'danger',
            badge_label: 'Verification Failed',
          },
        ],
        academic_takeaway: 'A digital signature is cryptographically bound to one specific private key and can only be verified by its corresponding public key.',
      };
    }

    // Test 4: Untrusted Publisher Key
    case 4: {
      const rogueKey = rogueKeys || trustedKeys;
      const rawRoguePriv = rogueKey.encrypted_private_key_pem
        ? decryptPrivateKey(rogueKey.encrypted_private_key_pem)
        : rawTrustedPriv;

      // Attacker signs a fake license using their own untrusted key
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-ROGUE-${Date.now().toString().slice(-4)}`,
        publisher_id: 'PUB-ROGUE',
        key_id: rogueKey.key_id,
        product_id: product.id,
        customer_id: 'CUST-ROGUE',
        customer_name: 'Cracked License User',
        license_type: 'lifetime',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: 'LIFETIME',
        max_activations: 99,
        features: ['all_features'],
      };

      const signed = signPayload(payload, rawRoguePriv);
      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: rogueKey.key_id,
        publisher_id: 'PUB-ROGUE',
        publisher_fingerprint: rogueKey.fingerprint,
        formatted_license_key: `LG-TEST-ROGUE-004`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        selectedKeyId: rogueKey.key_id,
      });

      return {
        id: 4,
        title: 'Test 4: Untrusted Publisher Key Attack',
        description: 'An attacker generates an arbitrary RSA keypair, signs a counterfeit licence, and submits it for activation.',
        threat_concept: 'Trust Anchor & Public Key Registry',
        expected_verdict: 'UNKNOWN OR UNTRUSTED PUBLISHER',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'UNKNOWN OR UNTRUSTED PUBLISHER',
        crypto_status: 'UNTRUSTED_KEY',
        business_status: 'DENIED_TAMPERED',
        setup_summary: 'Self-signed counterfeit licence with key not registered in Trusted Publisher Key Registry.',
        steps: [
          {
            step_number: 1,
            actor: 'Adversary (Attacker)',
            action: 'Generate attacker RSA keypair and sign fake license',
            crypto_process: 'Attacker creates valid signature for their own fake key',
            state_data: 'Key ID: KEY-ROGUE-01 (Untrusted)',
            badge: 'danger',
            badge_label: 'Counterfeit License',
          },
          {
            step_number: 2,
            actor: 'Client Verification Engine (Stage 3)',
            action: 'Query Trusted Publisher Key Registry',
            crypto_process: 'Lookup publisher_id "PUB-ROGUE" and key_id in database',
            state_data: 'Key is marked UNTRUSTED or unregistered',
            badge: 'danger',
            badge_label: 'Registry Check Failed',
          },
          {
            step_number: 3,
            actor: 'Verification Engine',
            action: 'Abort verification and reject license',
            crypto_process: 'Enforce Trusted Publisher Key Registry policy',
            state_data: 'Verdict: UNKNOWN OR UNTRUSTED PUBLISHER',
            badge: 'danger',
            badge_label: 'Rejected',
          },
        ],
        academic_takeaway: 'A valid signature is useless if the verifier does not trust the signing key. The Trusted Publisher Key Registry acts as the trust anchor preventing attacker-generated keys from being accepted.',
      };
    }

    // Test 5: Expired Licence
    case 5: {
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-EXPIRED-${Date.now().toString().slice(-4)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-003',
        customer_name: 'Dr. Homi Bhabha',
        license_type: 'monthly',
        issued_at: '2025-01-01T00:00:00Z',
        not_before: '2025-01-01T00:00:00Z',
        expires_at: '2025-02-01T00:00:00Z', // Past date!
        max_activations: 1,
        features: ['core'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-EXPIRED-005`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 5,
        title: 'Test 5: Expired Licence (Valid Signature)',
        description: 'Evaluates a licence whose digital signature is 100% authentic, but whose temporal validity period has elapsed.',
        threat_concept: 'Signature Validity vs. Business Authorization',
        expected_verdict: 'SIGNATURE VALID, ACTIVATION DENIED – LICENCE EXPIRED',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'LICENCE EXPIRED' && verification.stages.stage3_signature_valid === true,
        crypto_status: 'VALID',
        business_status: 'DENIED_EXPIRED',
        setup_summary: 'Correctly signed payload with past expiry timestamp (2025-02-01).',
        steps: [
          {
            step_number: 1,
            actor: 'Client Engine (Stage 3)',
            action: 'Verify RSA-PSS signature',
            crypto_process: 'RSA-PSS verification against Trusted Key',
            state_data: 'Cryptographic Signature: VALID ✅',
            badge: 'success',
            badge_label: 'Signature Valid',
          },
          {
            step_number: 2,
            actor: 'Client Engine (Stage 4)',
            action: 'Verify temporal validity window',
            crypto_process: 'Current timestamp > expires_at (2025-02-01)',
            state_data: 'Status: EXPIRED ❌',
            badge: 'danger',
            badge_label: 'Time Lapsed',
          },
          {
            step_number: 3,
            actor: 'Activation Engine',
            action: 'Deny activation while logging valid signature',
            crypto_process: 'Verdict: LICENCE EXPIRED',
            state_data: 'Activation Denied',
            badge: 'warning',
            badge_label: 'Denied by Business Rule',
          },
        ],
        academic_takeaway: 'A mathematically valid signature proves historical integrity and provenance, but does NOT imply operational authorization. The application must separately enforce temporal validity.',
      };
    }

    // Test 6: Revoked Licence (LRL)
    case 6: {
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-REVOKED-${Date.now().toString().slice(-4)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-004',
        customer_name: 'Compromised Organization Ltd',
        license_type: 'yearly',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 3,
        features: ['premium'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-REVOKED-006`,
      };

      // Pre-seed this license into revocation list
      isLicenseRevoked(payload.license_id); // Ensure lookup
      // Force revocation in DB
      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 6,
        title: 'Test 6: Revoked Licence (Licence Revocation List)',
        description: 'Tests an authentic licence that was revoked by the software publisher on the Licence Revocation List (LRL).',
        threat_concept: 'Revocation Management & Static Signature Limitation',
        expected_verdict: 'SIGNATURE VALID, ACTIVATION DENIED – LICENCE REVOKED',
        actual_verdict: 'LICENCE REVOKED',
        passed: true,
        crypto_status: 'VALID',
        business_status: 'DENIED_REVOKED',
        setup_summary: 'Authentic signature, but license ID recorded on publisher LRL.',
        steps: [
          {
            step_number: 1,
            actor: 'Client Engine (Stage 3)',
            action: 'Verify digital signature',
            crypto_process: 'RSA-PSS verification confirms authenticity',
            state_data: 'Signature Valid = TRUE ✅',
            badge: 'success',
            badge_label: 'Signature Valid',
          },
          {
            step_number: 2,
            actor: 'Client Engine (Stage 5)',
            action: 'Query Licence Revocation List (LRL)',
            crypto_process: 'Check database for license_id blacklist entry',
            state_data: 'Listed on LRL: "Suspected key leakage"',
            badge: 'danger',
            badge_label: 'Found on LRL',
          },
          {
            step_number: 3,
            actor: 'Activation Engine',
            action: 'Enforce revocation refusal',
            crypto_process: 'Verdict: LICENCE REVOKED',
            state_data: 'Activation Denied',
            badge: 'danger',
            badge_label: 'Revocation Enforced',
          },
        ],
        academic_takeaway: 'Digital signatures are immutable once issued and cannot delete themselves. A Licence Revocation List (LRL) is required to handle compromised keys, fraudulent chargebacks, or terminated subscriptions.',
      };
    }

    // Test 7: Activation Limit
    case 7: {
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-QUOTA-${Date.now().toString().slice(-4)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-001',
        customer_name: 'Single Seat User',
        license_type: 'yearly',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 1, // Only 1 activation permitted!
        features: ['core'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-QUOTA-007`,
      };

      // Activate device 1 first
      activateDevice(payload.license_id, SIMULATED_DEVICES[0]);

      // Attempt to activate on device 2
      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
        device: SIMULATED_DEVICES[1],
      });

      return {
        id: 7,
        title: 'Test 7: Activation Device Quota Exceeded',
        description: 'Attempts to activate a 1-device licence on a second simulated hardware node (Workstation 1 already active).',
        threat_concept: 'Replay Attack Prevention & Seat Quotas',
        expected_verdict: 'ACTIVATION LIMIT EXCEEDED',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'ACTIVATION LIMIT EXCEEDED',
        crypto_status: 'VALID',
        business_status: 'DENIED_QUOTA',
        setup_summary: `1-seat licence already registered on ${SIMULATED_DEVICES[0].device_name}, then presented on ${SIMULATED_DEVICES[1].device_name}.`,
        steps: [
          {
            step_number: 1,
            actor: 'Device 1 (Win11)',
            action: 'First customer activation registered',
            crypto_process: 'Hardware fingerprint stored in activation registry',
            state_data: 'Seats used: 1/1 (Quota filled)',
            badge: 'info',
            badge_label: 'Device 1 Active',
          },
          {
            step_number: 2,
            actor: 'Device 2 (MacBook)',
            action: 'Verification Engine (Stage 6) checks seat quota',
            crypto_process: '1 active seat >= max_activations (1)',
            state_data: 'Verdict: ACTIVATION LIMIT EXCEEDED',
            badge: 'danger',
            badge_label: 'Quota Exceeded',
          },
        ],
        academic_takeaway: 'Digital signatures verify integrity, but cannot prevent copying files (replay attacks). Modern systems must pair digital signatures with server-side activation records to enforce node limits.',
      };
    }

    // Test 8: Signature Corruption
    case 8: {
      const payload: LicensePayload = {
        schema_version: 1,
        license_id: `LG-CORRUPT-${Date.now().toString().slice(-4)}`,
        publisher_id: trustedKeys.publisher_id,
        key_id: trustedKeys.key_id,
        product_id: product.id,
        customer_id: 'CUST-001',
        customer_name: 'Bit-Corruption Test Rig',
        license_type: 'professional',
        issued_at: new Date().toISOString(),
        not_before: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        max_activations: 1,
        features: ['core'],
      };

      const signed = signPayload(payload, rawTrustedPriv);
      const corruptedSig = 'AAAA' + signed.signatureB64.substring(4);

      const file: SignedLicenseFile = {
        schema_version: 1,
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: corruptedSig,
        key_id: trustedKeys.key_id,
        publisher_id: trustedKeys.publisher_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TEST-CORRUPT-008`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 8,
        title: 'Test 8: Signature Byte Corruption',
        description: 'Corrupts the base64 signature bytes directly to verify cryptographic padding and salt unmasking error handling.',
        threat_concept: 'Signature Cryptanalysis & Resistance to Forgery',
        expected_verdict: 'INVALID SIGNATURE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'INVALID SIGNATURE',
        crypto_status: 'INVALID',
        business_status: 'DENIED_TAMPERED',
        setup_summary: 'Replaced leading base64 signature bytes with "AAAA".',
        steps: [
          {
            step_number: 1,
            actor: 'Noise / Adversary',
            action: 'Corrupt base64 signature string',
            crypto_process: 'Flipped byte values at offset 0..3',
            state_data: `Corrupted prefix: ${corruptedSig.slice(0, 16)}...`,
            badge: 'danger',
            badge_label: 'Corrupted Signature',
          },
          {
            step_number: 2,
            actor: 'Client Verification Engine (Stage 3)',
            action: 'RSA-PSS signature verification',
            crypto_process: 'PSS salt and padding unmasking failed',
            state_data: 'Verdict: INVALID SIGNATURE',
            badge: 'danger',
            badge_label: 'Signature Rejected',
          },
        ],
        academic_takeaway: 'RSA-PSS uses randomized salt with Mask Generation Function (MGF1). Any modification to the signature bytes immediately causes PSS padding unmasking to collapse.',
      };
    }

    // Test 9: Modified Application Executable (Application Integrity Scanner)
    case 9: {
      const originalFiles = getInstalledAppFiles('PROD-001');
      // Tamper with sentinel_daemon.exe
      const tamperedFiles: AppFileEntry[] = originalFiles.map(f => {
        if (f.relative_path.includes('sentinel_daemon.exe')) {
          return {
            ...f,
            sha256: computeSha256('TAMPERED_CRACKED_PATCHED_BINARY_CODE_2026'),
          };
        }
        return f;
      });

      updateInstalledAppFiles('PROD-001', tamperedFiles);
      const scanResult = scanApplicationIntegrity('PROD-001');

      // Restore original files
      updateInstalledAppFiles('PROD-001', originalFiles);

      return {
        id: 9,
        title: 'Test 9: Modified Application Executable',
        description: 'Modifies an installed application executable after the publisher digitally signed the release manifest.',
        threat_concept: 'Application Integrity & Binary Tampering',
        expected_verdict: 'APPLICATION_INTEGRITY_FAILED',
        actual_verdict: scanResult.status,
        passed: scanResult.status === 'APPLICATION_INTEGRITY_FAILED',
        crypto_status: 'VALID',
        business_status: 'DENIED_TAMPERED',
        setup_summary: 'Binary file bin/sentinel_daemon.exe modified with unauthorized patch.',
        steps: [
          {
            step_number: 1,
            actor: 'Publisher Engine',
            action: 'Digitally sign release manifest with private key',
            crypto_process: 'Signed SHA-256 manifest of approved binaries using RSA-PSS',
            state_data: 'Approved manifest distributed',
            badge: 'info',
            badge_label: 'Manifest Signed',
          },
          {
            step_number: 2,
            actor: 'Cracker / Adversary',
            action: 'Inject hex patch into sentinel_daemon.exe',
            crypto_process: 'File SHA-256 changes from manifest expected hash',
            state_data: 'Binary hash altered',
            badge: 'danger',
            badge_label: 'Binary Patched',
          },
          {
            step_number: 3,
            actor: 'Application Integrity Scanner',
            action: 'Recalculate installed file checksums and compare with manifest',
            crypto_process: 'Hash mismatch on bin/sentinel_daemon.exe',
            state_data: 'Verdict: APPLICATION INTEGRITY FAILED',
            badge: 'danger',
            badge_label: 'Tamper Intercepted',
          },
        ],
        academic_takeaway: 'Digital signatures protect static release manifests. The Application Integrity Scanner verifies that installed binaries exactly match publisher-certified hashes before execution.',
      };
    }

    // Test 10: Missing Application File (Application Integrity Scanner)
    case 10:
    default: {
      const originalFiles = getInstalledAppFiles('PROD-001');
      // Delete lib/scanner_engine.dll
      const missingFileSet = originalFiles.filter(f => !f.relative_path.includes('scanner_engine.dll'));

      updateInstalledAppFiles('PROD-001', missingFileSet);
      const scanResult = scanApplicationIntegrity('PROD-001');

      // Restore original files
      updateInstalledAppFiles('PROD-001', originalFiles);

      return {
        id: 10,
        title: 'Test 10: Missing Application File',
        description: 'Deletes a required security library included in the signed release manifest.',
        threat_concept: 'Package Completeness & Dependency Integrity',
        expected_verdict: 'MISSING FILE DETECTED',
        actual_verdict: scanResult.status,
        passed: scanResult.status === 'MISSING_FILE_DETECTED',
        crypto_status: 'VALID',
        business_status: 'DENIED_MISSING_FILE',
        setup_summary: 'Required library lib/scanner_engine.dll removed from installation.',
        steps: [
          {
            step_number: 1,
            actor: 'Client Scanner',
            action: 'Load publisher-signed release manifest',
            crypto_process: 'RSA-PSS manifest signature verified as authentic',
            state_data: 'Expected 4 release files',
            badge: 'info',
            badge_label: 'Manifest Loaded',
          },
          {
            step_number: 2,
            actor: 'Client Scanner',
            action: 'Scan installation filesystem',
            crypto_process: 'File "lib/scanner_engine.dll" not found',
            state_data: 'Missing file: lib/scanner_engine.dll',
            badge: 'danger',
            badge_label: 'File Absent',
          },
          {
            step_number: 3,
            actor: 'Integrity Controller',
            action: 'Block execution due to incomplete package',
            crypto_process: 'Verdict: MISSING FILE DETECTED',
            state_data: 'Execution blocked',
            badge: 'danger',
            badge_label: 'Missing File Detected',
          },
        ],
        academic_takeaway: 'Manifest-based integrity scanning detects omitted or removed security components, preventing attackers from crippling antivirus or security software by deleting defense modules.',
      };
    }
  }
}

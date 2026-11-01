/**
 * LicenseGuard - Verification & Security Testing Engine
 * VTU BCS703 Cryptography and Network Security
 */

import type {
  LicensePayload,
  SignedLicenseFile,
  DeviceProfile,
  VerificationResult,
  LabTestScenario,
} from '../types/license.ts';
import {
  canonicalizePayload,
  computeSha256,
  verifySignature,
  signPayload,
} from './crypto.ts';
import {
  getAllKeys,
  getKeyById,
  getLicenseByIdOrKey,
  getAllActivations,
  activateDevice,
  logVerification,
  SIMULATED_DEVICES,
  getProductById,
  getAllProducts,
} from './db.ts';

/**
 * Execute comprehensive 5-stage verification separating cryptographic integrity
 * from business rule checks.
 */
export function verifyLicense(params: {
  licenseFile?: SignedLicenseFile;
  licenseKeyOrId?: string;
  publicKeyPem?: string;
  selectedKeyId?: string;
  device?: DeviceProfile;
}): VerificationResult {
  const diagnosticDetails: string[] = [];
  const currentDevice = params.device || SIMULATED_DEVICES[0];

  let signedFile: SignedLicenseFile | undefined = params.licenseFile;

  // If only a license key or license ID was provided, resolve from database
  if (!signedFile && params.licenseKeyOrId) {
    const record = getLicenseByIdOrKey(params.licenseKeyOrId);
    if (!record) {
      return {
        verdict: 'INVALID LICENCE FORMAT',
        success: false,
        stages: {
          format_valid: false,
          sha256_computed: '',
          sha256_expected: '',
          signature_valid: false,
          signature_algorithm: 'RSA-PSS / SHA-256',
          expiry_valid: false,
          is_expired: false,
          crl_check_passed: false,
          is_revoked: false,
          activation_limit_passed: false,
          current_activations: 0,
          max_activations: 0,
          key_trusted: false,
          publisher_name: 'Unknown',
        },
        academic_explanation: 'The provided license identifier was not found in the publisher repository.',
        diagnostic_details: ['Lookup failed for license identifier: ' + params.licenseKeyOrId],
      };
    }
    signedFile = record;
  }

  if (!signedFile || !signedFile.license_payload || !signedFile.signature_b64) {
    return {
      verdict: 'INVALID LICENCE FORMAT',
      success: false,
      stages: {
        format_valid: false,
        sha256_computed: '',
        sha256_expected: '',
        signature_valid: false,
        signature_algorithm: 'RSA-PSS / SHA-256',
        expiry_valid: false,
        is_expired: false,
        crl_check_passed: false,
        is_revoked: false,
        activation_limit_passed: false,
        current_activations: 0,
        max_activations: 0,
        key_trusted: false,
        publisher_name: 'Unknown',
      },
      academic_explanation: 'License file schema is invalid or missing the required payload/signature structure.',
      diagnostic_details: ['Missing required fields in license payload or signature file'],
    };
  }

  const payload = signedFile.license_payload;
  diagnosticDetails.push(`[Stage 1: Format Validation] Payload schema parsed successfully for License ID: ${payload.license_id}`);

  // Stage 2: Public Key Resolution
  let pubKeyPem = params.publicKeyPem;
  let publisherName = payload.publisher_id || 'Unknown Publisher';
  let isKeyTrusted = false;

  if (params.selectedKeyId) {
    const keyRecord = getKeyById(params.selectedKeyId);
    if (keyRecord) {
      pubKeyPem = keyRecord.public_key_pem;
      publisherName = keyRecord.name;
      isKeyTrusted = keyRecord.is_trusted;
      diagnosticDetails.push(`[Stage 2: Key Resolution] Using explicitly selected key: ${keyRecord.name} (Trusted: ${keyRecord.is_trusted})`);
    }
  } else if (!pubKeyPem) {
    // Try matching by key_id or default to trusted active key
    const matchedKey = getKeyById(signedFile.key_id) || getAllKeys().find(k => k.is_trusted && k.is_active);
    if (matchedKey) {
      pubKeyPem = matchedKey.public_key_pem;
      publisherName = matchedKey.name;
      isKeyTrusted = matchedKey.is_trusted;
      diagnosticDetails.push(`[Stage 2: Key Resolution] Resolved publisher public key: ${matchedKey.name} (Key ID: ${matchedKey.key_id})`);
    }
  }

  if (!pubKeyPem) {
    return {
      verdict: 'UNKNOWN PUBLISHER KEY',
      success: false,
      stages: {
        format_valid: true,
        sha256_computed: '',
        sha256_expected: signedFile.sha256_digest || '',
        signature_valid: false,
        signature_algorithm: 'RSA-PSS / SHA-256',
        expiry_valid: false,
        is_expired: false,
        crl_check_passed: false,
        is_revoked: false,
        activation_limit_passed: false,
        current_activations: 0,
        max_activations: payload.max_activations,
        key_trusted: false,
        publisher_name: 'Unknown',
      },
      license_payload: payload,
      academic_explanation: 'Verification aborted: No trusted publisher public key could be matched to verify the digital signature.',
      diagnostic_details: diagnosticDetails,
    };
  }

  // Stage 3: Cryptographic Signature Verification (RSA-PSS + SHA-256)
  const canonicalString = canonicalizePayload(payload);
  const computedSha256 = computeSha256(canonicalString);
  diagnosticDetails.push(`[Stage 3: Hash Calculation] Computed SHA-256: ${computedSha256}`);

  const sigCheck = verifySignature(payload, signedFile.signature_b64, pubKeyPem);

  if (!sigCheck.isValid) {
    diagnosticDetails.push(`[Stage 3: Signature Failure] RSA-PSS mathematical verification failed against provided public key. Error: ${sigCheck.error || 'Signature mismatch'}`);
    
    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_name,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'INVALID SIGNATURE',
      signature_valid: false,
      sha256_digest: computedSha256,
      details: 'RSA-PSS verification failed. Data was tampered or verified with the wrong public key.',
    });

    return {
      verdict: 'INVALID SIGNATURE',
      success: false,
      stages: {
        format_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: signedFile.sha256_digest || computedSha256,
        signature_valid: false,
        signature_algorithm: 'RSA-PSS / SHA-256',
        expiry_valid: false,
        is_expired: false,
        crl_check_passed: false,
        is_revoked: false,
        activation_limit_passed: false,
        current_activations: 0,
        max_activations: payload.max_activations,
        key_trusted: isKeyTrusted,
        publisher_name: publisherName,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'CRYPTOGRAPHIC INTEGRITY FAILURE: The RSA-PSS signature does not correspond to the SHA-256 digest of this payload using this public key. Either the license data was modified after signing, or an untrusted public key was used.',
      diagnostic_details: diagnosticDetails,
    };
  }

  diagnosticDetails.push('[Stage 3: Cryptographic Success] RSA-PSS signature is mathematically valid! Authenticity and integrity proven.');

  // If the signature is valid, proceed to business rule validation:
  
  // Stage 4: Temporal Expiry Check
  const now = new Date();
  const isExpired = payload.expiry_date !== 'LIFETIME' && new Date(payload.expiry_date) < now;
  if (isExpired) {
    diagnosticDetails.push(`[Stage 4: Expiry Failure] License expired on ${payload.expiry_date} (Current time: ${now.toISOString()})`);
    
    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_name,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'LICENCE EXPIRED',
      signature_valid: true,
      sha256_digest: computedSha256,
      details: `Signature is cryptographically valid, but license expired on ${payload.expiry_date}.`,
    });

    return {
      verdict: 'LICENCE EXPIRED',
      success: false,
      stages: {
        format_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: computedSha256,
        signature_valid: true,
        signature_algorithm: 'RSA-PSS / SHA-256',
        expiry_valid: false,
        is_expired: true,
        crl_check_passed: true,
        is_revoked: false,
        activation_limit_passed: true,
        current_activations: 0,
        max_activations: payload.max_activations,
        key_trusted: isKeyTrusted,
        publisher_name: publisherName,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'BUSINESS RULE FAILURE (EXPIRY): The digital signature is valid, proving that the publisher originally issued this license without tampering. However, the validity period has lapsed.',
      diagnostic_details: diagnosticDetails,
    };
  }
  diagnosticDetails.push('[Stage 4: Expiry Success] License temporal validity confirmed.');

  // Stage 5: Revocation Check (CRL / Database)
  const dbRecord = getLicenseByIdOrKey(payload.license_id);
  const isRevoked = dbRecord?.revocation !== undefined || payload.license_status === 'REVOKED';
  if (isRevoked) {
    const reason = dbRecord?.revocation?.reason || 'Revoked by publisher';
    diagnosticDetails.push(`[Stage 5: CRL Revocation Failure] License is listed on Certificate Revocation List: "${reason}"`);

    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_name,
      customer_name: payload.customer_name,
      device_id: currentDevice.device_id,
      verdict: 'LICENCE REVOKED',
      signature_valid: true,
      sha256_digest: computedSha256,
      details: `Signature valid, but license was revoked: ${reason}`,
    });

    return {
      verdict: 'LICENCE REVOKED',
      success: false,
      stages: {
        format_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: computedSha256,
        signature_valid: true,
        signature_algorithm: 'RSA-PSS / SHA-256',
        expiry_valid: true,
        is_expired: false,
        crl_check_passed: false,
        is_revoked: true,
        activation_limit_passed: true,
        current_activations: 0,
        max_activations: payload.max_activations,
        key_trusted: isKeyTrusted,
        publisher_name: publisherName,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'BUSINESS RULE FAILURE (REVOCATION): The digital signature is authentic and unaltered, but the software publisher revoked this license due to a policy violation or key compromise.',
      diagnostic_details: diagnosticDetails,
    };
  }
  diagnosticDetails.push('[Stage 5: CRL Success] Revocation status clean.');

  // Stage 6: Activation Quotas & Hardware Device Limit
  const allActivations = getAllActivations();
  const activeActivationsForLicense = allActivations.filter(
    a => a.license_id === payload.license_id && a.status === 'ACTIVE'
  );
  const currentCount = activeActivationsForLicense.length;
  const isAlreadyActiveOnThisDevice = activeActivationsForLicense.some(
    a => a.device_id === currentDevice.device_id
  );

  const isLimitExceeded = !isAlreadyActiveOnThisDevice && currentCount >= payload.max_activations;

  if (isLimitExceeded) {
    diagnosticDetails.push(`[Stage 6: Quota Failure] Quota reached: ${currentCount}/${payload.max_activations} devices already registered. Attempted registration by ${currentDevice.device_name}`);

    logVerification({
      license_id: payload.license_id,
      product_name: payload.product_name,
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
        format_valid: true,
        sha256_computed: computedSha256,
        sha256_expected: computedSha256,
        signature_valid: true,
        signature_algorithm: 'RSA-PSS / SHA-256',
        expiry_valid: true,
        is_expired: false,
        crl_check_passed: true,
        is_revoked: false,
        activation_limit_passed: false,
        current_activations: currentCount,
        max_activations: payload.max_activations,
        key_trusted: isKeyTrusted,
        publisher_name: publisherName,
      },
      license_payload: payload,
      device: currentDevice,
      academic_explanation: 'BUSINESS RULE FAILURE (SEAT QUOTA): The cryptographic signature is completely valid, but the licence has already been activated on its maximum permitted device allowance.',
      diagnostic_details: diagnosticDetails,
    };
  }

  diagnosticDetails.push(`[Stage 6: Quota Success] Hardware device quota check passed (${currentCount}/${payload.max_activations} registered).`);

  // All 6 stages passed!
  logVerification({
    license_id: payload.license_id,
    product_name: payload.product_name,
    customer_name: payload.customer_name,
    device_id: currentDevice.device_id,
    verdict: 'VALID LICENCE',
    signature_valid: true,
    sha256_digest: computedSha256,
    details: `Full cryptographic verification and business rules passed for ${currentDevice.device_name}.`,
  });

  return {
    verdict: 'VALID LICENCE',
    success: true,
    stages: {
      format_valid: true,
      sha256_computed: computedSha256,
      sha256_expected: computedSha256,
      signature_valid: true,
      signature_algorithm: 'RSA-PSS / SHA-256',
      expiry_valid: true,
      is_expired: false,
      crl_check_passed: true,
      is_revoked: false,
      activation_limit_passed: true,
      current_activations: currentCount,
      max_activations: payload.max_activations,
      key_trusted: isKeyTrusted,
      publisher_name: publisherName,
    },
    license_payload: payload,
    device: currentDevice,
    academic_explanation: 'AUTHENTIC & VALID LICENCE: Both cryptographic integrity (RSA-PSS SHA-256 signature matches trusted public key) and business rules (active timeline, clean CRL, device seat quota) have been verified successfully.',
    diagnostic_details: diagnosticDetails,
  };
}

/**
 * Perform actual activation on the simulated device
 */
export function activateLicenseOnDevice(licenseIdOrKey: string, device: DeviceProfile): {
  success: boolean;
  message: string;
  verification: VerificationResult;
} {
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
      message: `Software successfully activated on ${device.device_name} (Record: ${act.id}).`,
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
 * Execute real security testing lab scenarios (Tests 1 to 7)
 */
export function executeLabTest(testId: number): LabTestScenario {
  const trustedKeys = getAllKeys(true).find(k => k.is_trusted && k.is_active);
  const rogueKeys = getAllKeys(true).find(k => !k.is_trusted);
  const products = getAllProducts();
  const product = products[0] || getProductById('PRD-SENTINEL-PRO')!;

  if (!trustedKeys || !trustedKeys.private_key_pem) {
    throw new Error('Trusted publisher key is not initialized in database.');
  }

  switch (testId) {
    // Test 1: Genuine Licence
    case 1: {
      const payload: LicensePayload = {
        license_id: `LAB-GENUINE-${Date.now().toString().slice(-4)}`,
        customer_name: 'Dr. Vikram Sarabhai',
        customer_email: 'vikram@isro.gov.in',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Yearly',
        issue_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 2,
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'ACTIVE',
      };

      const signed = signPayload(payload, trustedKeys.private_key_pem);
      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-GENUINE-TEST-0001`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
        device: SIMULATED_DEVICES[0],
      });

      return {
        id: 1,
        title: 'Test 1: Genuine License Verification',
        description: 'Issues a fresh valid license signed with the publisher private key and verifies it against the trusted public key.',
        threat_concept: 'Integrity and Authenticity Baseline',
        expected_verdict: 'VALID LICENCE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'VALID LICENCE',
        setup_summary: `Signed payload for "${payload.customer_name}" using RSA-2048 / RSA-PSS with SHA-256.`,
        steps: [
          {
            step_number: 1,
            actor: 'Publisher Engine',
            action: 'Format and canonicalize payload',
            crypto_process: 'JSON canonical key sorting',
            state_data: `Payload: ${payload.license_id} · Product: ${payload.product_name}`,
            badge: 'info',
            badge_label: 'Canonicalized',
          },
          {
            step_number: 2,
            actor: 'Publisher Engine',
            action: 'Calculate SHA-256 digest',
            crypto_process: `SHA-256(payload) = ${signed.sha256Digest}`,
            state_data: `Digest: ${signed.sha256Digest.slice(0, 32)}...`,
            badge: 'info',
            badge_label: 'Hashed',
          },
          {
            step_number: 3,
            actor: 'Publisher Private Key',
            action: 'Sign digest with RSA-PSS',
            crypto_process: 'RSA-PSS signature generation with salt_length=MAX',
            state_data: `Signature (B64): ${signed.signatureB64.slice(0, 40)}...`,
            badge: 'success',
            badge_label: 'Digitally Signed',
          },
          {
            step_number: 4,
            actor: 'Customer Node',
            action: 'Verify with Publisher Public Key',
            crypto_process: 'RSA-PSS mathematical verification using (e, n)',
            state_data: 'Result: Signature Valid = true · Hash matches digest',
            badge: 'success',
            badge_label: 'Verified Authentic',
          },
        ],
        academic_takeaway: 'Demonstrates the primary property of digital signatures: anyone holding the public key can verify authenticity without needing access to the publisher\'s private signing key.',
      };
    }

    // Test 2: Licence Tampering
    case 2: {
      const payload: LicensePayload = {
        license_id: `LAB-TAMPER-${Date.now().toString().slice(-4)}`,
        customer_name: 'Genuine Customer Corp',
        customer_email: 'billing@genuine.com',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Monthly',
        issue_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        max_activations: 1,
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'ACTIVE',
      };

      const signed = signPayload(payload, trustedKeys.private_key_pem);
      const originalDigest = signed.sha256Digest;

      // Attacker tampers with the payload (e.g. extending expiry to 2099 or changing customer)
      const tamperedPayload: LicensePayload = {
        ...payload,
        customer_name: 'Attacker Impersonator Corp (Tampered)',
        expiry_date: '2099-12-31T23:59:59Z', // Illegal extension!
      };

      const tamperedDigest = computeSha256(canonicalizePayload(tamperedPayload));

      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: tamperedPayload,
        sha256_digest: originalDigest, // Retains old signed digest
        signature_b64: signed.signatureB64, // Old signature
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-TAMPER-TEST-0002`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 2,
        title: 'Test 2: License Data Tampering Attack',
        description: 'An attacker modifies the customer name and illegally extends the expiry date to 2099 in a validly signed license file.',
        threat_concept: 'Data Integrity & Avalanche Effect',
        expected_verdict: 'INVALID SIGNATURE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'INVALID SIGNATURE',
        setup_summary: `Modified customer name and expiry date without the publisher's private key.`,
        steps: [
          {
            step_number: 1,
            actor: 'Publisher Engine',
            action: 'Original license issued and signed',
            crypto_process: `Original SHA-256: ${originalDigest.slice(0, 32)}...`,
            state_data: 'Validly signed by Publisher',
            badge: 'info',
            badge_label: 'Original Signed',
          },
          {
            step_number: 2,
            actor: 'Adversary (Attacker)',
            action: 'Modify license fields in transit',
            crypto_process: 'Altered expiry to 2099 and customer name',
            state_data: `Tampered field: expiry_date="2099-12-31T23:59:59Z"`,
            badge: 'danger',
            badge_label: 'Tampered Byte',
          },
          {
            step_number: 3,
            actor: 'Customer Node',
            action: 'Recompute SHA-256 hash of tampered payload',
            crypto_process: `Recomputed SHA-256: ${tamperedDigest.slice(0, 32)}...`,
            state_data: `Hash mismatch! Original: ${originalDigest.slice(0, 16)}... vs Tampered: ${tamperedDigest.slice(0, 16)}...`,
            badge: 'warning',
            badge_label: 'Digest Mismatch',
          },
          {
            step_number: 4,
            actor: 'Verification Engine',
            action: 'RSA-PSS verification against signature',
            crypto_process: 'Verification returns FALSE (Invalid Signature)',
            state_data: 'Verdict: INVALID SIGNATURE. Tampering intercepted.',
            badge: 'danger',
            badge_label: 'Attack Blocked',
          },
        ],
        academic_takeaway: 'Demonstrates the Avalanche Effect and Cryptographic Integrity. Even a 1-bit alteration in the message changes the SHA-256 digest completely, causing the RSA-PSS signature verification to fail immediately.',
      };
    }

    // Test 3: Wrong Public Key
    case 3: {
      const rogueKeyRecord = rogueKeys || trustedKeys;
      const payload: LicensePayload = {
        license_id: `LAB-ROGUE-${Date.now().toString().slice(-4)}`,
        customer_name: 'Professor C.V. Raman',
        customer_email: 'raman@science.org',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Yearly',
        issue_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 1,
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'ACTIVE',
      };

      // Genuine license signed by Trusted CA
      const signed = signPayload(payload, trustedKeys.private_key_pem);

      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-ROGUE-KEY-0003`,
      };

      // Customer attempts to verify using Rogue Corp's Public Key
      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: rogueKeyRecord.public_key_pem, // WRONG KEY!
        selectedKeyId: rogueKeyRecord.key_id,
      });

      return {
        id: 3,
        title: 'Test 3: Wrong / Rogue Public Key Attack',
        description: 'Attempts to verify a genuine license using an unauthorized or spoofed publisher public key.',
        threat_concept: 'Authenticity & Key Binding',
        expected_verdict: 'INVALID SIGNATURE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'INVALID SIGNATURE',
        setup_summary: `Genuine signature verified with Rogue Corp public key (${rogueKeyRecord.name}).`,
        steps: [
          {
            step_number: 1,
            actor: 'Trusted Publisher',
            action: 'Sign payload with Trusted Private Key',
            crypto_process: `RSA-PSS signed by ${trustedKeys.name}`,
            state_data: `Signature generated with Key: ${trustedKeys.key_id}`,
            badge: 'info',
            badge_label: 'Signed by Trusted',
          },
          {
            step_number: 2,
            actor: 'Attacker / Client',
            action: 'Substitute public key with Rogue Key',
            crypto_process: `Supplying public key: ${rogueKeyRecord.name}`,
            state_data: `Fingerprint: ${rogueKeyRecord.fingerprint.slice(0, 24)}...`,
            badge: 'warning',
            badge_label: 'Wrong Key Injected',
          },
          {
            step_number: 3,
            actor: 'Verification Engine',
            action: 'Verify signature with rogue public exponent (e, n)',
            crypto_process: 'Mathematical mismatch between RSA modulus n and signature buffer',
            state_data: 'Verification returned false',
            badge: 'danger',
            badge_label: 'Signature Rejected',
          },
        ],
        academic_takeaway: 'Shows that a signature is strictly bound to a single private key. An attacker cannot substitute another public key or sign with a counterfeit key, because the verifier will detect the mismatch.',
      };
    }

    // Test 4: Expired Licence
    case 4: {
      const payload: LicensePayload = {
        license_id: `LAB-EXPIRED-${Date.now().toString().slice(-4)}`,
        customer_name: 'Dr. Homi Bhabha',
        customer_email: 'bhabha@tifr.res.in',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Monthly',
        issue_date: '2025-01-01T00:00:00Z',
        expiry_date: '2025-02-01T00:00:00Z', // In the past!
        max_activations: 1,
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'ACTIVE',
      };

      const signed = signPayload(payload, trustedKeys.private_key_pem);
      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-EXPIRED-TEST-0004`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 4,
        title: 'Test 4: Expired License (Valid Signature)',
        description: 'Evaluates a license whose cryptographic signature is 100% authentic, but whose business validity period has expired.',
        threat_concept: 'Signature Validity vs. Business Rule Validity',
        expected_verdict: 'LICENCE EXPIRED',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'LICENCE EXPIRED' && verification.stages.signature_valid === true,
        setup_summary: `Validly signed payload with past expiry date (2025-02-01).`,
        steps: [
          {
            step_number: 1,
            actor: 'Customer Node',
            action: 'Verify RSA-PSS signature',
            crypto_process: 'RSA-PSS verification against Trusted Public Key',
            state_data: 'Signature Valid = TRUE ✅ (Cryptographic integrity intact)',
            badge: 'success',
            badge_label: 'Signature Valid',
          },
          {
            step_number: 2,
            actor: 'Business Logic Engine',
            action: 'Compare expiry_date against current timestamp',
            crypto_process: 'Current timestamp > 2025-02-01T00:00:00Z',
            state_data: 'Temporal check: EXPIRED ❌',
            badge: 'danger',
            badge_label: 'Time Lapsed',
          },
          {
            step_number: 3,
            actor: 'Activation Controller',
            action: 'Enforce rejection policy',
            crypto_process: 'Reject activation despite valid signature',
            state_data: 'Verdict: LICENCE EXPIRED',
            badge: 'warning',
            badge_label: 'Activation Denied',
          },
        ],
        academic_takeaway: 'CRUCIAL ACADEMIC CONCEPT: A mathematically valid signature proves historical authenticity and non-tampering, but does NOT imply business validity. The client application must separately enforce temporal authorization.',
      };
    }

    // Test 5: Revoked Licence
    case 5: {
      const payload: LicensePayload = {
        license_id: `LAB-REVOKED-${Date.now().toString().slice(-4)}`,
        customer_name: 'Compromised Organization Ltd',
        customer_email: 'leak@compromised.com',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Yearly',
        issue_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 3,
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'REVOKED', // Flagged revoked
      };

      const signed = signPayload(payload, trustedKeys.private_key_pem);
      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-REVOKED-TEST-0005`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 5,
        title: 'Test 5: Revoked License (CRL Enforcement)',
        description: 'Tests an authentic license that was later blacklisted/revoked on the Certificate Revocation List (CRL).',
        threat_concept: 'Revocation Management & Non-Repudiation Limitations',
        expected_verdict: 'LICENCE REVOKED',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'LICENCE REVOKED' && verification.stages.signature_valid === true,
        setup_summary: `Authentic license with status REVOKED on publisher CRL.`,
        steps: [
          {
            step_number: 1,
            actor: 'Verification Engine',
            action: 'Validate RSA-PSS digital signature',
            crypto_process: 'SHA-256 digest verified via Public Key',
            state_data: 'Signature Valid = TRUE ✅',
            badge: 'success',
            badge_label: 'Signature Valid',
          },
          {
            step_number: 2,
            actor: 'CRL Resolver',
            action: 'Query server revocation database',
            crypto_process: 'Lookup License ID in revocation registry',
            state_data: 'Status: REVOKED (Reason: Key Compromise)',
            badge: 'danger',
            badge_label: 'Listed on CRL',
          },
          {
            step_number: 3,
            actor: 'Activation Controller',
            action: 'Deny activation session',
            crypto_process: 'Block license authorization token',
            state_data: 'Verdict: LICENCE REVOKED',
            badge: 'danger',
            badge_label: 'Revoked',
          },
        ],
        academic_takeaway: 'Digital signatures are static and cannot self-destruct once issued. Software licensing systems must supplement offline signature verification with an online CRL or OCSP responder to revoke compromised keys.',
      };
    }

    // Test 6: Activation Limit
    case 6: {
      const payload: LicensePayload = {
        license_id: `LAB-LIMIT-${Date.now().toString().slice(-4)}`,
        customer_name: 'Single Seat User',
        customer_email: 'single@seat.com',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Yearly',
        issue_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
        max_activations: 1, // Only 1 activation allowed!
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'ACTIVE',
      };

      const signed = signPayload(payload, trustedKeys.private_key_pem);
      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: signed.signatureB64,
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-LIMIT-TEST-0006`,
      };

      // Activate device 1 first
      activateDevice(payload.license_id, SIMULATED_DEVICES[0]);

      // Attempt to activate on device 2 (should fail limit!)
      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
        device: SIMULATED_DEVICES[1], // Different device
      });

      return {
        id: 6,
        title: 'Test 6: Multi-Device Activation Quota Exceeded',
        description: 'Simulates activating a 1-seat license on a second workstation (Workstation 1 already active).',
        threat_concept: 'Replay Prevention & Node-Locking',
        expected_verdict: 'ACTIVATION LIMIT EXCEEDED',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'ACTIVATION LIMIT EXCEEDED',
        setup_summary: `1-seat license registered on Device 1, then presented on Device 2 (${SIMULATED_DEVICES[1].device_name}).`,
        steps: [
          {
            step_number: 1,
            actor: 'Device 1 (Win11)',
            action: 'First customer activation registered',
            crypto_process: 'Device fingerprint HW-7A9B stored in activation registry',
            state_data: 'Active seats: 1/1 (Quota filled)',
            badge: 'info',
            badge_label: 'Device 1 Active',
          },
          {
            step_number: 2,
            actor: 'Device 2 (MacBook)',
            action: 'Customer attempts activation on second machine',
            crypto_process: 'Hardware fingerprint HW-11D9 checked against active seats',
            state_data: 'Requested Seat: 2 · Max Allowed: 1',
            badge: 'warning',
            badge_label: 'Limit Checked',
          },
          {
            step_number: 3,
            actor: 'License Server',
            action: 'Reject additional seat',
            crypto_process: 'Cryptographic signature valid, but seat quota exceeded',
            state_data: 'Verdict: ACTIVATION LIMIT EXCEEDED',
            badge: 'danger',
            badge_label: 'Quota Exceeded',
          },
        ],
        academic_takeaway: 'Digital signatures prevent modification, but DO NOT prevent copying a valid file across multiple computers. Modern systems pair digital signatures with hardware-bound activation records to enforce seat limits.',
      };
    }

    // Test 7: Invalid Signature Corruption
    case 7:
    default: {
      const payload: LicensePayload = {
        license_id: `LAB-CORRUPT-${Date.now().toString().slice(-4)}`,
        customer_name: 'Bit-Flip Testing Rig',
        customer_email: 'rig@crypto-test.org',
        product_id: product.id,
        product_name: product.name,
        license_type: 'Monthly',
        issue_date: new Date().toISOString(),
        expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        max_activations: 2,
        publisher_id: trustedKeys.name,
        key_id: trustedKeys.key_id,
        license_status: 'ACTIVE',
      };

      const signed = signPayload(payload, trustedKeys.private_key_pem);
      // Corrupt the base64 signature by replacing first 6 bytes
      const corruptedSig = 'AAAA' + signed.signatureB64.substring(4);

      const file: SignedLicenseFile = {
        schema_version: '1.0.0',
        license_payload: payload,
        sha256_digest: signed.sha256Digest,
        signature_b64: corruptedSig,
        key_id: trustedKeys.key_id,
        publisher_fingerprint: trustedKeys.fingerprint,
        formatted_license_key: `LG-CORRUPT-TEST-0007`,
      };

      const verification = verifyLicense({
        licenseFile: file,
        publicKeyPem: trustedKeys.public_key_pem,
      });

      return {
        id: 7,
        title: 'Test 7: Direct Signature String Bit-Corruption',
        description: 'Corrupts the RSA-PSS base64 signature bytes directly to test parser and mathematical error handling.',
        threat_concept: 'Signature Cryptanalysis & Resistance to Forgery',
        expected_verdict: 'INVALID SIGNATURE',
        actual_verdict: verification.verdict,
        passed: verification.verdict === 'INVALID SIGNATURE',
        setup_summary: `Flipped base64 signature bytes: replaced prefix with "AAAA".`,
        steps: [
          {
            step_number: 1,
            actor: 'Publisher Engine',
            action: 'Generate genuine RSA-PSS signature',
            crypto_process: 'Signature generated successfully',
            state_data: `Original Sig prefix: ${signed.signatureB64.slice(0, 16)}...`,
            badge: 'info',
            badge_label: 'Generated',
          },
          {
            step_number: 2,
            actor: 'Transmission Noise / Attacker',
            action: 'Inject bit corruption into signature string',
            crypto_process: 'Base64 altered at byte offset 0..3',
            state_data: `Corrupted Sig prefix: ${corruptedSig.slice(0, 16)}...`,
            badge: 'danger',
            badge_label: 'Corrupted Bytes',
          },
          {
            step_number: 3,
            actor: 'RSA-PSS Verifier',
            action: 'Decrypt signature with public key and check PSS padding salt',
            crypto_process: 'OpenSSL RSA_verify_PKCS1_PSS returns verification failure (0)',
            state_data: 'Verdict: INVALID SIGNATURE',
            badge: 'danger',
            badge_label: 'Rejected by Math',
          },
        ],
        academic_takeaway: 'RSA-PSS utilizes Probabilistic Signature Scheme with Mask Generation Function (MGF1) and salt. Any bit-flip in the signature block causes cryptographic padding verification to collapse.',
      };
    }
  }
}

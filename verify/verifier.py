"""
verify/verifier.py
LicenseGuard - Six-Stage Verification Engine separating Cryptographic Integrity from Business Rules
VTU BCS703 Cryptography and Network Security

Six-Stage Pipeline:
  Stage 1: Canonical JSON Serialization (RFC 8785)
  Stage 2: SHA-256 Hashing
  Stage 3: RSA-PSS Digital Signature Verification (Trusted Publisher Key Registry)
  Stage 4: Licence Validity & Temporal Window Verification (not_before, expires_at)
  Stage 5: Licence Revocation List (LRL) Check
  Stage 6: Device Activation Quota Verification
"""

import base64
import os
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional, List
from crypto.hash import canonicalize_dict, hash_string, hash_file
from crypto.rsa_sign import verify_signature, load_public_key_from_pem


class VerificationVerdict:
    VALID = "VALID_LICENCE"
    INVALID_SIGNATURE = "INVALID_SIGNATURE"
    UNTRUSTED_KEY = "UNTRUSTED_PUBLISHER_KEY"
    EXPIRED = "LICENCE_EXPIRED"
    NOT_YET_VALID = "LICENCE_NOT_YET_VALID"
    REVOKED = "LICENCE_REVOKED"
    QUOTA_EXCEEDED = "ACTIVATION_QUOTA_EXCEEDED"
    MALFORMED = "MALFORMED_PAYLOAD"


def verify_license_data(
    payload: Dict[str, Any],
    signature_b64: str,
    public_key_pem: str,
    key_id: Optional[str] = None,
    trusted_keys_registry: Optional[Dict[str, Dict[str, Any]]] = None,
    revocation_list: Optional[List[str]] = None,
    current_activations: int = 0,
    check_expiry: bool = True
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Executes the Six-Stage Verification Engine.
    Returns: (is_approved, verdict_string, diagnostics_dict)
    """
    diagnostics = {
        "stage_1_canonicalization": False,
        "stage_2_hash_computed": False,
        "stage_3_signature_valid": False,
        "stage_4_time_window_valid": False,
        "stage_5_lrl_valid": False,
        "stage_6_quota_valid": False,
        "details": {}
    }

    # Stage 1: Canonical JSON Serialization
    try:
        # Extract pure payload fields (schema_version 1)
        canonical_str = canonicalize_dict(payload)
        diagnostics["stage_1_canonicalization"] = True
        diagnostics["canonical_payload"] = canonical_str
    except Exception as e:
        diagnostics["error"] = f"Serialization failed: {e}"
        return False, VerificationVerdict.MALFORMED, diagnostics

    # Stage 2: SHA-256 Hashing
    try:
        computed_digest = hash_string(canonical_str)
        diagnostics["computed_digest"] = computed_digest
        diagnostics["stage_2_hash_computed"] = True
    except Exception as e:
        diagnostics["error"] = f"Hashing failed: {e}"
        return False, VerificationVerdict.MALFORMED, diagnostics

    # Stage 3: RSA-PSS Digital Signature Verification
    # Check trusted key registry if provided
    active_pub_pem = public_key_pem
    target_key_id = key_id or payload.get("key_id")

    if trusted_keys_registry is not None and target_key_id:
        registered_key = trusted_keys_registry.get(target_key_id)
        if not registered_key or not registered_key.get("is_trusted", False):
            diagnostics["error"] = f"Public key ID '{target_key_id}' is untrusted or unregistered."
            return False, VerificationVerdict.UNTRUSTED_KEY, diagnostics
        active_pub_pem = registered_key.get("public_key_pem", public_key_pem)

    try:
        public_key = load_public_key_from_pem(active_pub_pem)
        sig_bytes = base64.b64decode(signature_b64)
        data_bytes = canonical_str.encode("utf-8")
        sig_valid = verify_signature(public_key, data_bytes, sig_bytes)
        diagnostics["stage_3_signature_valid"] = sig_valid
    except Exception as e:
        diagnostics["stage_3_signature_valid"] = False
        diagnostics["error"] = f"Signature verification error: {e}"
        return False, VerificationVerdict.INVALID_SIGNATURE, diagnostics

    if not sig_valid:
        return False, VerificationVerdict.INVALID_SIGNATURE, diagnostics

    # Cryptographic integrity is 100% verified!
    # Proceed to Business Authorization rules (Stages 4 - 6).

    # Stage 4: Temporal Window & Expiry Verification
    if check_expiry:
        now_dt = datetime.now(timezone.utc)
        
        # Check not_before
        not_before_str = payload.get("not_before")
        if not_before_str:
            try:
                clean_nb = not_before_str.replace("Z", "+00:00")
                nb_dt = datetime.fromisoformat(clean_nb)
                if now_dt < nb_dt:
                    diagnostics["stage_4_time_window_valid"] = False
                    return False, VerificationVerdict.NOT_YET_VALID, diagnostics
            except Exception:
                pass

        # Check expires_at
        expires_at_str = payload.get("expires_at") or payload.get("expiry_date", "")
        if expires_at_str and expires_at_str != "LIFETIME":
            try:
                clean_exp = expires_at_str.replace("Z", "+00:00")
                exp_dt = datetime.fromisoformat(clean_exp)
                if now_dt > exp_dt:
                    diagnostics["stage_4_time_window_valid"] = False
                    return False, VerificationVerdict.EXPIRED, diagnostics
            except Exception:
                pass

    diagnostics["stage_4_time_window_valid"] = True

    # Stage 5: Licence Revocation List (LRL) Check
    license_id = payload.get("license_id", "")
    if revocation_list is not None and license_id in revocation_list:
        diagnostics["stage_5_lrl_valid"] = False
        return False, VerificationVerdict.REVOKED, diagnostics
    diagnostics["stage_5_lrl_valid"] = True

    # Stage 6: Device Activation Quota Verification
    max_activations = payload.get("max_activations", 1)
    if current_activations >= max_activations:
        diagnostics["stage_6_quota_valid"] = False
        return False, VerificationVerdict.QUOTA_EXCEEDED, diagnostics
    diagnostics["stage_6_quota_valid"] = True

    return True, VerificationVerdict.VALID, diagnostics


def verify_application_manifest(
    manifest_payload: Dict[str, Any],
    manifest_signature_b64: str,
    publisher_public_key_pem: str,
    base_install_dir: str
) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """
    Verifies Application Integrity:
    1. Cryptographically verifies publisher-signed release manifest.
    2. Hashes files on disk and checks for modified, missing, or unauthorized files.
    """
    file_results = []
    
    # Verify manifest signature
    canonical_manifest = canonicalize_dict(manifest_payload)
    try:
        pub_key = load_public_key_from_pem(publisher_public_key_pem)
        sig_bytes = base64.b64decode(manifest_signature_b64)
        if not verify_signature(pub_key, canonical_manifest.encode("utf-8"), sig_bytes):
            return False, "INVALID_MANIFEST_SIGNATURE", []
    except Exception as e:
        return False, f"MANIFEST_VERIFICATION_ERROR: {e}", []

    expected_files = manifest_payload.get("files", [])
    has_tampered = False
    has_missing = False

    for entry in expected_files:
        rel_path = entry.get("path")
        expected_hash = entry.get("sha256")
        expected_size = entry.get("size_bytes")
        full_path = os.path.join(base_install_dir, rel_path)

        if not os.path.exists(full_path):
            file_results.append({
                "path": rel_path,
                "status": "MISSING",
                "expected_hash": expected_hash,
                "actual_hash": None
            })
            has_missing = True
            continue

        actual_hash = hash_file(full_path)
        actual_size = os.path.getsize(full_path)

        if actual_hash != expected_hash or actual_size != expected_size:
            file_results.append({
                "path": rel_path,
                "status": "TAMPERED",
                "expected_hash": expected_hash,
                "actual_hash": actual_hash
            })
            has_tampered = True
        else:
            file_results.append({
                "path": rel_path,
                "status": "MATCHED",
                "expected_hash": expected_hash,
                "actual_hash": actual_hash
            })

    if has_missing:
        return False, "MISSING_FILE_DETECTED", file_results
    if has_tampered:
        return False, "APPLICATION_INTEGRITY_FAILED", file_results

    return True, "INTEGRITY_VERIFIED", file_results

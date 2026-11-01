"""
verify/verifier.py
LicenseGuard - Verification Engine separating Cryptographic Integrity from Business Rules
VTU BCS703 Cryptography and Network Security
"""

import base64
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from crypto.hash import canonicalize_dict, hash_string
from crypto.rsa_sign import verify_signature, load_public_key_from_pem


def verify_license_data(
    payload: Dict[str, Any],
    signature_b64: str,
    public_key_pem: str,
    check_expiry: bool = True
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Verify license payload integrity using RSA-PSS and validate business rules.
    Returns: (is_valid, verdict_string, diagnostics_dict)
    """
    diagnostics = {}
    
    # 1. Canonicalize & Hash
    canonical_str = canonicalize_dict(payload)
    computed_digest = hash_string(canonical_str)
    diagnostics["computed_digest"] = computed_digest
    
    # 2. Cryptographic Signature Verification
    try:
        public_key = load_public_key_from_pem(public_key_pem)
        sig_bytes = base64.b64decode(signature_b64)
        data_bytes = canonical_str.encode("utf-8")
        sig_valid = verify_signature(public_key, data_bytes, sig_bytes)
        diagnostics["signature_valid"] = sig_valid
    except Exception as e:
        diagnostics["signature_valid"] = False
        diagnostics["error"] = str(e)
        return False, "INVALID SIGNATURE", diagnostics

    if not sig_valid:
        return False, "INVALID SIGNATURE", diagnostics

    # 3. Business Rule: Expiry Date Validation
    if check_expiry:
        expiry_str = payload.get("expiry_date", "")
        if expiry_str != "LIFETIME" and expiry_str:
            try:
                # Handle ISO timestamps
                clean_exp = expiry_str.replace("Z", "+00:00")
                expiry_dt = datetime.fromisoformat(clean_exp)
                now_dt = datetime.now(timezone.utc)
                if now_dt > expiry_dt:
                    diagnostics["is_expired"] = True
                    return False, "LICENCE EXPIRED", diagnostics
            except Exception:
                pass

    diagnostics["is_expired"] = False
    return True, "VALID LICENCE", diagnostics

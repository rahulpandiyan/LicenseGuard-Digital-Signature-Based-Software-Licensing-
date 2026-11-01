"""
tests/test_license.py
Unit tests for LicenseGuard - VTU BCS703 Cryptography and Network Security
Tests: Signing, Verification, Tampering, Wrong Key, Expiry, Revocation, Quotas
"""

import unittest
import base64
from datetime import datetime, timezone, timedelta
from crypto.hash import canonicalize_dict, hash_string
from crypto.rsa_sign import (
    generate_key_pair,
    export_private_key_pem,
    export_public_key_pem,
    sign_payload_bytes,
    verify_signature,
    HAS_CRYPTOGRAPHY,
)
from verify.verifier import verify_license_data


@unittest.skipUnless(HAS_CRYPTOGRAPHY, "cryptography package required for full crypto tests")
class TestLicenseGuardCrypto(unittest.TestCase):

    def setUp(self):
        # Generate test keypairs
        self.priv_trusted, self.pub_trusted = generate_key_pair(2048)
        self.pub_trusted_pem = export_public_key_pem(self.pub_trusted)
        self.priv_trusted_pem = export_private_key_pem(self.priv_trusted)

        self.priv_rogue, self.pub_rogue = generate_key_pair(2048)
        self.pub_rogue_pem = export_public_key_pem(self.pub_rogue)

        # Baseline sample payload
        self.sample_payload = {
            "license_id": "LIC-2026-TEST01",
            "customer_name": "Alan Turing",
            "customer_email": "turing@cambridge.ac.uk",
            "product_id": "PRD-SENTINEL",
            "product_name": "Sentinel Enterprise",
            "license_type": "Yearly",
            "issue_date": "2026-01-01T00:00:00Z",
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "max_activations": 2,
            "publisher_id": "LicenseGuard CA",
            "license_status": "ACTIVE",
        }

    def test_canonical_hashing_consistency(self):
        """Test that canonical JSON ordering produces identical hashes regardless of dict insertion order"""
        dict_a = {"z_key": "123", "a_key": "abc", "m_key": True}
        dict_b = {"a_key": "abc", "m_key": True, "z_key": "123"}
        
        canon_a = canonicalize_dict(dict_a)
        canon_b = canonicalize_dict(dict_b)
        self.assertEqual(canon_a, canon_b)
        self.assertEqual(hash_string(canon_a), hash_string(canon_b))

    def test_genuine_signing_and_verification(self):
        """Test 1: Genuine license signing and verification succeeds"""
        canonical = canonicalize_dict(self.sample_payload)
        sig = sign_payload_bytes(self.priv_trusted, canonical.encode("utf-8"))
        sig_b64 = base64.b64encode(sig).decode("utf-8")

        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            sig_b64,
            self.pub_trusted_pem,
            check_expiry=True
        )
        self.assertTrue(valid)
        self.assertEqual(verdict, "VALID LICENCE")
        self.assertTrue(diag["signature_valid"])

    def test_tampering_detection(self):
        """Test 2: Modifying 1 field causes signature verification to fail immediately"""
        canonical = canonicalize_dict(self.sample_payload)
        sig = sign_payload_bytes(self.priv_trusted, canonical.encode("utf-8"))
        sig_b64 = base64.b64encode(sig).decode("utf-8")

        # Tamper customer name
        tampered_payload = dict(self.sample_payload)
        tampered_payload["customer_name"] = "Mallory (Attacker)"

        valid, verdict, diag = verify_license_data(
            tampered_payload,
            sig_b64,
            self.pub_trusted_pem,
            check_expiry=True
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, "INVALID SIGNATURE")
        self.assertFalse(diag["signature_valid"])

    def test_wrong_public_key_rejection(self):
        """Test 3: Attempting verification with Rogue Public Key fails mathematical check"""
        canonical = canonicalize_dict(self.sample_payload)
        sig = sign_payload_bytes(self.priv_trusted, canonical.encode("utf-8"))
        sig_b64 = base64.b64encode(sig).decode("utf-8")

        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            sig_b64,
            self.pub_rogue_pem, # Wrong public key!
            check_expiry=True
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, "INVALID SIGNATURE")

    def test_expired_license_handling(self):
        """Test 4: Expired license has valid signature but fails business authorization"""
        expired_payload = dict(self.sample_payload)
        expired_payload["expiry_date"] = "2024-01-01T00:00:00Z" # Past date

        canonical = canonicalize_dict(expired_payload)
        sig = sign_payload_bytes(self.priv_trusted, canonical.encode("utf-8"))
        sig_b64 = base64.b64encode(sig).decode("utf-8")

        valid, verdict, diag = verify_license_data(
            expired_payload,
            sig_b64,
            self.pub_trusted_pem,
            check_expiry=True
        )
        # Signature itself is valid!
        self.assertTrue(diag["signature_valid"])
        # But overall verdict must be EXPIRED
        self.assertFalse(valid)
        self.assertEqual(verdict, "LICENCE EXPIRED")

    def test_corrupted_signature_rejection(self):
        """Test 7: Direct signature byte flip is rejected by RSA-PSS verifier"""
        canonical = canonicalize_dict(self.sample_payload)
        sig = sign_payload_bytes(self.priv_trusted, canonical.encode("utf-8"))
        sig_b64 = base64.b64encode(sig).decode("utf-8")

        corrupted_b64 = "AAAA" + sig_b64[4:]

        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            corrupted_b64,
            self.pub_trusted_pem,
            check_expiry=True
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, "INVALID SIGNATURE")


if __name__ == "__main__":
    unittest.main()

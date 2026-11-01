"""
tests/test_license.py
Unit tests for LicenseGuard - VTU BCS703 Cryptography and Network Security
Tests:
  1. Deterministic JSON Canonicalization (RFC 8785)
  2. Genuine RSA-PSS Signature Verification
  3. Single-byte Tampering Detection
  4. Untrusted / Attacker Key Rejection
  5. Wrong Public Key Detection
  6. Temporal Window (Not Yet Valid & Expired)
  7. Licence Revocation List (LRL) Enforcement
  8. Device Activation Quota Enforcement
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
    HAS_CRYPTOGRAPHY,
)
from verify.verifier import verify_license_data, VerificationVerdict


@unittest.skipUnless(HAS_CRYPTOGRAPHY, "cryptography package required for full crypto tests")
class TestLicenseGuardCore(unittest.TestCase):

    def setUp(self):
        # 1. Trusted Publisher Key
        self.priv_trusted, self.pub_trusted = generate_key_pair(2048)
        self.pub_trusted_pem = export_public_key_pem(self.pub_trusted)
        self.priv_trusted_pem = export_private_key_pem(self.priv_trusted)

        # 2. Rogue Publisher Key
        self.priv_rogue, self.pub_rogue = generate_key_pair(2048)
        self.pub_rogue_pem = export_public_key_pem(self.pub_rogue)
        self.priv_rogue_pem = export_private_key_pem(self.priv_rogue)

        # 3. Trusted Publisher Registry
        self.trusted_registry = {
            "KEY-PUB01-2026": {
                "key_id": "KEY-PUB01-2026",
                "publisher_id": "PUB-001",
                "is_trusted": True,
                "public_key_pem": self.pub_trusted_pem
            },
            "KEY-ROGUE-001": {
                "key_id": "KEY-ROGUE-001",
                "publisher_id": "PUB-ROGUE",
                "is_trusted": False,  # Flagged untrusted
                "public_key_pem": self.pub_rogue_pem
            }
        }

        # 4. Standardized Version 1 Deterministic Payload
        now = datetime.now(timezone.utc)
        self.sample_payload = {
            "schema_version": 1,
            "license_id": "LG-2026-TEST01",
            "publisher_id": "PUB-001",
            "key_id": "KEY-PUB01-2026",
            "product_id": "PROD-SENTINEL",
            "customer_id": "CUST-001",
            "customer_name": "Dr. Alan Turing",
            "license_type": "professional",
            "issued_at": (now - timedelta(days=1)).isoformat(),
            "not_before": (now - timedelta(days=1)).isoformat(),
            "expires_at": (now + timedelta(days=365)).isoformat(),
            "max_activations": 3,
            "features": ["threat_intel", "deep_packet_inspection", "real_time_shield"]
        }

    def _sign_payload(self, payload: dict, private_key) -> str:
        canonical_str = canonicalize_dict(payload)
        sig = sign_payload_bytes(private_key, canonical_str.encode("utf-8"))
        return base64.b64encode(sig).decode("utf-8")

    def test_canonical_json_determinism(self):
        """Test: Deterministic sorting ensures identical SHA-256 digests across unordered maps"""
        dict_a = {"schema_version": 1, "z_param": "data", "a_param": "first", "features": ["a", "b"]}
        dict_b = {"a_param": "first", "features": ["a", "b"], "z_param": "data", "schema_version": 1}
        
        canon_a = canonicalize_dict(dict_a)
        canon_b = canonicalize_dict(dict_b)
        self.assertEqual(canon_a, canon_b)
        self.assertEqual(hash_string(canon_a), hash_string(canon_b))

    def test_01_genuine_license_verification(self):
        """Test 1: Genuine signed licence passes all 6 verification stages"""
        sig_b64 = self._sign_payload(self.sample_payload, self.priv_trusted)

        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            sig_b64,
            self.pub_trusted_pem,
            key_id="KEY-PUB01-2026",
            trusted_keys_registry=self.trusted_registry,
            revocation_list=[],
            current_activations=1
        )
        self.assertTrue(valid)
        self.assertEqual(verdict, VerificationVerdict.VALID)
        self.assertTrue(diag["stage_1_canonicalization"])
        self.assertTrue(diag["stage_2_hash_computed"])
        self.assertTrue(diag["stage_3_signature_valid"])
        self.assertTrue(diag["stage_4_time_window_valid"])
        self.assertTrue(diag["stage_5_lrl_valid"])
        self.assertTrue(diag["stage_6_quota_valid"])

    def test_02_single_field_tampering_detection(self):
        """Test 2: Modifying customer_name breaks RSA-PSS signature verification immediately"""
        sig_b64 = self._sign_payload(self.sample_payload, self.priv_trusted)

        tampered_payload = dict(self.sample_payload)
        tampered_payload["customer_name"] = "Mallory (Attacker)"

        valid, verdict, diag = verify_license_data(
            tampered_payload,
            sig_b64,
            self.pub_trusted_pem,
            key_id="KEY-PUB01-2026",
            trusted_keys_registry=self.trusted_registry
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.INVALID_SIGNATURE)
        self.assertFalse(diag["stage_3_signature_valid"])

    def test_03_wrong_public_key_rejection(self):
        """Test 3: Valid signature verified against non-matching public key fails verification"""
        sig_b64 = self._sign_payload(self.sample_payload, self.priv_trusted)

        # Verify using rogue public key directly
        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            sig_b64,
            self.pub_rogue_pem,
            key_id=None
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.INVALID_SIGNATURE)

    def test_04_untrusted_publisher_key_rejection(self):
        """Test 4: Attacker-signed licence rejected because key_id is untrusted in registry"""
        # Attacker signs payload with rogue key
        rogue_payload = dict(self.sample_payload)
        rogue_payload["key_id"] = "KEY-ROGUE-001"
        rogue_payload["publisher_id"] = "PUB-ROGUE"

        sig_b64 = self._sign_payload(rogue_payload, self.priv_rogue)

        valid, verdict, diag = verify_license_data(
            rogue_payload,
            sig_b64,
            self.pub_rogue_pem,
            key_id="KEY-ROGUE-001",
            trusted_keys_registry=self.trusted_registry
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.UNTRUSTED_KEY)

    def test_05_expired_license_rejection(self):
        """Test 5: Signature is valid, but expired date triggers Stage 4 rejection"""
        expired_payload = dict(self.sample_payload)
        expired_payload["expires_at"] = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()

        sig_b64 = self._sign_payload(expired_payload, self.priv_trusted)

        valid, verdict, diag = verify_license_data(
            expired_payload,
            sig_b64,
            self.pub_trusted_pem,
            key_id="KEY-PUB01-2026",
            trusted_keys_registry=self.trusted_registry
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.EXPIRED)
        self.assertTrue(diag["stage_3_signature_valid"])  # Crypto passed!
        self.assertFalse(diag["stage_4_time_window_valid"])  # Policy failed!

    def test_06_not_yet_valid_license(self):
        """Test 6: Future not_before date triggers Stage 4 rejection"""
        future_payload = dict(self.sample_payload)
        future_payload["not_before"] = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()

        sig_b64 = self._sign_payload(future_payload, self.priv_trusted)

        valid, verdict, diag = verify_license_data(
            future_payload,
            sig_b64,
            self.pub_trusted_pem,
            key_id="KEY-PUB01-2026",
            trusted_keys_registry=self.trusted_registry
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.NOT_YET_VALID)
        self.assertTrue(diag["stage_3_signature_valid"])

    def test_07_licence_revocation_list_rejection(self):
        """Test 7: Signature is mathematically valid, but license_id appears on LRL"""
        sig_b64 = self._sign_payload(self.sample_payload, self.priv_trusted)

        revocation_list = ["LG-2026-TEST01", "LG-2026-OTHER"]

        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            sig_b64,
            self.pub_trusted_pem,
            key_id="KEY-PUB01-2026",
            trusted_keys_registry=self.trusted_registry,
            revocation_list=revocation_list
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.REVOKED)
        self.assertTrue(diag["stage_3_signature_valid"])  # Crypto valid
        self.assertFalse(diag["stage_5_lrl_valid"])       # Revoked on LRL

    def test_08_activation_quota_enforcement(self):
        """Test 8: Current activations equal or exceed max_activations"""
        sig_b64 = self._sign_payload(self.sample_payload, self.priv_trusted)

        # max_activations is 3, test with 3 already active devices
        valid, verdict, diag = verify_license_data(
            self.sample_payload,
            sig_b64,
            self.pub_trusted_pem,
            key_id="KEY-PUB01-2026",
            trusted_keys_registry=self.trusted_registry,
            current_activations=3
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, VerificationVerdict.QUOTA_EXCEEDED)
        self.assertTrue(diag["stage_3_signature_valid"])
        self.assertFalse(diag["stage_6_quota_valid"])


if __name__ == "__main__":
    unittest.main()

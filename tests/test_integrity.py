"""
tests/test_integrity.py
Unit tests for LicenseGuard Application Integrity Scanner
VTU BCS703 Cryptography and Network Security
Tests:
  1. Publisher release manifest RSA-PSS signature verification
  2. Detection of modified/tampered application binary
  3. Detection of missing required application file/library
  4. Detection of invalid manifest digital signature
"""

import unittest
import base64
import os
import shutil
import tempfile
from crypto.hash import canonicalize_dict, hash_file
from crypto.rsa_sign import (
    generate_key_pair,
    export_private_key_pem,
    export_public_key_pem,
    sign_payload_bytes,
    HAS_CRYPTOGRAPHY,
)
from verify.verifier import verify_application_manifest


@unittest.skipUnless(HAS_CRYPTOGRAPHY, "cryptography package required for full crypto tests")
class TestApplicationIntegrityScanner(unittest.TestCase):

    def setUp(self):
        # Create temporary mock installation directory
        self.test_dir = tempfile.mkdtemp(prefix="licenseguard_app_")

        # Create mock application files
        self.bin_path = os.path.join(self.test_dir, "sentinel.exe")
        self.lib_path = os.path.join(self.test_dir, "crypto_engine.dll")

        with open(self.bin_path, "wb") as f:
            f.write(b"ORIGINAL_SENTINEL_EXECUTABLE_BINARY_DATA_V10")
        with open(self.lib_path, "wb") as f:
            f.write(b"ORIGINAL_CRYPTO_ENGINE_SHARED_LIBRARY_DATA")

        # Generate Publisher Keys
        self.priv_pub, self.pub_pub = generate_key_pair(2048)
        self.pub_pem = export_public_key_pem(self.pub_pub)

        # Generate Signed Release Manifest
        self.manifest_payload = {
            "schema_version": 1,
            "product_id": "PROD-SENTINEL",
            "version": "1.0.0",
            "files": [
                {
                    "path": "sentinel.exe",
                    "sha256": hash_file(self.bin_path),
                    "size_bytes": os.path.getsize(self.bin_path)
                },
                {
                    "path": "crypto_engine.dll",
                    "sha256": hash_file(self.lib_path),
                    "size_bytes": os.path.getsize(self.lib_path)
                }
            ]
        }

        canonical_str = canonicalize_dict(self.manifest_payload)
        sig = sign_payload_bytes(self.priv_pub, canonical_str.encode("utf-8"))
        self.manifest_sig_b64 = base64.b64encode(sig).decode("utf-8")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_intact_application_verification(self):
        """Test: Intact files matching genuine signed manifest succeed with INTEGRITY_VERIFIED"""
        valid, verdict, results = verify_application_manifest(
            self.manifest_payload,
            self.manifest_sig_b64,
            self.pub_pem,
            self.test_dir
        )
        self.assertTrue(valid)
        self.assertEqual(verdict, "INTEGRITY_VERIFIED")
        self.assertEqual(len(results), 2)
        self.assertTrue(all(r["status"] == "MATCHED" for r in results))

    def test_02_tampered_binary_detection(self):
        """Test: Modifying 1 byte in executable binary triggers APPLICATION_INTEGRITY_FAILED"""
        # Patch the binary
        with open(self.bin_path, "wb") as f:
            f.write(b"TAMPERED_CRACKED_BINARY_DATA_MALICIOUS_PATCH")

        valid, verdict, results = verify_application_manifest(
            self.manifest_payload,
            self.manifest_sig_b64,
            self.pub_pem,
            self.test_dir
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, "APPLICATION_INTEGRITY_FAILED")

        tampered_entries = [r for r in results if r["status"] == "TAMPERED"]
        self.assertEqual(len(tampered_entries), 1)
        self.assertEqual(tampered_entries[0]["path"], "sentinel.exe")

    def test_03_missing_file_detection(self):
        """Test: Deleting required shared library triggers MISSING_FILE_DETECTED"""
        os.remove(self.lib_path)

        valid, verdict, results = verify_application_manifest(
            self.manifest_payload,
            self.manifest_sig_b64,
            self.pub_pem,
            self.test_dir
        )
        self.assertFalse(valid)
        self.assertEqual(verdict, "MISSING_FILE_DETECTED")

        missing_entries = [r for r in results if r["status"] == "MISSING"]
        self.assertEqual(len(missing_entries), 1)
        self.assertEqual(missing_entries[0]["path"], "crypto_engine.dll")


if __name__ == "__main__":
    unittest.main()

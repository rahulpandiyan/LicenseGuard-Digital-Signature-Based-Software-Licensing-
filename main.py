"""
main.py
LicenseGuard - Digital Signature-Based Software Licensing and Activation System
VTU BCS703 Cryptography and Network Security Assignment
"""

import sys
import os
from crypto.hash import canonicalize_dict, hash_string
from crypto.rsa_sign import (
    generate_key_pair,
    export_private_key_pem,
    export_public_key_pem,
    sign_payload_bytes,
    HAS_CRYPTOGRAPHY,
)
from verify.verifier import verify_license_data
from database import init_db


def print_banner():
    print("=" * 70)
    print("  LicenseGuard – Digital Signature Software Licensing & Activation")
    print("  VTU BCS703 Cryptography & Network Security Coursework")
    print("  Primary Academic Concept: DIGITAL SIGNATURE (RSA-PSS & SHA-256)")
    print("=" * 70)


def main():
    print_banner()
    init_db()

    print("\n[1] Checking Cryptographic Subsystems:")
    if HAS_CRYPTOGRAPHY:
        print("  ✅ Python 'cryptography' library is available.")
    else:
        print("  ⚠️  Python 'cryptography' library not detected in local environment.")
        print("      To run Python standalone scripts: pip install cryptography flask")
        print("      Note: The web platform runs on Node.js/OpenSSL 3 on port 3000.")

    print("\n[2] Academic Architecture:")
    print("  - Digital Signature Algorithm: RSA-2048 with RSA-PSS (MGF1, salt=MAX)")
    print("  - Hash Digest Function: SHA-256 with deterministic JSON canonicalization")
    print("  - Business Rules Engine: Expiry timeline, CRL revocation, Hardware seats")

    print("\n[3] Launching Full-Stack Application:")
    print("  - The interactive web application runs at: http://localhost:3000")
    print("  - To run unit tests: python3 -m unittest discover tests")
    print("=" * 70)


if __name__ == "__main__":
    main()

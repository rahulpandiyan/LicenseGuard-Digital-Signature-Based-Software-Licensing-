"""
crypto/rsa_sign.py
LicenseGuard - RSA Key Generation, Signing, and Verification using RSA-PSS
VTU BCS703 Cryptography and Network Security
"""

import base64
from typing import Tuple, Optional

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa, padding
    from cryptography.hazmat.backends import default_backend
    from cryptography.exceptions import InvalidSignature
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False


def generate_key_pair(key_size: int = 2048) -> Tuple[object, object]:
    """
    Generate an authentic RSA public/private key pair (2048 or 4096 bits)
    Returns: (private_key, public_key)
    """
    if not HAS_CRYPTOGRAPHY:
        raise RuntimeError("Python 'cryptography' library is required. Run 'pip install cryptography'.")

    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return private_key, public_key


def export_private_key_pem(private_key) -> str:
    """Export private key to PKCS#8 PEM string"""
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return pem.decode("utf-8")


def export_public_key_pem(public_key) -> str:
    """Export public key to SubjectPublicKeyInfo (SPKI) PEM string"""
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem.decode("utf-8")


def load_private_key_from_pem(pem_str: str):
    """Load RSA private key from PEM string"""
    if not HAS_CRYPTOGRAPHY:
        raise RuntimeError("cryptography library required")
    return serialization.load_pem_private_key(
        pem_str.encode("utf-8"),
        password=None,
        backend=default_backend()
    )


def load_public_key_from_pem(pem_str: str):
    """Load RSA public key from PEM string"""
    if not HAS_CRYPTOGRAPHY:
        raise RuntimeError("cryptography library required")
    return serialization.load_pem_public_key(
        pem_str.encode("utf-8"),
        backend=default_backend()
    )


def sign_payload_bytes(private_key, data_bytes: bytes) -> bytes:
    """
    Sign raw payload bytes using RSA-PSS padding with SHA-256 and MGF1.
    Matches OpenSSL / RFC 8017 standard PSS specification.
    """
    if not HAS_CRYPTOGRAPHY:
        raise RuntimeError("cryptography library required")

    signature = private_key.sign(
        data_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    return signature


def verify_signature(public_key, data_bytes: bytes, signature_bytes: bytes) -> bool:
    """
    Verify RSA-PSS signature against data bytes using the public key.
    Returns: True if authentic and unaltered, False if tampered or invalid key.
    """
    if not HAS_CRYPTOGRAPHY:
        raise RuntimeError("cryptography library required")

    try:
        public_key.verify(
            signature_bytes,
            data_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except InvalidSignature:
        return False
    except Exception:
        return False

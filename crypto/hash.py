"""
crypto/hash.py
LicenseGuard - SHA-256 Hashing and Deterministic Canonical Serialization
VTU BCS703 Cryptography and Network Security
"""

import hashlib
import json
from typing import Dict, Any


def canonicalize_dict(data: Dict[str, Any]) -> str:
    """
    Sort dictionary keys recursively and serialize to canonical JSON string
    without extra whitespace. Ensures byte-for-byte deterministic hashing.
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'))


def hash_string(text: str) -> str:
    """Calculate SHA-256 hex digest of string"""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def hash_bytes(data: bytes) -> str:
    """Calculate SHA-256 hex digest of bytes"""
    return hashlib.sha256(data).hexdigest()


def hash_file(filepath: str) -> str:
    """Read file in chunks and compute SHA-256 hex digest"""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

"""
database.py
LicenseGuard - SQLite Relational Database Management
VTU BCS703 Cryptography and Network Security
"""

import sqlite3
import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DB_FILE = "licenseguard.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        version TEXT NOT NULL,
        category TEXT,
        description TEXT,
        default_max_activations INTEGER DEFAULT 1,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS publisher_keys (
        key_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key_size INTEGER NOT NULL,
        fingerprint TEXT NOT NULL,
        public_key_pem TEXT NOT NULL,
        private_key_pem TEXT,
        is_trusted INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS licenses (
        license_id TEXT PRIMARY KEY,
        formatted_key TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        license_type TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        max_activations INTEGER NOT NULL,
        key_id TEXT NOT NULL,
        sha256_digest TEXT NOT NULL,
        signature_b64 TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS activations (
        id TEXT PRIMARY KEY,
        license_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        os TEXT,
        hardware_hash TEXT,
        ip_address TEXT,
        activated_at TEXT,
        status TEXT DEFAULT 'ACTIVE'
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS revocations (
        license_id TEXT PRIMARY KEY,
        revoked_at TEXT NOT NULL,
        reason TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS verification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        license_id TEXT NOT NULL,
        product_name TEXT,
        customer_name TEXT,
        device_id TEXT,
        signature_valid INTEGER,
        verdict TEXT,
        details TEXT
    );
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_FILE)

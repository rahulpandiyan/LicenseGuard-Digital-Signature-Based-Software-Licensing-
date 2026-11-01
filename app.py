"""
app.py
LicenseGuard - Python Flask Full-Stack Server
VTU BCS703 Cryptography and Network Security Assignment
Default startup: python3 app.py (runs at http://localhost:5000)
"""

import os
import json
import sqlite3
from datetime import datetime, timezone
from flask import Flask, jsonify, request, render_template_string
from crypto.hash import canonicalize_dict, hash_string
from crypto.rsa_sign import (
    generate_key_pair,
    export_public_key_pem,
    export_private_key_pem,
    sign_payload_bytes,
    verify_signature,
    HAS_CRYPTOGRAPHY,
)
from verify.verifier import verify_license_data
from database import init_db, get_connection

app = Flask(__name__)
init_db()

# Simple elegant HTML Dashboard Template served by Flask at http://localhost:5000
INDEX_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LicenseGuard - Python Flask Server</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0b0f17; color: #f1f5f9; margin: 0; padding: 2rem; }
    .container { max-width: 900px; margin: 0 auto; }
    .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; color: #ffffff; margin-top: 0; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    .badge-success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-info { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
    pre { background: #070a10; padding: 1rem; border-radius: 8px; border: 1px solid #1e293b; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; overflow-x: auto; color: #cbd5e1; }
    .btn { background: #4f46e5; color: #fff; padding: 0.5rem 1rem; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span class="badge badge-info">VTU BCS703 Cryptography Lab</span>
          <h1>LicenseGuard – Python Flask Service</h1>
        </div>
        <span class="badge badge-success">Port 5000 Active</span>
      </div>
      <p style="color: #94a3b8; font-size: 0.875rem;">
        Python backend service implementing RSA-PSS with SHA-256 digital signatures, SQLite database persistence, and Six-Stage Verification.
      </p>
      <div style="margin-top: 1rem;">
        <a href="/api/stats" class="btn" style="font-size: 0.8rem; margin-right: 0.5rem;">View JSON Stats</a>
        <a href="/api/lab/tests" class="btn" style="font-size: 0.8rem; background: #0f172a; border: 1px solid #334155;">View Lab Test Vectors</a>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0; font-size: 1rem; color:#fff;">Six-Stage Verification Engine Summary</h3>
      <ol style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #cbd5e1; line-height: 1.8;">
        <li>Deterministic Canonical JSON Serialization (sorted keys, UTF-8)</li>
        <li>SHA-256 Message Digest Computation</li>
        <li>RSA-PSS Digital Signature Verification against Trusted Key Registry</li>
        <li>Licence Validity & Temporal Window Verification (not_before, expires_at)</li>
        <li>Licence Revocation List (LRL) Verification</li>
        <li>Device Activation Quota Verification</li>
      </ol>
    </div>
  </div>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(INDEX_HTML)

@app.route("/api/stats")
def api_stats():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM products")
    products = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM licenses")
    licenses = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM activations WHERE status='ACTIVE'")
    activations = cur.fetchone()[0]
    conn.close()

    return jsonify({
        "products": products,
        "licenses": licenses,
        "active_activations": activations,
        "crypto_library_available": HAS_CRYPTOGRAPHY,
        "signature_scheme": "RSA-PSS with SHA-256 (MGF1 Salt: MAX)",
    })

@app.route("/api/lab/tests")
def api_lab_tests():
    return jsonify({
        "total_test_scenarios": 10,
        "scenarios": [
            "Test 1: Genuine Licence (VALID LICENCE)",
            "Test 2: Licence Tampering (INVALID SIGNATURE)",
            "Test 3: Wrong Publisher Public Key (INVALID SIGNATURE)",
            "Test 4: Untrusted Publisher Key (UNKNOWN OR UNTRUSTED PUBLISHER)",
            "Test 5: Expired Licence (SIGNATURE VALID, ACTIVATION DENIED - LICENCE EXPIRED)",
            "Test 6: Revoked Licence (SIGNATURE VALID, ACTIVATION DENIED - LICENCE REVOKED)",
            "Test 7: Activation Limit (ACTIVATION LIMIT EXCEEDED)",
            "Test 8: Signature Corruption (INVALID SIGNATURE)",
            "Test 9: Modified Application Executable (APPLICATION INTEGRITY FAILED)",
            "Test 10: Missing Application File (MISSING FILE DETECTED)"
        ]
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting LicenseGuard Python Flask Application on http://0.0.0.0:{port}...")
    app.run(host="0.0.0.0", port=port, debug=False)

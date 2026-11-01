# LicenseGuard – Digital Signature-Based Software Licensing & Activation System

A comprehensive, production-grade cybersecurity software licensing platform and educational simulation built for the **VTU BCS703 Cryptography and Network Security** curriculum. The system demonstrates asymmetric public-key cryptography (RSA-PSS with SHA-256) for issuing, verifying, tampering-testing, and managing digitally signed software licenses.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during Phase 1 clarification:

- **Confirmed Decision 1 (Licensing Architecture)**: Dual-mode architecture supporting both **offline cryptographic signature & file verification** (standalone verification using only the publisher public key) and **online activation checks** (contacting server-side registry to validate expiry, revocation CRL, and per-device activation limits).
- **Confirmed Decision 2 (Hardware Device Simulation)**: Multi-profile device simulator with instant hardware switching (e.g., *Dev-Workstation-Win11*, *MacBook-Pro-M3*, *Ubuntu-Server-Prod*, *Docker-Container-Node*) allowing instant demonstration of activation limits and deactivations during college evaluation viva.
- **Confirmed Decision 3 (Publisher Key Infrastructure)**: Pre-configured Trusted Publisher keypair (`LicenseGuard Official CA v1.0`), an active Rogue/Untrusted keypair (`Rogue Software Co.`), and a live RSA key generator/rotator. This enables 1-click demonstration of the "Wrong Public Key" attack test without manual key pasting.

---

## 1. Overview & Core Concept

- **What It Does**: LicenseGuard transforms the legacy file verification concept into an enterprise-grade software publisher and customer activation platform. Software publishers define products, generate cryptographic RSA-2048/4096 key pairs, issue structured customer licenses, and compute SHA-256 digests signed with RSA-PSS. Customers and software clients load the publisher's public key to cryptographically verify payload integrity and authenticity, perform revocation & expiry checks, and activate software across simulated hardware nodes.
- **Target Audience / Academic Persona**: VTU BCS703 students, evaluators, and software engineers studying digital signatures, non-repudiation, one-way trapdoor functions, PKI, and software licensing security models.
- **Key Value**: Provides a visually rigorous, mathematically authentic demonstration proving that digital signatures guarantee *authenticity* and *integrity*, while highlighting that *business rules* (expiry, revocation, device limits) must be validated in conjunction with cryptographic checks.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Publisher Operations**:
   - **Product Catalog**: Create and configure products (`Sentinel Antivirus Enterprise`, `DevStudio IDE Pro`, `CloudShield Gateway`), versioning, and default activation policies.
   - **Key Management**: Generate RSA-2048 / RSA-4096 keypairs, view cryptographic fingerprints (SHA-256 of SPKI), download public keys (`publisher_public.pem`), and rotate keys seamlessly.
   - **Issue License**: Fill customer details, select product and license type (`Free Trial 14d`, `Monthly`, `Yearly`, `Lifetime`), set maximum allowed devices (1–5), canonicalize JSON payload, compute SHA-256 digest, sign via RSA-PSS, and export `.lic` files or formatted license keys (`LG-XXXX-XXXX-XXXX-XXXX`).
   - **Revocation & Device Audit**: Admin revocation of licenses with audit reasons; inspect activated hardware IDs and deactivate rogue instances.

2. **Customer Activation Portal**:
   - **Input Method**: Upload `.lic` file, drag-and-drop, or paste license text/keys.
   - **Key Selection**: Select from trusted publisher catalog or upload an external PEM public key.
   - **Evaluation Pipeline**: Sequential visual breakdown showing:
     1. SHA-256 Digest Recomputation.
     2. RSA-PSS Cryptographic Signature Verification.
     3. Temporal Expiry Validation.
     4. Certificate Revocation List (CRL) Check.
     5. Device Activation Quota & Hardware Profile Check.
   - **Result States**: High-contrast, unambiguous verdicts: `VALID LICENCE`, `INVALID SIGNATURE (Tampered)`, `LICENCE EXPIRED`, `LICENCE REVOKED`, `ACTIVATION LIMIT EXCEEDED`, `UNKNOWN PUBLISHER KEY`, or `INVALID LICENCE FORMAT`.

3. **Security Testing Lab (Interactive 7-Test Suite)**:
   - **Test 1: Genuine License** $\rightarrow$ Signature Valid & Activation Granted.
   - **Test 2: License Tampering** $\rightarrow$ Modifying 1 byte in customer name or expiry date causes SHA-256 mismatch, failing RSA-PSS verification.
   - **Test 3: Wrong Public Key** $\rightarrow$ Verifying with Rogue Publisher public key fails mathematical signature verification.
   - **Test 4: Expired License** $\rightarrow$ Signature is cryptographically VALID, but activation is DENIED due to business rules (highlights the core academic distinction).
   - **Test 5: Revoked License** $\rightarrow$ Signature is cryptographically VALID, but revoked on server CRL.
   - **Test 6: Activation Limit** $\rightarrow$ Successfully activate across Device 1 and 2, but 3rd simulated device gets rejected (`LIMIT EXCEEDED`).
   - **Test 7: Signature Corruption** $\rightarrow$ Base64 bit flip in signature string triggers immediate RSA-PSS rejection.

4. **Digital Signature Visualizer**:
   - Interactive, step-by-step schematic showing the asymmetry between Publisher Signing (using Private Key $d$) and Customer Verification (using Public Key $(e, n)$), with animated data digests, salt padding, and hash comparisons.

5. **VTU BCS703 Academic Learning & Assignment Report Generator**:
   - Complete academic guide formatted for VTU syllabus: SHA-256 avalanche effect, RSA trapdoor permutation, RSA-PSS vs PKCS#1 v1.5 padding security, Non-Repudiation limitations, and printable assignment documentation.

### Visual Identity & Theme

- **Aesthetic Direction**: High-trust, utilitarian cybersecurity console. Minimal, structured, crisp typography, devoid of AI clichés (no purple neon, no floating bubbles, no decorative pulse dots).
- **Color Palette & Discipline (60-30-10)**:
  - `60% Neutral Canvas`: Crisp dark slate (`#0B0F17` / `#0F172A`) with subtle hairline dividers (`#1E293B`).
  - `30% Structural Surfaces`: Deep charcoal cards (`#131B2E` / `#1E293B`), clean tabular grids, structured inputs.
  - `10% Purposeful Accents`: Emerald (`#10B981`) for verified cryptographic integrity, Amber (`#F59E0B`) for warnings/expiry, Crimson (`#EF4444`) for tampered signatures/revocations, and Indigo/Cobalt (`#3B82F6`) for primary interactive controls.
- **Typography**:
  - Display / Headings: `Plus Jakarta Sans` (crisp, confident weights).
  - Body: `Public Sans` / `Plus Jakarta Sans` for dense readability.
  - Cryptography & Data: `JetBrains Mono` with `tabular-nums` for hashes, keys, base64 signatures, and timestamps.
- **Top Bar Contract**:
  - Zone 1: Single brand wordmark `LicenseGuard` (VTU BCS703 Security Lab).
  - Zone 2: Single-line navigation links (`Overview`, `Products`, `Licenses`, `Activate`, `Testing Lab`, `Learn`).
  - Zone 3: Quick Device Selector & Action button (`Quick Activate`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cryptographic Engine Implementation**:
  - *Chosen Approach*: Full RSA-PSS with SHA-256 implemented in standard cryptographic libraries (Node.js native `crypto` backed by OpenSSL 3.0 on the backend, alongside complete modular Python scripts in `crypto/` and `verify/` for standalone Python assignment grading).
  - *Why*: Guarantees zero hardcoded verification, mathematically authentic signature generation and verification, bit-for-bit compatibility between Python scripts and the web applet, and instant execution without external network latency.
  - *Alternatives Considered*: Pure WebCrypto in the browser only (would make headless Python grading and local terminal execution impossible).
- **Decision 2: Canonical Payload Serialization**:
  - *Chosen Approach*: Deterministic JSON serialization with alphabetically sorted keys and uniform spacing prior to hashing.
  - *Why*: Digital signatures verify exact byte streams; non-deterministic key ordering would cause spurious verification failures across different environments.
- **Decision 3: Device Fingerprinting Architecture**:
  - *Chosen Approach*: Multi-attribute device simulation profile consisting of OS signature, virtual Machine GUID, Hostname, and hashed network identifier with an interactive device switcher bar.
  - *Why*: Academic integrity. The UI explicitly states that hardware IDs in software can be spoofed in user-space, explaining why modern licensing combines digital signatures with server-side lease tokens and TPM/hardware security modules.

---

## 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                       LicenseGuard Full-Stack Platform                        │
└───────┬───────────────────────────────────────────────────────────────┬───────┘
        │                                                               │
        ▼                                                               ▼
┌─────────────────────────────────────────┐   ┌─────────────────────────────────┐
│       Publisher / Admin Workspace       │   │   Customer Activation Portal    │
│  - Product Manager                      │   │  - .lic File / Key Input        │
│  - RSA Keypair Generator (PSS/2048)     │   │  - Trusted Public Key Selector  │
│  - License Issuer (Canonical JSON)      │   │  - Cryptographic Verification   │
│  - Revocation & Device Deactivator      │   │  - Business Rules Engine        │
└────────────────────┬────────────────────┘   └────────────────┬────────────────┘
                     │                                         │
                     ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    Cryptographic Core (RSA-PSS + SHA-256)                     │
│  - Canonical Payload Hasher: SHA-256(canonical_json(data))                    │
│  - Signer: RSA-PSS(Digest, Publisher_Private_Key, salt_len=MAX, MGF1)        │
│  - Verifier: Verify_PSS(Digest, Signature, Publisher_Public_Key)             │
│  - Export Formats: .lic (Base64 signature + Metadata), PEM Public Keys       │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    SQLite / Persistent Relational Storage                     │
│  - Products (id, name, version, code, max_devices, description)               │
│  - PublisherKeys (key_id, name, pub_pem, priv_pem, is_active, created_at)    │
│  - Licenses (license_id, key, customer, email, prod_id, type, issue, expiry) │
│  - Activations (id, license_id, device_id, device_name, ip, activated_at)     │
│  - Revocations (license_id, revoked_at, reason)                               │
│  - VerificationLogs (id, timestamp, license_id, test_case, result, details)   │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Core Cryptographic Specification

1. **Payload Structure**:
   ```json
   {
     "license_id": "LIC-2026-8849A",
     "customer_name": "Dr. Sarah Jenkins",
     "customer_email": "s.jenkins@vtu.edu",
     "product_id": "PRD-SENTINEL-PRO",
     "product_name": "Sentinel Antivirus Enterprise",
     "license_type": "Yearly",
     "issue_date": "2026-03-01T00:00:00Z",
     "expiry_date": "2027-03-01T00:00:00Z",
     "max_activations": 3,
     "publisher_id": "PUB-OFFICIAL-CA",
     "key_id": "KEY-RSA2048-V1"
   }
   ```
2. **Canonical Hashing**:
   $H = \text{SHA-256}(\text{Canonicalize}(\text{Payload}))$
3. **Digital Signature**:
   $S = \text{Sign}_{\text{RSA-PSS}}(H, K_{\text{private}}, \text{salt}=\text{MAX})$
4. **Standalone Verification Formula**:
   $\text{Valid} = \text{Verify}_{\text{RSA-PSS}}(H, S, K_{\text{public}})$

---

## 5. Implementation Stages

1. **Stage 1: Core Engine & Data Models**:
   - Implement persistent database store (`src/services/db.ts` and `backend/database.py`) with pre-seeded products, trusted publisher keys, and rogue attacker keys.
   - Implement exact RSA-PSS SHA-256 cryptographic module (`src/services/crypto.ts` and `crypto/rsa_sign.py`).
2. **Stage 2: Full-Stack Express Server (`server.ts`)**:
   - Provide REST API endpoints for product CRUD, key generation, license signing, verification, activation checks, and security lab tests.
   - Enable both automated testing and web UI integration on Port 3000.
3. **Stage 3: Dashboard & Interactive Portals**:
   - Build 11 views: Overview, Products, Licenses, Issue License, Activate Portal, Key Management, Device Activations, Security Testing Lab, Verification History, Digital Signature Visualizer, and Learn Section.
   - Include Device Simulator switcher at the top of the app.
4. **Stage 4: Python CLI & Standalone Test Suite**:
   - Update `crypto/`, `verify/`, `tests/` and `main.py` so the Python assignment scripts can be tested directly with `python3` or `pytest`.
5. **Stage 5: Documentation & Assignment Report**:
   - Produce complete `README.md` and `VTU_BCS703_ASSIGNMENT_REPORT.md` including Abstract, Cryptographic Algorithms, Test Cases, and Security Analysis.

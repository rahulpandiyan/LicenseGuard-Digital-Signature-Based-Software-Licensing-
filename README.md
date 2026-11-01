# LicenseGuard – Digital Signature-Based Software Licensing and Activation System

**VTU BCS703 Cryptography and Network Security Assignment**  
**Primary Academic Concept:** DIGITAL SIGNATURE (RSA-PSS with SHA-256)

---

## 1. Abstract
LicenseGuard is an enterprise-grade digital signature-based software licensing, tamper detection, and multi-device activation platform. Inspired by the licensing architectures used by Microsoft Windows, Adobe, and JetBrains, LicenseGuard demonstrates the fundamental security properties of asymmetric public-key cryptography—namely **authenticity**, **integrity**, and **non-repudiation**—while rigorously highlighting the distinction between cryptographic validity and operational business authorization rules.

---

## 2. Introduction
In standard software distribution, publishers must ensure that customer licenses cannot be forged, transferred to unauthorized entities, or modified (such as extending an expiration date or altering licensed feature flags). Symmetric cryptography cannot solve this problem because distributing the secret key to client software allows malicious users to reverse-engineer the key and generate counterfeit licenses. Asymmetric cryptography (RSA public/private key pairs) solves this by keeping the private key confidential on publisher servers while distributing the public key to software clients.

---

## 3. Problem Statement
Commercial software protection faces three primary threat vectors:
1. **License Data Tampering**: An adversary alters a genuine license file (e.g. extending expiry from 2026 to 2099 or changing the licensee name).
2. **Key Counterfeiting**: An attacker generates their own keypair and signs a license, attempting to deceive the verifier.
3. **Replay & Uncontrolled Duplication**: A legitimate license is copied onto dozens of unauthorized machines.

---

## 4. Objectives
- Implement authentic RSA-2048 public/private key generation.
- Formulate deterministic canonical JSON payloads and compute SHA-256 digests.
- Generate digital signatures using RSA-PSS with SHA-256 (MGF1 and salt).
- Verify digital signatures using the publisher's trusted public key without hardcoded shortcuts.
- Separate cryptographic signature verification from business rules (expiry, CRL revocation, device limits).
- Provide an interactive 7-test Security Testing Lab demonstrating real attack scenarios.

---

## 5. Existing System vs. Proposed System

| Feature | Legacy File Verification System | LicenseGuard Proposed System |
| :--- | :--- | :--- |
| **Domain** | SpongeBob generic file integrity checker | Commercial software licensing & activation platform |
| **Key Management** | Transient keys in memory | Persistent publisher key infrastructure & rotation |
| **Tampering Defense** | Basic hash comparison | RSA-PSS with SHA-256 over canonical JSON payloads |
| **Business Logic** | None (only verifies file hashes) | Expiry dates, CRL revocation, multi-device seat quotas |
| **Simulation** | Cartoon roleplay scenario | Real-world workstation & cloud server hardware profiling |
| **Lab Testing** | 3 basic attack steps | 7 comprehensive security attack test vectors |

---

## 6. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   Publisher / Administrative Console                     │
│  - Product Catalog (IDs, versions, default seats)                        │
│  - RSA Keypair Management (2048/4096-bit, PEM export, rotation)         │
│  - Structured License Issuer (Canonical JSON -> SHA-256 -> RSA-PSS)      │
│  - Certificate Revocation List (CRL) & Seat Management                   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Issues .lic file & Public Key
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Customer Activation Portal                          │
│  - Input: Formatted Product Key (LG-XXXX) or .lic file upload            │
│  - Authority: Select or upload trusted Publisher Public Key (.pem)       │
│  - Hardware Node: Simulated device profiling (OS, GUID, hardware hash)   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Sequential 5-Stage Verification Engine                 │
│  Stage 1: Deterministic Canonical JSON formatting                       │
│  Stage 2: SHA-256 Digest Recomputation                                  │
│  Stage 3: RSA-PSS Mathematical Signature Verification (Integrity/Auth)   │
│  Stage 4: Temporal Expiry Check (Current time vs License Expiry)         │
│  Stage 5: Certificate Revocation List (CRL) Check                        │
│  Stage 6: Multi-Device Quota & Seat Allocation Check                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Cryptographic Algorithms

### A. SHA-256 (Secure Hash Algorithm 256-bit)
SHA-256 is a cryptographic hash function that takes an arbitrary-length message and computes a unique 256-bit (32-byte) message digest. It exhibits the **Avalanche Effect**: altering even a single bit of input changes more than 50% of the output hash bits.

### B. RSA-PSS (Probabilistic Signature Scheme)
Standardized in PKCS#1 v2.1 and RFC 8017. Compared to legacy deterministic PKCS#1 v1.5, RSA-PSS introduces a randomized salt value and Mask Generation Function (MGF1).
- **Signing**:
  $$H = \text{SHA-256}(\text{Canonicalize}(\text{Payload}))$$
  $$EM = \text{PSS-Encode}(H, \text{salt})$$
  $$S = EM^d \pmod n$$
- **Verification**:
  $$EM' = S^e \pmod n$$
  $$\text{Valid} = \text{PSS-Verify}(EM', H)$$

---

## 8. Security Testing Lab: 7 Test Scenarios

1. **Test 1: Genuine License**: Freshly signed license verified against publisher public key $\rightarrow$ **VALID LICENCE** (Pass).
2. **Test 2: License Tampering**: Attacker modifies customer name or extends expiry date $\rightarrow$ SHA-256 digest mismatches $\rightarrow$ **INVALID SIGNATURE** (Tampering caught).
3. **Test 3: Wrong Public Key**: Attempting verification using Rogue Corp's public key $\rightarrow$ RSA modulus mismatch $\rightarrow$ **INVALID SIGNATURE** (Rejected).
4. **Test 4: Expired License**: Valid signature, but expiry timestamp is in the past $\rightarrow$ Signature Valid, but activation denied: **LICENCE EXPIRED** (Demonstrates signature != authorization).
5. **Test 5: Revoked License**: Valid signature, but license listed on publisher CRL $\rightarrow$ **LICENCE REVOKED**.
6. **Test 6: Activation Limit**: License with 1 seat attempted on a 2nd device $\rightarrow$ **ACTIVATION LIMIT EXCEEDED**.
7. **Test 7: Signature Bit Corruption**: Corrupted base64 signature string $\rightarrow$ PSS salt verification fails $\rightarrow$ **INVALID SIGNATURE**.

---

## 9. Limitations & Practical Countermeasures
- **Replay Attacks**: Offline digital signatures cannot prevent copying a file to multiple machines. LicenseGuard mitigates this by pairing digital signatures with server-side activation records.
- **Hardware Spoofing**: In software, device identifiers can theoretically be spoofed. Enterprise licensing systems use TPM (Trusted Platform Module) chips or cloud-based leasing tokens.

---

## 10. Running the Application

### Full-Stack Interactive Web Platform (Port 3000)
```bash
npm run dev
```
Visit `http://localhost:3000` to interact with the full dashboard, Security Testing Lab, and Digital Signature Visualizer.

### Python Assignment CLI & Unit Tests
```bash
# Run CLI
python3 main.py

# Run Unit Tests
python3 -m unittest discover tests
```

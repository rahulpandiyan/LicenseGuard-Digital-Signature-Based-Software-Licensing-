# Visvesvaraya Technological University (VTU)
## Department of Computer Science & Engineering
### Course: Cryptography and Network Security (BCS703)
### Assignment / Project Report

---

# LicenseGuard: Digital Signature-Based Software Licensing and Activation System

**Student Name:** VTU CSE Student  
**USN:** 1VT21CS001  
**Semester:** VII  
**Academic Year:** 2026–2027  
**Primary Academic Topic:** Module IV – Digital Signatures, Asymmetric Cryptography, and Message Authentication

---

## Abstract

This project demonstrates the design, mathematical formulation, and implementation of a commercial-grade software licensing and activation platform called **LicenseGuard**. The system is built to explore the security principles of **Digital Signatures** using RSA-PSS (Probabilistic Signature Scheme) and SHA-256 in accordance with RFC 8017 (PKCS#1 v2.2) and RFC 8785. The system strictly contrasts cryptographic verification against business authorization through a deterministic Six-Stage Verification Engine, models an authoritative Trusted Publisher Key Registry to prevent arbitrary key substitution attacks, encrypts publisher private keys at rest via PBKDF2 and AES-256-GCM, maintains a Licence Revocation List (LRL), and implements an Application Integrity Scanner to detect binary patching and omitted modules.

---

## 1. Introduction & Theoretical Foundations

### 1.1 Digital Signatures vs. Symmetric Encryption
In software distribution, symmetric encryption fails because the decryption key must be shared with the client to interpret the license. An adversary reverse-engineers the client binary, extracts the symmetric secret key, and can unilaterally forge valid license tokens.

Digital signatures solve this challenge using asymmetric keypairs $(e, d, N)$:
- The **Private Key** ($d, N$) remains exclusively on the software publisher's secure server.
- The **Public Key** ($e, N$) is distributed to client applications.
- Anyone can verify the authenticity and integrity of a signed license using the publisher's public key, but no party without the private key can forge or alter a signature.

### 1.2 Mathematical Formulation of RSA-PSS (RFC 8017)
Standard "textbook" RSA encryption/signing without random padding ($S = M^d \pmod N$) is vulnerable to multiplicative property attacks, existential forgery, and deterministic chosen-message attacks. LicenseGuard employs **RSA-PSS (Probabilistic Signature Scheme)**:

1. **Message Digest**: Compute $mHash = \text{SHA-256}(M)$.
2. **Random Salt**: Generate random salt $salt \leftarrow \{0, 1\}^{sLen}$ (where $sLen = 32$ bytes).
3. **Padded Hash Input**: Form $M' = \text{0x00}^{8} \parallel mHash \parallel salt$.
4. **Digest of Salted Hash**: $H = \text{SHA-256}(M')$.
5. **Mask Generation Function (MGF1)**: $DB = \text{PS} \parallel \text{0x01} \parallel salt$. $dbMask = \text{MGF1}(H, embLen - hLen - 1)$.
6. **Masked DB**: $maskedDB = DB \oplus dbMask$.
7. **Encoded Message**: $EM = maskedDB \parallel H \parallel \text{0xbc}$.
8. **Asymmetric Operation**: $S = (EM)^d \pmod N$.

Verification computes the reverse mapping, generates the expected mask from $H$, recovers the salt, reconstructs $M'$, and verifies that $\text{SHA-256}(M') = H$.

---

## 2. Six-Stage Verification Engine Architecture

```
[ Incoming License Payload & Signature ]
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  STAGE 1: Deterministic Canonical JSON Serialization   │
│  - RFC 8785 rules: sorted keys, no whitespace          │
│  - Prevents JSON key reordering false negatives       │
└────────────────────┬───────────────────────────────────┘
                     ▼
┌────────────────────────────────────────────────────────┐
│  STAGE 2: SHA-256 Cryptographic Hash Computation       │
│  - Produces unique 256-bit collision-resistant digest  │
└────────────────────┬───────────────────────────────────┘
                     ▼
┌────────────────────────────────────────────────────────┐
│  STAGE 3: RSA-PSS Digital Signature Verification       │
│  - Validates key_id against Trusted Key Registry       │
│  - Rejects untrusted/attacker public keys              │
│  - Mathematical check: EM = S^e mod N                  │
└────────────────────┬───────────────────────────────────┘
                     │ Valid Signature? (Authenticity & Integrity)
            ┌────────┴────────┐
            │ NO              │ YES
            ▼                 ▼
  [ INVALID_SIGNATURE ] ┌───────────────────────────────────────────────┐
  [ UNTRUSTED_KEY     ] │  STAGE 4: Temporal Window & Expiry            │
                        │  - Validates: not_before <= now <= expires_at │
                        └───────────────────────┬───────────────────────┘
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │  STAGE 5: Licence Revocation List (LRL) Check │
                        │  - Validates: license_id not in LRL           │
                        └───────────────────────┬───────────────────────┘
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │  STAGE 6: Hardware Node & Activation Quota    │
                        │  - Validates: current_seats < max_activations │
                        └───────────────────────┬───────────────────────┘
                                                ▼
                                       [ VALID_LICENCE ]
```

---

## 3. Trusted Publisher Key Management

A critical vulnerability in naive public-key implementations is allowing the client to accept an arbitrary public key bundled with the payload. An attacker creates a rogue keypair, signs a forged license with their private key, and supplies their public key.

LicenseGuard prevents this by registering authorized publisher keys in an authoritative **Trusted Publisher Key Registry**:
- Keys possess immutable identifiers (`key_id`, e.g., `KEY-PUB01-2026`).
- Keys possess verified SHA-256 fingerprints formatted as hexadecimal byte pairs.
- During Stage 3 verification, the verifier resolves the key by its `key_id` in the local trust store. Unregistered or untrusted keys immediately trigger `UNTRUSTED_PUBLISHER_KEY`, defeating rogue publisher attacks.
- Supports **Key Rotation**: Expired or rotated keys remain in the registry marked inactive for signing, allowing previously signed licenses to continue validating until their expiration.

---

## 4. Application Integrity Scanner

Commercial software licenses can be rendered useless if an attacker tampers directly with the application executable (e.g., patching a jump instruction `JZ` to `JNZ` in the license check routine) or removes critical security libraries.

LicenseGuard addresses this with an **Application Integrity Scanner**:
1. At release time, the publisher compiles an inventory of all executable binaries (`.exe`), dynamic libraries (`.dll`), and assets.
2. The publisher computes SHA-256 hashes of each file and creates a signed release manifest (`release_manifest.json`) using their RSA private key.
3. Upon launch or integrity scan, the client application:
   - Verifies the publisher's digital signature on the release manifest using the trusted public key.
   - Computes live SHA-256 hashes of all installed files.
   - Checks for modified binaries (`APPLICATION_INTEGRITY_FAILED`).
   - Checks for missing critical components (`MISSING_FILE_DETECTED`).

---

## 5. Security Testing Lab: 10 Experimental Test Scenarios

The system includes an interactive 10-test Security Lab validating all theoretical attack vectors:

| Test ID | Scenario Description | Cryptographic Status | Business Status | System Verdict | Academic Principle Demonstrated |
|:---:|:---|:---:|:---:|:---:|:---|
| **1** | Genuine signed license with valid seat and date | VALID | APPROVED | `VALID_LICENCE` | Baseline signature validity and multi-stage approval. |
| **2** | Modified customer identity (single character change) | INVALID | DENIED | `INVALID_SIGNATURE` | Avalanche effect of SHA-256 and RSA-PSS integrity guarantee. |
| **3** | Extended expiry date (2026 to 2099) | INVALID | DENIED | `INVALID_SIGNATURE` | Signatures bind entire canonical payload; dates cannot be altered. |
| **4** | Unauthorized feature tier escalation | INVALID | DENIED | `INVALID_SIGNATURE` | Feature arrays are signed; adding perks invalidates the digest. |
| **5** | Signed by rogue/attacker publisher key | UNTRUSTED | DENIED | `UNTRUSTED_PUBLISHER_KEY` | Public keys must be explicitly trusted; self-signed keys rejected. |
| **6** | Valid signature on past expiry date | VALID | DENIED_EXPIRED | `LICENCE_EXPIRED` | Separation of cryptographic integrity from temporal validity. |
| **7** | Valid signature on license listed in LRL | VALID | DENIED_REVOKED | `LICENCE_REVOKED` | Cryptographically genuine licenses can be dynamically revoked. |
| **8** | Valid signature exceeding maximum device quota | VALID | DENIED_QUOTA | `ACTIVATION_QUOTA_EXCEEDED` | Hardware fingerprinting and seat management policy enforcement. |
| **9** | Patching application executable binary | VALID | DENIED_TAMPERED | `APPLICATION_INTEGRITY_FAILED` | Signed release manifests protect application binary integrity. |
| **10**| Deletion of required security library | VALID | DENIED_MISSING | `MISSING_FILE_DETECTED` | Package completeness verification prevents module deletion attacks. |

---

## 6. Comparison: Digital Signatures vs. Encryption

| Property | Symmetric Encryption (e.g. AES) | Asymmetric Encryption (e.g. RSA Encrypt) | Digital Signatures (RSA-PSS) |
|:---|:---|:---|:---|
| **Primary Goal** | Confidentiality (hide data) | Confidentiality for key exchange | Authenticity, Integrity, Non-Repudiation |
| **Key Used to Generate** | Shared Secret Key | Recipient's Public Key | Publisher's **Private Key** |
| **Key Used to Verify/Read**| Shared Secret Key | Recipient's Private Key | Publisher's **Public Key** |
| **Public Visibility** | Data is hidden (ciphertext) | Data is hidden (ciphertext) | Payload is **plaintext readable** (canonical JSON) |
| **Suitability for Licensing** | Poor (distributing key exposes secret) | Inapplicable (publisher is creator, not recipient) | **Ideal** (publisher signs, anyone verifies) |

---

## 7. Conclusion

LicenseGuard demonstrates that modern digital signatures using RSA-PSS and SHA-256 provide an uncompromising guarantee of data authenticity and integrity for software distribution. By pairing cryptographic validation with deterministic serialization, a Trusted Publisher Key Registry, Licence Revocation Lists, device seat quotas, and an Application Integrity Scanner, the platform mirrors production commercial licensing architectures while delivering clear educational insight into the mathematical separation between cryptographic proof and business authorization.

---

## 8. References
1. **RFC 8017**: PKCS #1: RSA Cryptography Specifications Version 2.2 (RSA-PSS & MGF1).
2. **RFC 8785**: JSON Canonicalization Scheme (JCS).
3. **NIST SP 800-57 Part 1**: Recommendation for Key Management.
4. **VTU BCS703 Curriculum**: Module IV – Asymmetric Key Cryptography & Digital Signature Standards.

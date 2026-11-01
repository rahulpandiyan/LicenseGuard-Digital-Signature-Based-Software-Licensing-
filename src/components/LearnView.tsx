import React, { useState } from 'react';
import { BookOpen, Download, FileText, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export const LearnView: React.FC = () => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadReport = () => {
    const reportContent = `# VTU BCS703 Cryptography and Network Security - Assignment Report
## Project Title: LicenseGuard – Digital Signature-Based Software Licensing and Activation System

### 1. Abstract
Commercial software licensing solutions (e.g., Microsoft Windows, Adobe Creative Cloud, JetBrains) require resilient mechanisms to verify product authenticity, prevent unauthorized software modification, and bind installations to authorized users. This project implements LicenseGuard, an educational software licensing and activation platform demonstrating digital signature algorithms using RSA-PSS and SHA-256 in compliance with the VTU BCS703 curriculum.

### 2. Introduction & Background
In symmetric cryptography, both sender and verifier share a secret key, making it unsuitable for software licensing because distributing the key inside client applications would allow users to extract it and forge licenses. Asymmetric cryptography solves this by separating the private signing key (kept on publisher servers) from the public verification key (distributed with software).

### 3. Problem Statement
Software piracy often involves altering plaintext license files (e.g. extending expiry dates, changing user names, inflating seats). Without digital signatures, client software cannot detect whether a configuration was altered. Furthermore, many naive systems confuse cryptographic validity with business authorization.

### 4. Cryptographic Algorithms
- **SHA-256 (Secure Hash Algorithm 256-bit)**: Cryptographic hash function with preimage and collision resistance. Produces a 256-bit (32-byte) digest.
- **RSA-PSS (Probabilistic Signature Scheme)**: Standardized in PKCS#1 v2.1 / RFC 8017. Unlike deterministic PKCS#1 v1.5, PSS uses random salt and Mask Generation Function (MGF1) to achieve provable security against existential forgery.

### 5. Step-by-Step Architecture
1. **Canonicalization**: License JSON attributes are sorted alphabetically to prevent false hash mismatches across differing JSON parsers.
2. **Digest Generation**: $H = \\text{SHA-256}(\\text{canonical\\_json}(m))$.
3. **Digital Signature**: $S = \\text{Sign}_{\\text{RSA-PSS}}(H, K_{\\text{private}})$.
4. **Distribution**: Payload and Base64-encoded signature are distributed as a \`.lic\` file.
5. **Client Verification**: Client recomputes $H'$ and verifies $S$ using $K_{\\text{public}}$.
6. **Business Rules Validation**:
   - Expiry check: Compares system UTC timestamp against license expiration.
   - CRL check: Queries Certificate Revocation List for compromised keys.
   - Quota check: Enforces maximum concurrent hardware seats.

### 6. Security Testing Results
- Test 1 (Genuine License): PASS (Valid Signature & Activation Granted).
- Test 2 (Data Tampering): PASS (1-bit alteration caught by SHA-256 avalanche effect; signature rejected).
- Test 3 (Wrong Public Key): PASS (Rogue publisher key rejected by RSA modulus check).
- Test 4 (Expired License): PASS (Signature Valid, but activation denied with LICENCE EXPIRED).
- Test 5 (Revoked License): PASS (Signature Valid, but activation denied with LICENCE REVOKED).
- Test 6 (Seat Quota): PASS (Exceeded device limit rejected with ACTIVATION LIMIT EXCEEDED).
- Test 7 (Signature Bit Corruption): PASS (Corrupted base64 bytes rejected by PSS salt unmasking).

### 7. Limitations & Real-World Countermeasures
- **Replay Attacks**: A digitally signed license can be copied to multiple computers. LicenseGuard addresses this by pairing digital signatures with server-side activation records and hardware profiling.
- **Hardware Spoofing**: In user-space software, MAC addresses and Machine GUIDs can be spoofed. Enterprise implementations use TPM (Trusted Platform Modules) or cloud-leased short-lived tokens.

### 8. Conclusion
LicenseGuard demonstrates that digital signatures provide non-repudiation, authenticity, and tamper detection. However, robust software protection requires separating mathematical signature verification from operational business rules.
`;

    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VTU_BCS703_LicenseGuard_Assignment_Report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
            <BookOpen className="w-4 h-4" />
            <span>VTU BCS703 Cryptography & Network Security Coursework</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Academic Learning & Assignment Documentation</h2>
          <p className="text-xs text-slate-400">
            Comprehensive study guide, mathematical proofs, and assignment report generator for viva presentation
          </p>
        </div>

        <button
          onClick={handleDownloadReport}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-colors shadow-sm shadow-indigo-950"
        >
          <Download className="w-4 h-4" />
          <span>{downloaded ? 'Downloaded Report!' : 'Download VTU Assignment Report'}</span>
        </button>
      </div>

      {/* Curriculum Q&A Accordion / Cards */}
      <div className="space-y-4">
        {/* Module 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs">
              01
            </span>
            <span>What is a Digital Signature and why is it needed in Software Licensing?</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            A <strong>digital signature</strong> is a mathematical scheme for presenting the authenticity of digital messages or documents. In commercial software licensing, software companies (publishers) cannot trust users with symmetric shared keys because reverse-engineers can extract the key and generate counterfeit licenses. Using asymmetric cryptography (RSA-PSS), the publisher signs license payloads with their private key, while client applications only bundle the public key to verify legitimacy.
          </p>
        </div>

        {/* Module 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs">
              02
            </span>
            <span>What is SHA-256 and what is the Avalanche Effect?</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            <strong>SHA-256</strong> (Secure Hash Algorithm 256-bit) is a cryptographic hash function that produces a fixed 32-byte hash value. It exhibits the <strong>Avalanche Effect</strong>: changing even a single bit in the input message (such as changing an expiry year from 2026 to 2027) causes more than 50% of the output hash bits to change completely at random. Because digital signatures sign this digest, any tampering with the message payload destroys the signature verification.
          </p>
        </div>

        {/* Module 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs">
              03
            </span>
            <span>RSA-PSS vs. Legacy PKCS#1 v1.5 Padding</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            Earlier systems used deterministic padding (PKCS#1 v1.5), which proved vulnerable to Bleichenbacher-style chosen-ciphertext attacks. <strong>RSA-PSS</strong> (Probabilistic Signature Scheme) is randomized: it introduces a random salt and employs a Mask Generation Function (MGF1). This ensures that signing the exact same license file twice produces different signature bytes, while remaining verifiable by the public key.
          </p>
        </div>

        {/* Module 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs">
              04
            </span>
            <span>Core Distinction: Valid Signature vs. Valid License</span>
          </h3>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-300 block mb-1">Key Viva Exam Question:</strong>
            Does a mathematically valid digital signature guarantee that a license is active?
            <span className="block mt-1 text-slate-300">
              <strong>NO.</strong> A digital signature only proves that the payload was created by the publisher and has not been altered in transit. A license could be expired (past its temporal deadline) or revoked (on a CRL blacklisting stolen keys) while still possessing a mathematically perfect digital signature. Software systems must evaluate both cryptographic integrity and business authorization rules.
            </span>
          </div>
        </div>

        {/* Module 5 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs">
              05
            </span>
            <span>Replay Attack Limitations & Node Locking</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            A digital signature cannot prevent a user from copying a valid <code>.lic</code> file to 100 different computers (a classic <strong>replay attack</strong>). To solve this, software architectures combine digital signatures with <strong>server-side activation records</strong> and <strong>hardware device profiling</strong> (MAC, OS identifier, Machine GUID) to lock the license to an authorized quota of physical or virtual machines.
          </p>
        </div>
      </div>
    </div>
  );
};

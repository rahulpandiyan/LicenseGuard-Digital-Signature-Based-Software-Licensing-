import React, { useState } from 'react';
import {
  Layers,
  FileText,
  Hash,
  Key,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  ArrowRight,
  ArrowDown,
  Cpu,
  FileCheck2,
} from 'lucide-react';

export const VisualizerView: React.FC = () => {
  const [activeFlow, setActiveFlow] = useState<'SIGNING' | 'VERIFICATION'>('SIGNING');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Digital Signature Process Visualizer</h2>
          <p className="text-xs text-slate-400">
            Interactive visual pipeline demonstrating the asymmetric cryptographic transformation between signing and verification
          </p>
        </div>

        {/* Flow Switcher */}
        <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setActiveFlow('SIGNING')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeFlow === 'SIGNING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>1. Publisher Signing Flow</span>
          </button>
          <button
            onClick={() => setActiveFlow('VERIFICATION')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeFlow === 'VERIFICATION'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Customer Verification Flow</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8">
        {activeFlow === 'SIGNING' ? (
          <div className="space-y-6">
            <div className="max-w-2xl">
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                Publisher Workspace Flow
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                How a Software License is Digitally Signed
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The publisher uses a private key that never leaves the secure server. Digital signing does not encrypt the license; it creates an unforgeable cryptographic seal over the plaintext license attributes.
              </p>
            </div>

            {/* Stepper Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 font-mono font-bold text-xs">
                    01
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">Canonical Payload</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Customer & license metadata sorted alphabetically into canonical JSON bytes.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300">
                  {`{"cust":"Turing","lic":"LIC-01","prod":"Sentinel"}`}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 font-mono font-bold text-xs">
                    02
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">SHA-256 Hashing</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    One-way cryptographic hash compresses the arbitrary-length payload into a fixed 256-bit digest.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-emerald-400 break-all">
                  H = SHA-256(m)
                  <div className="text-slate-500 truncate">7f83b1657ff1...</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2 font-mono font-bold text-xs">
                    03
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">RSA-PSS Signing</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The digest is padded with random salt (PSS) and encrypted using the Publisher's Private Key $d$.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-rose-300 break-all">
                  s = (PSS(H))^d mod n
                  <div className="text-slate-500 truncate">PrivateKey: Secret</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 font-mono font-bold text-xs">
                    04
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">Signed .lic Package</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The plaintext payload + base64 signature are packaged and issued to the customer.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-indigo-300">
                  {`{ payload: {...}, sig: "B64..." }`}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="max-w-2xl">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                Customer Client Flow
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                How Software Verifies Authenticity & Grants Activation
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The software client uses the publisher's Public Key to independently verify that the license came from the genuine publisher and has not been altered by even a single bit.
              </p>
            </div>

            {/* Stepper Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 font-mono font-bold text-xs">
                    01
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">Extract & Recompute</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Software extracts payload from .lic file and computes fresh SHA-256 hash $H'$.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300">
                  H' = SHA-256(canonical(m))
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 font-mono font-bold text-xs">
                    02
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">Public Key Math</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Using publisher Public Key $(e, n)$, verifier decrypts signature: $(s)^e \pmod n$.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-indigo-300">
                  recovered = s^e mod n
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 font-mono font-bold text-xs">
                    03
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">Digest Comparison</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    PSS unmasks salt and tests if recovered hash equals $H'$. Any difference triggers INVALID SIGNATURE.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-emerald-400">
                  H' === H_recovered ? PASS : FAIL
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2 font-mono font-bold text-xs">
                    04
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">Business Authorization</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Once signature passes, system checks Expiry date, CRL status, and device seat allowance.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300">
                  Expiry + CRL + Seats OK
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mathematical Trapdoor Section */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Academic Theory: Why the Public Key Cannot Forge Signatures</span>
          </h4>
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2 font-sans">
            <p>
              In RSA public-key cryptography (Rivest, Shamir, Adleman), the system is built upon the <strong className="text-white">Integer Factorization Trapdoor Problem</strong>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px] text-slate-400 my-2">
              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="text-indigo-400 font-bold block mb-1">Public Key Components (Known to Verifier):</span>
                <div>Modulus: <span className="text-slate-200">n = p · q</span> (2048-bit composite number)</div>
                <div>Public Exponent: <span className="text-slate-200">e = 65537</span> (Fermat prime $F_4$)</div>
              </div>
              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="text-rose-400 font-bold block mb-1">Private Key Secret (Known Only to Publisher):</span>
                <div>Private Exponent: <span className="text-slate-200">d ≡ e⁻¹ (mod φ(n))</span></div>
                <div>Euler Totient: <span className="text-slate-200">φ(n) = (p - 1)(q - 1)</span></div>
              </div>
            </div>
            <p>
              To forge a digital signature without the publisher's private key, an attacker must compute $d$, which requires finding $\phi(n)$. Computing $\phi(n)$ is strictly as difficult as factoring $n$ into its constituent prime factors $p$ and $q$. For a 2048-bit modulus, the best known general number field sieve would require millions of core computing years, rendering signature forgery computationally infeasible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

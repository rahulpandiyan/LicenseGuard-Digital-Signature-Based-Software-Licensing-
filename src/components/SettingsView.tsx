import React, { useState } from 'react';
import { Settings, Shield, Lock, Database, Key, CheckCircle2, RotateCcw } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Settings & Cryptographic Audit</h2>
          <p className="text-xs text-slate-400">
            Cryptographic standards, private-key encryption at rest, and database persistence status
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cryptographic Standards Specification */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Active Cryptographic Standards</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans font-semibold">Digital Signature Scheme:</span>
              <div className="text-emerald-400">RSA-PSS (Probabilistic Signature Scheme)</div>
              <div className="text-[11px] text-slate-500">RFC 8017 / PKCS#1 v2.1 compliant, randomized salt, MGF1</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans font-semibold">Message Digest Hash Function:</span>
              <div className="text-indigo-300">SHA-256 (FIPS 180-4)</div>
              <div className="text-[11px] text-slate-500">256-bit collision-resistant digest with deterministic JSON canonicalization</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans font-semibold">Private Key Encryption at Rest:</span>
              <div className="text-emerald-400">AES-256-GCM (Authenticated Encryption)</div>
              <div className="text-[11px] text-slate-500">Key derived via PBKDF2 (HMAC-SHA256, 100,000 iterations, 16-byte random salt)</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-sans font-semibold">Verification Architecture:</span>
              <div className="text-cyan-300">Six-Stage Sequential Engine</div>
              <div className="text-[11px] text-slate-500">Strict separation between mathematical signatures and operational business rules</div>
            </div>
          </div>
        </div>

        {/* Persistence & Security Enforcement */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Security Invariants & Protections</h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-300 font-sans">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Client Exposure of Private Keys:</strong> Publisher private keys are never returned in public API payloads or sent to customer portals.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Licence Revocation List (LRL):</strong> Real-time database checks prevent revoked licenses from acquiring valid activation tokens.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Application Integrity Scanner:</strong> Protects software distribution against binary patching, replacement, and omitted modules.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Simulated Device Fingerprinting:</strong> Discloses academic limitations: hardware hashes can be spoofed in user-space without TPM modules.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">VTU BCS703 Cryptography Lab</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Security Controls Active</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

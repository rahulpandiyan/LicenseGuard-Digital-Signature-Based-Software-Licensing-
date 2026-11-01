import React, { useState } from 'react';
import { X, Copy, Check, Download, ShieldCheck, FileCode, Key } from 'lucide-react';
import type { LicenseRecord } from '../types/license.ts';
import { canonicalizePayload } from '../services/crypto.ts';

interface LicenseInspectionModalProps {
  license: LicenseRecord | null;
  onClose: () => void;
}

export const LicenseInspectionModal: React.FC<LicenseInspectionModalProps> = ({
  license,
  onClose,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!license) return null;

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadLic = () => {
    const jsonStr = JSON.stringify(license, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${license.license_payload.license_id}.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canonicalString = canonicalizePayload(license.license_payload);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>License Cryptographic Inspector</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {license.license_payload.license_id} · {license.formatted_license_key}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          {/* Canonical Payload */}
          <div>
            <div className="flex items-center justify-between mb-1 font-sans text-xs">
              <span className="font-semibold text-slate-300">Deterministic Canonical Payload (Raw UTF-8 Bytes Input)</span>
              <button
                onClick={() => handleCopy(canonicalString, 'canonical')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedSection === 'canonical' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all">
              {canonicalString}
            </pre>
          </div>

          {/* SHA-256 Digest */}
          <div>
            <div className="flex items-center justify-between mb-1 font-sans text-xs">
              <span className="font-semibold text-emerald-400">Computed SHA-256 Digest (32-Byte Hex)</span>
              <button
                onClick={() => handleCopy(license.sha256_digest, 'hash')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedSection === 'hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-emerald-300 break-all">
              {license.sha256_digest}
            </div>
          </div>

          {/* RSA-PSS Signature */}
          <div>
            <div className="flex items-center justify-between mb-1 font-sans text-xs">
              <span className="font-semibold text-indigo-400">RSA-PSS Digital Signature (Base64 Encoded)</span>
              <button
                onClick={() => handleCopy(license.signature_b64, 'sig')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedSection === 'sig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] text-indigo-300 overflow-x-auto break-all whitespace-pre-wrap">
              {license.signature_b64}
            </pre>
          </div>

          {/* Signing Authority Fingerprint */}
          <div>
            <span className="font-sans font-semibold text-slate-300 block mb-1">
              Signing Authority Fingerprint:
            </span>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 break-all">
              {license.publisher_fingerprint} (Key ID: {license.key_id})
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleDownloadLic}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .lic File</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

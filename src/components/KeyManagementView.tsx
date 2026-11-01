import React, { useState } from 'react';
import {
  Key,
  Plus,
  Shield,
  Download,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import type { PublisherKey } from '../types/license.ts';

interface KeyManagementViewProps {
  keys: PublisherKey[];
  onGenerateKey: (name: string, keySize: 2048 | 4096, isTrusted: boolean) => Promise<void>;
}

export const KeyManagementView: React.FC<KeyManagementViewProps> = ({
  keys,
  onGenerateKey,
}) => {
  const [showGenModal, setShowGenModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('LicenseGuard Enterprise CA v2.0');
  const [newKeySize, setNewKeySize] = useState<2048 | 4096>(2048);
  const [isTrusted, setIsTrusted] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [inspectingKey, setInspectingKey] = useState<PublisherKey | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await onGenerateKey(newKeyName, newKeySize, isTrusted);
      setShowGenModal(false);
      setNewKeyName('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadPem = (key: PublisherKey) => {
    const blob = new Blob([key.public_key_pem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key.key_id}_public.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Publisher Key Infrastructure</h2>
          <p className="text-xs text-slate-400">
            Asymmetric RSA public/private key generation, cryptographic fingerprints, and key rotation management
          </p>
        </div>
        <button
          onClick={() => setShowGenModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-colors shadow-sm shadow-indigo-950"
        >
          <Plus className="w-4 h-4" />
          <span>Generate RSA Keypair</span>
        </button>
      </div>

      {/* Security Architecture Principle Note */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white block mb-0.5">Key Separation Security Principle:</strong>
          In commercial software licensing (Microsoft, JetBrains, Adobe), the software publisher strictly keeps the RSA <strong className="text-rose-400">Private Key ($d$)</strong> inside a secure Hardware Security Module (HSM). The software client installer only embeds or retrieves the <strong className="text-emerald-400">Public Key ($e, n$)</strong>. Because RSA is a one-way trapdoor function, an attacker holding the public key cannot forge signatures.
        </div>
      </div>

      {/* Key Rings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {keys.map((key) => (
          <div
            key={key.key_id}
            className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-colors ${
              key.is_trusted ? 'border-slate-800 hover:border-slate-700' : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {key.key_id}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    key.is_trusted
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {key.is_trusted ? 'Trusted Official Publisher' : 'Untrusted / Rogue Key'}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{key.name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 font-mono">
                <span>RSA-{key.key_size}</span>
                <span>·</span>
                <span>Created {key.created_at.slice(0, 10)}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">SHA-256 Public Key Fingerprint:</span>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 break-all">
                  {key.fingerprint}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setInspectingKey(key);
                  setShowPrivateKey(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect PEMs</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(key.public_key_pem, `pub-${key.key_id}`)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === `pub-${key.key_id}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy Public</span>
                </button>
                <button
                  onClick={() => handleDownloadPem(key)}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .pem</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate RSA Key Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Generate RSA Public/Private Keypair</h3>
              <button
                onClick={() => setShowGenModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Publisher Keypair Name</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. LicenseGuard CA 2026-Q1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Modulus Bit Length</label>
                <select
                  value={newKeySize}
                  onChange={(e) => setNewKeySize(Number(e.target.value) as 2048 | 4096)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value={2048}>RSA-2048 (Recommended for speed & security)</option>
                  <option value={4096}>RSA-4096 (Military / High Security)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="trustedCheck"
                  checked={isTrusted}
                  onChange={(e) => setIsTrusted(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="trustedCheck" className="text-slate-300 cursor-pointer">
                  Mark as Trusted Official Authority (Uncheck to simulate Rogue CA)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isGenerating ? 'Generating Primes...' : 'Generate Keypair'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Key Modal */}
      {inspectingKey && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">{inspectingKey.name}</h3>
                <span className="text-xs font-mono text-slate-400">{inspectingKey.key_id} · RSA-{inspectingKey.key_size}</span>
              </div>
              <button
                onClick={() => setInspectingKey(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <div className="flex items-center justify-between mb-1 font-sans text-xs">
                  <span className="font-semibold text-emerald-400">SubjectPublicKeyInfo (Public Key PEM)</span>
                  <button
                    onClick={() => handleCopy(inspectingKey.public_key_pem, 'inspect-pub')}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedKey === 'inspect-pub' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-300 overflow-x-auto">
                  {inspectingKey.public_key_pem}
                </pre>
              </div>

              {(inspectingKey.encrypted_private_key_pem || inspectingKey.private_key_pem) && (
                <div>
                  <div className="flex items-center justify-between mb-1 font-sans text-xs">
                    <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{inspectingKey.encrypted_private_key_pem ? 'Encrypted Vault Storage (PBKDF2 + AES-256-GCM)' : 'PKCS#8 Private Key PEM (Publisher Secret)'}</span>
                    </span>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPrivateKey ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>
                  {showPrivateKey ? (
                    <pre className="bg-slate-950 p-3 rounded-lg border border-rose-500/30 text-[10px] text-rose-300 overflow-x-auto whitespace-pre-wrap break-all">
                      {inspectingKey.encrypted_private_key_pem || inspectingKey.private_key_pem}
                    </pre>
                  ) : (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-500 font-sans text-center">
                      Private key encrypted at rest. Click 'Reveal' to inspect encrypted vault payload.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingKey(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

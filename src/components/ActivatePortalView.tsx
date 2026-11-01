import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileCheck2,
  Key,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  ArrowRight,
  RefreshCw,
  Info,
  Clock,
  Layers,
  Lock,
} from 'lucide-react';
import type {
  PublisherKey,
  DeviceProfile,
  VerificationResult,
  SignedLicenseFile,
  LicenseRecord,
} from '../types/license.ts';

interface ActivatePortalViewProps {
  keys: PublisherKey[];
  currentDevice: DeviceProfile;
  licenses: LicenseRecord[];
  onVerify: (data: {
    licenseFile?: SignedLicenseFile;
    licenseKeyOrId?: string;
    selectedKeyId?: string;
    publicKeyPem?: string;
    device?: DeviceProfile;
  }) => Promise<VerificationResult>;
  onActivate: (
    licenseKeyOrId: string,
    device: DeviceProfile
  ) => Promise<{ success: boolean; message: string; verification: VerificationResult }>;
}

export const ActivatePortalView: React.FC<ActivatePortalViewProps> = ({
  keys,
  currentDevice,
  licenses,
  onVerify,
  onActivate,
}) => {
  const [inputMode, setInputMode] = useState<'KEY' | 'FILE' | 'PRESET'>('KEY');
  const [licenseKeyInput, setLicenseKeyInput] = useState('LG-00124-TURI-NG01-PROD');
  const [uploadedFile, setUploadedFile] = useState<SignedLicenseFile | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    keys.find((k) => k.is_trusted && k.is_active)?.key_id || keys[0]?.key_id || ''
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setUploadedFile(parsed);
      } catch (err) {
        alert('Invalid JSON in license file: ' + err);
      }
    };
    reader.readAsText(file);
  };

  const handleSelectPreset = (lic: LicenseRecord) => {
    setInputMode('KEY');
    setLicenseKeyInput(lic.formatted_license_key);
    setUploadedFile(lic);
    if (lic.key_id) setSelectedKeyId(lic.key_id);
  };

  const handleRunVerification = async () => {
    setIsVerifying(true);
    setActivationMessage(null);
    try {
      let result: VerificationResult;
      if (inputMode === 'FILE' && uploadedFile) {
        result = await onVerify({
          licenseFile: uploadedFile,
          selectedKeyId,
          device: currentDevice,
        });
      } else {
        result = await onVerify({
          licenseKeyOrId: licenseKeyInput,
          selectedKeyId,
          device: currentDevice,
        });
      }
      setVerificationResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunActivation = async () => {
    if (!verificationResult?.license_payload) return;
    setIsActivating(true);
    try {
      const outcome = await onActivate(
        verificationResult.license_payload.license_id,
        currentDevice
      );
      setActivationMessage(outcome.message);
      setVerificationResult(outcome.verification);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActivationMessage('Activation error: ' + msg);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Customer Software Activation Portal</h2>
        <p className="text-xs text-slate-400">
          Six-Stage Verification Engine enforcing deterministic RSA-PSS cryptography, Trusted Publisher Key Registry, and Licence Revocation Lists (LRL)
        </p>
      </div>

      {/* Quick Preset Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Quick Test Presets (Demonstration Scenarios):</span>
          <span className="text-[11px] text-slate-500 font-mono">1-Click Population</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {licenses.slice(0, 4).map((lic) => {
            const isRevoked = lic.revocation !== undefined;
            const isExpired =
              lic.license_payload.expires_at !== 'LIFETIME' &&
              new Date(lic.license_payload.expires_at) < new Date();

            let label = 'Genuine Active';
            let badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';

            if (isRevoked) {
              label = 'Revoked Licence (LRL)';
              badgeStyle = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
            } else if (isExpired) {
              label = 'Expired Licence';
              badgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
            }

            return (
              <button
                key={lic.license_payload.license_id}
                onClick={() => handleSelectPreset(lic)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-mono flex items-center gap-2 transition-colors"
              >
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans border ${badgeStyle}`}>
                  {label}
                </span>
                <span className="text-slate-300">{lic.license_payload.customer_name}</span>
                <span className="text-slate-500">({lic.license_payload.license_id})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Verification Input Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>Licence Submission</span>
            </h3>

            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setInputMode('KEY')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  inputMode === 'KEY'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Licence Key
              </button>
              <button
                onClick={() => setInputMode('FILE')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  inputMode === 'FILE'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload .lic
              </button>
            </div>
          </div>

          {inputMode === 'KEY' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Product Licence Key or Unique Licence ID
              </label>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="e.g. LG-2026-00124 or formatted key"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Upload Cryptographic .lic Licence File
              </label>
              <label className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                <Upload className="w-6 h-6 text-slate-500 mb-2" />
                <span className="text-xs font-medium text-slate-300">
                  {uploadedFileName || 'Click or drag signed .lic file here'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">Deterministic JSON payload + signature</span>
                <input
                  type="file"
                  accept=".lic,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Trusted Publisher Public Key Registry Lookup
            </label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {keys.map((k) => (
                <option key={k.key_id} value={k.key_id}>
                  {k.key_id} · {k.name} ({k.is_trusted ? 'Trusted' : 'Untrusted / Rogue'})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Notice: The client verifies using the trusted key registered for this key ID. Untrusted keys are rejected.
            </span>
          </div>

          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Target Device Verification Context:</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
              <div>Node: <span className="text-slate-200">{currentDevice.device_name}</span></div>
              <div>OS: <span className="text-slate-300">{currentDevice.os}</span></div>
              <div>Hardware Hash: <span className="text-slate-400">{currentDevice.hardware_hash}</span></div>
            </div>
          </div>

          <button
            onClick={handleRunVerification}
            disabled={isVerifying}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-950"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Executing Six-Stage Verification...' : 'Execute Six-Stage Verification Engine'}</span>
          </button>
        </div>

        {/* Verification Engine Output */}
        <div className="lg:col-span-7 space-y-4">
          {verificationResult ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-5">
              {/* Verdict Header */}
              {(() => {
                const verdict = verificationResult.verdict;
                let bannerBg = 'bg-slate-950 border-slate-800 text-slate-200';
                let icon = <CheckCircle2 className="w-6 h-6 text-emerald-400" />;

                if (verdict === 'VALID LICENCE') {
                  bannerBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200';
                  icon = <ShieldCheck className="w-6 h-6 text-emerald-400" />;
                } else if (verdict === 'INVALID SIGNATURE') {
                  bannerBg = 'bg-rose-500/10 border-rose-500/30 text-rose-200';
                  icon = <XCircle className="w-6 h-6 text-rose-400" />;
                } else if (verdict === 'UNKNOWN OR UNTRUSTED PUBLISHER') {
                  bannerBg = 'bg-amber-500/10 border-amber-500/30 text-amber-200';
                  icon = <Lock className="w-6 h-6 text-amber-400" />;
                } else if (verdict === 'LICENCE EXPIRED' || verdict === 'LICENCE NOT YET VALID') {
                  bannerBg = 'bg-amber-500/10 border-amber-500/30 text-amber-200';
                  icon = <Clock className="w-6 h-6 text-amber-400" />;
                } else if (verdict === 'LICENCE REVOKED') {
                  bannerBg = 'bg-rose-500/10 border-rose-500/30 text-rose-200';
                  icon = <XCircle className="w-6 h-6 text-rose-400" />;
                } else if (verdict === 'ACTIVATION LIMIT EXCEEDED') {
                  bannerBg = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200';
                  icon = <Laptop className="w-6 h-6 text-cyan-400" />;
                }

                return (
                  <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${bannerBg}`}>
                    <div className="shrink-0 mt-0.5">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider font-bold">
                          Verification Verdict:
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-current">
                          {verdict}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed font-sans opacity-90">
                        {verificationResult.academic_explanation}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* The Six Verification Stages */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>The Six-Stage Verification Engine Execution</span>
                </h4>

                {/* Stage 1: Canonical Serialization */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-slate-300">
                      Stage 1: Canonical JSON Serialization & Schema
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.stage1_canonical_valid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {verificationResult.stages.stage1_canonical_valid ? 'CANONICAL VALID ✅' : 'SCHEMA FAILED ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    Schema v1 · Sorted alphabetical keys · UTF-8 encoding
                  </div>
                </div>

                {/* Stage 2: SHA-256 Hashing */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-slate-300">
                      Stage 2: SHA-256 Message Digest Computation
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px]">HASHED ✅</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono break-all">
                    {verificationResult.stages.sha256_computed}
                  </div>
                </div>

                {/* Stage 3: RSA-PSS Digital Signature */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-slate-300">
                      Stage 3: RSA-PSS Signature & Key Registry Check
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.stage3_signature_valid
                          ? 'text-emerald-400'
                          : !verificationResult.stages.key_trusted
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {verificationResult.stages.stage3_signature_valid
                        ? 'SIGNATURE VALID ✅'
                        : !verificationResult.stages.key_trusted
                        ? 'UNTRUSTED KEY ❌'
                        : 'SIGNATURE INVALID ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Authority: {verificationResult.stages.publisher_name} ({verificationResult.stages.publisher_id}) · Key:{' '}
                    {verificationResult.stages.key_fingerprint.slice(0, 20)}...
                  </div>
                </div>

                {/* Stage 4: Licence Validity & Temporal Window */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-slate-300">
                      Stage 4: Licence Validity & Expiry Timeline
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.stage4_validity_passed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {verificationResult.stages.stage4_validity_passed ? 'TIMELINE VALID ✅' : 'EXPIRED / INVALID ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Validity Window: [{verificationResult.stages.not_before?.slice(0, 10)} $\rightarrow${' '}
                    {verificationResult.stages.expires_at === 'LIFETIME'
                      ? 'LIFETIME'
                      : verificationResult.stages.expires_at?.slice(0, 10)}]
                  </div>
                </div>

                {/* Stage 5: Licence Revocation List (LRL) */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-slate-300">
                      Stage 5: Licence Revocation List (LRL) Check
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.stage5_lrl_passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {verificationResult.stages.stage5_lrl_passed ? 'NOT REVOKED ✅' : 'REVOKED ON LRL ❌'}
                    </span>
                  </div>
                  {verificationResult.stages.revocation_reason && (
                    <div className="text-[11px] text-rose-400 font-sans">
                      LRL Reason: {verificationResult.stages.revocation_reason}
                    </div>
                  )}
                </div>

                {/* Stage 6: Device Activation Quota */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-slate-300">
                      Stage 6: Device Activation Quota Verification
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.stage6_quota_passed ? 'text-emerald-400' : 'text-cyan-400'
                      }`}
                    >
                      {verificationResult.stages.stage6_quota_passed ? 'QUOTA AVAILABLE ✅' : 'QUOTA EXCEEDED ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Registered Seats: {verificationResult.stages.current_activations} /{' '}
                    {verificationResult.stages.max_activations}
                  </div>
                </div>
              </div>

              {/* Activation Trigger */}
              {verificationResult.success && (
                <div className="pt-2">
                  <button
                    onClick={handleRunActivation}
                    disabled={isActivating}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-950"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isActivating
                        ? 'Registering Device Activation Token...'
                        : `Activate Software on ${currentDevice.device_name}`}
                    </span>
                  </button>
                  {activationMessage && (
                    <p className="mt-2 text-xs text-center font-medium text-emerald-400 font-sans">
                      {activationMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[360px]">
              <ShieldCheck className="w-12 h-12 text-slate-700 mb-3" />
              <h4 className="text-sm font-semibold text-slate-400">Awaiting Licence Submission</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Enter a product key or upload a signed .lic file and press "Execute Six-Stage Verification Engine" to run cryptographic validation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

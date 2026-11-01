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
  const [licenseKeyInput, setLicenseKeyInput] = useState('LG-9810-A014-TURI-NG01');
  const [uploadedFile, setUploadedFile] = useState<SignedLicenseFile | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    keys.find((k) => k.is_trusted && k.is_active)?.key_id || keys[0]?.key_id || ''
  );
  const [customPublicKeyPem, setCustomPublicKeyPem] = useState('');
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
  };

  const handleRunVerification = async () => {
    setIsVerifying(true);
    setActivationMessage(null);
    try {
      let result: VerificationResult;
      if (inputMode === 'FILE' && uploadedFile) {
        result = await onVerify({
          licenseFile: uploadedFile,
          selectedKeyId: customPublicKeyPem ? undefined : selectedKeyId,
          publicKeyPem: customPublicKeyPem || undefined,
          device: currentDevice,
        });
      } else {
        result = await onVerify({
          licenseKeyOrId: licenseKeyInput,
          selectedKeyId: customPublicKeyPem ? undefined : selectedKeyId,
          publicKeyPem: customPublicKeyPem || undefined,
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
          Independent verification of RSA-PSS digital signatures, SHA-256 payload integrity, and device seat registration
        </p>
      </div>

      {/* Quick Preset Selector for Easy College Assignment Demos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Quick Test Presets (Demonstration Scenarios):</span>
          <span className="text-[11px] text-slate-500 font-mono">1-Click Population</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {licenses.slice(0, 4).map((lic) => {
            const isRevoked = lic.revocation !== undefined;
            const isExpired =
              lic.license_payload.expiry_date !== 'LIFETIME' &&
              new Date(lic.license_payload.expiry_date) < new Date();

            let label = 'Genuine Active';
            let badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';

            if (isRevoked) {
              label = 'Revoked License';
              badgeStyle = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
            } else if (isExpired) {
              label = 'Expired License';
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
        {/* Verification Submission Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-400" />
              <span>License Input</span>
            </h3>

            {/* Input Mode Selector */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setInputMode('KEY')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  inputMode === 'KEY'
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                License Key
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
                Product License Key or License ID
              </label>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="e.g. LG-9810-A014-TURI-NG01 or LIC-2026-9810A"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Upload Cryptographic .lic File
              </label>
              <label className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                <Upload className="w-6 h-6 text-slate-500 mb-2" />
                <span className="text-xs font-medium text-slate-300">
                  {uploadedFileName || 'Click or drag license file here'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">JSON schema with signature</span>
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
              Verification Public Key Authority
            </label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {keys.map((k) => (
                <option key={k.key_id} value={k.key_id}>
                  {k.name} ({k.is_trusted ? 'Trusted Official' : 'Rogue Attacker'})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Laptop className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Target Device Context:</span>
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
            <span>{isVerifying ? 'Verifying Cryptography & Rules...' : 'Verify Digital Signature & Rules'}</span>
          </button>
        </div>

        {/* Verification Stages & Verdict Column */}
        <div className="lg:col-span-7 space-y-4">
          {verificationResult ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-5">
              {/* Verdict Header Banner */}
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
                } else if (verdict === 'LICENCE EXPIRED') {
                  bannerBg = 'bg-amber-500/10 border-amber-500/30 text-amber-200';
                  icon = <AlertTriangle className="w-6 h-6 text-amber-400" />;
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
                      <div className="flex items-center justify-between">
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

              {/* 5-Stage Step Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Sequential Verification Stages
                </h4>

                {/* Stage 1: Hash Calculation */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold font-sans">
                      Stage 1: SHA-256 Digest Recomputation
                    </span>
                    <span className="text-emerald-400 text-[11px]">Computed</span>
                  </div>
                  <div className="text-[11px] text-slate-300 break-all">
                    {verificationResult.stages.sha256_computed}
                  </div>
                </div>

                {/* Stage 2: RSA-PSS Signature Verification */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold font-sans">
                      Stage 2: RSA-PSS Signature Verification
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.signature_valid
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {verificationResult.stages.signature_valid ? 'VALID SIGNATURE ✅' : 'INVALID SIGNATURE ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Algorithm: RSA-PSS with SHA-256 (MGF1 Salt: MAX) · Key: {verificationResult.stages.publisher_name}
                  </div>
                </div>

                {/* Stage 3: Expiry Check */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold font-sans">
                      Stage 3: Business Rule – Expiry Validation
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.expiry_valid ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {verificationResult.stages.expiry_valid ? 'TIMELINE VALID ✅' : 'EXPIRED ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Expiry Date: {verificationResult.license_payload?.expiry_date || 'N/A'}
                  </div>
                </div>

                {/* Stage 4: CRL Check */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold font-sans">
                      Stage 4: Business Rule – Revocation List (CRL)
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.crl_check_passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {verificationResult.stages.crl_check_passed ? 'NOT REVOKED ✅' : 'REVOKED ON CRL ❌'}
                    </span>
                  </div>
                </div>

                {/* Stage 5: Seat Quota */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold font-sans">
                      Stage 5: Business Rule – Activation Device Quota
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        verificationResult.stages.activation_limit_passed ? 'text-emerald-400' : 'text-cyan-400'
                      }`}
                    >
                      {verificationResult.stages.activation_limit_passed ? 'QUOTA AVAILABLE ✅' : 'LIMIT EXCEEDED ❌'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Active Registrations: {verificationResult.stages.current_activations} / {verificationResult.stages.max_activations}
                  </div>
                </div>
              </div>

              {/* Activation Trigger Button */}
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
                        ? 'Registering Device Activation...'
                        : `Activate Software on ${currentDevice.device_name}`}
                    </span>
                  </button>
                  {activationMessage && (
                    <p className="mt-2 text-xs text-center font-medium text-emerald-400">
                      {activationMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[360px]">
              <ShieldCheck className="w-12 h-12 text-slate-700 mb-3" />
              <h4 className="text-sm font-semibold text-slate-400">Awaiting License Submission</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Enter a product key or upload a signed .lic file and press "Verify Digital Signature" to run cryptographic validation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

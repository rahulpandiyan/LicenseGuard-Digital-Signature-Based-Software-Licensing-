import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Code2,
  Terminal,
  Bug,
} from 'lucide-react';
import type { LabTestScenario, LicenseRecord, SignedLicenseFile, VerificationResult } from '../types/license.ts';

interface SecurityLabViewProps {
  licenses: LicenseRecord[];
  onRunTest: (testId: number) => Promise<LabTestScenario>;
  onVerifyCustom: (file: SignedLicenseFile) => Promise<VerificationResult>;
}

export const SecurityLabView: React.FC<SecurityLabViewProps> = ({
  licenses,
  onRunTest,
  onVerifyCustom,
}) => {
  const [selectedTestId, setSelectedTestId] = useState<number>(1);
  const [activeScenario, setActiveScenario] = useState<LabTestScenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Custom Tampering Sandbox State
  const [sandboxLic, setSandboxLic] = useState<LicenseRecord>(licenses[0]);
  const [tamperField, setTamperField] = useState<'customer_name' | 'expiry_date' | 'max_activations' | 'signature_b64'>('expiry_date');
  const [tamperValue, setTamperValue] = useState('2099-12-31T23:59:59Z');
  const [sandboxResult, setSandboxResult] = useState<VerificationResult | null>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  const testDefinitions = [
    {
      id: 1,
      title: 'Test 1: Genuine License Baseline',
      desc: 'Issue & sign license with private key, then verify with trusted public key.',
      concept: 'Authenticity & Integrity',
      color: 'border-emerald-500/30 text-emerald-400',
    },
    {
      id: 2,
      title: 'Test 2: License Data Tampering',
      desc: 'Modify 1 character in expiry date or name; signature becomes invalid.',
      concept: 'Avalanche Effect & Integrity',
      color: 'border-rose-500/30 text-rose-400',
    },
    {
      id: 3,
      title: 'Test 3: Wrong Public Key Attack',
      desc: 'Verify license using Rogue Corp public key; mathematical mismatch caught.',
      concept: 'Key Binding & Trapdoor RSA',
      color: 'border-amber-500/30 text-amber-400',
    },
    {
      id: 4,
      title: 'Test 4: Expired License (Valid Sig)',
      desc: 'Valid signature, but past expiry date. Proves signature != authorization.',
      concept: 'Temporal Validity vs Signature',
      color: 'border-amber-500/30 text-amber-400',
    },
    {
      id: 5,
      title: 'Test 5: Revoked License (CRL)',
      desc: 'Valid signature, but blacklisted on server CRL due to key compromise.',
      concept: 'Revocation & Non-Repudiation',
      color: 'border-rose-500/30 text-rose-400',
    },
    {
      id: 6,
      title: 'Test 6: Multi-Device Quota Exceeded',
      desc: 'Valid signature presented on device beyond maximum allowed seats.',
      concept: 'Replay Protection & Seat Limits',
      color: 'border-cyan-500/30 text-cyan-400',
    },
    {
      id: 7,
      title: 'Test 7: Signature Bit Corruption',
      desc: 'Corrupt the base64 signature string directly; RSA-PSS padding check fails.',
      concept: 'Cryptanalysis & Padding Verification',
      color: 'border-rose-500/30 text-rose-400',
    },
  ];

  const handleRunSelectedTest = async (testId: number) => {
    setSelectedTestId(testId);
    setIsRunning(true);
    try {
      const scenario = await onRunTest(testId);
      setActiveScenario(scenario);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSandboxTamper = async () => {
    if (!sandboxLic) return;
    setIsSandboxRunning(true);
    try {
      // Clone license file
      const cloned: SignedLicenseFile = JSON.parse(JSON.stringify(sandboxLic));

      if (tamperField === 'signature_b64') {
        cloned.signature_b64 = 'AAAA' + cloned.signature_b64.substring(4);
      } else if (tamperField === 'expiry_date') {
        cloned.license_payload.expiry_date = tamperValue;
      } else if (tamperField === 'customer_name') {
        cloned.license_payload.customer_name = tamperValue;
      } else if (tamperField === 'max_activations') {
        cloned.license_payload.max_activations = Number(tamperValue) || 999;
      }

      const res = await onVerifyCustom(cloned);
      setSandboxResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSandboxRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
          <FlaskConical className="w-4 h-4" />
          <span>VTU BCS703 Cryptographic Lab Evaluation</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Security Testing & Attack Simulation Lab</h2>
        <p className="text-xs text-slate-400">
          Execute real cryptographic test vectors, inspect intermediate mathematical state, and evaluate attack resistance
        </p>
      </div>

      {/* 7-Test Suite Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {testDefinitions.map((test) => {
          const isSelected = selectedTestId === test.id;
          return (
            <button
              key={test.id}
              onClick={() => handleRunSelectedTest(test.id)}
              className={`p-3.5 rounded-xl border text-left transition-colors flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-950'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono font-bold uppercase ${test.color}`}>
                    {test.concept}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">#{test.id}</span>
                </div>
                <h4 className="font-bold text-xs text-white mb-1">{test.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{test.desc}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">1-Click Test</span>
                <Play className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Test Execution Output Console */}
      {activeScenario && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Scenario {activeScenario.id}
                </span>
                <h3 className="text-base font-bold text-white">{activeScenario.title}</h3>
              </div>
              <p className="text-xs text-slate-400">{activeScenario.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Outcome:</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    activeScenario.passed
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {activeScenario.actual_verdict}
                </span>
              </div>
              <button
                onClick={() => handleRunSelectedTest(activeScenario.id)}
                disabled={isRunning}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Re-run test scenario"
              >
                <RotateCcw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Test Steps Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cryptographic Execution Trace</span>
            </h4>

            <div className="space-y-2">
              {activeScenario.steps.map((step) => {
                let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                if (step.badge === 'success') {
                  badgeClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                } else if (step.badge === 'danger') {
                  badgeClass = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                } else if (step.badge === 'warning') {
                  badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                } else if (step.badge === 'info') {
                  badgeClass = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
                }

                return (
                  <div
                    key={step.step_number}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500">Step {step.step_number}:</span>
                        <span className="font-semibold text-slate-200">{step.actor}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-300">{step.action}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 pl-4 border-l border-slate-800">
                        {step.crypto_process}
                      </div>
                      <div className="font-mono text-[11px] text-indigo-300 pl-4">
                        {step.state_data}
                      </div>
                    </div>

                    <span
                      className={`self-start md:self-center px-2 py-0.5 rounded text-[11px] font-mono border whitespace-nowrap ${badgeClass}`}
                    >
                      {step.badge_label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Viva Takeaway Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Academic Takeaway for Assignment Evaluation:</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              {activeScenario.academic_takeaway}
            </p>
          </div>
        </div>
      )}

      {/* Live Tampering Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white">Interactive Tampering Sandbox</h3>
              <p className="text-xs text-slate-400">
                Manually alter signed license attributes and witness the cryptographic signature verification failure in real time
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Select Base License to Attack</label>
            <select
              value={sandboxLic?.license_payload.license_id || ''}
              onChange={(e) => {
                const found = licenses.find((l) => l.license_payload.license_id === e.target.value);
                if (found) {
                  setSandboxLic(found);
                  setSandboxResult(null);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
            >
              {licenses.map((l) => (
                <option key={l.license_payload.license_id} value={l.license_payload.license_id}>
                  {l.license_payload.license_id} ({l.license_payload.customer_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Field to Tamper With</label>
            <select
              value={tamperField}
              onChange={(e) => {
                const val = e.target.value as any;
                setTamperField(val);
                if (val === 'expiry_date') setTamperValue('2099-12-31T23:59:59Z');
                if (val === 'customer_name') setTamperValue('Mallory (The Attacker)');
                if (val === 'max_activations') setTamperValue('999');
                if (val === 'signature_b64') setTamperValue('Corrupt Signature Bytes');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="expiry_date">expiry_date (Illegal Time Extension)</option>
              <option value="customer_name">customer_name (Unauthorized Transfer)</option>
              <option value="max_activations">max_activations (Seat Inflation)</option>
              <option value="signature_b64">signature_b64 (Bit-Flip in Signature)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Tampered Value</label>
            <input
              type="text"
              value={tamperValue}
              onChange={(e) => setTamperValue(e.target.value)}
              disabled={tamperField === 'signature_b64'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          onClick={handleRunSandboxTamper}
          disabled={isSandboxRunning}
          className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-rose-950"
        >
          <FlaskConical className="w-4 h-4" />
          <span>{isSandboxRunning ? 'Verifying Tampered Signature...' : 'Inject Tampering & Verify'}</span>
        </button>

        {sandboxResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Sandbox Verification Result:</span>
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold border ${
                  sandboxResult.verdict === 'INVALID SIGNATURE'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {sandboxResult.verdict}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed font-sans">
              {sandboxResult.academic_explanation}
            </p>

            <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800 break-all space-y-1">
              <div>Computed SHA-256: <span className="text-slate-200">{sandboxResult.stages.sha256_computed}</span></div>
              <div>RSA-PSS Math Result: <span className={sandboxResult.stages.signature_valid ? 'text-emerald-400' : 'text-rose-400'}>{sandboxResult.stages.signature_valid ? 'Valid' : 'Invalid / Padding Rejected'}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

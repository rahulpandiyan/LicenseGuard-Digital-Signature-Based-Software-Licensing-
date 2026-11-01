import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  FileCode,
  RefreshCw,
  Bug,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FolderGit2,
} from 'lucide-react';
import type { SignedAppManifest, AppFileEntry, IntegrityScanResult } from '../types/license.ts';

export const IntegrityScannerView: React.FC = () => {
  const [manifests, setManifests] = useState<SignedAppManifest[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('PROD-001');
  const [scanResult, setScanResult] = useState<IntegrityScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const fetchManifestsAndScan = async () => {
    setIsScanning(true);
    try {
      const manRes = await fetch('/api/manifests').then((r) => r.json());
      if (Array.isArray(manRes)) setManifests(manRes);

      const scanRes = await fetch(`/api/integrity/scan?appId=${selectedAppId}`).then((r) =>
        r.json()
      );
      setScanResult(scanRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchManifestsAndScan();
  }, [selectedAppId]);

  const handleTamperFile = async (filePath: string, action: 'tamper' | 'delete' | 'restore') => {
    setIsMutating(true);
    try {
      await fetch('/api/integrity/tamper-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: selectedAppId, filePath, action }),
      });
      await fetchManifestsAndScan();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMutating(false);
    }
  };

  const activeManifest = manifests.find((m) => m.app_id === selectedAppId) || manifests[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <FolderGit2 className="w-4 h-4" />
            <span>Cryptographic Release Verification</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Application Integrity Scanner</h2>
          <p className="text-xs text-slate-400">
            Verify installed application executables, dynamic libraries, and assets against publisher-signed release manifests
          </p>
        </div>

        <button
          onClick={fetchManifestsAndScan}
          disabled={isScanning || isMutating}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-colors disabled:opacity-50 shadow-sm shadow-indigo-950"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Files...' : 'Run Full Integrity Scan'}</span>
        </button>
      </div>

      {/* Target Application & Manifest Information Card */}
      {activeManifest && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {activeManifest.app_id}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {activeManifest.app_name} ({activeManifest.version})
              </h3>
              <p className="text-xs text-slate-400">
                Publisher: <strong className="text-slate-200">{activeManifest.publisher_id}</strong> · Signing Key:{' '}
                <strong className="text-slate-200 font-mono">{activeManifest.key_id}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Manifest Digital Signature:</span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>RSA-PSS Verified</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs text-slate-400 break-all space-y-1">
            <div>
              Manifest SHA-256 Digest: <span className="text-slate-200">{activeManifest.manifest_digest}</span>
            </div>
            <div>
              RSA-PSS Signature Prefix: <span className="text-indigo-400">{activeManifest.signature_b64.slice(0, 48)}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Scan Results Banner */}
      {scanResult && (
        <div
          className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            scanResult.status === 'INTEGRITY_VERIFIED'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {scanResult.status === 'INTEGRITY_VERIFIED' ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  Integrity Verdict:
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-current">
                  {scanResult.status}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed font-sans opacity-90 max-w-2xl">
                {scanResult.academic_explanation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
            <div className="text-center px-3 py-1.5 rounded bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Files Intact</span>
              <span className="text-base font-bold text-emerald-400">
                {scanResult.files_intact} / {scanResult.files_scanned}
              </span>
            </div>
            {scanResult.modified_files.length > 0 && (
              <div className="text-center px-3 py-1.5 rounded bg-slate-950/50 border border-rose-500/30">
                <span className="text-[10px] text-slate-400 block font-sans">Modified</span>
                <span className="text-base font-bold text-rose-400">
                  {scanResult.modified_files.length}
                </span>
              </div>
            )}
            {scanResult.missing_files.length > 0 && (
              <div className="text-center px-3 py-1.5 rounded bg-slate-950/50 border border-rose-500/30">
                <span className="text-[10px] text-slate-400 block font-sans">Missing</span>
                <span className="text-base font-bold text-rose-400">
                  {scanResult.missing_files.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Installed Files Matrix & Interactive Attack Simulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white text-base">Protected Release Files</h3>
            <p className="text-xs text-slate-400">Individual file checksum comparisons against the signed manifest</p>
          </div>

          <button
            onClick={() => handleTamperFile('', 'restore')}
            disabled={isMutating}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Restore All Clean Binaries</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-medium uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Relative File Path</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Manifest Expected SHA-256</th>
                <th className="py-3 px-4">Installed Integrity Status</th>
                <th className="py-3 px-4 text-right">Tampering Simulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {activeManifest?.files.map((file) => {
                const isModified = scanResult?.modified_files.some((f) => f.path === file.relative_path);
                const isMissing = scanResult?.missing_files.includes(file.relative_path);

                let statusBadge = (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Intact & Authentic</span>
                  </span>
                );

                if (isMissing) {
                  statusBadge = (
                    <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Missing from Disk</span>
                    </span>
                  );
                } else if (isModified) {
                  statusBadge = (
                    <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Checksum Mismatch (Modified)</span>
                    </span>
                  );
                }

                return (
                  <tr key={file.relative_path} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {file.relative_path}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] uppercase font-mono border border-slate-800">
                        {file.file_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs" title={file.sha256}>
                      {file.sha256.slice(0, 24)}...
                    </td>
                    <td className="py-3 px-4 font-sans font-medium">{statusBadge}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleTamperFile(file.relative_path, 'tamper')}
                          disabled={isMutating}
                          title="Inject Hex Modification into File"
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Bug className="w-3 h-3" />
                          <span>Tamper File</span>
                        </button>
                        <button
                          onClick={() => handleTamperFile(file.relative_path, 'delete')}
                          disabled={isMutating}
                          title="Simulate Deleting File"
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Academic Explanation of Application Integrity Limitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 space-y-2">
        <h4 className="font-semibold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>Academic Scope & Limitations of Manifest-Based Integrity Scanning:</span>
        </h4>
        <p className="leading-relaxed font-sans">
          The <strong>Application Integrity Scanner</strong> detects modifications, unauthorized additions, or missing files covered by the publisher's digitally signed manifest. However, in software security engineering:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400 font-sans">
          <li>
            It detects static binary patches on disk before execution.
          </li>
          <li>
            It <em>cannot</em> prevent dynamic in-memory code injection (e.g. DLL injection, API hooking) occurring after the application process has started.
          </li>
          <li>
            It relies on the verifier trusting the publisher's registered public key. If the manifest is signed with an untrusted or self-generated key, the system flags it as unauthorized.
          </li>
        </ul>
      </div>
    </div>
  );
};

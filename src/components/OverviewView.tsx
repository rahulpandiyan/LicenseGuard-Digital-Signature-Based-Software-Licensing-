import React from 'react';
import {
  ShieldCheck,
  Package,
  FileCheck2,
  AlertTriangle,
  XCircle,
  Laptop,
  ArrowRight,
  FlaskConical,
  Key,
  FolderGit2,
  Users,
  Building2,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import type { ActiveTab } from './Navbar.tsx';
import type { VerificationLog, PublisherKey } from '../types/license.ts';

interface OverviewViewProps {
  stats: {
    totalProducts: number;
    totalLicenses: number;
    totalPublishers?: number;
    totalCustomers?: number;
    activeLicenses: number;
    expiredLicenses: number;
    revokedLicenses: number;
    activeActivations: number;
    successfulVerifications: number;
    failedVerifications: number;
  };
  keys: PublisherKey[];
  history: VerificationLog[];
  setActiveTab: (tab: ActiveTab) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  keys,
  history,
  setActiveTab,
}) => {
  const trustedKey = keys.find((k) => k.is_trusted && k.is_active);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl border border-slate-800 p-6 md:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>VTU BCS703 Cryptography & Network Security</span>
            <span>·</span>
            <span>RSA-PSS & SHA-256</span>
            <span>·</span>
            <span>Six-Stage Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance">
            LicenseGuard – Digital Signature Software Licensing & Integrity System
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-300 leading-relaxed">
            A production-grade educational platform demonstrating public-key cryptography (RSA-PSS with SHA-256), Trusted Publisher Key Registries, Licence Revocation Lists (LRL), and signed Application Integrity Scanning.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('issue')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-indigo-950"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Issue Signed Licence</span>
            </button>
            <button
              onClick={() => setActiveTab('activate')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Activate / Six-Stage Verify</span>
            </button>
            <button
              onClick={() => setActiveTab('integrity')}
              className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Application Integrity Scanner</span>
            </button>
            <button
              onClick={() => setActiveTab('lab')}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              <span>10-Test Security Lab</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Software Products</span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {stats.totalProducts}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Catalog entries</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Customers</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
            {stats.totalCustomers || 4}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Registered licensees</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Licences</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {stats.activeLicenses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Authentic & valid</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Expired</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {stats.expiredLicenses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Signature intact</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Revoked (LRL)</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {stats.revokedLicenses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">LRL blacklisted</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Devices</span>
            <Laptop className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
            {stats.activeActivations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Simulated seats</div>
        </div>
      </div>

      {/* Grid: Six-Stage Engine & Security Testing Lab */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Six-Stage Engine Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Six-Stage Verification Engine</h3>
                <span className="text-xs text-slate-400">Architecture Specification</span>
              </div>
            </div>

            <ol className="space-y-1.5 text-xs text-slate-300 font-mono">
              <li className="flex items-center gap-1.5">
                <span className="text-indigo-400">1.</span>
                <span>Canonical JSON serialization</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-indigo-400">2.</span>
                <span>SHA-256 message hashing</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-indigo-400">3.</span>
                <span>RSA-PSS signature verification</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-amber-400">4.</span>
                <span>Licence validity & expiry check</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-rose-400">5.</span>
                <span>Licence Revocation List (LRL)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-cyan-400">6.</span>
                <span>Device activation seat quota</span>
              </li>
            </ol>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Strict Cryptographic Separation</span>
            <button
              onClick={() => setActiveTab('activate')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>Test Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Trusted Publisher Registry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Trusted Publisher Registry</h3>
                  <span className="text-xs text-slate-400 font-mono">PKI Trust Anchor</span>
                </div>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Root Active
              </span>
            </div>

            {trustedKey ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block">Authority:</span>
                  <span className="font-medium text-slate-200">{trustedKey.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Key ID:</span>
                  <span className="font-mono text-slate-300">{trustedKey.key_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SHA-256 Fingerprint:</span>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                    {trustedKey.fingerprint}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Encrypted at rest (AES-256-GCM)</span>
            <button
              onClick={() => setActiveTab('publishers')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Application Integrity Scanner Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Application Integrity Scanner</h3>
                <span className="text-xs text-slate-400">Binary Modification Defense</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Protects applications from executable hex-patching, unauthorized binary replacement, or deleted security libraries by verifying installed files against digitally signed release manifests.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <span className="px-2 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
                Signed Manifest
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-rose-400 border border-slate-800">
                Binary Patches
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-amber-400 border border-slate-800">
                Missing DLLs
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                SHA-256 Hashes
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Live Binary Tampering Lab</span>
            <button
              onClick={() => setActiveTab('integrity')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>Launch Scanner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Verification History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-base">Recent Verification Audit Trail</h3>
            <p className="text-xs text-slate-400">Immutable audit log of verification checks and verdicts</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-medium uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Licence ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Signature Integrity</th>
                <th className="py-3 px-4">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {history.slice(0, 5).map((log) => {
                let badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                if (log.verdict === 'INVALID SIGNATURE') {
                  badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                } else if (log.verdict === 'UNKNOWN OR UNTRUSTED PUBLISHER') {
                  badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                } else if (log.verdict === 'LICENCE EXPIRED') {
                  badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                } else if (log.verdict === 'LICENCE REVOKED') {
                  badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                } else if (log.verdict === 'ACTIVATION LIMIT EXCEEDED') {
                  badgeClass = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{log.timestamp.replace('T', ' ').slice(0, 19)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{log.license_id}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{log.customer_name}</td>
                    <td className="py-3 px-4 text-slate-300 font-sans">{log.product_name}</td>
                    <td className="py-3 px-4">
                      {log.signature_valid ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>RSA-PSS Valid</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1 font-sans">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Invalid / Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold border ${badgeClass}`}>
                        {log.verdict}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

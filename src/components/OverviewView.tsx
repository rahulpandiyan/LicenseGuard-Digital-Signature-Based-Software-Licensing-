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
  Lock,
  Layers,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import type { ActiveTab } from './Navbar.tsx';
import type { VerificationLog, PublisherKey } from '../types/license.ts';

interface OverviewViewProps {
  stats: {
    totalProducts: number;
    totalLicenses: number;
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
      {/* Hero Banner / Academic Introduction */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl border border-slate-800 p-6 md:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span>VTU BCS703 Cryptography & Network Security</span>
            <span>·</span>
            <span>RSA-2048 / RSA-PSS</span>
            <span>·</span>
            <span>SHA-256</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance">
            Digital Signature-Based Software Licensing & Activation System
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-300 leading-relaxed">
            A practical simulation of commercial software licensing (Windows, Adobe, JetBrains) demonstrating public-key cryptography, deterministic SHA-256 payload hashing, tamper detection, and independent business-rule validation.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('issue')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-indigo-950"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Issue New Signed License</span>
            </button>
            <button
              onClick={() => setActiveTab('activate')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Activate / Verify License</span>
            </button>
            <button
              onClick={() => setActiveTab('lab')}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Launch 7-Test Security Lab</span>
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
            <span className="text-xs font-medium">Licenses Issued</span>
            <FileCheck2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
            {stats.totalLicenses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Digitally signed</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Licenses</span>
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
            <span className="text-xs font-medium">Revoked (CRL)</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {stats.revokedLicenses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Blacklisted seats</div>
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

      {/* Grid: Active Key Pair & Academic Principles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Publisher Key Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Active Publisher Key</h3>
                  <span className="text-xs text-slate-400 font-mono">RSA-PSS / SHA-256</span>
                </div>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Trusted Root
              </span>
            </div>

            {trustedKey ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Authority Name:</span>
                  <span className="font-medium text-slate-200">{trustedKey.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Key Identifier:</span>
                  <span className="font-mono text-slate-300">{trustedKey.key_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Public Key Fingerprint (SHA-256):</span>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
                    {trustedKey.fingerprint}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">No active trusted key found.</div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Key Size: 2048 bits</span>
            <button
              onClick={() => setActiveTab('keys')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>Manage Key Rings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Academic Concept Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Central Academic Concept</h3>
                <span className="text-xs text-slate-400">VTU BCS703 Syllabus Core</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed space-y-2">
              <strong className="text-indigo-300 block">Digital Signature vs. License Validity:</strong>
              A digital signature mathematically guarantees <span className="text-emerald-300">authenticity</span> (issued by publisher) and <span className="text-emerald-300">integrity</span> (unaltered). However, it does <strong className="text-amber-300">not</strong> imply authorization. The software must separately verify:
            </p>

            <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Temporal validity</strong> (expiry date checking)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Revocation status</strong> (Certificate Revocation List / CRL)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Hardware seat quota</strong> (multi-device activation limits)</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">RSA-PSS with MGF1 Salt</span>
            <button
              onClick={() => setActiveTab('visualizer')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>Explore Cryptographic Flow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Testing Lab Trigger */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Security Testing Lab</h3>
                <span className="text-xs text-slate-400">7 Real Cryptographic Attack Tests</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Verify actual system behavior under authentic conditions: genuine verification, data tampering, wrong public key injection, expired licenses, CRL revoking, quota limits, and bit-flipped signature corruptions.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <span className="px-2 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800">
                1. Genuine Check
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-rose-400 border border-slate-800">
                2. Data Tampering
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-amber-400 border border-slate-800">
                3. Rogue Key Attack
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800">
                4. Expired Rule
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-rose-400 border border-slate-800">
                5. Revocation CRL
              </span>
              <span className="px-2 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                6. Seat Quotas
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Automated Viva Suite</span>
            <button
              onClick={() => setActiveTab('lab')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              <span>Run Lab Test Suite</span>
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
            <p className="text-xs text-slate-400">Immutable audit log of recent license verification events</p>
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
                <th className="py-3 px-4">License ID</th>
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
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>RSA-PSS Valid</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
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

import React, { useState } from 'react';
import { History, Search, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { VerificationLog } from '../types/license.ts';

interface HistoryViewProps {
  history: VerificationLog[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.license_id.toLowerCase().includes(search.toLowerCase()) ||
      item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.device_id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'ALL') return true;
    return item.verdict === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Verification Audit Trail</h2>
          <p className="text-xs text-slate-400">
            Immutable log of all cryptographic checks, tamper detections, and authorization decisions
          </p>
        </div>
      </div>

      {/* Search and Verdict Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by License, Customer, Product, or Device..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-xs">
          {['ALL', 'VALID LICENCE', 'INVALID SIGNATURE', 'LICENCE EXPIRED', 'LICENCE REVOKED', 'ACTIVATION LIMIT EXCEEDED'].map(
            (v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                  filter === v
                    ? 'bg-slate-800 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v === 'ALL' ? 'All Logs' : v}
              </button>
            )
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-medium uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Event Timestamp</th>
                <th className="py-3 px-4">License ID</th>
                <th className="py-3 px-4">Customer & Product</th>
                <th className="py-3 px-4">Device Node</th>
                <th className="py-3 px-4">Signature Integrity</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No verification log entries found matching filter.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  let badgeClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  if (item.verdict === 'INVALID SIGNATURE') {
                    badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  } else if (item.verdict === 'LICENCE EXPIRED') {
                    badgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                  } else if (item.verdict === 'LICENCE REVOKED') {
                    badgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  } else if (item.verdict === 'ACTIVATION LIMIT EXCEEDED') {
                    badgeClass = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {item.timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">{item.license_id}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="text-white font-medium">{item.customer_name}</div>
                        <div className="text-slate-400 text-[11px]">{item.product_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{item.device_id}</td>
                      <td className="py-3 px-4">
                        {item.signature_valid ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>RSA-PSS Valid</span>
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Failed / Tampered</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold border ${badgeClass}`}>
                          {item.verdict}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px] max-w-xs truncate" title={item.details}>
                        {item.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

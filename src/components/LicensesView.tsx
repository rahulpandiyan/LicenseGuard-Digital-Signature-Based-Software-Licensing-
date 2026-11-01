import React, { useState } from 'react';
import {
  FileCheck2,
  Search,
  Download,
  Copy,
  Check,
  Ban,
  Eye,
  AlertTriangle,
  X,
  FileCode,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import type { LicenseRecord } from '../types/license.ts';

interface LicensesViewProps {
  licenses: LicenseRecord[];
  onRevokeLicense: (licenseId: string, reason: string) => Promise<void>;
  onInspectLicense: (license: LicenseRecord) => void;
}

export const LicensesView: React.FC<LicensesViewProps> = ({
  licenses,
  onRevokeLicense,
  onInspectLicense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Revocation Modal state
  const [revokingLicense, setRevokingLicense] = useState<LicenseRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('Administrative policy revocation');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter licenses
  const now = new Date();
  const filteredLicenses = licenses.filter((lic) => {
    const payload = lic.license_payload;
    const matchesSearch =
      payload.license_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.formatted_license_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payload.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payload.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payload.product_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isRevoked = lic.revocation !== undefined || payload.license_status === 'REVOKED';
    const isExpired = payload.expiry_date !== 'LIFETIME' && new Date(payload.expiry_date) < now;

    if (statusFilter === 'ACTIVE') return !isRevoked && !isExpired;
    if (statusFilter === 'EXPIRED') return isExpired && !isRevoked;
    if (statusFilter === 'REVOKED') return isRevoked;
    return true;
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadLic = (lic: LicenseRecord) => {
    const jsonStr = JSON.stringify(lic, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lic.license_payload.license_id}.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingLicense) return;
    setIsSubmitting(true);
    try {
      await onRevokeLicense(revokingLicense.license_payload.license_id, revokeReason);
      setRevokingLicense(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Issued Customer Licenses</h2>
          <p className="text-xs text-slate-400">Cryptographically signed software licenses, formatted product keys, and revocation control</p>
        </div>
      </div>

      {/* Search and Segmented Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by License ID, Key, Customer, or Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Segmented Filter Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Licenses ({licenses.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('EXPIRED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'EXPIRED'
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => setStatusFilter('REVOKED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'REVOKED'
                ? 'bg-rose-500/20 text-rose-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Revoked
          </button>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-medium uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">License Identifier</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Product & Type</th>
                <th className="py-3 px-4">Validity / Expiry</th>
                <th className="py-3 px-4">Seat Quota</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No matching licenses found.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => {
                  const payload = lic.license_payload;
                  const isRevoked = lic.revocation !== undefined || payload.license_status === 'REVOKED';
                  const isExpired = payload.expiry_date !== 'LIFETIME' && new Date(payload.expiry_date) < now;

                  let statusText = 'ACTIVE';
                  let statusBadge = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                  if (isRevoked) {
                    statusText = 'REVOKED';
                    statusBadge = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  } else if (isExpired) {
                    statusText = 'EXPIRED';
                    statusBadge = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                  }

                  return (
                    <tr key={payload.license_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{payload.license_id}</div>
                        <div className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5">
                          <span>{lic.formatted_license_key}</span>
                          <button
                            onClick={() => handleCopyKey(lic.formatted_license_key)}
                            title="Copy License Key"
                            className="hover:text-white"
                          >
                            {copiedKey === lic.formatted_license_key ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-white">{payload.customer_name}</div>
                        <div className="text-slate-400 text-[11px]">{payload.customer_email}</div>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="text-slate-200 font-medium">{payload.product_name}</div>
                        <div className="text-[11px] text-slate-400">{payload.license_type}</div>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        <div className="text-slate-300">
                          Expires: {payload.expiry_date === 'LIFETIME' ? 'Never (Lifetime)' : payload.expiry_date.slice(0, 10)}
                        </div>
                        <div className="text-slate-500">Issued: {payload.issue_date.slice(0, 10)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200">
                          {lic.current_activations} / {payload.max_activations}
                        </span>
                        <span className="text-[11px] text-slate-500 block font-sans">devices</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold border ${statusBadge}`}>
                          {statusText}
                        </span>
                        {isRevoked && lic.revocation && (
                          <span className="block text-[10px] text-rose-400 font-sans mt-0.5 truncate max-w-[140px]" title={lic.revocation.reason}>
                            {lic.revocation.reason}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onInspectLicense(lic)}
                            title="Inspect Cryptographic Signature"
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadLic(lic)}
                            title="Download .lic signed file"
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!isRevoked && (
                            <button
                              onClick={() => setRevokingLicense(lic)}
                              title="Revoke License on CRL"
                              className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
      {revokingLicense && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Revoke Customer License</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Revoking adds <span className="font-mono font-bold text-white">{revokingLicense.license_payload.license_id}</span> ({revokingLicense.license_payload.customer_name}) to the Certificate Revocation List (CRL). Any subsequent activation or validation checks will be rejected.
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Revocation Reason</label>
                <input
                  type="text"
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g., Refund issued, chargeback, or key compromise"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevokingLicense(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

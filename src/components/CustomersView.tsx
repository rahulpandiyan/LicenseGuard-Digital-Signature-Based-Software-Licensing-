import React, { useState } from 'react';
import { Users, Plus, Mail, Building, FileCheck2, X } from 'lucide-react';
import type { Customer, LicenseRecord } from '../types/license.ts';

interface CustomersViewProps {
  customers: Customer[];
  licenses: LicenseRecord[];
  onAddCustomer: (data: Omit<Customer, 'id' | 'created_at'>) => Promise<void>;
  onIssueForCustomer: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  licenses,
  onAddCustomer,
  onIssueForCustomer,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsSubmitting(true);
    try {
      await onAddCustomer({ name, email, organization });
      setShowModal(false);
      setName('');
      setEmail('');
      setOrganization('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Customer Registry</h2>
          <p className="text-xs text-slate-400">
            Registered license holders, authorized entities, and allocated software rights
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-colors shadow-sm shadow-indigo-950"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((cust) => {
          const customerLicenses = licenses.filter(
            (l) => l.license_payload.customer_id === cust.id || l.license_payload.customer_name === cust.name
          );

          return (
            <div
              key={cust.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {cust.id}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Registered {cust.created_at.slice(0, 10)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{cust.name}</h3>
                <div className="text-xs text-slate-400 space-y-1 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{cust.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{cust.organization}</span>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 text-xs">
                  <span className="text-slate-400 block mb-1">Active Licences ({customerLicenses.length}):</span>
                  {customerLicenses.length === 0 ? (
                    <span className="text-slate-500 font-mono text-[11px]">No licences issued yet</span>
                  ) : (
                    <div className="space-y-1 font-mono text-[11px]">
                      {customerLicenses.map((l) => (
                        <div key={l.license_payload.license_id} className="flex justify-between text-slate-300">
                          <span>{l.license_payload.license_id}</span>
                          <span className="text-indigo-400">{l.license_payload.license_type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => onIssueForCustomer(cust)}
                  className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Issue Licence</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Register New Customer</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane.doe@university.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Cambridge Computing Lab"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

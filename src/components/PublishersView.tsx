import React from 'react';
import { ShieldCheck, ShieldAlert, Key, Globe, Building2, CheckCircle2, XCircle } from 'lucide-react';
import type { Publisher, PublisherKey } from '../types/license.ts';

interface PublishersViewProps {
  publishers: Publisher[];
  keys: PublisherKey[];
  onGoToKeys: () => void;
}

export const PublishersView: React.FC<PublishersViewProps> = ({
  publishers,
  keys,
  onGoToKeys,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Trusted Publisher Key Registry</h2>
          <p className="text-xs text-slate-400">
            Registered software publishers, public-key trust hierarchies, and publisher identification
          </p>
        </div>
      </div>

      {/* Trust Architecture Callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Critical Security Rule: No Blind Public Key Trust</strong>
          In standard PKI and commercial licensing, clients must <em>never</em> accept an arbitrary public key simply because a user or attacker uploaded it. The system queries the <strong>Trusted Publisher Key Registry</strong>. If a licence is signed with a key from an unregistered or revoked authority, verification aborts immediately with <span className="text-rose-400 font-mono">UNKNOWN OR UNTRUSTED PUBLISHER</span>.
        </div>
      </div>

      {/* Publishers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {publishers.map((pub) => {
          const associatedKeys = keys.filter((k) => k.publisher_id === pub.publisher_id);

          return (
            <div
              key={pub.publisher_id}
              className={`bg-slate-900 border rounded-xl p-5 md:p-6 flex flex-col justify-between transition-colors ${
                pub.is_trusted
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {pub.publisher_id}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                      pub.is_trusted
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    }`}
                  >
                    {pub.is_trusted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{pub.is_trusted ? 'Trusted Publisher' : 'Untrusted / Rogue Authority'}</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{pub.name}</h3>
                <div className="text-xs text-slate-400 space-y-1 mb-4 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{pub.organization}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-indigo-400 text-[11px]">{pub.website}</span>
                  </div>
                </div>

                {/* Associated Registered Keys */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Registered Public Keys ({associatedKeys.length}):
                  </span>
                  {associatedKeys.map((k) => (
                    <div
                      key={k.key_id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{k.key_id}</span>
                        <span className="text-[10px] text-slate-400 font-sans">RSA-{k.key_size}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 break-all">
                        Fingerprint: {k.fingerprint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">Status: {pub.status}</span>
                <button
                  onClick={onGoToKeys}
                  className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Key Ring Operations</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

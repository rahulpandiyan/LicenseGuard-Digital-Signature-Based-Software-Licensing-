import React from 'react';
import { Laptop, Cpu, Server, HardDrive, Ban, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { ActivationRecord, DeviceProfile } from '../types/license.ts';

interface DevicesViewProps {
  activations: ActivationRecord[];
  currentDevice: DeviceProfile;
  devices: DeviceProfile[];
  onSelectDevice: (device: DeviceProfile) => void;
  onDeactivateDevice: (activationId: string) => Promise<void>;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  activations,
  currentDevice,
  devices,
  onSelectDevice,
  onDeactivateDevice,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Activated Devices & Node Seats</h2>
          <p className="text-xs text-slate-400">
            Hardware-bound activation records, device quotas, and seat de-provisioning controls
          </p>
        </div>
      </div>

      {/* Hardware Profile Sandbox Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Simulated Hardware Profiles (Client Sandbox)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Switch the active hardware identity to test how the server enforces multi-device seat allowances when different machines present the same digitally signed license file.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {devices.map((dev) => {
            const isCurrent = dev.device_id === currentDevice.device_id;
            let Icon = Laptop;
            if (dev.device_id.includes('SERVER')) Icon = Server;
            if (dev.device_id.includes('CONTAINER')) Icon = HardDrive;

            return (
              <div
                key={dev.device_id}
                onClick={() => onSelectDevice(dev)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600/15 border-indigo-500/50 shadow-sm shadow-indigo-950'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="font-semibold text-xs text-white">{dev.device_name}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                  <div className="truncate text-slate-300">{dev.os}</div>
                  <div className="truncate text-slate-500">Hash: {dev.hardware_hash}</div>
                  <div className="text-slate-500">IP: {dev.ip_address}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activated Devices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-800">
          <h3 className="font-semibold text-white text-base">Registered Device Activation Records</h3>
          <p className="text-xs text-slate-400">Current device seats claimed against active software licenses</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-medium uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Activation Record ID</th>
                <th className="py-3 px-4">License ID</th>
                <th className="py-3 px-4">Device Name & OS</th>
                <th className="py-3 px-4">Hardware Fingerprint</th>
                <th className="py-3 px-4">Activated Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {activations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No active device activations recorded yet.
                  </td>
                </tr>
              ) : (
                activations.map((act) => {
                  const isActive = act.status === 'ACTIVE';

                  return (
                    <tr key={act.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200">{act.id}</td>
                      <td className="py-3 px-4 text-indigo-400 font-semibold">{act.license_id}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="text-white font-medium">{act.device_name}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{act.os}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{act.hardware_hash}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {act.activated_at.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isActive ? (
                          <button
                            onClick={() => onDeactivateDevice(act.id)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded text-[11px] font-sans font-medium transition-colors"
                          >
                            Deactivate Seat
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-sans">Deactivated</span>
                        )}
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

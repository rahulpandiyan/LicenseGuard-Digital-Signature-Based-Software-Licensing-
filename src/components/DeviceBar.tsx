import React from 'react';
import { Laptop, Server, HardDrive, MonitorCheck, HelpCircle } from 'lucide-react';
import type { DeviceProfile } from '../types/license.ts';

interface DeviceBarProps {
  currentDevice: DeviceProfile;
  devices: DeviceProfile[];
  onSelectDevice: (device: DeviceProfile) => void;
}

export const DeviceBar: React.FC<DeviceBarProps> = ({
  currentDevice,
  devices,
  onSelectDevice,
}) => {
  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-semibold text-slate-300">Simulated Hardware Node:</span>
          <span className="font-mono text-indigo-400">{currentDevice.device_name}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-400">{currentDevice.os}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-400">Hash: {currentDevice.hardware_hash}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Switch Machine Profile:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {devices.map((dev) => {
              const isSelected = dev.device_id === currentDevice.device_id;
              let Icon = Laptop;
              if (dev.device_id.includes('SERVER')) Icon = Server;
              if (dev.device_id.includes('CONTAINER')) Icon = HardDrive;
              if (dev.device_id.includes('WORKSTATION')) Icon = MonitorCheck;

              return (
                <button
                  key={dev.device_id}
                  onClick={() => onSelectDevice(dev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-medium'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{dev.device_name.split('-')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

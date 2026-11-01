import React from 'react';
import { Shield, Cpu, Key, FileCheck, FlaskConical, BookOpen, Layers } from 'lucide-react';
import type { DeviceProfile } from '../types/license.ts';

export type ActiveTab = 
  | 'overview' 
  | 'products' 
  | 'licenses' 
  | 'issue' 
  | 'activate' 
  | 'keys' 
  | 'devices' 
  | 'lab' 
  | 'history' 
  | 'visualizer' 
  | 'learn';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentDevice: DeviceProfile;
  devices: DeviceProfile[];
  onSelectDevice: (device: DeviceProfile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentDevice,
  devices,
  onSelectDevice,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element wordmark */}
          <button 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/30 transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                LicenseGuard
              </span>
              <span className="text-xs text-slate-400 font-mono block">
                VTU BCS703 · RSA-PSS & SHA-256
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'products'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('licenses')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'licenses'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Licenses
            </button>
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'issue'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Issue
            </button>
            <button
              onClick={() => setActiveTab('activate')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'activate'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Activate
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'keys'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Keys
            </button>
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'devices'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Devices
            </button>
            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'lab'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Testing Lab</span>
            </button>
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'visualizer'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visualizer</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('learn')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'learn'
                  ? 'bg-slate-800 text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>VTU Theory</span>
            </button>
          </nav>

          {/* Zone 3: Active Simulated Hardware Node Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="text-slate-500 block leading-none">Simulated Node:</span>
                <select
                  value={currentDevice.device_id}
                  onChange={(e) => {
                    const dev = devices.find((d) => d.device_id === e.target.value);
                    if (dev) onSelectDevice(dev);
                  }}
                  className="bg-transparent text-emerald-300 font-mono font-medium focus:outline-none cursor-pointer text-xs"
                >
                  {devices.map((d) => (
                    <option key={d.device_id} value={d.device_id} className="bg-slate-900 text-slate-200">
                      {d.device_name} ({d.os.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('activate')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shadow-sm shadow-indigo-900/50 flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Verify / Activate</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

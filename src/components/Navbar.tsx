import React, { useState } from 'react';
import {
  Shield,
  Cpu,
  Key,
  FileCheck,
  FlaskConical,
  BookOpen,
  FolderGit2,
  Users,
  Building2,
  Settings as SettingsIcon,
  Menu,
  X,
  History,
  Layers,
  FileCheck2,
  Package,
} from 'lucide-react';
import type { DeviceProfile } from '../types/license.ts';

export type ActiveTab =
  | 'overview'
  | 'products'
  | 'customers'
  | 'licenses'
  | 'issue'
  | 'activate'
  | 'keys'
  | 'publishers'
  | 'devices'
  | 'integrity'
  | 'lab'
  | 'history'
  | 'visualizer'
  | 'learn'
  | 'settings';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'licenses', label: 'Licences', icon: FileCheck2 },
    { id: 'issue', label: 'Issue', icon: FileCheck },
    { id: 'activate', label: 'Activate', icon: FileCheck, badge: 'Portal' },
    { id: 'keys', label: 'Key Ring', icon: Key },
    { id: 'publishers', label: 'Publishers', icon: Building2 },
    { id: 'devices', label: 'Devices', icon: Cpu },
    { id: 'integrity', label: 'Integrity Scanner', icon: FolderGit2, badge: 'New' },
    { id: 'lab', label: 'Testing Lab', icon: FlaskConical, badge: '10 Tests' },
    { id: 'visualizer', label: 'Visualizer', icon: Layers },
    { id: 'history', label: 'Audit Logs', icon: History },
    { id: 'learn', label: 'VTU Theory', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => handleTabClick('overview')}
            className="flex items-center gap-3 text-left group focus:outline-none shrink-0"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/30 transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white block leading-tight">
                LicenseGuard
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-mono block">
                VTU BCS703 · RSA-PSS & SHA-256
              </span>
            </div>
          </button>

          {/* Zone 2: Desktop Navigation Bar (Primary Links) */}
          <nav className="hidden xl:flex items-center gap-1 text-xs font-medium">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products' },
              { id: 'customers', label: 'Customers' },
              { id: 'licenses', label: 'Licences' },
              { id: 'issue', label: 'Issue' },
              { id: 'activate', label: 'Activate' },
              { id: 'keys', label: 'Keys' },
              { id: 'publishers', label: 'Publishers' },
              { id: 'integrity', label: 'Integrity Scanner' },
              { id: 'lab', label: 'Lab (10 Tests)', highlight: true },
              { id: 'learn', label: 'Theory' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as ActiveTab)}
                className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === item.id
                    ? item.highlight
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                      : 'bg-slate-800 text-white font-semibold shadow-sm'
                    : item.highlight
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Hardware Node Selector & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Simulated Node Selector */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate max-w-[130px] lg:max-w-none">
                <span className="text-slate-500 block leading-none text-[10px]">Active Node:</span>
                <select
                  value={currentDevice.device_id}
                  onChange={(e) => {
                    const dev = devices.find((d) => d.device_id === e.target.value);
                    if (dev) onSelectDevice(dev);
                  }}
                  className="bg-transparent text-emerald-300 font-mono font-medium focus:outline-none cursor-pointer text-xs truncate"
                >
                  {devices.map((d) => (
                    <option key={d.device_id} value={d.device_id} className="bg-slate-900 text-slate-200">
                      {d.device_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => handleTabClick('activate')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shadow-sm shadow-indigo-950 hidden sm:flex items-center gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Verify / Activate</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-slate-950/98 px-4 pt-3 pb-6 space-y-3 max-h-[85vh] overflow-y-auto shadow-2xl">
          <div className="sm:hidden p-3 rounded-lg bg-slate-900 border border-slate-800 mb-2">
            <span className="text-[11px] text-slate-400 block mb-1 font-semibold">Active Hardware Profile:</span>
            <select
              value={currentDevice.device_id}
              onChange={(e) => {
                const dev = devices.find((d) => d.device_id === e.target.value);
                if (dev) onSelectDevice(dev);
              }}
              className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-2 rounded border border-slate-800"
            >
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id} className="bg-slate-900 text-slate-200">
                  {d.device_name} ({d.os.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors font-medium ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

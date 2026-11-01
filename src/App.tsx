import React, { useState, useEffect } from 'react';
import { Navbar, type ActiveTab } from './components/Navbar.tsx';
import { DeviceBar } from './components/DeviceBar.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { LicensesView } from './components/LicensesView.tsx';
import { IssueLicenseView } from './components/IssueLicenseView.tsx';
import { ActivatePortalView } from './components/ActivatePortalView.tsx';
import { KeyManagementView } from './components/KeyManagementView.tsx';
import { PublishersView } from './components/PublishersView.tsx';
import { DevicesView } from './components/DevicesView.tsx';
import { IntegrityScannerView } from './components/IntegrityScannerView.tsx';
import { SecurityLabView } from './components/SecurityLabView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { VisualizerView } from './components/VisualizerView.tsx';
import { LearnView } from './components/LearnView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { LicenseInspectionModal } from './components/LicenseInspectionModal.tsx';

import type {
  Product,
  Customer,
  Publisher,
  PublisherKey,
  LicenseRecord,
  ActivationRecord,
  VerificationLog,
  DeviceProfile,
  VerificationResult,
  LabTestScenario,
  SignedLicenseFile,
  LicenseType,
} from './types/license.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Database states
  const [stats, setStats] = useState({
    totalProducts: 3,
    totalLicenses: 4,
    totalPublishers: 2,
    totalCustomers: 4,
    activeLicenses: 2,
    expiredLicenses: 1,
    revokedLicenses: 1,
    activeActivations: 1,
    successfulVerifications: 1,
    failedVerifications: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [keys, setKeys] = useState<PublisherKey[]>([]);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [activations, setActivations] = useState<ActivationRecord[]>([]);
  const [history, setHistory] = useState<VerificationLog[]>([]);
  const [devices, setDevices] = useState<DeviceProfile[]>([]);
  const [currentDevice, setCurrentDevice] = useState<DeviceProfile>({
    device_id: 'DEV-WIN11-WORKSTATION',
    device_name: 'Workstation-Win11-Pro',
    os: 'Windows 11 Enterprise 23H2 (x86_64)',
    hardware_hash: 'HW-7A9B-4C1E-92D0-AA14',
    ip_address: '192.168.1.104',
  });

  const [inspectingLicense, setInspectingLicense] = useState<LicenseRecord | null>(null);
  const [productForIssuing, setProductForIssuing] = useState<Product | null>(null);
  const [customerForIssuing, setCustomerForIssuing] = useState<Customer | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [statsRes, prodRes, custRes, pubRes, keysRes, licRes, actRes, histRes, devRes] =
        await Promise.all([
          fetch('/api/stats').then((r) => r.json()),
          fetch('/api/products').then((r) => r.json()),
          fetch('/api/customers').then((r) => r.json()),
          fetch('/api/publishers').then((r) => r.json()),
          fetch('/api/keys?admin=true').then((r) => r.json()),
          fetch('/api/licenses').then((r) => r.json()),
          fetch('/api/activations').then((r) => r.json()),
          fetch('/api/history').then((r) => r.json()),
          fetch('/api/devices').then((r) => r.json()),
        ]);

      if (!statsRes.error) setStats(statsRes);
      if (Array.isArray(prodRes)) setProducts(prodRes);
      if (Array.isArray(custRes)) setCustomers(custRes);
      if (Array.isArray(pubRes)) setPublishers(pubRes);
      if (Array.isArray(keysRes)) setKeys(keysRes);
      if (Array.isArray(licRes)) setLicenses(licRes);
      if (Array.isArray(actRes)) setActivations(actRes);
      if (Array.isArray(histRes)) setHistory(histRes);
      if (Array.isArray(devRes) && devRes.length > 0) {
        setDevices(devRes);
        if (!currentDevice.device_id) setCurrentDevice(devRes[0]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleAddProduct = async (productData: Omit<Product, 'id' | 'created_at'>) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    if (res.ok) await fetchData();
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) await fetchData();
  };

  const handleAddCustomer = async (custData: Omit<Customer, 'id' | 'created_at'>) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(custData),
    });
    if (res.ok) await fetchData();
  };

  const handleIssueLicense = async (params: {
    customer_id: string;
    product_id: string;
    publisher_id: string;
    key_id: string;
    license_type: LicenseType;
    max_activations: number;
    features?: string[];
    custom_expiry?: string;
  }): Promise<LicenseRecord> => {
    const res = await fetch('/api/licenses/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const record = await res.json();
    await fetchData();
    return record;
  };

  const handleRevokeLicense = async (licenseId: string, reason: string) => {
    const res = await fetch(`/api/licenses/${licenseId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) await fetchData();
  };

  const handleGenerateKey = async (name: string, keySize: 2048 | 4096, isTrusted: boolean) => {
    const res = await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publisher_id: 'PUB-001',
        name,
        key_size: keySize,
        is_trusted: isTrusted,
      }),
    });
    if (res.ok) await fetchData();
  };

  const handleVerify = async (params: {
    licenseFile?: SignedLicenseFile;
    licenseKeyOrId?: string;
    selectedKeyId?: string;
    publicKeyPem?: string;
    device?: DeviceProfile;
  }): Promise<VerificationResult> => {
    const res = await fetch('/api/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    await fetchData();
    return data;
  };

  const handleActivate = async (
    licenseKeyOrId: string,
    device: DeviceProfile
  ): Promise<{ success: boolean; message: string; verification: VerificationResult }> => {
    const res = await fetch('/api/licenses/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKeyOrId, device }),
    });
    const outcome = await res.json();
    await fetchData();
    return outcome;
  };

  const handleDeactivateDevice = async (activationId: string) => {
    const res = await fetch(`/api/activations/${activationId}/deactivate`, {
      method: 'POST',
    });
    if (res.ok) await fetchData();
  };

  const handleRunLabTest = async (testId: number): Promise<LabTestScenario> => {
    const res = await fetch('/api/lab/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId }),
    });
    const data = await res.json();
    await fetchData();
    return data;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Bar with Mobile Drawer */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentDevice={currentDevice}
        devices={devices}
        onSelectDevice={setCurrentDevice}
      />

      {/* Simulated Hardware Node Switcher */}
      <DeviceBar
        currentDevice={currentDevice}
        devices={devices}
        onSelectDevice={setCurrentDevice}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewView
            stats={stats}
            keys={keys}
            history={history}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onIssueForProduct={(p) => {
              setProductForIssuing(p);
              setActiveTab('issue');
            }}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            licenses={licenses}
            onAddCustomer={handleAddCustomer}
            onIssueForCustomer={(c) => {
              setCustomerForIssuing(c);
              setActiveTab('issue');
            }}
          />
        )}

        {activeTab === 'licenses' && (
          <LicensesView
            licenses={licenses}
            onRevokeLicense={handleRevokeLicense}
            onInspectLicense={(lic) => setInspectingLicense(lic)}
          />
        )}

        {activeTab === 'issue' && (
          <IssueLicenseView
            products={products}
            customers={customers}
            keys={keys}
            initialProduct={productForIssuing}
            initialCustomer={customerForIssuing}
            onIssueLicense={handleIssueLicense}
            onGoToActivate={() => setActiveTab('activate')}
          />
        )}

        {activeTab === 'activate' && (
          <ActivatePortalView
            keys={keys}
            currentDevice={currentDevice}
            licenses={licenses}
            onVerify={handleVerify}
            onActivate={handleActivate}
          />
        )}

        {activeTab === 'keys' && (
          <KeyManagementView
            keys={keys}
            onGenerateKey={handleGenerateKey}
          />
        )}

        {activeTab === 'publishers' && (
          <PublishersView
            publishers={publishers}
            keys={keys}
            onGoToKeys={() => setActiveTab('keys')}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesView
            activations={activations}
            currentDevice={currentDevice}
            devices={devices}
            onSelectDevice={setCurrentDevice}
            onDeactivateDevice={handleDeactivateDevice}
          />
        )}

        {activeTab === 'integrity' && <IntegrityScannerView />}

        {activeTab === 'lab' && (
          <SecurityLabView
            licenses={licenses}
            onRunTest={handleRunLabTest}
            onVerifyCustom={(file) =>
              handleVerify({
                licenseFile: file,
                device: currentDevice,
              })
            }
          />
        )}

        {activeTab === 'history' && <HistoryView history={history} />}

        {activeTab === 'visualizer' && <VisualizerView />}

        {activeTab === 'learn' && <LearnView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Cryptographic Inspector Modal */}
      <LicenseInspectionModal
        license={inspectingLicense}
        onClose={() => setInspectingLicense(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LicenseGuard · VTU BCS703 Cryptography and Network Security Assignment</span>
          <span className="font-mono text-[11px] text-slate-600">
            RSA-PSS & SHA-256 · Six-Stage Verification Engine · Licence Revocation List (LRL)
          </span>
        </div>
      </footer>
    </div>
  );
}

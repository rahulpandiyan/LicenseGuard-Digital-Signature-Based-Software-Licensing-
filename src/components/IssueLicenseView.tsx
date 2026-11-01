import React, { useState } from 'react';
import {
  FileCheck2,
  Key,
  Download,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Code2,
  Users,
} from 'lucide-react';
import type { Product, Customer, PublisherKey, LicenseRecord, LicenseType } from '../types/license.ts';

interface IssueLicenseViewProps {
  products: Product[];
  customers: Customer[];
  keys: PublisherKey[];
  initialProduct?: Product | null;
  initialCustomer?: Customer | null;
  onIssueLicense: (data: {
    customer_id: string;
    product_id: string;
    publisher_id: string;
    key_id: string;
    license_type: LicenseType;
    max_activations: number;
    features?: string[];
    custom_expiry?: string;
  }) => Promise<LicenseRecord>;
  onGoToActivate: () => void;
}

export const IssueLicenseView: React.FC<IssueLicenseViewProps> = ({
  products,
  customers,
  keys,
  initialProduct,
  initialCustomer,
  onIssueLicense,
  onGoToActivate,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer?.id || customers[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || products[0]?.id || ''
  );
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    keys.find((k) => k.is_trusted && k.is_active)?.key_id || keys[0]?.key_id || ''
  );
  const [licenseType, setLicenseType] = useState<LicenseType>('professional');
  const [maxActivations, setMaxActivations] = useState<number>(3);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'realtime_scanner',
    'cloud_heuristics',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedRecord, setIssuedRecord] = useState<LicenseRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const selectedKey = keys.find((k) => k.key_id === selectedKeyId) || keys[0];

  const handleFeatureToggle = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feature));
    } else {
      setSelectedFeatures([...selectedFeatures, feature]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId || !selectedKeyId) return;
    setIsSubmitting(true);
    try {
      const record = await onIssueLicense({
        customer_id: selectedCustomerId,
        product_id: selectedProductId,
        publisher_id: selectedKey.publisher_id,
        key_id: selectedKeyId,
        license_type: licenseType,
        max_activations: Number(maxActivations),
        features: selectedFeatures,
      });
      setIssuedRecord(record);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!issuedRecord) return;
    const jsonStr = JSON.stringify(issuedRecord, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${issuedRecord.license_payload.license_id}.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyKey = () => {
    if (!issuedRecord) return;
    navigator.clipboard.writeText(issuedRecord.formatted_license_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Publisher Licence Issuing Station</h2>
        <p className="text-xs text-slate-400">
          Formulate structured, versioned JSON licence payloads, compute deterministic SHA-256 digests, and sign using encrypted RSA-PSS private keys
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-indigo-400" />
            <span>Licence Parameters</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Target Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.organization}) · {c.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Target Software Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p?.supported_features) {
                    setSelectedFeatures(p.supported_features.slice(0, 2));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.version}) · {p.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Licence Tier</label>
                <select
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value as LicenseType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="trial">trial (14 Days)</option>
                  <option value="monthly">monthly (30 Days)</option>
                  <option value="yearly">yearly (1 Year)</option>
                  <option value="professional">professional (1 Year)</option>
                  <option value="enterprise">enterprise (3 Years)</option>
                  <option value="lifetime">lifetime (Perpetual)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Max Activation Devices</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxActivations}
                  onChange={(e) => setMaxActivations(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Signing Authority (Publisher Key in Registry)
              </label>
              <select
                value={selectedKeyId}
                onChange={(e) => setSelectedKeyId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                {keys.map((k) => (
                  <option key={k.key_id} value={k.key_id}>
                    {k.key_id} · {k.name} ({k.key_size}-bit {k.is_trusted ? 'Trusted' : 'Untrusted'})
                  </option>
                ))}
              </select>
            </div>

            {/* Features Enabled */}
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">Licensed Product Features</label>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                {(selectedProduct?.supported_features || ['core', 'analytics']).map((feat) => (
                  <label key={feat} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(feat)}
                      onChange={() => handleFeatureToggle(feat)}
                      className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="font-mono text-[11px]">{feat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-950"
              >
                <Key className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Canonicalizing, Hashing & Signing with RSA-PSS...'
                    : 'Issue & Digitally Sign Licence'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Canonical Preview Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Versioned Licence Payload Preview</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">schema_version: 1</span>
            </div>

            <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-64">
              {JSON.stringify(
                {
                  schema_version: 1,
                  license_id: 'LG-2026-00124',
                  publisher_id: selectedKey?.publisher_id || 'PUB-001',
                  key_id: selectedKey?.key_id || 'KEY-001',
                  product_id: selectedProduct?.id || 'PROD-001',
                  customer_id: selectedCustomer?.id || 'CUST-001',
                  customer_name: selectedCustomer?.name || 'Dr. Alan Turing',
                  license_type: licenseType,
                  issued_at: '2026-11-01T10:00:00Z',
                  not_before: '2026-11-01T10:00:00Z',
                  expires_at:
                    licenseType === 'lifetime' ? 'LIFETIME' : '2027-11-01T10:00:00Z',
                  max_activations: maxActivations,
                  features: selectedFeatures,
                },
                null,
                2
              )}
            </pre>
            <p className="text-[11px] text-slate-400 mt-2 font-sans">
              Critical Rule: No mutable fields (like current activation count or revocation status) are included in the signed payload. Those are verified independently in the database.
            </p>
          </div>

          {/* Issued Result Display */}
          {issuedRecord && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Digitally Signed Successfully</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {issuedRecord.license_payload.license_id}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Product Activation Key:</span>
                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-indigo-500/30">
                  <span className="font-mono text-sm font-bold text-indigo-300 tracking-wider flex-1">
                    {issuedRecord.formatted_license_key}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>SHA-256 Digest:</span>
                  <span className="text-slate-300 truncate max-w-[200px]" title={issuedRecord.sha256_digest}>
                    {issuedRecord.sha256_digest.slice(0, 24)}...
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>RSA-PSS Signature:</span>
                  <span className="text-slate-300 truncate max-w-[200px]" title={issuedRecord.signature_b64}>
                    {issuedRecord.signature_b64.slice(0, 24)}...
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download .lic File</span>
                </button>
                <button
                  onClick={onGoToActivate}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Test Activation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

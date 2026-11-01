/**
 * LicenseGuard - Full-Stack Express Server with Vite Middleware
 * VTU BCS703 Cryptography and Network Security
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initDatabase,
  getStats,
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  getAllCustomers,
  addCustomer,
  getAllPublishers,
  getAllKeys,
  getKeyById,
  registerPublisherKey,
  getAllLicenses,
  getLicenseByIdOrKey,
  issueLicense,
  getRevocationList,
  revokeLicense,
  getAllActivations,
  deactivateDevice,
  getVerificationHistory,
  SIMULATED_DEVICES,
  getAppManifests,
  getInstalledAppFiles,
  updateInstalledAppFiles,
} from './src/services/db.ts';
import {
  verifyLicense,
  activateLicenseOnDevice,
  executeLabTest,
  scanApplicationIntegrity,
} from './src/services/verification.ts';
import { canonicalizePayload, computeSha256 } from './src/services/crypto.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize persistent database
initDatabase();

// ---- REST API Endpoints ----

// 1. Dashboard Stats
app.get('/api/stats', (_req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 2. Products
app.get('/api/products', (_req, res) => {
  try {
    res.json(getAllProducts());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, code, version, category, description, default_max_activations, supported_features } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    const product = addProduct({
      name,
      code,
      version: version || '1.0.0',
      category: category || 'General Software',
      description: description || '',
      default_max_activations: parseInt(default_max_activations, 10) || 1,
      supported_features: supported_features || ['core'],
    });
    res.status(201).json(product);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const updated = updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 3. Customers
app.get('/api/customers', (_req, res) => {
  try {
    res.json(getAllCustomers());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, email, organization } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const cust = addCustomer({ name, email, organization: organization || 'Personal' });
    res.status(201).json(cust);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 4. Publishers & Trusted Key Registry
app.get('/api/publishers', (_req, res) => {
  try {
    res.json(getAllPublishers());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/keys', (req, res) => {
  try {
    const includePrivate = req.query.admin === 'true';
    res.json(getAllKeys(includePrivate));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/keys/generate', (req, res) => {
  try {
    const { publisher_id, name, key_size, is_trusted } = req.body;
    if (!publisher_id || !name) {
      return res.status(400).json({ error: 'Publisher ID and key name are required' });
    }
    const size = parseInt(key_size, 10) === 4096 ? 4096 : parseInt(key_size, 10) === 3072 ? 3072 : 2048;
    const newKey = registerPublisherKey({
      publisher_id,
      name,
      key_size: size,
      is_trusted: is_trusted !== false,
    });
    res.status(201).json(newKey);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/keys/:id/public', (req, res) => {
  try {
    const key = getKeyById(req.params.id);
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${key.key_id}_public.pem"`);
    res.send(key.public_key_pem);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 5. Licenses
app.get('/api/licenses', (_req, res) => {
  try {
    res.json(getAllLicenses());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/licenses/:id', (req, res) => {
  try {
    const lic = getLicenseByIdOrKey(req.params.id);
    if (!lic) {
      return res.status(404).json({ error: 'License not found' });
    }
    res.json(lic);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/licenses/issue', (req, res) => {
  try {
    const { customer_id, product_id, publisher_id, key_id, license_type, max_activations, features, custom_expiry } = req.body;
    if (!customer_id || !product_id || !key_id) {
      return res.status(400).json({ error: 'customer_id, product_id, and key_id are required' });
    }
    const record = issueLicense({
      customer_id,
      product_id,
      publisher_id: publisher_id || 'PUB-001',
      key_id,
      license_type: license_type || 'yearly',
      max_activations: parseInt(max_activations, 10) || 1,
      features,
      custom_expiry,
    });
    res.status(201).json(record);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 6. Licence Revocation List (LRL)
app.get('/api/lrl', (_req, res) => {
  try {
    res.json(getRevocationList());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/licenses/:id/revoke', (req, res) => {
  try {
    const { reason, revoked_by } = req.body;
    const revoked = revokeLicense(req.params.id, reason || 'Administrative revocation on LRL', revoked_by);
    res.json(revoked);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 7. Six-Stage Verification & Activation
app.post('/api/licenses/verify', (req, res) => {
  try {
    const { licenseFile, licenseKeyOrId, selectedKeyId, publicKeyPem, device } = req.body;
    const result = verifyLicense({
      licenseFile,
      licenseKeyOrId,
      selectedKeyId,
      publicKeyPem,
      device,
    });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/licenses/activate', (req, res) => {
  try {
    const { licenseKeyOrId, device } = req.body;
    if (!licenseKeyOrId) {
      return res.status(400).json({ error: 'License key or ID is required' });
    }
    const targetDevice = device || SIMULATED_DEVICES[0];
    const outcome = activateLicenseOnDevice(licenseKeyOrId, targetDevice);
    res.json(outcome);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 8. Devices and Activations
app.get('/api/devices', (_req, res) => {
  res.json(SIMULATED_DEVICES);
});

app.get('/api/activations', (_req, res) => {
  try {
    res.json(getAllActivations());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/activations/:id/deactivate', (req, res) => {
  try {
    const ok = deactivateDevice(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Activation record not found' });
    }
    res.json({ success: true, message: 'Device seat deactivated successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 9. Application Integrity Scanner
app.get('/api/manifests', (_req, res) => {
  try {
    res.json(getAppManifests());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/integrity/scan', (req, res) => {
  try {
    const appId = (req.query.appId as string) || 'PROD-001';
    const scan = scanApplicationIntegrity(appId);
    res.json(scan);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/integrity/tamper-file', (req, res) => {
  try {
    const { appId, filePath, action } = req.body;
    const targetApp = appId || 'PROD-001';
    const files = getInstalledAppFiles(targetApp);

    if (action === 'tamper') {
      const updated = files.map(f => {
        if (f.relative_path === filePath) {
          return {
            ...f,
            sha256: computeSha256('TAMPERED_CRACKED_PATCHED_BINARY_CODE_2026'),
          };
        }
        return f;
      });
      updateInstalledAppFiles(targetApp, updated);
      res.json({ success: true, message: `Injected tampering into ${filePath}` });
    } else if (action === 'delete') {
      const updated = files.filter(f => f.relative_path !== filePath);
      updateInstalledAppFiles(targetApp, updated);
      res.json({ success: true, message: `Removed file ${filePath}` });
    } else if (action === 'restore') {
      // Re-read from manifest
      const manifests = getAppManifests();
      const manifest = manifests.find(m => m.app_id === targetApp) || manifests[0];
      if (manifest) {
        updateInstalledAppFiles(targetApp, JSON.parse(JSON.stringify(manifest.files)));
      }
      res.json({ success: true, message: `Restored all files for ${targetApp}` });
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 10. Verification Audit Logs
app.get('/api/history', (_req, res) => {
  try {
    res.json(getVerificationHistory());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 11. Security Testing Lab Runner (10 Scenarios)
app.post('/api/lab/test', (req, res) => {
  try {
    const testId = parseInt(req.body.testId, 10);
    if (!testId || testId < 1 || testId > 10) {
      return res.status(400).json({ error: 'Invalid test ID. Must be between 1 and 10.' });
    }
    const scenario = executeLabTest(testId);
    res.json(scenario);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ---- Vite Integration ----

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LicenseGuard Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start LicenseGuard server:', err);
  process.exit(1);
});

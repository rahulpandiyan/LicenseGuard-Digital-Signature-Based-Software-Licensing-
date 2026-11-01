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
  getAllKeys,
  getKeyById,
  addPublisherKey,
  getAllLicenses,
  getLicenseByIdOrKey,
  issueLicense,
  revokeLicense,
  getAllActivations,
  deactivateDevice,
  getVerificationHistory,
  SIMULATED_DEVICES,
} from './src/services/db.ts';
import {
  verifyLicense,
  activateLicenseOnDevice,
  executeLabTest,
} from './src/services/verification.ts';
import { canonicalizePayload, computeSha256 } from './src/services/crypto.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite/JSON persistence and seed keys
initDatabase();

// ---- REST API Routes ----

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
    const products = getAllProducts();
    res.json(products);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, code, version, category, description, default_max_activations } = req.body;
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

// 3. Publisher Keys
app.get('/api/keys', (req, res) => {
  try {
    // Only return private keys if specifically requesting management view
    const includePrivate = req.query.admin === 'true';
    const keys = getAllKeys(includePrivate);
    res.json(keys);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/keys/generate', (req, res) => {
  try {
    const { name, key_size, is_trusted } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Key name is required' });
    }
    const size = parseInt(key_size, 10) === 4096 ? 4096 : 2048;
    const newKey = addPublisherKey(name, size, is_trusted !== false);
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

// 4. Licenses
app.get('/api/licenses', (_req, res) => {
  try {
    const licenses = getAllLicenses();
    res.json(licenses);
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
    const { customer_name, customer_email, product_id, license_type, max_activations, key_id, custom_expiry } = req.body;
    if (!customer_name || !customer_email || !product_id || !license_type) {
      return res.status(400).json({ error: 'Missing required license fields' });
    }
    const record = issueLicense({
      customer_name,
      customer_email,
      product_id,
      license_type,
      max_activations: parseInt(max_activations, 10) || 1,
      key_id,
      custom_expiry,
    });
    res.status(201).json(record);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/licenses/:id/revoke', (req, res) => {
  try {
    const { reason } = req.body;
    const revoked = revokeLicense(req.params.id, reason || 'Revoked by administrator');
    res.json(revoked);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 5. Verification & Activation
app.post('/api/licenses/verify', (req, res) => {
  try {
    const { licenseFile, licenseKeyOrId, publicKeyPem, selectedKeyId, device } = req.body;
    const result = verifyLicense({
      licenseFile,
      licenseKeyOrId,
      publicKeyPem,
      selectedKeyId,
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

// 6. Devices and Activations
app.get('/api/devices', (_req, res) => {
  res.json(SIMULATED_DEVICES);
});

app.get('/api/activations', (_req, res) => {
  try {
    const activations = getAllActivations();
    res.json(activations);
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
    res.json({ success: true, message: 'Device deactivated successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 7. Audit Verification History
app.get('/api/history', (_req, res) => {
  try {
    const history = getVerificationHistory();
    res.json(history);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 8. Security Testing Lab Runner
app.post('/api/lab/test', (req, res) => {
  try {
    const testId = parseInt(req.body.testId, 10);
    if (!testId || testId < 1 || testId > 7) {
      return res.status(400).json({ error: 'Invalid test ID. Must be between 1 and 7.' });
    }
    const scenario = executeLabTest(testId);
    res.json(scenario);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 9. Tamper Simulation Tool
app.post('/api/tools/tamper', (req, res) => {
  try {
    const { licenseFile, tamperField, tamperValue } = req.body;
    if (!licenseFile || !licenseFile.license_payload) {
      return res.status(400).json({ error: 'Valid licenseFile is required' });
    }

    const tamperedPayload = { ...licenseFile.license_payload };

    if (tamperField === 'expiry_date') {
      tamperedPayload.expiry_date = tamperValue || '2099-12-31T23:59:59Z';
    } else if (tamperField === 'customer_name') {
      tamperedPayload.customer_name = tamperValue || `${tamperedPayload.customer_name} (Hacked)`;
    } else if (tamperField === 'max_activations') {
      tamperedPayload.max_activations = parseInt(tamperValue, 10) || 999;
    } else if (tamperField === 'product_name') {
      tamperedPayload.product_name = tamperValue || 'Enterprise Unlimited Crack Edition';
    }

    const canonical = canonicalizePayload(tamperedPayload);
    const newDigest = computeSha256(canonical);

    // Keep the old signature intentionally to demonstrate tampering
    const tamperedFile = {
      ...licenseFile,
      license_payload: tamperedPayload,
      tampered_sha256: newDigest,
      original_sha256: licenseFile.sha256_digest,
    };

    res.json(tamperedFile);
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

const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const psgcService = require('../services/psgc');

// ==================== PSGC (Philippine Geographic) ROUTES ====================

// Get all regions
router.get('/psgc/regions', (req, res) => {
  try {
    const regions = psgcService.getRegions();
    res.json(regions);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get provinces by region
router.get('/psgc/provinces/:regionCode', (req, res) => {
  try {
    const provinces = psgcService.getProvinces(req.params.regionCode);
    res.json(provinces);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

// Get municipalities by region and province
router.get('/psgc/municipalities/:regionCode/:province', (req, res) => {
  try {
    const municipalities = psgcService.getMunicipalities(
      req.params.regionCode,
      decodeURIComponent(req.params.province)
    );
    res.json(municipalities);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch municipalities' });
  }
});

// Get barangays by region, province, and municipality
router.get('/psgc/barangays/:regionCode/:province/:municipality', (req, res) => {
  try {
    const barangays = psgcService.getBarangays(
      req.params.regionCode,
      decodeURIComponent(req.params.province),
      decodeURIComponent(req.params.municipality)
    );
    res.json(barangays);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch barangays' });
  }
});

// Search locations
router.get('/psgc/search', (req, res) => {
  try {
    const { q, limit } = req.query;
    const results = psgcService.search(q, parseInt(limit) || 20);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== ADDRESS ROUTES ====================

// Get user addresses
router.get('/addresses', auth, (req, res) => {
  try {
    const addresses = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality,
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(req.user.id);
    res.json(addresses);
  } catch (e) {
    console.error('Fetch addresses error:', e.message);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Create new address
router.post('/addresses', auth, (req, res) => {
  try {
    const {
      label, name, phone, region_code, region, province,
      municipality, barangay, street_address, zip_code, is_default
    } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    if (!region || !province || !municipality) {
      return res.status(400).json({ error: 'Region, province, and municipality are required' });
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    // Check if this is the first address (auto-set as default)
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?').get(req.user.id);
    const setDefault = is_default || existingCount.count === 0 ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO addresses (user_id, label, name, phone, region_code, region, province,
                            municipality, barangay, street_address, zip_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      (label || 'Home').trim(),
      name.trim(),
      phone.trim(),
      region_code || null,
      region.trim(),
      province.trim(),
      municipality.trim(),
      barangay ? barangay.trim() : null,
      street_address ? street_address.trim() : null,
      zip_code || null,
      setDefault
    );

    const newAddress = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality,
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newAddress);
  } catch (e) {
    console.error('Create address error:', e.message);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// Update address
router.put('/addresses/:id', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    if (!Number.isInteger(addressId) || addressId < 1) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      label, name, phone, region_code, region, province,
      municipality, barangay, street_address, zip_code
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    db.prepare(`
      UPDATE addresses
      SET label = ?, name = ?, phone = ?, region_code = ?, region = ?, province = ?,
          municipality = ?, barangay = ?, street_address = ?, zip_code = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      (label || 'Home').trim(),
      name.trim(),
      phone.trim(),
      region_code || null,
      region ? region.trim() : null,
      province ? province.trim() : null,
      municipality ? municipality.trim() : null,
      barangay ? barangay.trim() : null,
      street_address ? street_address.trim() : null,
      zip_code || null,
      addressId
    );

    const updatedAddress = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality,
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses WHERE id = ?
    `).get(addressId);

    res.json(updatedAddress);
  } catch (e) {
    console.error('Update address error:', e.message);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address
router.delete('/addresses/:id', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    if (!Number.isInteger(addressId) || addressId < 1) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id, is_default FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.prepare('DELETE FROM addresses WHERE id = ?').run(addressId);

    // If deleted address was default, set another as default
    if (existingAddress.is_default) {
      const nextAddress = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
      if (nextAddress) {
        db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(nextAddress.id);
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Delete address error:', e.message);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

router.put('/addresses/:id/default', auth, (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    if (!Number.isInteger(addressId) || addressId < 1) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    // Verify ownership
    const existingAddress = db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(addressId);
    if (!existingAddress || existingAddress.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Set all addresses to not default
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);

    // Set this address as default
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(addressId);

    const updatedAddress = db.prepare(`
      SELECT id, label, name, phone, region_code, region, province, municipality,
             barangay, street_address, zip_code, is_default, created_at
      FROM addresses WHERE id = ?
    `).get(addressId);

    res.json(updatedAddress);
  } catch (e) {
    console.error('Set default address error:', e.message);
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

module.exports = router;

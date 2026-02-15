const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');
const upload = require('../../config/upload');
const minioService = require('../../services/minio');
const { validateString, validatePositiveNumber, sanitizeString } = require('../../helpers/validators');

router.get('/admin/products', auth, adminOnly, (req, res) => {
  try {
    const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC').all();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/admin/products', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const { name, description, price, sale_price, category_id, stock, featured, variants, low_stock_threshold } = req.body;
    let { images } = req.body;

    // Handle image uploads if files provided
    if (req.files && req.files.length > 0) {
      const uploadResults = await minioService.uploadImages(req.files, 'products');
      images = uploadResults.filter(r => r.success).map(r => r.url);
    } else if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { images = images ? [images] : []; }
    }

    if (!validateString(name)) {
      return res.status(400).json({ error: 'Product name required' });
    }
    if (!validatePositiveNumber(price)) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    const safeStock = Math.max(0, parseInt(stock) || 0);
    const safeCategoryId = parseInt(category_id) || null;
    const safeSalePrice = validatePositiveNumber(sale_price) ? sale_price : null;
    const safeVariants = variants ? JSON.stringify(variants) : null;
    const safeThreshold = parseInt(low_stock_threshold) >= 0 ? parseInt(low_stock_threshold) : 10;

    const result = db.prepare('INSERT INTO products (name, slug, description, price, sale_price, category_id, images, stock, featured, variants, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      sanitizeString(name), slug, sanitizeString(description), price, safeSalePrice, safeCategoryId, JSON.stringify(images || []), safeStock, featured ? 1 : 0, safeVariants, safeThreshold
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Product with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/admin/products/:id', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const { name, description, price, sale_price, category_id, stock, featured, status, variants, low_stock_threshold } = req.body;
    let { images } = req.body;

    if (!validateString(name)) {
      return res.status(400).json({ error: 'Product name required' });
    }
    if (!validatePositiveNumber(price)) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    // Handle image uploads if new files provided
    if (req.files && req.files.length > 0) {
      const uploadResults = await minioService.uploadImages(req.files, 'products');
      const newImageUrls = uploadResults.filter(r => r.success).map(r => r.url);

      // Get existing images and merge
      const existingProduct = db.prepare('SELECT images FROM products WHERE id = ?').get(id);
      let existingImages = [];
      if (existingProduct && existingProduct.images) {
        try { existingImages = JSON.parse(existingProduct.images); } catch {}
      }
      images = [...existingImages, ...newImageUrls];
    } else if (typeof images === 'string') {
      try { images = JSON.parse(images); } catch { images = images ? [images] : []; }
    }

    const safeStock = Math.max(0, parseInt(stock) || 0);
    const safeCategoryId = parseInt(category_id) || null;
    const safeSalePrice = validatePositiveNumber(sale_price) ? sale_price : null;
    const safeStatus = ['active', 'inactive', 'draft'].includes(status) ? status : 'active';
    const safeVariants = variants ? JSON.stringify(variants) : null;
    const safeThreshold = parseInt(low_stock_threshold) >= 0 ? parseInt(low_stock_threshold) : 10;

    db.prepare('UPDATE products SET name=?, description=?, price=?, sale_price=?, category_id=?, images=?, stock=?, featured=?, status=?, variants=?, low_stock_threshold=? WHERE id=?').run(
      sanitizeString(name), sanitizeString(description), price, safeSalePrice, safeCategoryId, JSON.stringify(images || []), safeStock, featured ? 1 : 0, safeStatus, safeVariants, safeThreshold, id
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Product update error:', e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Bulk delete products
router.post('/admin/products/bulk-delete', auth, adminOnly, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs required' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...ids);
    res.json({ deleted: result.changes });
  } catch (e) {
    console.error('Bulk delete error:', e.message);
    res.status(500).json({ error: 'Failed to bulk delete products' });
  }
});

// Bulk update stock
router.post('/admin/products/bulk-stock', auth, adminOnly, (req, res) => {
  try {
    const { ids, stock } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs required' });
    }
    const safeStock = Math.max(0, parseInt(stock) || 0);
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`UPDATE products SET stock = ? WHERE id IN (${placeholders})`).run(safeStock, ...ids);
    res.json({ updated: result.changes });
  } catch (e) {
    console.error('Bulk stock update error:', e.message);
    res.status(500).json({ error: 'Failed to bulk update stock' });
  }
});

router.delete('/admin/products/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ==================== INVENTORY MANAGEMENT ROUTES ====================

// Get all products with category names for inventory view
router.get('/admin/inventory', auth, adminOnly, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.stock, p.low_stock_threshold,
             p.status, p.images, p.category_id, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock ASC, p.name ASC
    `).all();
    res.json(products);
  } catch (e) {
    console.error('Get inventory error:', e.message);
    res.status(500).json({ error: 'Failed to load inventory' });
  }
});

// Update single product stock with logging
router.put('/admin/inventory/:id/stock', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const { stock, note } = req.body;
    const newStock = Math.max(0, parseInt(stock) || 0);

    const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.stock;
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, id);

    // Log the change
    db.prepare(`
      INSERT INTO inventory_log (product_id, previous_stock, new_stock, change_amount, change_type, changed_by, note)
      VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `).run(id, previousStock, newStock, newStock - previousStock, req.user.id, note || null);

    res.json({ previous_stock: previousStock, new_stock: newStock });
  } catch (e) {
    console.error('Update stock error:', e.message);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Bulk update stock with logging
router.post('/admin/inventory/bulk-stock', auth, adminOnly, (req, res) => {
  try {
    const { ids, stock, note } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs required' });
    }
    const newStock = Math.max(0, parseInt(stock) || 0);

    const updateStmt = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
    const logStmt = db.prepare(`
      INSERT INTO inventory_log (product_id, previous_stock, new_stock, change_amount, change_type, changed_by, note)
      VALUES (?, ?, ?, ?, 'bulk', ?, ?)
    `);
    const getStmt = db.prepare('SELECT id, stock FROM products WHERE id = ?');

    const transaction = db.transaction(() => {
      let updated = 0;
      for (const id of ids) {
        const product = getStmt.get(id);
        if (product) {
          const previousStock = product.stock;
          updateStmt.run(newStock, id);
          logStmt.run(id, previousStock, newStock, newStock - previousStock, req.user.id, note || null);
          updated++;
        }
      }
      return updated;
    });

    const updated = transaction();
    res.json({ updated });
  } catch (e) {
    console.error('Bulk stock update error:', e.message);
    res.status(500).json({ error: 'Failed to bulk update stock' });
  }
});

// Get inventory audit log
router.get('/admin/inventory/log', auth, adminOnly, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const productId = req.query.product_id ? parseInt(req.query.product_id) : null;

    let whereClause = '';
    const params = [];
    if (productId) {
      whereClause = 'WHERE il.product_id = ?';
      params.push(productId);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM inventory_log il ${whereClause}
    `).get(...params).count;

    const logs = db.prepare(`
      SELECT il.*, p.name as product_name, u.name as changed_by_name
      FROM inventory_log il
      LEFT JOIN products p ON il.product_id = p.id
      LEFT JOIN users u ON il.changed_by = u.id
      ${whereClause}
      ORDER BY il.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ logs, total });
  } catch (e) {
    console.error('Get inventory log error:', e.message);
    res.status(500).json({ error: 'Failed to load inventory log' });
  }
});

// ==================== IMAGE UPLOAD ROUTES ====================

/**
 * Upload product images to MinIO S3
 * POST /api/admin/upload/product-images
 */
router.post('/admin/upload/product-images', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const results = await minioService.uploadImages(req.files, 'products');
    const successfulUploads = results.filter(r => r.success);
    const failedUploads = results.filter(r => !r.success);

    if (successfulUploads.length === 0) {
      return res.status(500).json({ error: 'All uploads failed', details: failedUploads });
    }

    res.json({
      success: true,
      uploaded: successfulUploads.length,
      failed: failedUploads.length,
      images: successfulUploads.map(r => ({
        url: r.url,
        key: r.key
      }))
    });
  } catch (e) {
    console.error('Image upload error:', e.message);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * Upload category image to MinIO S3
 * POST /api/admin/upload/category-image
 */
router.post('/admin/upload/category-image', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await minioService.uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'categories'
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      image: {
        url: result.url,
        key: result.key
      }
    });
  } catch (e) {
    console.error('Category image upload error:', e.message);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * Delete image from MinIO S3
 * DELETE /api/admin/upload/image
 */
router.delete('/admin/upload/image', auth, adminOnly, async (req, res) => {
  try {
    const { key, url } = req.body;
    const imageKey = key || minioService.extractKeyFromUrl(url);

    if (!imageKey) {
      return res.status(400).json({ error: 'Image key or URL required' });
    }

    const result = await minioService.deleteImage(imageKey);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Image delete error:', e.message);
    res.status(500).json({ error: 'Image delete failed' });
  }
});

module.exports = router;

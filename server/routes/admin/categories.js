const express = require('express');
const router = express.Router();
const db = require('../../db');
const { auth, adminOnly } = require('../../middleware/auth');
const { validateString, sanitizeString } = require('../../helpers/validators');

router.get('/admin/categories', auth, adminOnly, (req, res) => {
  try {
    // Get categories with product count
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/admin/categories', auth, adminOnly, (req, res) => {
  try {
    const { name, slug, description, image } = req.body;
    if (!validateString(name)) {
      return res.status(400).json({ error: 'Category name required' });
    }
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    const result = db.prepare('INSERT INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)').run(
      sanitizeString(name), finalSlug, sanitizeString(description || ''), sanitizeString(image || '')
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/admin/categories/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const { name, slug, description, image } = req.body;
    if (!validateString(name)) {
      return res.status(400).json({ error: 'Category name required' });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);

    const result = db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, image = ? WHERE id = ?').run(
      sanitizeString(name), finalSlug, sanitizeString(description || ''), sanitizeString(image || ''), id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Category with this slug already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/admin/categories/:id', auth, adminOnly, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check if category has products
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);
    if (productCount && productCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete category with ${productCount.count} product(s). Reassign or delete products first.`
      });
    }

    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;

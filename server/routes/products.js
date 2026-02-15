const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

router.get('/products', (req, res) => {
  try {
    const { category, featured, search } = req.query;
    let limit = parseInt(req.query.limit) || 50;
    limit = Math.min(Math.max(limit, 1), 100); // Clamp between 1-100

    let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ?';
    const params = ['active'];

    if (category && typeof category === 'string') {
      query += ' AND c.slug = ?';
      params.push(category.toLowerCase().trim());
    }
    if (featured === 'true' || featured === '1') {
      query += ' AND p.featured = 1';
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search.trim().slice(0, 100)}%`);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ?';
    params.push(limit);

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (e) {
    console.error('Products fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const product = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(id);
    product ? res.json(product) : res.status(404).json({ error: 'Product not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ==================== REVIEWS ROUTES ====================

router.get('/products/:id/reviews', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `).all(productId);
    res.json(reviews);
  } catch (e) {
    console.error('Reviews fetch error:', e.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/products/:id/reviews', auth, (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { rating, title, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const result = db.prepare(`
      INSERT INTO reviews (product_id, user_id, rating, title, comment, verified_purchase)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(productId, req.user.id, rating, title.trim(), comment.trim());

    res.status(201).json({ id: result.lastInsertRowid, message: 'Review posted successfully' });
  } catch (e) {
    console.error('Review creation error:', e.message);
    res.status(500).json({ error: 'Failed to post review' });
  }
});

// ==================== CATEGORY ROUTES ====================

router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get Company Information
router.get('/company/info', (req, res) => {
  try {
    const companyInfo = {
      name: 'Silvera',
      company_legal_name: 'NJ RG Shopziee LLC',
      tagline: 'Premium Online Shopping - Worldwide',
      founded: 2021,
      description: 'NJ RG Shopziee LLC, founded in 2021, emerged with a vision to revolutionize e-commerce by bringing premium products to customers worldwide. Based in Clifton, New Jersey, we have grown from a passionate team into a trusted digital marketplace serving customers globally.',
      mission: 'To provide a seamless, secure, and reliable online shopping experience for customers worldwide with access to premium products at competitive prices.',
      vision: 'To be the most trusted and convenient e-commerce platform globally, connecting millions of customers with quality products and trusted sellers.',
      values: [
        'Customer-First Service',
        'Quality Assurance',
        'Secure Payment Solutions',
        'Innovation',
        'Integrity'
      ],
      stats: {
        customers: 100000,
        products: 15000,
        categories: 5,
        years_operating: 3
      },
      contact: {
        company_name: 'NJ RG Shopziee LLC',
        email: 'micap2737@gmail.com',
        phone: '+1 (973) 767-4967',
        address: 'Clifton, NJ',
        facebook: 'facebook.com/njrgshopzieellc'
      },
      features: [
        {
          title: 'Fast & Secure Delivery',
          description: 'We partner with trusted logistics providers worldwide to ensure your orders arrive safely and on time. Track your package in real-time from warehouse to your doorstep.',
          icon: 'delivery.webp'
        },
        {
          title: '30-Day Money Back',
          description: 'Not satisfied with your purchase? Return it within 30 days for a full refund. No questions asked. We stand behind the quality of every product we sell.',
          icon: 'money-bag.webp'
        },
        {
          title: '24/7 Customer Support',
          description: 'Our dedicated support team is available round-the-clock to assist you. Chat, email, or call us anytime. Your satisfaction is our top priority.',
          icon: 'support.webp'
        }
      ]
    };

    res.json(companyInfo);
  } catch (e) {
    console.error('Company info error:', e.message);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
});

module.exports = router;

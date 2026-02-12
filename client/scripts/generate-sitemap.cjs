/**
 * Sitemap Generator for Silvera V2
 * Generates sitemap.xml and robots.txt for SEO indexing
 * Fetches product pages dynamically from the API
 *
 * Usage: node scripts/generate-sitemap.cjs
 * Runs automatically during build: npm run build
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://silvera.innoserver.cloud';
const API_URL = process.env.CI ? 'http://127.0.0.1:3865' : BASE_URL;

// Static pages with priority and change frequency
const staticPages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/shop', changefreq: 'daily', priority: 0.9 },
  { url: '/contact', changefreq: 'monthly', priority: 0.5 },
  { url: '/faq', changefreq: 'monthly', priority: 0.5 },
  { url: '/shipping', changefreq: 'monthly', priority: 0.5 },
];

// Fetch products from API
function fetchProducts() {
  const url = `${API_URL}/api/products`;
  const mod = url.startsWith('https') ? https : require('http');

  return new Promise((resolve) => {
    mod.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const products = Array.isArray(parsed) ? parsed : parsed.products || [];
          resolve(products);
        } catch {
          console.warn('⚠️  Could not parse products API response, using static pages only');
          resolve([]);
        }
      });
    }).on('error', () => {
      console.warn('⚠️  Could not reach products API, using static pages only');
      resolve([]);
    });
  });
}

// Generate XML sitemap
function generateSitemap(products) {
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  staticPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  // Dynamic product pages
  products.forEach(product => {
    const lastmod = product.updated_at
      ? new Date(product.updated_at).toISOString().split('T')[0]
      : today;
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/product/${product.id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}

// Generate robots.txt
function generateRobotsTxt() {
  let robots = '# Silvera PH - Robots.txt\n\n';
  robots += 'User-agent: *\n';
  robots += 'Allow: /\n';
  robots += 'Disallow: /checkout\n';
  robots += 'Disallow: /cart\n';
  robots += 'Disallow: /profile\n';
  robots += 'Disallow: /orders\n';
  robots += 'Disallow: /payment/\n';
  robots += 'Disallow: /admin\n';
  robots += 'Disallow: /admin/\n';
  robots += '\n';
  robots += `Sitemap: ${BASE_URL}/sitemap.xml\n`;
  return robots;
}

// Main execution
async function main() {
  const publicDir = path.join(__dirname, '../public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Fetch products for dynamic URLs
  const products = await fetchProducts();
  console.log(`📦 Found ${products.length} products for sitemap`);

  // Generate and write sitemap.xml
  const sitemap = generateSitemap(products);
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('✅ sitemap.xml generated successfully');

  // Generate and write robots.txt
  const robotsTxt = generateRobotsTxt();
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
  console.log('✅ robots.txt generated successfully');

  const totalUrls = staticPages.length + products.length;
  console.log(`\n📄 Sitemap: ${totalUrls} URLs (${staticPages.length} static + ${products.length} products)`);
}

main().catch(err => {
  console.error('❌ Error generating sitemap:', err.message);
  process.exit(1);
});

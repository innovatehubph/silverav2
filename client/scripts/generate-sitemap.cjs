/**
 * Sitemap Generator for Silvera V2
 * Generates sitemap.xml for better SEO indexing
 *
 * Usage: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://silvera.innoserver.cloud';

// Static pages with priority and change frequency
const staticPages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/shop', changefreq: 'daily', priority: 0.9 },
  { url: '/contact', changefreq: 'monthly', priority: 0.5 },
  { url: '/faq', changefreq: 'monthly', priority: 0.5 },
  { url: '/shipping', changefreq: 'monthly', priority: 0.5 },
  { url: '/login', changefreq: 'monthly', priority: 0.3 },
  { url: '/register', changefreq: 'monthly', priority: 0.3 },
];

// Generate XML sitemap
function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static pages
  staticPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  // Note: In production, you would fetch products from the API
  // For now, we'll add a placeholder for product pages
  xml += '  <!-- Product pages: fetch from API in production -->\n';
  xml += '  <!-- Example: -->\n';
  xml += '  <!-- <url> -->\n';
  xml += `  <!--   <loc>${BASE_URL}/products/1</loc> -->\n`;
  xml += `  <!--   <lastmod>${today}</lastmod> -->\n`;
  xml += '  <!--   <changefreq>weekly</changefreq> -->\n';
  xml += '  <!--   <priority>0.8</priority> -->\n';
  xml += '  <!-- </url> -->\n';

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
  robots += 'Disallow: /login\n';
  robots += 'Disallow: /register\n';
  robots += '\n';
  robots += `Sitemap: ${BASE_URL}/sitemap.xml\n`;

  return robots;
}

// Main execution
try {
  const publicDir = path.join(__dirname, '../public');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate and write sitemap.xml
  const sitemap = generateSitemap();
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('✅ sitemap.xml generated successfully');

  // Generate and write robots.txt
  const robotsTxt = generateRobotsTxt();
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
  console.log('✅ robots.txt generated successfully');

  console.log('\n📄 Files created:');
  console.log(`   - ${path.join(publicDir, 'sitemap.xml')}`);
  console.log(`   - ${path.join(publicDir, 'robots.txt')}`);
  console.log('\n🌐 Your sitemap URL: https://silvera.innoserver.cloud/sitemap.xml');
  console.log('🤖 Your robots.txt URL: https://silvera.innoserver.cloud/robots.txt');

} catch (error) {
  console.error('❌ Error generating sitemap:', error.message);
  process.exit(1);
}

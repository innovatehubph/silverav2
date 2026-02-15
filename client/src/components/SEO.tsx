import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  price?: string;
  currency?: string;
  availability?: 'instock' | 'outofstock' | 'preorder';
  structuredData?: object;
}

const defaultMeta = {
  title: 'Silvera PH - Premium Branded Goods',
  description: 'Shop premium branded products online in the Philippines. Luxury watches, designer bags, electronics and more. Fast delivery, secure payment, 30-day returns.',
  keywords: 'luxury shopping, premium brands, designer products, online shopping philippines, branded goods',
  image: 'https://silvera.innoserver.cloud/og-image.jpg',
  url: 'https://silvera.innoserver.cloud',
  type: 'website'
};

export function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  price,
  currency = 'PHP',
  availability,
  structuredData
}: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Silvera PH` : defaultMeta.title;
    const fullDescription = description || defaultMeta.description;
    const fullImage = image || defaultMeta.image;
    const fullUrl = url || defaultMeta.url;
    const fullKeywords = keywords || defaultMeta.keywords;

    // Update title
    document.title = fullTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }

      element.content = content;
    };

    // Standard meta tags
    updateMeta('description', fullDescription);
    updateMeta('keywords', fullKeywords);
    updateMeta('author', 'Silvera Philippines');
    updateMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // Open Graph tags
    updateMeta('og:title', fullTitle, true);
    updateMeta('og:description', fullDescription, true);
    updateMeta('og:image', fullImage, true);
    updateMeta('og:url', fullUrl, true);
    updateMeta('og:type', type, true);
    updateMeta('og:site_name', 'Silvera PH', true);
    updateMeta('og:locale', 'en_PH', true);

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', fullDescription);
    updateMeta('twitter:image', fullImage);

    // Product-specific Open Graph tags
    if (type === 'product' && price) {
      updateMeta('og:price:amount', price, true);
      updateMeta('og:price:currency', currency, true);
      if (availability) {
        updateMeta('og:availability', availability, true);
      }
      updateMeta('product:price:amount', price, true);
      updateMeta('product:price:currency', currency, true);
    }

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = fullUrl;

    // Structured Data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

  }, [title, description, keywords, image, url, type, price, currency, availability, structuredData]);

  return null;
}

// Helper function to generate product structured data
// eslint-disable-next-line react-refresh/only-export-components
export function generateProductStructuredData(product: {
  name: string;
  description: string;
  image: string;
  price: number;
  salePrice?: number;
  currency?: string;
  brand?: string;
  sku?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  rating?: number;
  reviewCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand
    } : undefined,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: product.currency || 'PHP',
      price: product.salePrice || product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      seller: {
        '@type': 'Organization',
        name: 'Silvera Philippines'
      }
    },
    aggregateRating: product.rating ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 0
    } : undefined
  };
}

// Helper function to generate breadcrumb structured data
// eslint-disable-next-line react-refresh/only-export-components
export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

// Helper function to generate organization structured data
// eslint-disable-next-line react-refresh/only-export-components
export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Silvera Philippines',
    url: 'https://silvera.innoserver.cloud',
    logo: 'https://silvera.innoserver.cloud/logo.png',
    description: 'Premium online shopping destination in the Philippines for luxury branded products.',
    sameAs: [
      'https://facebook.com/silveraph',
      'https://instagram.com/silveraph'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+63-917-123-4567',
      contactType: 'Customer Service',
      areaServed: 'PH',
      availableLanguage: ['English', 'Filipino']
    }
  };
}

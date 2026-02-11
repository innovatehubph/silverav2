# Silvera V2 - Premium E-Commerce Design System
## Complete UI/UX Design Brief

---

## 1. Design Philosophy

### Vision
Create a **premium, modern e-commerce experience** inspired by Apple, Stripe, Linear, and Vercel aesthetics. The design should feel luxurious yet accessible, with smooth animations and an editorial quality that elevates branded goods.

### Core Principles
- **Minimal Maximalism**: Clean layouts with bold hero moments
- **Motion as Identity**: Smooth, purposeful animations everywhere
- **Premium by Default**: Every pixel exudes quality
- **Dark Mode First**: Designed for dark, adapted for light

---

## 2. Color System

### Dark Mode (Primary)
```css
:root {
  /* Background Layers */
  --bg-primary: #0A0A0B;          /* Deep black */
  --bg-secondary: #111113;        /* Card backgrounds */
  --bg-tertiary: #18181B;         /* Elevated surfaces */
  --bg-hover: #1F1F23;            /* Interactive hover */
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.12);
  
  /* Text Hierarchy */
  --text-primary: #FAFAFA;        /* Headlines */
  --text-secondary: #A1A1AA;      /* Body text */
  --text-tertiary: #71717A;       /* Muted/captions */
  --text-inverse: #0A0A0B;        /* On light bg */
  
  /* Accent Colors */
  --accent-primary: #D4AF37;      /* Gold - luxury accent */
  --accent-primary-hover: #E5C158;
  --accent-secondary: #8B5CF6;    /* Violet - CTAs */
  --accent-gradient: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
  
  /* Status Colors */
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
  
  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.2);
}
```

### Light Mode
```css
[data-theme="light"] {
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F4F4F5;
  --bg-hover: #E4E4E7;
  
  --glass-bg: rgba(0, 0, 0, 0.02);
  --glass-border: rgba(0, 0, 0, 0.06);
  
  --text-primary: #09090B;
  --text-secondary: #52525B;
  --text-tertiary: #A1A1AA;
  
  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-default: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.15);
}
```

### Tailwind Config Extension
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        silvera: {
          bg: {
            primary: 'var(--bg-primary)',
            secondary: 'var(--bg-secondary)',
            tertiary: 'var(--bg-tertiary)',
          },
          gold: {
            DEFAULT: '#D4AF37',
            light: '#F5E6A3',
            dark: '#B8942E',
          },
          violet: {
            DEFAULT: '#8B5CF6',
            light: '#A78BFA',
            dark: '#7C3AED',
          }
        }
      }
    }
  }
}
```

---

## 3. Typography System

### Font Stack
```css
:root {
  /* Display - For hero headlines */
  --font-display: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Body - For all other text */
  --font-body: 'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Mono - For prices, codes */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}
```

### Type Scale
```css
/* Fluid Typography with clamp() */
.text-display-xl {
  font-size: clamp(3rem, 8vw, 6rem);      /* 48-96px */
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 600;
}

.text-display-lg {
  font-size: clamp(2.5rem, 5vw, 4rem);    /* 40-64px */
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-weight: 600;
}

.text-display-md {
  font-size: clamp(1.75rem, 3vw, 2.5rem); /* 28-40px */
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 600;
}

.text-heading-lg {
  font-size: clamp(1.25rem, 2vw, 1.5rem); /* 20-24px */
  line-height: 1.3;
  letter-spacing: -0.01em;
  font-weight: 500;
}

.text-heading-md {
  font-size: 1.125rem;                     /* 18px */
  line-height: 1.4;
  font-weight: 500;
}

.text-body-lg {
  font-size: 1rem;                         /* 16px */
  line-height: 1.6;
  font-weight: 400;
}

.text-body-md {
  font-size: 0.875rem;                     /* 14px */
  line-height: 1.5;
  font-weight: 400;
}

.text-caption {
  font-size: 0.75rem;                      /* 12px */
  line-height: 1.4;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* Price styling - monospace */
.text-price {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

### Tailwind Classes
```javascript
// tailwind.config.js
fontSize: {
  'display-xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
  'display-lg': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
  'display-md': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
}
```

---

## 4. Spacing & Layout System

### Spacing Scale (8px base)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

### Container Widths
```css
.container-sm { max-width: 640px; }   /* Content/text heavy */
.container-md { max-width: 768px; }   /* Forms, checkout */
.container-lg { max-width: 1024px; }  /* Product grids */
.container-xl { max-width: 1280px; }  /* Full layouts */
.container-2xl { max-width: 1440px; } /* Hero sections */
```

### Grid System
```css
/* Product Grid - Responsive */
.product-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* 12-column grid for complex layouts */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}
```

---

## 5. Component Specifications

### 5.1 Navigation Bar

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 72px;
  padding: 0 var(--space-6);
  
  /* Glassmorphism effect */
  background: rgba(10, 10, 11, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--glass-border);
  
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Mobile: Shrink on scroll */
.navbar.scrolled {
  height: 56px;
  background: rgba(10, 10, 11, 0.95);
}

/* Logo */
.navbar-logo {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 5.2 Buttons

```css
/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

/* Primary - Gold gradient */
.btn-primary {
  background: var(--accent-gradient);
  color: var(--text-inverse);
  border: none;
  box-shadow: 0 0 0 0 rgba(212, 175, 55, 0);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px -8px rgba(212, 175, 55, 0.5);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Secondary - Glass */
.btn-secondary {
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: var(--glass-highlight);
  border-color: var(--border-default);
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}

.btn-ghost:hover {
  color: var(--text-primary);
  background: var(--glass-bg);
}

/* Sizes */
.btn-sm { padding: var(--space-2) var(--space-4); font-size: 0.75rem; }
.btn-lg { padding: var(--space-4) var(--space-8); font-size: 1rem; }
.btn-xl { padding: var(--space-5) var(--space-10); font-size: 1.125rem; }
```

### 5.3 Product Card

```css
.product-card {
  position: relative;
  border-radius: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.product-card:hover {
  transform: translateY(-8px);
  border-color: var(--border-default);
  box-shadow: 
    0 20px 40px -15px rgba(0, 0, 0, 0.5),
    0 0 0 1px var(--glass-highlight);
}

/* Image Container */
.product-card-image {
  aspect-ratio: 1;
  background: var(--bg-tertiary);
  position: relative;
  overflow: hidden;
}

.product-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.product-card:hover .product-card-image img {
  transform: scale(1.05);
}

/* Quick Actions - Appear on hover */
.product-card-actions {
  position: absolute;
  bottom: var(--space-4);
  left: var(--space-4);
  right: var(--space-4);
  display: flex;
  gap: var(--space-2);
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
}

.product-card:hover .product-card-actions {
  opacity: 1;
  transform: translateY(0);
}

/* Content */
.product-card-content {
  padding: var(--space-5);
}

.product-card-brand {
  font-size: 0.75rem;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}

.product-card-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card-price {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.product-card-price-original {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  text-decoration: line-through;
  margin-left: var(--space-2);
}
```

### 5.4 Input Fields

```css
.input-group {
  position: relative;
}

.input {
  width: 100%;
  padding: var(--space-4) var(--space-5);
  font-size: 1rem;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  outline: none;
  transition: all 0.2s ease;
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:hover {
  border-color: var(--border-strong);
}

.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
}

/* Floating Label */
.input-label {
  position: absolute;
  left: var(--space-5);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
  transition: all 0.2s ease;
  background: var(--bg-secondary);
  padding: 0 var(--space-1);
}

.input:focus + .input-label,
.input:not(:placeholder-shown) + .input-label {
  top: 0;
  font-size: 0.75rem;
  color: var(--accent-primary);
}
```

---

## 6. Page Specifications

### 6.1 Homepage

#### Hero Section
```html
<section class="hero">
  <!-- Full viewport height, dark gradient background -->
  <!-- 3D product showcase using Three.js/Spline -->
  <!-- Animated headline with staggered reveal -->
  <!-- CTA buttons with hover glow -->
</section>
```

```css
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: var(--space-6);
  position: relative;
  overflow: hidden;
  
  /* Gradient background */
  background: 
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 175, 55, 0.15), transparent),
    var(--bg-primary);
}

/* 3D Scene Container */
.hero-3d-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* Content */
.hero-content {
  position: relative;
  z-index: 10;
  max-width: 900px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 100px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
  backdrop-filter: blur(10px);
}

.hero-headline {
  font-size: clamp(3rem, 10vw, 7rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
  margin-bottom: var(--space-6);
}

/* Gradient text */
.hero-headline span {
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto var(--space-10);
  line-height: 1.6;
}

.hero-cta {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}

/* Scroll indicator */
.hero-scroll {
  position: absolute;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-tertiary);
  font-size: 0.75rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}
```

#### Featured Products Section
```css
.featured-section {
  padding: var(--space-24) var(--space-6);
  background: var(--bg-primary);
}

.section-header {
  text-align: center;
  margin-bottom: var(--space-16);
}

.section-label {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

#### Categories Bento Grid
```css
.bento-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 300px);
}

.bento-item {
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  transition: all 0.4s ease;
}

/* Large item spans 2 columns and 2 rows */
.bento-item.large {
  grid-column: span 2;
  grid-row: span 2;
}

/* Medium item spans 2 columns */
.bento-item.medium {
  grid-column: span 2;
}

.bento-item:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 0 60px -20px rgba(212, 175, 55, 0.3);
}

/* Mobile: Stack */
@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
  
  .bento-item.large,
  .bento-item.medium {
    grid-column: span 1;
    grid-row: span 1;
  }
}
```

### 6.2 Product Page

```css
.product-page {
  padding-top: 72px; /* Navbar height */
}

/* Gallery - Left side */
.product-gallery {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--space-4);
  position: sticky;
  top: 88px;
}

.gallery-thumbs {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.gallery-thumb {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gallery-thumb.active,
.gallery-thumb:hover {
  border-color: var(--accent-primary);
}

.gallery-main {
  aspect-ratio: 1;
  border-radius: 24px;
  overflow: hidden;
  background: var(--bg-secondary);
}

/* Image zoom on hover */
.gallery-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
  cursor: zoom-in;
}

.gallery-main:hover img {
  transform: scale(1.1);
}

/* Product Info - Right side */
.product-info {
  padding: var(--space-8);
}

.product-brand {
  font-size: 0.875rem;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.product-title {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: var(--space-4);
}

.product-price-container {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.product-price {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 600;
}

.product-price-original {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  color: var(--text-tertiary);
  text-decoration: line-through;
}

.product-badge {
  padding: var(--space-1) var(--space-3);
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
}

/* Variant Selector */
.variant-section {
  margin-bottom: var(--space-6);
}

.variant-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.variant-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.variant-option {
  padding: var(--space-3) var(--space-5);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.variant-option:hover {
  border-color: var(--text-secondary);
}

.variant-option.selected {
  border-color: var(--accent-primary);
  background: rgba(212, 175, 55, 0.1);
  color: var(--accent-primary);
}

/* Add to Cart */
.add-to-cart-section {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.quantity-selector {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  overflow: hidden;
}

.quantity-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.quantity-btn:hover {
  background: var(--glass-bg);
  color: var(--text-primary);
}

.quantity-value {
  width: 48px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 1rem;
}

.add-to-cart-btn {
  flex: 1;
}
```

### 6.3 Cart Drawer

```css
.cart-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  max-width: 480px;
  height: 100vh;
  z-index: 200;
  
  background: var(--bg-primary);
  border-left: 1px solid var(--border-subtle);
  
  display: flex;
  flex-direction: column;
  
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.cart-drawer.open {
  transform: translateX(0);
}

/* Backdrop */
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.cart-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

/* Header */
.cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}

.cart-title {
  font-size: 1.25rem;
  font-weight: 600;
}

.cart-count {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

/* Items */
.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.cart-item {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.cart-item-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.cart-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cart-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: var(--space-1);
}

.cart-item-variant {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-bottom: auto;
}

.cart-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cart-item-price {
  font-family: var(--font-mono);
  font-weight: 600;
}

/* Footer */
.cart-footer {
  padding: var(--space-6);
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
}

.cart-subtotal {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.cart-subtotal-label {
  color: var(--text-secondary);
}

.cart-subtotal-value {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 600;
}
```

### 6.4 Checkout Flow

```css
/* Multi-step checkout */
.checkout-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 480px;
}

@media (max-width: 1024px) {
  .checkout-page {
    grid-template-columns: 1fr;
  }
}

/* Left: Forms */
.checkout-main {
  padding: var(--space-12) var(--space-8);
  max-width: 640px;
  margin: 0 auto;
}

/* Progress Steps */
.checkout-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-12);
}

.checkout-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.checkout-step.active {
  color: var(--text-primary);
}

.checkout-step.completed {
  color: var(--success);
}

.checkout-step-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 0.75rem;
  font-weight: 600;
}

.checkout-step.active .checkout-step-number {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-inverse);
}

.checkout-step.completed .checkout-step-number {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.checkout-step-divider {
  flex: 1;
  height: 1px;
  background: var(--border-default);
}

/* Form Sections */
.checkout-section {
  margin-bottom: var(--space-10);
}

.checkout-section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--space-6);
}

/* Right: Order Summary */
.checkout-summary {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-subtle);
  padding: var(--space-8);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.summary-item {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.summary-totals {
  margin-top: var(--space-6);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.summary-row.total {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-default);
  margin-top: var(--space-4);
}
```

---

## 7. Animation System

### Easing Functions
```css
:root {
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Animation Durations
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 400ms;
--duration-slowest: 600ms;
```

### Core Animations
```css
/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s var(--ease-out) forwards;
}

/* Stagger children */
.stagger-children > * {
  opacity: 0;
  animation: fadeInUp 0.5s var(--ease-out) forwards;
}

.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
.stagger-children > *:nth-child(4) { animation-delay: 150ms; }
.stagger-children > *:nth-child(5) { animation-delay: 200ms; }

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Shimmer loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

/* Hover lift */
.hover-lift {
  transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3);
}

/* Button press */
.btn:active {
  transform: scale(0.98);
}

/* Glow pulse */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }
  50% { box-shadow: 0 0 40px rgba(212, 175, 55, 0.5); }
}

.glow-pulse {
  animation: glowPulse 2s infinite;
}
```

### Framer Motion Presets (for React)
```javascript
// animation-presets.js
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3 }
};

export const slideInRight = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { type: 'spring', damping: 25, stiffness: 200 }
};

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};
```

---

## 8. 3D Elements Integration

### Three.js/Spline Recommendations

#### Hero Scene
```javascript
// Suggested: Floating product showcase
// - Product model floating with subtle rotation
// - Particle field background (gold particles)
// - Mouse-following camera movement
// - Ambient lighting with gold highlights

const sceneConfig = {
  background: '#0A0A0B',
  ambientLight: { color: '#ffffff', intensity: 0.3 },
  directionalLight: { color: '#D4AF37', intensity: 0.8, position: [5, 5, 5] },
  particles: {
    count: 500,
    color: '#D4AF37',
    size: 0.02,
    opacity: 0.4
  },
  camera: {
    fov: 45,
    position: [0, 0, 5],
    mouseFollowStrength: 0.05
  }
};
```

#### Product Page 3D Viewer
```javascript
// Interactive product viewer
// - Full 360° rotation
// - Zoom capability
// - Auto-rotate when idle
// - Touch/drag controls on mobile

const productViewerConfig = {
  autoRotate: true,
  autoRotateSpeed: 0.5,
  enableZoom: true,
  minZoom: 1,
  maxZoom: 3,
  enablePan: false,
  dampingFactor: 0.05
};
```

### Spline Integration
```html
<!-- Embed Spline scene -->
<spline-viewer 
  url="https://prod.spline.design/YOUR-SCENE-ID/scene.splinecode"
  loading-anim
  events-target="global"
></spline-viewer>
```

---

## 9. Micro-Interactions Checklist

### Buttons
- [x] Hover: Lift + shadow expansion
- [x] Active: Scale down 0.98
- [x] Focus: Ring outline
- [x] Loading: Spinner replacement

### Cards
- [x] Hover: Lift + border glow
- [x] Image zoom on hover
- [x] Quick actions fade in

### Forms
- [x] Input focus: Border color + shadow
- [x] Label float animation
- [x] Validation shake on error
- [x] Success checkmark animation

### Navigation
- [x] Mobile menu slide-in
- [x] Dropdown fade + scale
- [x] Active link indicator slide

### Cart
- [x] Add to cart: Button pulse + count increment
- [x] Drawer slide-in from right
- [x] Item removal: Slide out + height collapse
- [x] Price update: Number roll animation

### Page Transitions
- [x] Fade between routes
- [x] Skeleton loading states
- [x] Lazy image fade-in

---

## 10. Mobile-First Breakpoints

```css
/* Mobile First Approach */

/* Base: Mobile (0-639px) */
/* All base styles */

/* sm: Large phones (640px+) */
@media (min-width: 640px) { }

/* md: Tablets (768px+) */
@media (min-width: 768px) { }

/* lg: Laptops (1024px+) */
@media (min-width: 1024px) { }

/* xl: Desktops (1280px+) */
@media (min-width: 1280px) { }

/* 2xl: Large screens (1536px+) */
@media (min-width: 1536px) { }
```

### Touch Targets
```css
/* Minimum 44x44px touch targets on mobile */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Increased spacing on touch devices */
@media (pointer: coarse) {
  .btn { padding: var(--space-4) var(--space-6); }
  .input { padding: var(--space-4) var(--space-5); }
}
```

---

## 11. Accessibility Requirements

```css
/* Focus visible for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --border-default: rgba(255, 255, 255, 0.5);
    --text-secondary: #D4D4D8;
  }
}
```

---

## 12. Implementation Recommendations

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + CSS Variables
- **Animations**: Framer Motion
- **3D**: Three.js or Spline
- **Icons**: Lucide React
- **State**: Zustand (cart, UI state)

### Component Library Structure
```
components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── ...
├── layout/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── Container.tsx
├── product/
│   ├── ProductCard.tsx
│   ├── ProductGallery.tsx
│   └── VariantSelector.tsx
├── cart/
│   ├── CartDrawer.tsx
│   └── CartItem.tsx
├── checkout/
│   ├── CheckoutForm.tsx
│   └── OrderSummary.tsx
└── 3d/
    ├── HeroScene.tsx
    └── ProductViewer.tsx
```

### Performance Targets
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **TTI**: < 3.5s

### Image Strategy
- Use Next.js Image component
- WebP with AVIF fallback
- Responsive srcset
- Lazy loading with blur placeholder
- Product images: 1200x1200px max

---

## 13. Summary

### Design DNA
| Aspect | Specification |
|--------|---------------|
| **Primary Background** | #0A0A0B (near black) |
| **Accent Color** | #D4AF37 (gold) |
| **Border Radius** | 12-24px (generous) |
| **Font** | Inter / SF Pro |
| **Animation Timing** | 200-400ms |
| **Easing** | cubic-bezier(0.4, 0, 0.2, 1) |

### Key Differentiators
1. **Premium gold gradient accents** - Communicates luxury
2. **Glassmorphism navigation** - Modern, floating feel
3. **3D hero section** - Memorable first impression
4. **Micro-interactions everywhere** - Delightful details
5. **Dark mode first** - Contemporary, eye-friendly

This design system creates a cohesive, premium e-commerce experience that stands out while maintaining excellent usability and performance.

---

*Design Brief by Senior UI/UX Designer*
*For Silvera V2 - Premium Branded Goods*

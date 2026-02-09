/**
 * Test Data Fixtures
 * Contains mock products, orders, and other test data
 */

export const TEST_PRODUCTS = {
  // Sample products for cart testing
  products: [
    {
      id: 1,
      name: 'Test Product 1',
      price: 1000,
      sale_price: 800,
      category_id: 1,
      description: 'Test product for cart operations',
    },
    {
      id: 2,
      name: 'Test Product 2',
      price: 2000,
      sale_price: 1500,
      category_id: 2,
      description: 'Another test product',
    },
    {
      id: 3,
      name: 'Test Product 3',
      price: 500,
      sale_price: 450,
      category_id: 1,
      description: 'Discounted test product',
    },
  ],

  // Products for wishlist testing
  wishlistProducts: [
    {
      id: 4,
      name: 'Wishlist Product 1',
      price: 3000,
      category_id: 3,
    },
    {
      id: 5,
      name: 'Wishlist Product 2',
      price: 4500,
      category_id: 3,
    },
  ],

  // Out of stock product
  outOfStockProduct: {
    id: 99,
    name: 'Out of Stock Product',
    price: 5000,
    stock: 0,
  },
};

export const TEST_CATEGORIES = [
  { id: 1, name: 'Fashion', slug: 'fashion' },
  { id: 2, name: 'Electronics', slug: 'electronics' },
  { id: 3, name: 'Home & Living', slug: 'home-living' },
  { id: 4, name: 'Beauty', slug: 'beauty' },
];

export const TEST_ADDRESSES = {
  primaryAddress: {
    name: 'Home Address',
    phone: '9876543210',
    address: '123 Main Street',
    locality: 'Makati',
    city: 'Makati City',
    state: 'Metro Manila',
    pin_code: '1200',
  },

  alternateAddress: {
    name: 'Work Address',
    phone: '9876543211',
    address: '456 Business Avenue',
    locality: 'BGC',
    city: 'Taguig City',
    state: 'Metro Manila',
    pin_code: '1600',
  },

  invalidAddress: {
    name: '',  // Missing required field
    phone: '123',  // Invalid phone
    address: '',   // Missing required field
    city: '',      // Missing required field
  },
};

export const TEST_ORDERS = [
  {
    id: 'ORDER-001',
    date: '2024-01-15',
    status: 'Delivered',
    total: 3500,
    items: 2,
  },
  {
    id: 'ORDER-002',
    date: '2024-01-20',
    status: 'In Transit',
    total: 5200,
    items: 3,
  },
  {
    id: 'ORDER-003',
    date: '2024-01-25',
    status: 'Processing',
    total: 1800,
    items: 1,
  },
];

export const TEST_REVIEWS = [
  {
    id: 1,
    product_id: 1,
    user_name: 'John Doe',
    rating: 5,
    title: 'Excellent Product',
    comment: 'Great quality and fast shipping!',
    created_at: '2024-01-10',
  },
  {
    id: 2,
    product_id: 1,
    user_name: 'Jane Smith',
    rating: 4,
    title: 'Good Value',
    comment: 'Worth the money, very satisfied.',
    created_at: '2024-01-12',
  },
  {
    id: 3,
    product_id: 1,
    user_name: 'Bob Wilson',
    rating: 3,
    title: 'Average',
    comment: 'Not bad, could be better.',
    created_at: '2024-01-15',
  },
];

export const TEST_PAYMENT_METHODS = [
  { id: 'gcash', name: 'GCash', icon: 'gcash' },
  { id: 'paymaya', name: 'PayMaya', icon: 'paymaya' },
  { id: 'unionbank', name: 'UnionBank Online', icon: 'unionbank' },
  { id: 'bdo', name: 'BDO Online', icon: 'bdo' },
  { id: 'bpi', name: 'BPI Online', icon: 'bpi' },
  { id: 'credit_card', name: 'Credit Card', icon: 'credit-card' },
];

export const TEST_CART_ITEMS = [
  {
    id: 1,
    product_id: 1,
    name: 'Test Product 1',
    price: 1000,
    sale_price: 800,
    quantity: 1,
  },
  {
    id: 2,
    product_id: 2,
    name: 'Test Product 2',
    price: 2000,
    sale_price: 1500,
    quantity: 2,
  },
];

/**
 * Test data for form validation
 */
export const FORM_VALIDATION_DATA = {
  validEmail: 'test@example.com',
  invalidEmails: ['notanemail', '@example.com', 'user@', 'user @example.com'],

  validPhone: '9876543210',
  invalidPhones: ['123', 'abc', '98765', ''],

  validPassword: 'SecurePass123!',
  weakPasswords: ['123456', 'password', 'qwerty', 'abc123'],

  validPinCode: '1200',
  invalidPinCodes: ['', 'abc', '12'],

  validName: 'John Doe',
  invalidNames: ['', '123', '@#$%'],
};

/**
 * Test payment amounts
 */
export const PAYMENT_AMOUNTS = {
  small: 100,
  medium: 1000,
  large: 5000,
  invalid: -100,
  zero: 0,
};

/**
 * Test currency codes
 */
export const CURRENCIES = {
  PHP: { code: 'PHP', symbol: '₱' },
  USD: { code: 'USD', symbol: '$' },
};

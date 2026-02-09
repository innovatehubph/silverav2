/**
 * Test User Fixtures
 * Contains test user accounts for E2E testing
 */

export const TEST_USERS = {
  // Valid test user
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    phone: '9876543210',
  },

  // User for address testing
  addressUser: {
    email: 'address-test@example.com',
    password: 'AddressTest123!',
    name: 'Address Tester',
    phone: '9876543211',
  },

  // User for payment testing
  paymentUser: {
    email: 'payment-test@example.com',
    password: 'PaymentTest123!',
    name: 'Payment Tester',
    phone: '9876543212',
  },

  // User for orders testing
  ordersUser: {
    email: 'orders-test@example.com',
    password: 'OrdersTest123!',
    name: 'Orders Tester',
    phone: '9876543213',
  },

  // Invalid credentials for negative testing
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword123',
    name: 'Invalid User',
  },

  // User with incomplete data
  incompleteUser: {
    email: 'incomplete@example.com',
    password: '', // Missing password
    name: '',     // Missing name
  },
};

/**
 * Test credentials for authentication
 */
export const AUTH_CREDENTIALS = {
  validCredentials: {
    email: TEST_USERS.validUser.email,
    password: TEST_USERS.validUser.password,
  },

  invalidCredentials: {
    email: 'nonexistent@example.com',
    password: 'InvalidPassword123',
  },

  // Credentials with SQL injection attempt
  maliciousCredentials: {
    email: "admin' OR '1'='1",
    password: "' OR '1'='1",
  },
};

/**
 * Test PINs for PIN verification
 */
export const TEST_PINS = {
  validPIN: '123456',
  invalidPIN: '000000',
  weakPIN: '111111', // All same digits
};

/**
 * Test phone numbers for OTP verification
 */
export const TEST_PHONE_NUMBERS = {
  valid: {
    countryCode: '+63',
    number: '9876543210',
    full: '+639876543210',
  },

  invalid: {
    countryCode: '+63',
    number: 'abc',
    full: '+63abc',
  },
};

/**
 * Test emails
 */
export const TEST_EMAILS = {
  valid: [
    'user@example.com',
    'test.email@domain.co.uk',
    'name+tag@site.org',
  ],

  invalid: [
    'notanemail',
    '@example.com',
    'user@',
    'user @example.com',
  ],
};

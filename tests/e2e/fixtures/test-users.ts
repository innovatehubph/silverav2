export const TEST_USERS = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    phone: '09171234567',
  },

  secondUser: {
    email: 'test2@example.com',
    password: 'TestPassword123!',
    name: 'Second User',
    phone: '09171234568',
  },

  adminUser: {
    email: process.env.CI ? 'admin-test@example.com' : 'boss@silveraph.shop',
    password: 'AdminTestPass123!',
    name: 'Admin',
    phone: '09170000001',
  },

  invalidUser: {
    email: 'nonexistent@example.com',
    password: 'WrongPassword123',
    name: 'Invalid User',
  },

  incompleteUser: {
    email: 'incomplete@example.com',
    password: '',
    name: '',
  },
};

export const AUTH_CREDENTIALS = {
  validCredentials: {
    email: TEST_USERS.validUser.email,
    password: TEST_USERS.validUser.password,
  },

  invalidCredentials: {
    email: 'nonexistent@example.com',
    password: 'InvalidPassword123',
  },

  maliciousCredentials: {
    email: "admin' OR '1'='1",
    password: "' OR '1'='1",
  },
};

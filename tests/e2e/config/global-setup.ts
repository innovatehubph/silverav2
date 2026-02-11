import { TEST_USERS } from '../fixtures/test-users';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3865';

async function globalSetup() {
  // Register test users before running any tests
  for (const user of [TEST_USERS.validUser, TEST_USERS.secondUser]) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
          phone: user.phone,
        }),
      });
      if (res.ok) {
        console.log(`Registered test user: ${user.email}`);
      } else {
        const body = await res.json().catch(() => ({}));
        // User already exists is fine
        console.log(`User ${user.email}: ${body.message || res.status}`);
      }
    } catch (err) {
      console.warn(`Could not register ${user.email}:`, err);
    }
  }
}

export default globalSetup;

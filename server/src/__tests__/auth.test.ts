import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app';
import prisma from '../config/prisma';
import argon2 from 'argon2';

describe('Authentication API (/api/auth)', () => {
  const testEmail = `auth.test.${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';
  let authToken = '';
  let createdUserId = '';

  before(async () => {
    // Ensure clean state for test email
    await prisma.user.deleteMany({
      where: { email: testEmail.toLowerCase() },
    });
  });

  after(async () => {
    // Cleanup test user and disconnect prisma
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return safe user info and token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: testName,
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      assert.equal(response.body.success, true);
      assert.ok(response.body.data.token, 'Token should be returned');
      assert.ok(response.body.data.user, 'User object should be returned');
      assert.equal(response.body.data.user.email, testEmail.toLowerCase());
      assert.equal(response.body.data.user.name, testName);
      assert.ok(response.body.data.user.id, 'User ID should be returned');

      createdUserId = response.body.data.user.id;
      authToken = response.body.data.token;

      // CRITICAL: Ensure passwordHash is NOT returned in response
      assert.equal(response.body.data.user.passwordHash, undefined, 'passwordHash must never be returned');
      assert.equal(JSON.stringify(response.body).includes('passwordHash'), false, 'passwordHash string must not appear anywhere in response');

      // Verify in DB that password was hashed with Argon2 and plaintext is not stored
      const dbUser = await prisma.user.findUnique({
        where: { id: createdUserId },
      });
      assert.ok(dbUser, 'User must exist in database');
      assert.notEqual(dbUser.passwordHash, testPassword, 'Plaintext password must never be stored');
      assert.ok(dbUser.passwordHash.startsWith('$argon2'), 'Password hash must be Argon2');
      const isArgon2Valid = await argon2.verify(dbUser.passwordHash, testPassword);
      assert.equal(isArgon2Valid, true, 'Stored Argon2 hash must verify against original password');
    });

    it('should prevent duplicate registration with the same email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail.toUpperCase(), // Testing case-insensitivity
          password: 'AnotherPassword123!',
        })
        .expect(409);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'CONFLICT');
      assert.ok(response.body.error.message.includes('already exists'));
    });

    it('should reject registration with invalid input', async () => {
      // Short password (< 8 chars)
      const resShortPass = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'shortpass@example.com',
          password: 'short',
        })
        .expect(400);

      assert.equal(resShortPass.body.success, false);
      assert.equal(resShortPass.body.error.code, 'VALIDATION_ERROR');

      // Invalid email format
      const resBadEmail = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'ValidPassword123!',
        })
        .expect(400);

      assert.equal(resBadEmail.body.success, false);
      assert.equal(resBadEmail.body.error.code, 'VALIDATION_ERROR');

      // Missing name
      const resMissingName = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'noname@example.com',
          password: 'ValidPassword123!',
        })
        .expect(400);

      assert.equal(resMissingName.body.success, false);
      assert.equal(resMissingName.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in successfully with valid credentials and return safe user info', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      assert.equal(response.body.success, true);
      assert.ok(response.body.data.token, 'Login should return a JWT');
      assert.equal(response.body.data.user.id, createdUserId);
      assert.equal(response.body.data.user.email, testEmail.toLowerCase());

      // CRITICAL: Ensure passwordHash is NOT returned in response
      assert.equal(response.body.data.user.passwordHash, undefined, 'passwordHash must never be in login response');
      assert.equal(JSON.stringify(response.body).includes('passwordHash'), false, 'passwordHash must not appear anywhere in response');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
      assert.equal(response.body.error.message, 'Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
      assert.equal(response.body.error.message, 'Invalid email or password');
    });

    it('should reject login with invalid request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        })
        .expect(400);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return authenticated safe user profile when valid token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.user.id, createdUserId);
      assert.equal(response.body.data.user.email, testEmail.toLowerCase());
      assert.equal(response.body.data.user.name, testName);

      // CRITICAL: Ensure passwordHash is NOT returned
      assert.equal(response.body.data.user.passwordHash, undefined, 'passwordHash must not be in /me response');
      assert.equal(JSON.stringify(response.body).includes('passwordHash'), false, 'passwordHash must not appear anywhere in /me response');
    });

    it('should reject request when no token is provided (unauthenticated /me)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
      assert.ok(response.body.error.message.includes('token is required'));
    });

    it('should reject request with an invalid/tampered token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token')
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
      assert.ok(response.body.error.message.includes('Invalid or expired'));
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 with success message on logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.message, 'Logged out successfully');
    });
  });
});

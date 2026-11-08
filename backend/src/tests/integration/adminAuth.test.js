import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import Vendor from '../../models/Vendor.js';
import env from '../../config/env.js';

describe('Admin Authentication - Integration Tests', () => {
  let app;
  const TEST_DB_URI = 'mongodb://localhost:27017/invoice-test-admin';
  const VALID_ADMIN_TOKEN = env.ADMIN_TOKEN;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
    app = createApp();
  });

  afterEach(async () => {
    await Vendor.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should return 401 when creating vendor without token', async () => {
    const response = await request(app)
      .post('/api/vendors')
      .send({
        name: 'Test Vendor',
        email: 'test@vendor.com',
        isActive: true
      })
      .expect(401);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Admin token required');

    // Verify no vendor was created
    const count = await Vendor.countDocuments();
    expect(count).toBe(0);
  });

  it('should return 403 when creating vendor with wrong token', async () => {
    const response = await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', 'wrong-token-12345678901234567890123456')
      .send({
        name: 'Test Vendor',
        email: 'test@vendor.com',
        isActive: true
      })
      .expect(403);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toBe('Invalid admin token');

    // Verify no vendor was created
    const count = await Vendor.countDocuments();
    expect(count).toBe(0);
  });

  it('should successfully create vendor with correct X-Admin-Token header', async () => {
    const vendorData = {
      name: 'Authorized Vendor',
      email: 'authorized@vendor.com',
      isActive: true
    };

    const response = await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', VALID_ADMIN_TOKEN)
      .send(vendorData)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.vendor.name).toBe('Authorized Vendor');
    expect(response.body.data.vendor.email).toBe('authorized@vendor.com');

    // Verify vendor was created in database
    const vendor = await Vendor.findById(response.body.data.vendor._id);
    expect(vendor).toBeTruthy();
    expect(vendor.name).toBe('Authorized Vendor');
  });

  it('should successfully create vendor with Bearer token in Authorization header', async () => {
    const vendorData = {
      name: 'Bearer Auth Vendor',
      email: 'bearer@vendor.com',
      isActive: true
    };

    const response = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${VALID_ADMIN_TOKEN}`)
      .send(vendorData)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.vendor.name).toBe('Bearer Auth Vendor');

    const vendor = await Vendor.findById(response.body.data.vendor._id);
    expect(vendor).toBeTruthy();
  });

  it('should allow GET /api/vendors without authentication', async () => {
    // Create a vendor first
    await Vendor.create({
      name: 'Public Vendor',
      email: 'public@vendor.com',
      isActive: true
    });

    // GET should work without auth
    const response = await request(app)
      .get('/api/vendors')
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.vendors).toHaveLength(1);
    expect(response.body.data.vendors[0].name).toBe('Public Vendor');
  });

  it('should reject empty token', async () => {
    const response = await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', '')
      .send({
        name: 'Test Vendor',
        email: 'test@vendor.com'
      })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject token with Bearer prefix in X-Admin-Token header', async () => {
    const response = await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', `Bearer ${VALID_ADMIN_TOKEN}`)
      .send({
        name: 'Test Vendor',
        email: 'test@vendor.com'
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toBe('Invalid admin token');
  });

  it('should handle case-sensitive token comparison', async () => {
    // Token is case-sensitive
    const wrongCaseToken = VALID_ADMIN_TOKEN.toUpperCase();

    const response = await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', wrongCaseToken)
      .send({
        name: 'Test Vendor',
        email: 'test@vendor.com'
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should create multiple vendors with same token', async () => {
    // First vendor
    await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', VALID_ADMIN_TOKEN)
      .send({
        name: 'Vendor 1',
        email: 'vendor1@test.com',
        isActive: true
      })
      .expect(201);

    // Second vendor
    await request(app)
      .post('/api/vendors')
      .set('X-Admin-Token', VALID_ADMIN_TOKEN)
      .send({
        name: 'Vendor 2',
        email: 'vendor2@test.com',
        isActive: true
      })
      .expect(201);

    // Verify both created
    const count = await Vendor.countDocuments();
    expect(count).toBe(2);
  });

  it('should handle malformed Authorization header', async () => {
    const response = await request(app)
      .post('/api/vendors')
      .set('Authorization', 'InvalidFormat')
      .send({
        name: 'Test Vendor',
        email: 'test@vendor.com'
      })
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

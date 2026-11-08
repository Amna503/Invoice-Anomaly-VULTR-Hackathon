import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { createApp } from '../../app.js';
import Invoice from '../../models/Invoice.js';
import env from '../../config/env.js';

describe('POST /api/invoices/upload - Integration Tests', () => {
  let app;
  const TEST_DB_URI = 'mongodb://localhost:27017/invoice-test-upload';
  const testFilesDir = path.join(process.cwd(), 'test-uploads');

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_DB_URI);

    // Create app
    app = createApp();

    // Create test files directory
    await fs.mkdir(testFilesDir, { recursive: true });
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clear database after each test
    await Invoice.deleteMany({});

    // Clean up uploaded files
    const files = await fs.readdir(env.UPLOAD_DIR).catch(() => []);
    for (const file of files) {
      await fs.unlink(path.join(env.UPLOAD_DIR, file)).catch(() => {});
    }
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.connection.close();
    await fs.rm(testFilesDir, { recursive: true, force: true });
  });

  it('should upload valid PDF and create invoice record', async () => {
    // Create a test PDF file
    const pdfPath = path.join(testFilesDir, 'test-invoice.pdf');
    await fs.writeFile(pdfPath, '%PDF-1.4\n%Test invoice content\n%%EOF');

    const response = await request(app)
      .post('/api/invoices/upload')
      .attach('files', pdfPath)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.invoices).toHaveLength(1);
    expect(response.body.data.invoices[0].fileType).toBe('pdf');
    expect(response.body.data.invoices[0].status).toBe('received');

    // Verify database record
    const invoice = await Invoice.findById(response.body.data.invoices[0].id);
    expect(invoice).toBeTruthy();
    expect(invoice.originalFileName).toBe('test-invoice.pdf');
  });

  it('should upload valid CSV and create invoice record', async () => {
    // Create a test CSV file
    const csvPath = path.join(testFilesDir, 'test-invoice.csv');
    await fs.writeFile(csvPath, 'vendor,amount,date\nAcme Corp,1000,2024-01-01');

    const response = await request(app)
      .post('/api/invoices/upload')
      .attach('files', csvPath)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.invoices).toHaveLength(1);
    expect(response.body.data.invoices[0].fileType).toBe('csv');
    expect(response.body.data.invoices[0].status).toBe('received');
  });

  it('should reject .exe file renamed to .pdf (invalid file type)', async () => {
    // Create a fake PDF (actually an exe)
    const fakePdfPath = path.join(testFilesDir, 'malicious.pdf');
    await fs.writeFile(fakePdfPath, 'MZ\x90\x00'); // EXE header

    const response = await request(app)
      .post('/api/invoices/upload')
      .attach('files', fakePdfPath)
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    expect(response.body.error.message).toContain('Invalid file type');

    // Verify no invoice was created
    const count = await Invoice.countDocuments();
    expect(count).toBe(0);
  });

  it('should reject file exceeding 10MB size limit', async () => {
    // Create a file larger than 10MB
    const largePath = path.join(testFilesDir, 'large-invoice.pdf');
    const largeContent = Buffer.alloc(11 * 1024 * 1024); // 11 MB
    await fs.writeFile(largePath, largeContent);

    const response = await request(app)
      .post('/api/invoices/upload')
      .attach('files', largePath)
      .expect(413);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    expect(response.body.error.message).toContain('exceeds');

    // Verify no invoice was created
    const count = await Invoice.countDocuments();
    expect(count).toBe(0);
  });

  it('should handle multiple file uploads', async () => {
    // Create multiple test files
    const pdf1Path = path.join(testFilesDir, 'invoice1.pdf');
    const pdf2Path = path.join(testFilesDir, 'invoice2.pdf');
    await fs.writeFile(pdf1Path, '%PDF-1.4\nInvoice 1\n%%EOF');
    await fs.writeFile(pdf2Path, '%PDF-1.4\nInvoice 2\n%%EOF');

    const response = await request(app)
      .post('/api/invoices/upload')
      .attach('files', pdf1Path)
      .attach('files', pdf2Path)
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.invoices).toHaveLength(2);

    // Verify both invoices in database
    const count = await Invoice.countDocuments();
    expect(count).toBe(2);
  });

  it('should return 400 when no files are uploaded', async () => {
    const response = await request(app)
      .post('/api/invoices/upload')
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('No files uploaded');
  });
});

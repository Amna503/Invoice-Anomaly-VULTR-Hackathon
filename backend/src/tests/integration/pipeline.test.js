import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.js';
import Flag from '../../models/Flag.js';
import AuditEvent from '../../models/AuditEvent.js';
import Vendor from '../../models/Vendor.js';
import PurchaseOrder from '../../models/PurchaseOrder.js';
import Email from '../../models/Email.js';
import { runPipeline } from '../../pipeline/runPipeline.js';
import * as extractService from '../../services/ai/extractInvoice.js';
import * as explainService from '../../services/ai/explainFlag.js';
import * as draftService from '../../services/ai/draftEmail.js';

describe('Pipeline Integration Tests', () => {
  const TEST_DB_URI = 'mongodb://localhost:27017/invoice-test-pipeline';

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterEach(async () => {
    // Clear all test data
    await Invoice.deleteMany({});
    await Flag.deleteMany({});
    await AuditEvent.deleteMany({});
    await Vendor.deleteMany({});
    await PurchaseOrder.deleteMany({});
    await Email.deleteMany({});
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should complete pipeline and route to auto_cleared when no anomalies', async () => {
    // Mock AI services
    vi.spyOn(extractService, 'extractInvoiceData').mockResolvedValue({
      vendorName: 'Test Vendor',
      invoiceNumber: 'INV-001',
      invoiceDate: new Date('2024-01-15'),
      currency: 'USD',
      lineItems: [
        { description: 'Service', quantity: 1, unitPrice: 1000, amount: 1000 }
      ],
      subtotal: 1000,
      tax: 100,
      total: 1100,
      bankAccount: '****1234',
      poNumber: 'PO-001'
    });

    vi.spyOn(explainService, 'explainFlags').mockResolvedValue([]);
    vi.spyOn(draftService, 'draftEmail').mockResolvedValue({
      subject: 'Test subject',
      body: 'Test body'
    });

    // Create test vendor and PO
    const vendor = await Vendor.create({
      name: 'Test Vendor',
      email: 'vendor@test.com',
      bankAccount: '****1234',
      isActive: true
    });

    await PurchaseOrder.create({
      poNumber: 'PO-001',
      vendorId: vendor._id,
      approvedAmount: 1200,
      status: 'approved'
    });

    // Create invoice
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored-test.pdf',
      fileType: 'pdf',
      rawText: 'Invoice from Test Vendor for $1100',
      status: 'received'
    });

    // Run pipeline
    await runPipeline(invoice._id.toString());

    // Verify final state
    const updated = await Invoice.findById(invoice._id);
    expect(updated.status).toBe('auto_cleared');
    expect(updated.route).toBe('auto_cleared');
    expect(updated.riskScore).toBe(0);
    expect(updated.extracted.vendorName).toBe('Test Vendor');
    expect(updated.extracted.total).toBe(1100);

    // Verify no flags created
    const flags = await Flag.find({ invoiceId: invoice._id });
    expect(flags).toHaveLength(0);

    // Verify audit events
    const auditEvents = await AuditEvent.find({ invoiceId: invoice._id });
    expect(auditEvents.length).toBeGreaterThan(0);

    const startedEvent = auditEvents.find(e => e.action === 'pipeline_started');
    expect(startedEvent).toBeTruthy();

    const completedEvent = auditEvents.find(e => e.action === 'pipeline_completed');
    expect(completedEvent).toBeTruthy();
  });

  it('should create flags and route to needs_review when anomalies detected', async () => {
    // Mock AI extraction with missing PO number
    vi.spyOn(extractService, 'extractInvoiceData').mockResolvedValue({
      vendorName: 'Unknown Vendor',
      invoiceNumber: 'INV-002',
      invoiceDate: new Date('2024-01-15'),
      currency: 'USD',
      lineItems: [],
      subtotal: 5000,
      tax: 500,
      total: 5500,
      bankAccount: null,
      poNumber: null // Missing PO - should trigger flag
    });

    vi.spyOn(explainService, 'explainFlags').mockResolvedValue([
      { flagId: 'mock-id', explanation: 'No purchase order provided for high-value invoice' }
    ]);

    vi.spyOn(draftService, 'draftEmail').mockResolvedValue({
      subject: 'Query regarding Invoice INV-002',
      body: 'Please provide PO number'
    });

    // Create invoice
    const invoice = await Invoice.create({
      originalFileName: 'test2.pdf',
      storedFileName: 'stored-test2.pdf',
      fileType: 'pdf',
      rawText: 'Invoice INV-002 for $5500',
      status: 'received'
    });

    // Run pipeline
    await runPipeline(invoice._id.toString());

    // Verify final state
    const updated = await Invoice.findById(invoice._id);
    expect(updated.route).toBe('needs_review');
    expect(updated.riskScore).toBeGreaterThan(0);

    // Verify flags created
    const flags = await Flag.find({ invoiceId: invoice._id });
    expect(flags.length).toBeGreaterThan(0);

    // Should have no_matching_po and unknown_vendor flags
    const flagTypes = flags.map(f => f.type);
    expect(flagTypes).toContain('no_matching_po');
    expect(flagTypes).toContain('unknown_vendor');

    // Verify email draft created
    const email = await Email.findOne({ invoiceId: invoice._id });
    expect(email).toBeTruthy();
    expect(email.status).toBe('draft');
  });

  it('should route to blocked when high-risk anomalies detected', async () => {
    // Create vendor with known bank account
    const vendor = await Vendor.create({
      name: 'Trusted Vendor',
      email: 'trusted@test.com',
      bankAccount: '****1234',
      isActive: true
    });

    // Mock AI extraction with changed bank details
    vi.spyOn(extractService, 'extractInvoiceData').mockResolvedValue({
      vendorName: 'Trusted Vendor',
      invoiceNumber: 'INV-003',
      invoiceDate: new Date('2024-01-15'),
      currency: 'USD',
      lineItems: [],
      subtotal: 10000,
      tax: 1000,
      total: 11000,
      bankAccount: '****9999', // Changed bank account - high severity flag
      poNumber: 'PO-999'
    });

    vi.spyOn(explainService, 'explainFlags').mockResolvedValue([
      { flagId: 'mock-id', explanation: 'Bank account details have changed' }
    ]);

    vi.spyOn(draftService, 'draftEmail').mockResolvedValue({
      subject: 'URGENT: Bank Details Change Detected',
      body: 'Please verify bank account change'
    });

    // Create invoice
    const invoice = await Invoice.create({
      originalFileName: 'test3.pdf',
      storedFileName: 'stored-test3.pdf',
      fileType: 'pdf',
      rawText: 'Invoice from Trusted Vendor',
      status: 'received'
    });

    // Run pipeline
    await runPipeline(invoice._id.toString());

    // Verify final state
    const updated = await Invoice.findById(invoice._id);
    expect(updated.route).toBe('blocked');
    expect(updated.riskScore).toBeGreaterThanOrEqual(10);

    // Verify bank_details_changed flag created
    const flags = await Flag.find({ invoiceId: invoice._id });
    const bankFlag = flags.find(f => f.type === 'bank_details_changed');
    expect(bankFlag).toBeTruthy();
    expect(bankFlag.severity).toBe('high');
  });

  it('should create audit events for each pipeline step', async () => {
    // Mock AI services
    vi.spyOn(extractService, 'extractInvoiceData').mockResolvedValue({
      vendorName: 'Simple Vendor',
      invoiceNumber: 'INV-004',
      invoiceDate: new Date('2024-01-15'),
      currency: 'USD',
      lineItems: [],
      subtotal: 100,
      tax: 10,
      total: 110,
      bankAccount: null,
      poNumber: 'PO-004'
    });

    const invoice = await Invoice.create({
      originalFileName: 'test4.pdf',
      storedFileName: 'stored-test4.pdf',
      fileType: 'pdf',
      rawText: 'Simple invoice',
      status: 'received'
    });

    await runPipeline(invoice._id.toString());

    // Verify audit trail
    const auditEvents = await AuditEvent.find({ invoiceId: invoice._id })
      .sort({ createdAt: 1 });

    const actions = auditEvents.map(e => e.action);
    expect(actions).toContain('pipeline_started');
    expect(actions).toContain('step_ingest_completed');
    expect(actions).toContain('step_extract_completed');
    expect(actions).toContain('step_check_completed');
    expect(actions).toContain('step_score_route_completed');
    expect(actions).toContain('pipeline_completed');

    // All events should have actor = 'agent'
    const agentEvents = auditEvents.filter(e =>
      e.action !== 'pipeline_started' &&
      e.action !== 'pipeline_completed'
    );
    agentEvents.forEach(event => {
      expect(['agent', 'system']).toContain(event.actor);
    });
  });

  it('should handle duplicate invoice detection', async () => {
    const vendor = await Vendor.create({
      name: 'Test Vendor',
      email: 'vendor@test.com',
      isActive: true
    });

    // Create existing invoice
    await Invoice.create({
      originalFileName: 'existing.pdf',
      storedFileName: 'stored-existing.pdf',
      fileType: 'pdf',
      status: 'approved',
      vendorId: vendor._id,
      extracted: {
        vendorName: 'Test Vendor',
        invoiceNumber: 'DUPLICATE-001',
        total: 1000
      }
    });

    // Mock AI to return same invoice number
    vi.spyOn(extractService, 'extractInvoiceData').mockResolvedValue({
      vendorName: 'Test Vendor',
      invoiceNumber: 'DUPLICATE-001', // Same as existing
      invoiceDate: new Date('2024-01-15'),
      currency: 'USD',
      lineItems: [],
      subtotal: 1000,
      tax: 100,
      total: 1100,
      bankAccount: null,
      poNumber: 'PO-001'
    });

    vi.spyOn(explainService, 'explainFlags').mockResolvedValue([
      { flagId: 'mock-id', explanation: 'Duplicate invoice number detected' }
    ]);

    vi.spyOn(draftService, 'draftEmail').mockResolvedValue({
      subject: 'Duplicate Invoice Detected',
      body: 'This invoice number already exists'
    });

    const newInvoice = await Invoice.create({
      originalFileName: 'duplicate.pdf',
      storedFileName: 'stored-duplicate.pdf',
      fileType: 'pdf',
      rawText: 'Duplicate invoice',
      status: 'received'
    });

    await runPipeline(newInvoice._id.toString());

    // Verify duplicate flag created
    const flags = await Flag.find({ invoiceId: newInvoice._id });
    const duplicateFlag = flags.find(f => f.type === 'duplicate_invoice');
    expect(duplicateFlag).toBeTruthy();
    expect(duplicateFlag.severity).toBe('high');
  });
});

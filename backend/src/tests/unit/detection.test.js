import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, clearCollections } from '../utils/testDb.js';
import { createTestInvoice, createTestVendor, createTestPO } from '../utils/fixtures.js';
import { checkInvoice, scoreAndRoute } from '../../detection/index.js';
import Invoice from '../../models/Invoice.js';
import Vendor from '../../models/Vendor.js';
import PurchaseOrder from '../../models/PurchaseOrder.js';

describe('Detection Module', () => {
  beforeAll(async () => {
    await setupTestDb();
  }, 30000);

  afterAll(async () => {
    await teardownTestDb();
  }, 30000);

  beforeEach(async () => {
    await clearCollections();
  });

  it('should detect PRICE_OUTLIER when invoice exceeds 2x average', async () => {
    const invoice = createTestInvoice({ extracted: { total: 2000 } });
    const history = [
      { extracted: { total: 500 } },
      { extracted: { total: 500 } }
    ];

    const { flags } = await checkInvoice({ invoice, vendor: {}, purchaseOrders: [], history });

    const outlier = flags.find(f => f.type === 'price_outlier');
    expect(outlier).toBeDefined();
    expect(outlier.severity).toBe('medium');
  });

  it('should detect NO_MATCHING_PO when poNumber is missing', async () => {
    const invoice = createTestInvoice({
      extracted: { total: 1000, poNumber: '' }
    });

    const { flags } = await checkInvoice({ invoice, vendor: {}, purchaseOrders: [], history: [] });

    const noPoFlag = flags.find(f => f.type === 'no_matching_po');
    expect(noPoFlag).toBeDefined();
  });

  it('should detect OVER_PURCHASE_ORDER when amount exceeds PO', async () => {
    const invoice = createTestInvoice({ extracted: { total: 1200, poNumber: 'PO-123' } });
    const po = createTestPO({ poNumber: 'PO-123', approvedAmount: 1000 });

    const { flags } = await checkInvoice({
      invoice,
      vendor: {},
      purchaseOrders: [po],
      history: []
    });

    const overPO = flags.find(f => f.type === 'over_purchase_order');
    expect(overPO).toBeDefined();
    expect(overPO.severity).toBe('high');
  });

  it('should detect BANK_DETAILS_CHANGED when bank account differs', async () => {
    const vendor = createTestVendor({ bankAccount: '1234567890' });
    const invoice = createTestInvoice({
      extracted: { bankAccount: '****9999' }
    });

    const { flags } = await checkInvoice({ invoice, vendor, purchaseOrders: [], history: [] });

    const bankFlag = flags.find(f => f.type === 'bank_details_changed');
    expect(bankFlag).toBeDefined();
    expect(bankFlag.severity).toBe('high');
  });

  it('should detect UNKNOWN_VENDOR when vendor is null', async () => {
    const invoice = createTestInvoice({ extracted: { vendorName: 'Unknown Corp' } });

    const { flags } = await checkInvoice({
      invoice,
      vendor: null,
      purchaseOrders: [],
      history: []
    });

    const unknownVendor = flags.find(f => f.type === 'unknown_vendor');
    expect(unknownVendor).toBeDefined();
    expect(unknownVendor.severity).toBe('medium');
  });

  it('should detect MATH_ERROR when totals do not match', async () => {
    const invoice = createTestInvoice({
      extracted: {
        lineItems: [
          { amount: 100 },
          { amount: 200 }
        ],
        tax: 30,
        total: 500 // Should be 330
      }
    });

    const { flags } = await checkInvoice({ invoice, vendor: {}, purchaseOrders: [], history: [] });

    const mathError = flags.find(f => f.type === 'math_error');
    expect(mathError).toBeDefined();
  });

  it('should detect DUPLICATE_INVOICE when invoice number exists', async () => {
    const existingInvoice = await Invoice.create(
      createTestInvoice({ extracted: { invoiceNumber: 'INV-123' } })
    );

    const invoice = createTestInvoice({ extracted: { invoiceNumber: 'INV-123' } });
    const history = [existingInvoice.toObject()];

    const { flags } = await checkInvoice({ invoice, vendor: {}, purchaseOrders: [], history });

    const duplicate = flags.find(f => f.type === 'duplicate_invoice');
    expect(duplicate).toBeDefined();
    expect(duplicate.severity).toBe('high');
  });

  describe('scoreAndRoute', () => {
    it('should route to auto_cleared with 0 flags', () => {
      const result = scoreAndRoute([]);

      expect(result.riskScore).toBe(0);
      expect(result.route).toBe('auto_cleared');
    });

    it('should route to needs_review with medium severity flags', () => {
      const flags = [
        { severity: 'medium' },
        { severity: 'medium' }
      ];

      const result = scoreAndRoute(flags);

      expect(result.riskScore).toBe(10); // 2 * 5
      expect(result.route).toBe('blocked'); // >= 10
    });

    it('should route to blocked with high severity flags', () => {
      const flags = [
        { severity: 'high' },
        { severity: 'medium' }
      ];

      const result = scoreAndRoute(flags);

      expect(result.riskScore).toBe(15); // 10 + 5
      expect(result.route).toBe('blocked');
    });

    it('should route to needs_review with low risk score', () => {
      const flags = [{ severity: 'medium' }];

      const result = scoreAndRoute(flags);

      expect(result.riskScore).toBe(5);
      expect(result.route).toBe('needs_review');
    });
  });
});

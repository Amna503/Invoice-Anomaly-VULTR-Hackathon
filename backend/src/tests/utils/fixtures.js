import mongoose from 'mongoose';

export function createTestVendor(overrides = {}) {
  return {
    name: 'Acme Corp',
    taxId: 'TAX-' + Date.now(),
    bankAccount: '1234567890',
    email: 'billing@acme.com',
    paymentTerms: 'net30',
    isActive: true,
    notes: 'Test vendor',
    ...overrides
  };
}

export function createTestPO(overrides = {}) {
  return {
    poNumber: 'PO-' + Date.now(),
    vendorId: new mongoose.Types.ObjectId(),
    lineItems: [
      {
        description: 'Test Item',
        quantity: 10,
        unitPrice: 50,
        amount: 500
      }
    ],
    approvedAmount: 500,
    status: 'approved',
    approvedBy: 'test@example.com',
    approvedAt: new Date(),
    notes: 'Test PO',
    ...overrides
  };
}

export function createTestInvoice(overrides = {}) {
  return {
    originalFileName: 'test-invoice.pdf',
    storedFileName: 'test-' + Date.now() + '.pdf',
    fileType: 'pdf',
    rawText: 'Invoice test content',
    extracted: {
      vendorName: 'Acme Corp',
      invoiceNumber: 'INV-' + Date.now(),
      invoiceDate: new Date(),
      currency: 'USD',
      lineItems: [
        {
          description: 'Test Item',
          quantity: 10,
          unitPrice: 50,
          amount: 500
        }
      ],
      subtotal: 500,
      tax: 50,
      total: 550,
      bankAccount: '****7890',
      poNumber: 'PO-12345'
    },
    status: 'received',
    riskScore: 0,
    route: null,
    currentStep: null,
    retryCount: 0,
    ...overrides
  };
}

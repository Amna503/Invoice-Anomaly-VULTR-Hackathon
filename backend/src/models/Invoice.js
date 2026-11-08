import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  // File metadata
  originalFileName: {
    type: String,
    required: true
  },
  storedFileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'csv'],
    required: true
  },
  rawText: {
    type: String,
    default: ''
  },

  // Extracted invoice data
  extracted: {
    vendorName: String,
    invoiceNumber: String,
    invoiceDate: Date,
    currency: {
      type: String,
      default: 'USD'
    },
    lineItems: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      amount: Number
    }],
    subtotal: Number,
    tax: Number,
    total: Number,
    bankAccount: String, // Last 4 digits only
    poNumber: String
  },

  // Status tracking
  status: {
    type: String,
    enum: [
      'received',      // Just uploaded
      'queued',        // Waiting in DB-backed queue
      'processing',    // In pipeline
      'auto_cleared',  // Passed all checks
      'needs_review',  // Has flags, needs human
      'blocked',       // High risk, blocked
      'approved',      // Human approved
      'rejected',      // Human rejected
      'query_sent',    // Query sent to supplier
      'failed'         // Processing failed
    ],
    default: 'received',
    required: true
  },
  queuedAt: Date,

  // Risk assessment
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  route: {
    type: String,
    enum: ['auto_cleared', 'needs_review', 'blocked'],
    default: null
  },

  // Processing metadata
  currentStep: {
    type: String,
    enum: ['ingest', 'extract', 'check', 'score_route', 'explain', 'draft_email', 'completed'],
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  failureReason: String,

  // Related data
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  purchaseOrderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  reviewedAt: Date
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

// Indexes for performance
invoiceSchema.index({ status: 1, createdAt: -1 });
invoiceSchema.index({ route: 1, createdAt: -1 });
invoiceSchema.index({ vendorId: 1 });
invoiceSchema.index({ 'extracted.invoiceNumber': 1 });
invoiceSchema.index({ 'extracted.invoiceDate': -1 });

// Virtual for flags
invoiceSchema.virtual('flags', {
  ref: 'Flag',
  localField: '_id',
  foreignField: 'invoiceId'
});

// Virtual for email draft
invoiceSchema.virtual('emailDraft', {
  ref: 'Email',
  localField: '_id',
  foreignField: 'invoiceId',
  justOne: true
});

// Ensure virtuals are included in JSON output
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

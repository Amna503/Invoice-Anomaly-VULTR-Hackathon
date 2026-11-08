import mongoose from 'mongoose';

const flagSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'duplicate_invoice',
      'bank_details_changed',
      'over_purchase_order',
      'no_matching_po',
      'price_outlier',
      'math_error',
      'unknown_vendor'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true
  },
  evidence: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
flagSchema.index({ invoiceId: 1, type: 1 });
flagSchema.index({ severity: 1 });
flagSchema.index({ createdAt: -1 });

const Flag = mongoose.model('Flag', flagSchema);

export default Flag;

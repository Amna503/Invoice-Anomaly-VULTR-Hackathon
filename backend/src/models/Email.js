import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'approved', 'in_outbox'],
    default: 'draft'
  },
  approvedBy: String,
  approvedAt: Date,
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

// Indexes
emailSchema.index({ invoiceId: 1 });
emailSchema.index({ status: 1 });

const Email = mongoose.model('Email', emailSchema);

export default Email;

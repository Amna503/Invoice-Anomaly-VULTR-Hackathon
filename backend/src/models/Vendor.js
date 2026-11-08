import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  taxId: {
    type: String,
    trim: true,
    index: true
  },
  bankAccount: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  paymentTerms: {
    type: String,
    enum: ['net15', 'net30', 'net45', 'net60', 'due_on_receipt', 'other'],
    default: 'net30'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String,
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
vendorSchema.index({ name: 1 });
vendorSchema.index({ taxId: 1 }, { unique: true, sparse: true });

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;

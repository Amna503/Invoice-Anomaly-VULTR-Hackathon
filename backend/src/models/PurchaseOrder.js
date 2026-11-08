import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  lineItems: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  approvedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'partially_received', 'completed', 'cancelled'],
    default: 'pending'
  },
  approvedBy: String,
  approvedAt: Date,
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
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ vendorId: 1, status: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Calculate approved amount before save
purchaseOrderSchema.pre('save', function(next) {
  if (this.lineItems && this.lineItems.length > 0) {
    this.approvedAmount = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  }
  next();
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;

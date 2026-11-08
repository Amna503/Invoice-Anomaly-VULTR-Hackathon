import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true
  },
  actor: {
    type: String,
    enum: ['agent', 'user', 'system'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for audit queries
auditEventSchema.index({ invoiceId: 1, createdAt: -1 });
auditEventSchema.index({ actor: 1, createdAt: -1 });
auditEventSchema.index({ action: 1, createdAt: -1 });
auditEventSchema.index({ createdAt: -1 });

const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);

export default AuditEvent;

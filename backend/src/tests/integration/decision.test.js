import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import Invoice from '../../models/Invoice.js';
import Email from '../../models/Email.js';
import AuditEvent from '../../models/AuditEvent.js';

describe('POST /api/invoices/:id/decision - Integration Tests', () => {
  let app;
  const TEST_DB_URI = 'mongodb://localhost:27017/invoice-test-decision';

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
    app = createApp();
  });

  afterEach(async () => {
    await Invoice.deleteMany({});
    await Email.deleteMany({});
    await AuditEvent.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should approve invoice and update status to approved', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored.pdf',
      fileType: 'pdf',
      status: 'needs_review',
      route: 'needs_review',
      riskScore: 5
    });

    const response = await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'approve', note: 'Verified with vendor' })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.invoice.status).toBe('approved');

    // Verify database
    const updated = await Invoice.findById(invoice._id);
    expect(updated.status).toBe('approved');
    expect(updated.reviewedAt).toBeTruthy();

    // Verify audit event
    const auditEvent = await AuditEvent.findOne({
      invoiceId: invoice._id,
      action: 'decision_approve'
    });
    expect(auditEvent).toBeTruthy();
    expect(auditEvent.details.note).toBe('Verified with vendor');
  });

  it('should reject invoice and update status to rejected', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored.pdf',
      fileType: 'pdf',
      status: 'needs_review',
      route: 'needs_review',
      riskScore: 5
    });

    const response = await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'reject', note: 'Duplicate invoice' })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.invoice.status).toBe('rejected');

    // Verify database
    const updated = await Invoice.findById(invoice._id);
    expect(updated.status).toBe('rejected');
    expect(updated.reviewedAt).toBeTruthy();

    // Verify audit event
    const auditEvent = await AuditEvent.findOne({
      invoiceId: invoice._id,
      action: 'decision_reject'
    });
    expect(auditEvent).toBeTruthy();
  });

  it('should send query with draft email and update status to query_sent', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored.pdf',
      fileType: 'pdf',
      status: 'needs_review',
      route: 'needs_review',
      riskScore: 5
    });

    // Create draft email
    const email = await Email.create({
      invoiceId: invoice._id,
      subject: 'Query regarding invoice',
      body: 'Please clarify the amount',
      status: 'draft'
    });

    const response = await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'send_query' })
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.invoice.status).toBe('query_sent');

    // Verify invoice status
    const updatedInvoice = await Invoice.findById(invoice._id);
    expect(updatedInvoice.status).toBe('query_sent');
    expect(updatedInvoice.reviewedAt).toBeTruthy();

    // Verify email status changed to in_outbox
    const updatedEmail = await Email.findById(email._id);
    expect(updatedEmail.status).toBe('in_outbox');
    expect(updatedEmail.approvedAt).toBeTruthy();

    // Verify audit event
    const auditEvent = await AuditEvent.findOne({
      invoiceId: invoice._id,
      action: 'decision_send_query'
    });
    expect(auditEvent).toBeTruthy();
  });

  it('should return 400 when decision is invalid', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored.pdf',
      fileType: 'pdf',
      status: 'needs_review'
    });

    const response = await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'invalid_action' })
      .expect(400);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('approve, reject, or send_query');

    // Verify status unchanged
    const unchanged = await Invoice.findById(invoice._id);
    expect(unchanged.status).toBe('needs_review');
  });

  it('should return 404 when invoice not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post(`/api/invoices/${fakeId}/decision`)
      .send({ decision: 'approve' })
      .expect(404);

    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Invoice not found');
  });

  it('should handle approval of blocked invoice with note', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'blocked.pdf',
      storedFileName: 'stored-blocked.pdf',
      fileType: 'pdf',
      status: 'blocked',
      route: 'blocked',
      riskScore: 15
    });

    const response = await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({
        decision: 'approve',
        note: 'CFO verified bank account change via phone call'
      })
      .expect(200);

    expect(response.body.ok).toBe(true);

    // Verify audit event includes note
    const auditEvent = await AuditEvent.findOne({
      invoiceId: invoice._id,
      action: 'decision_approve'
    });
    expect(auditEvent.details.note).toBeTruthy();
  });

  it('should handle decision without note (note is optional)', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored.pdf',
      fileType: 'pdf',
      status: 'needs_review'
    });

    const response = await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'approve' }) // No note provided
      .expect(200);

    expect(response.body.ok).toBe(true);

    // Verify audit event has null note
    const auditEvent = await AuditEvent.findOne({
      invoiceId: invoice._id,
      action: 'decision_approve'
    });
    expect(auditEvent.details.note).toBeNull();
  });

  it('should handle multiple decisions on same invoice', async () => {
    const invoice = await Invoice.create({
      originalFileName: 'test.pdf',
      storedFileName: 'stored.pdf',
      fileType: 'pdf',
      status: 'needs_review'
    });

    // First decision: send query
    await Email.create({
      invoiceId: invoice._id,
      subject: 'Query',
      body: 'Please clarify',
      status: 'draft'
    });

    await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'send_query' })
      .expect(200);

    // Second decision: approve after query response
    await request(app)
      .post(`/api/invoices/${invoice._id}/decision`)
      .send({ decision: 'approve', note: 'Query resolved' })
      .expect(200);

    const updated = await Invoice.findById(invoice._id);
    expect(updated.status).toBe('approved');

    // Verify both audit events exist
    const auditEvents = await AuditEvent.find({ invoiceId: invoice._id })
      .sort({ createdAt: 1 });

    const actions = auditEvents.map(e => e.action);
    expect(actions).toContain('decision_send_query');
    expect(actions).toContain('decision_approve');
  });
});

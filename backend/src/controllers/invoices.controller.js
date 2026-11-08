import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { z } from 'zod';
import Invoice from '../models/Invoice.js';
import { success, error as errorResponse, ErrorCodes } from '../utils/response.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import { invoiceQueue } from '../pipeline/queue.js';
import { checkMagicBytes } from '../middleware/upload.js';

const listQuerySchema = z.object({
  status: z.enum(['received', 'queued', 'processing', 'needs_review', 'blocked', 'approved', 'rejected', 'query_sent', 'auto_cleared', 'failed']).optional(),
  route: z.enum(['auto_cleared', 'needs_review', 'blocked']).optional(),
  vendor: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0)
});

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'send_query']),
  note: z.string().max(1000).optional()
});

/**
 * Upload invoice files
 * POST /api/invoices/upload
 */
export const uploadInvoices = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'No files uploaded. Please upload at least one invoice file.',
        400
      );
    }

    const invoices = [];

    for (const file of req.files) {
      const fileType = path.extname(file.originalname).toLowerCase().substring(1);

      // Magic bytes validation — reject disguised files
      const isValidMagic = await checkMagicBytes(file.path, fileType);
      if (!isValidMagic) {
        await fsp.unlink(file.path).catch(() => {});
        return errorResponse(res, ErrorCodes.INVALID_FILE_TYPE,
          `File "${file.originalname}" content does not match its extension`, 400);
      }

      const invoice = await Invoice.create({
        originalFileName: file.originalname,
        storedFileName: file.filename,
        fileType,
        status: 'received'
      });

      invoices.push(invoice);

      logger.info({
        invoiceId: invoice._id,
        fileName: file.originalname
      }, 'Invoice uploaded');

      // Enqueue for background pipeline processing
      invoiceQueue.enqueue(invoice._id);
    }

    return success(res, {
      message: `Successfully uploaded ${invoices.length} invoice(s)`,
      invoices: invoices.map(inv => ({
        id: inv._id,
        originalFileName: inv.originalFileName,
        fileType: inv.fileType,
        status: inv.status,
        createdAt: inv.createdAt
      }))
    }, 201);

  } catch (error) {
    logger.error({ error }, 'Failed to upload invoices');
    next(error);
  }
};

/**
 * List invoices with filters
 * GET /api/invoices
 */
export const listInvoices = async (req, res, next) => {
  try {
    const { status, route, vendor, search, limit, offset } = listQuerySchema.parse(req.query);

    const filter = {};

    if (status) filter.status = status;
    if (route) filter.route = route;
    if (vendor) filter.vendorId = vendor;
    if (search) {
      // Escape regex special chars to prevent ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { originalFileName: new RegExp(escaped, 'i') },
        { 'extracted.invoiceNumber': new RegExp(escaped, 'i') },
        { 'extracted.vendorName': new RegExp(escaped, 'i') }
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('-rawText')
        .lean(),
      Invoice.countDocuments(filter)
    ]);

    return success(res, {
      invoices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + invoices.length < total
      }
    });

  } catch (error) {
    logger.error({ error }, 'Failed to list invoices');
    next(error);
  }
};

/**
 * Get invoice by ID
 * GET /api/invoices/:id
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('vendorId')
      .populate('purchaseOrderIds')
      .populate('flags')
      .populate('emailDraft');

    if (!invoice) {
      return errorResponse(
        res,
        ErrorCodes.NOT_FOUND,
        'Invoice not found',
        404
      );
    }

    return success(res, { invoice });

  } catch (error) {
    logger.error({ error, invoiceId: req.params.id }, 'Failed to get invoice');
    next(error);
  }
};

/**
 * Make decision on invoice (approve/reject/send_query)
 * POST /api/invoices/:id/decision
 */
export const makeDecision = async (req, res, next) => {
  try {
    const { decision, note } = decisionSchema.parse(req.body);

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return errorResponse(
        res,
        ErrorCodes.NOT_FOUND,
        'Invoice not found',
        404
      );
    }

    // Update invoice status based on decision
    let newStatus;
    if (decision === 'approve') {
      newStatus = 'approved';
    } else if (decision === 'reject') {
      newStatus = 'rejected';
    } else {
      newStatus = 'query_sent';

      // Update email status to in_outbox
      const { default: Email } = await import('../models/Email.js');
      await Email.updateOne(
        { invoiceId: invoice._id },
        { status: 'in_outbox', approvedAt: new Date() }
      );
    }

    await Invoice.findByIdAndUpdate(req.params.id, {
      status: newStatus,
      reviewedAt: new Date()
    });

    // Log audit event
    const { logAuditEvent } = await import('../services/auditLog.js');
    await logAuditEvent({
      invoiceId: invoice._id,
      actor: 'user',
      action: `decision_${decision}`,
      details: { note: note || null },
      req
    });

    logger.info({
      invoiceId: invoice._id,
      decision,
      newStatus
    }, 'Decision made on invoice');

    return success(res, {
      message: `Invoice ${decision}d successfully`,
      invoice: {
        id: invoice._id,
        status: newStatus
      }
    });

  } catch (error) {
    logger.error({ error, invoiceId: req.params.id }, 'Failed to make decision');
    next(error);
  }
};

/**
 * Download original invoice file
 * GET /api/invoices/:id/file
 */
export const downloadInvoiceFile = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return errorResponse(
        res,
        ErrorCodes.NOT_FOUND,
        'Invoice not found',
        404
      );
    }

    // Build file path and prevent path traversal
    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const filePath = path.resolve(uploadDir, invoice.storedFileName);

    // Security check: ensure file is inside upload directory
    if (!filePath.startsWith(uploadDir)) {
      logger.warn({
        invoiceId: invoice._id,
        attemptedPath: filePath
      }, 'Path traversal attempt detected');

      return errorResponse(
        res,
        ErrorCodes.FORBIDDEN,
        'Access denied',
        403
      );
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      logger.error({
        invoiceId: invoice._id,
        filePath
      }, 'Invoice file not found on disk');

      return errorResponse(
        res,
        ErrorCodes.NOT_FOUND,
        'Invoice file not found',
        404
      );
    }

    // Set headers
    const contentType = invoice.fileType === 'pdf' ? 'application/pdf' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${invoice.originalFileName}"`);

    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('error', (error) => {
      logger.error({ error, invoiceId: invoice._id }, 'File stream error');
      if (!res.headersSent) {
        next(error);
      }
    });

    logger.info({
      invoiceId: invoice._id,
      fileName: invoice.originalFileName
    }, 'Invoice file downloaded');

  } catch (error) {
    logger.error({ error, invoiceId: req.params.id }, 'Failed to download invoice file');
    next(error);
  }
};

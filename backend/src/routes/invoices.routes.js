import express from 'express';
import { uploadInvoices as uploadMiddleware, handleUploadError } from '../middleware/upload.js';
import { requireAdmin, strictRateLimiter } from '../middleware/security.js';
import {
  uploadInvoices,
  listInvoices,
  getInvoiceById,
  makeDecision,
  downloadInvoiceFile
} from '../controllers/invoices.controller.js';

const router = express.Router();

/**
 * POST /api/invoices/upload
 * Upload invoice files (PDF or CSV)
 */
router.post('/upload', requireAdmin, uploadMiddleware, handleUploadError, uploadInvoices);

/**
 * GET /api/invoices
 * List invoices with optional filters
 */
router.get('/', requireAdmin, listInvoices);

/**
 * GET /api/invoices/:id
 * Get invoice by ID with related data
 */
router.get('/:id', requireAdmin, getInvoiceById);

/**
 * GET /api/invoices/:id/file
 * Download original invoice file (PDF or CSV)
 */
router.get('/:id/file', requireAdmin, downloadInvoiceFile);

/**
 * POST /api/invoices/:id/decision
 * Make decision on invoice (approve/reject/send_query)
 */
router.post('/:id/decision', strictRateLimiter, requireAdmin, makeDecision);

export default router;

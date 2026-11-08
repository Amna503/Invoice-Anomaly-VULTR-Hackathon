import path from 'path';
import fs from 'fs/promises';
import Invoice from '../../models/Invoice.js';
import { extractTextFromPDF } from '../../services/pdfReader.js';
import { parseCSV } from '../../services/csvReader.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Ingest step - Read file, extract text, store in invoice
 * @param {string} invoiceId
 */
export default async function ingest(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const filePath = path.join(env.UPLOAD_DIR, invoice.storedFileName);

  try {
    let rawText = '';

    if (invoice.fileType === 'pdf') {
      rawText = await extractTextFromPDF(filePath);
    } else if (invoice.fileType === 'csv') {
      const rows = await parseCSV(filePath);
      // Convert CSV to readable text format
      rawText = JSON.stringify(rows, null, 2);
    } else {
      throw new Error(`Unsupported file type: ${invoice.fileType}`);
    }

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('No text extracted from file');
    }

    // Update invoice with raw text
    await Invoice.findByIdAndUpdate(invoiceId, {
      rawText,
      updatedAt: new Date()
    });

    logger.info({
      invoiceId,
      textLength: rawText.length
    }, 'Text extracted from invoice');

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
      logger.debug({ invoiceId, filePath }, 'Upload file deleted');
    } catch (unlinkError) {
      logger.warn({ invoiceId, error: unlinkError }, 'Failed to delete upload file');
    }

  } catch (error) {
    logger.error({ invoiceId, error }, 'Ingest step failed');
    throw error;
  }
}

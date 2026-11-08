import Invoice from '../../models/Invoice.js';
import Vendor from '../../models/Vendor.js';
import { extractInvoiceData } from '../../services/ai/extractInvoice.js';
import logger from '../../utils/logger.js';

/**
 * Extract step - Use AI to extract invoice fields
 * @param {string} invoiceId
 */
export default async function extract(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice || !invoice.rawText) {
    throw new Error('Invoice or raw text not found');
  }

  try {
    // Extract data using AI
    const extracted = await extractInvoiceData(invoice.rawText);

    // Look up vendor by name if extracted
    let vendorId = null;
    if (extracted.vendorName) {
      const vendor = await Vendor.findOne({
        name: new RegExp(`^${extracted.vendorName}$`, 'i')
      });
      vendorId = vendor?._id || null;
    }

    // Update invoice with extracted data
    await Invoice.findByIdAndUpdate(invoiceId, {
      extracted,
      vendorId,
      updatedAt: new Date()
    });

    logger.info({
      invoiceId,
      vendorName: extracted.vendorName,
      total: extracted.total
    }, 'Invoice data extracted');

  } catch (error) {
    logger.error({ invoiceId, error }, 'Extract step failed');
    throw error;
  }
}

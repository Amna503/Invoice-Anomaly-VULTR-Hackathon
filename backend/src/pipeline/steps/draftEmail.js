import Invoice from '../../models/Invoice.js';
import Flag from '../../models/Flag.js';
import Email from '../../models/Email.js';
import { draftEmail as draftEmailAI } from '../../services/ai/draftEmail.js';
import logger from '../../utils/logger.js';

/**
 * Draft Email step - Generate email draft for supplier query
 * @param {string} invoiceId
 */
export default async function draftEmail(invoiceId) {
  try {
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get flags with explanations
    const flags = await Flag.find({ invoiceId });

    if (flags.length === 0) {
      logger.info({ invoiceId }, 'No flags - skipping email draft');
      return;
    }

    // Generate email draft
    const { subject, body } = await draftEmailAI(invoice, flags);

    // Save email draft
    await Email.create({
      invoiceId,
      subject,
      body,
      status: 'draft'
    });

    logger.info({ invoiceId }, 'Email draft created');

  } catch (error) {
    logger.error({ invoiceId, error }, 'Draft email step failed');
    throw error;
  }
}

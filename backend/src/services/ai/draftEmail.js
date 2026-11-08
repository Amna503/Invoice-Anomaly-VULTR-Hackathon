import { callInference } from './inferenceClient.js';
import { DRAFT_EMAIL } from './prompts.js';
import logger from '../../utils/logger.js';

/**
 * Draft a supplier query email
 * @param {Object} invoice - Invoice with extracted data
 * @param {Array} flags - Flags with explanations
 * @returns {Promise<Object>} {subject, body}
 */
export async function draftEmail(invoice, flags) {
  try {
    const flagDescriptions = flags.map(f =>
      `- ${f.explanation || f.type}`
    ).join('\n');

    const prompt = `Draft a supplier query email for this invoice:

Invoice Number: ${invoice.extracted?.invoiceNumber || 'N/A'}
Vendor: ${invoice.extracted?.vendorName || 'Unknown'}
Amount: ${invoice.extracted?.currency || 'USD'} ${invoice.extracted?.total || 0}
Date: ${invoice.extracted?.invoiceDate || 'N/A'}

Issues detected:
${flagDescriptions}

Draft a professional query email.`;

    const response = await callInference(prompt, {
      systemPrompt: DRAFT_EMAIL,
      temperature: 0.3, // Some creativity for natural writing
      maxTokens: 600
    });

    // Parse subject and body
    const subjectMatch = response.match(/Subject:\s*(.+)/i);
    const bodyMatch = response.match(/Body:\s*([\s\S]+)/i);

    const subject = subjectMatch
      ? subjectMatch[1].trim()
      : `Query Regarding Invoice ${invoice.extracted?.invoiceNumber || ''}`;

    const body = bodyMatch
      ? bodyMatch[1].trim()
      : response; // Use full response if can't parse

    logger.info({ invoiceId: invoice._id }, 'Email drafted successfully');

    return { subject, body };

  } catch (error) {
    logger.error({ invoiceId: invoice._id, error }, 'Failed to draft email');

    // Return generic email on failure
    return {
      subject: `Query Regarding Invoice ${invoice.extracted?.invoiceNumber || ''}`,
      body: `Dear ${invoice.extracted?.vendorName || 'Supplier'},\n\nWe are reviewing invoice ${invoice.extracted?.invoiceNumber || ''} and have some questions. Please provide additional documentation.\n\nThank you.`
    };
  }
}

import Invoice from '../../models/Invoice.js';
import Flag from '../../models/Flag.js';
import { scoreAndRoute as scoreAndRouteDetection } from '../../detection/index.js';
import logger from '../../utils/logger.js';

/**
 * Score and Route step - Calculate risk score and determine routing
 * @param {string} invoiceId
 */
export default async function scoreRoute(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  try {
    // Get all flags for this invoice
    const flags = await Flag.find({ invoiceId }).lean();

    // Calculate risk score and route
    const { riskScore, route } = scoreAndRouteDetection(flags);

    // Determine final status based on route
    let status;
    if (route === 'auto_cleared') {
      status = 'auto_cleared';
    } else if (route === 'blocked') {
      status = 'blocked';
    } else {
      status = 'needs_review';
    }

    // Update invoice
    await Invoice.findByIdAndUpdate(invoiceId, {
      riskScore,
      route,
      status,
      processedAt: new Date()
    });

    logger.info({
      invoiceId,
      riskScore,
      route,
      status,
      flagCount: flags.length
    }, 'Score and route completed');

    return { riskScore, route, status };

  } catch (error) {
    logger.error({ invoiceId, error }, 'Score and route step failed');
    throw error;
  }
}

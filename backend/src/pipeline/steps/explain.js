import Flag from '../../models/Flag.js';
import { explainFlag as explainFlagAI } from '../../services/ai/explainFlag.js';
import logger from '../../utils/logger.js';

/**
 * Explain step - Generate human-readable explanations for flags
 * @param {string} invoiceId
 */
export default async function explain(invoiceId) {
  try {
    // Get all flags for this invoice
    const flags = await Flag.find({ invoiceId });

    if (flags.length === 0) {
      logger.info({ invoiceId }, 'No flags to explain');
      return;
    }

    // Generate explanation for each flag
    for (const flag of flags) {
      try {
        const explanation = await explainFlagAI(flag);

        await Flag.findByIdAndUpdate(flag._id, {
          explanation
        });

        logger.debug({
          flagId: flag._id,
          type: flag.type
        }, 'Flag explanation generated');

      } catch (error) {
        logger.warn({
          flagId: flag._id,
          error
        }, 'Failed to explain flag, skipping');
        // Continue with other flags
      }
    }

    logger.info({
      invoiceId,
      flagCount: flags.length
    }, 'Flag explanations completed');

  } catch (error) {
    logger.error({ invoiceId, error }, 'Explain step failed');
    throw error;
  }
}

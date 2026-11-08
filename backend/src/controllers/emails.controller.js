import { z } from 'zod';
import Email from '../models/Email.js';
import { success, error as errorResponse, ErrorCodes } from '../utils/response.js';
import logger from '../utils/logger.js';

const updateEmailSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(10000).optional()
}).refine(d => d.subject || d.body, { message: 'Must provide subject or body to update' });

/**
 * Update email draft
 * PUT /api/emails/:id
 */
export const updateEmail = async (req, res, next) => {
  try {
    const { subject, body } = updateEmailSchema.parse(req.body);

    const email = await Email.findById(req.params.id);

    if (!email) {
      return errorResponse(
        res,
        ErrorCodes.NOT_FOUND,
        'Email not found',
        404
      );
    }

    if (email.status !== 'draft') {
      return errorResponse(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Can only edit draft emails',
        400
      );
    }

    const updated = await Email.findByIdAndUpdate(
      req.params.id,
      {
        subject: subject || email.subject,
        body: body || email.body,
        updatedAt: new Date()
      },
      { new: true }
    );

    logger.info({ emailId: updated._id }, 'Email updated');

    return success(res, { email: updated });

  } catch (error) {
    logger.error({ error, emailId: req.params.id }, 'Failed to update email');
    next(error);
  }
};

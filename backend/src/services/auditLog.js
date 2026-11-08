import AuditEvent from '../models/AuditEvent.js';
import logger from '../utils/logger.js';

/**
 * Log an audit event
 * @param {Object} params
 * @param {string} params.invoiceId - Invoice ID (optional)
 * @param {string} params.actor - Who performed the action (agent|user|system)
 * @param {string} params.action - Action performed
 * @param {Object} params.details - Additional details
 * @param {Object} params.req - Express request object (optional, for IP/user agent)
 * @returns {Promise<Object|null>} Created event or null on error
 */
export async function logAuditEvent({ invoiceId, actor, action, details = {}, req }) {
  try {
    const eventData = {
      invoiceId: invoiceId || undefined,
      actor,
      action,
      details
    };

    // Extract IP and user agent from request if provided
    if (req) {
      eventData.ipAddress = req.ip || req.connection?.remoteAddress;
      eventData.userAgent = req.get('user-agent');
    }

    const event = await AuditEvent.create(eventData);

    logger.debug({
      eventId: event._id,
      action,
      actor
    }, 'Audit event logged');

    return event;
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    logger.error({ error, action, actor }, 'Failed to log audit event');
    return null;
  }
}

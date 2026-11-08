import AuditEvent from '../models/AuditEvent.js';
import { success } from '../utils/response.js';

export const getAuditLog = async (req, res, next) => {
  try {
    const { invoiceId, limit = 100, offset = 0 } = req.query;

    const filter = {};
    if (invoiceId) filter.invoiceId = invoiceId;

    const [events, total] = await Promise.all([
      AuditEvent.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset))
        .lean(),
      AuditEvent.countDocuments(filter)
    ]);

    return success(res, {
      events,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    next(error);
  }
};

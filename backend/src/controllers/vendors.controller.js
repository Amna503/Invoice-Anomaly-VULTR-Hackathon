import { z } from 'zod';
import Vendor from '../models/Vendor.js';
import { success, error as errorResponse, ErrorCodes } from '../utils/response.js';
import logger from '../utils/logger.js';

const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  taxId: z.string().max(50).optional(),
  bankAccount: z.string().max(50).optional(),
  email: z.string().email().optional(),
  paymentTerms: z.enum(['net15', 'net30', 'net45', 'net60', 'due_on_receipt', 'other']).default('net30'),
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).optional()
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(100).optional()
});

/**
 * List vendors
 * GET /api/vendors
 */
export const listVendors = async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);

    const filter = {};
    if (query.search) {
      // Escape regex special chars to prevent ReDoS
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .sort({ name: 1 })
        .limit(query.limit)
        .skip(query.offset)
        .lean(),
      Vendor.countDocuments(filter)
    ]);

    return success(res, {
      vendors,
      pagination: { total, limit: query.limit, offset: query.offset }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create vendor
 * POST /api/vendors
 */
export const createVendor = async (req, res, next) => {
  try {
    const data = createVendorSchema.parse(req.body);
    const vendor = await Vendor.create(data);

    logger.info({ vendorId: vendor._id, name: vendor.name }, 'Vendor created');

    return success(res, { vendor }, 201);
  } catch (error) {
    next(error);
  }
};

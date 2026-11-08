import { z } from 'zod';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { success, error as errorResponse, ErrorCodes } from '../utils/response.js';
import logger from '../utils/logger.js';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  amount: z.number()
});

const createPOSchema = z.object({
  poNumber: z.string().min(1).max(100),
  vendorId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid vendor ID'),
  lineItems: z.array(lineItemSchema).min(1),
  approvedAmount: z.number().min(0),
  status: z.enum(['pending', 'approved', 'partially_received', 'completed', 'cancelled']).default('pending'),
  approvedBy: z.string().max(100).optional(),
  notes: z.string().max(1000).optional()
});

const listPOQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  vendorId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(['pending', 'approved', 'partially_received', 'completed', 'cancelled']).optional()
});

export const listPurchaseOrders = async (req, res, next) => {
  try {
    const { limit, offset, vendorId, status } = listPOQuerySchema.parse(req.query);

    const filter = {};
    if (vendorId) filter.vendorId = vendorId;
    if (status) filter.status = status;

    const [pos, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('vendorId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      PurchaseOrder.countDocuments(filter)
    ]);

    return success(res, {
      purchaseOrders: pos,
      pagination: { total, limit, offset }
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (req, res, next) => {
  try {
    const data = createPOSchema.parse(req.body);
    const po = await PurchaseOrder.create(data);

    logger.info({ poId: po._id, poNumber: po.poNumber }, 'PO created');

    return success(res, { purchaseOrder: po }, 201);
  } catch (error) {
    next(error);
  }
};

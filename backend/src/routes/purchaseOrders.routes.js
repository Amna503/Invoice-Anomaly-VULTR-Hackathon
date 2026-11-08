import express from 'express';
import { requireAdmin } from '../middleware/security.js';
import { listPurchaseOrders, createPurchaseOrder } from '../controllers/purchaseOrders.controller.js';

const router = express.Router();

router.get('/', requireAdmin, listPurchaseOrders);
router.post('/', requireAdmin, createPurchaseOrder);

export default router;

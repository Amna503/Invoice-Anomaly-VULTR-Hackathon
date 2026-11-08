import express from 'express';
import { listVendors, createVendor } from '../controllers/vendors.controller.js';
import { requireAdmin } from '../middleware/security.js';

const router = express.Router();

router.get('/', listVendors);
router.post('/', requireAdmin, createVendor);

export default router;

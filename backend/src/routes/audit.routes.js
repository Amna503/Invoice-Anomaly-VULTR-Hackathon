import express from 'express';
import { requireAdmin } from '../middleware/security.js';
import { getAuditLog } from '../controllers/audit.controller.js';

const router = express.Router();

router.get('/', requireAdmin, getAuditLog);

export default router;

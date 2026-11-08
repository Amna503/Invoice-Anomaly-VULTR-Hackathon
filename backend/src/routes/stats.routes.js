import express from 'express';
import { requireAdmin } from '../middleware/security.js';
import { getStats } from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/', requireAdmin, getStats);

export default router;

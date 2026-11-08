import express from 'express';
import { requireAdmin } from '../middleware/security.js';
import { updateEmail } from '../controllers/emails.controller.js';

const router = express.Router();

/**
 * PUT /api/emails/:id
 * Update email draft
 */
router.put('/:id', requireAdmin, updateEmail);

export default router;

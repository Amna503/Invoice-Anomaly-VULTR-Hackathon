import express from 'express';
import healthRoutes from './health.routes.js';
import invoicesRoutes from './invoices.routes.js';
import vendorsRoutes from './vendors.routes.js';
import purchaseOrdersRoutes from './purchaseOrders.routes.js';
import emailsRoutes from './emails.routes.js';
import statsRoutes from './stats.routes.js';
import auditRoutes from './audit.routes.js';

const router = express.Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/emails', emailsRoutes);
router.use('/stats', statsRoutes);
router.use('/audit', auditRoutes);

export default router;

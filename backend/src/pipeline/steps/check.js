import Invoice from '../../models/Invoice.js';
import Vendor from '../../models/Vendor.js';
import PurchaseOrder from '../../models/PurchaseOrder.js';
import Flag from '../../models/Flag.js';
import { checkInvoice } from '../../detection/index.js';
import logger from '../../utils/logger.js';

/**
 * Check step - Run anomaly detection checks
 * @param {string} invoiceId
 */
export default async function check(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice || !invoice.extracted) {
    throw new Error('Invoice or extracted data not found');
  }

  try {
    // Load related data
    const [vendor, purchaseOrders, history] = await Promise.all([
      // Find vendor by name (case-insensitive)
      invoice.extracted.vendorName
        ? Vendor.findOne({
            name: new RegExp(`^${invoice.extracted.vendorName}$`, 'i')
          })
        : null,

      // Find matching purchase orders
      invoice.extracted.poNumber
        ? PurchaseOrder.find({
            poNumber: invoice.extracted.poNumber,
            status: { $in: ['approved', 'partially_received'] }
          })
        : [],

      // Get historical invoices from same vendor (last 50)
      invoice.vendorId
        ? Invoice.find({
            vendorId: invoice.vendorId,
            _id: { $ne: invoice._id },
            status: { $in: ['auto_cleared', 'approved'] }
          })
          .sort({ createdAt: -1 })
          .limit(50)
        : []
    ]);

    // Update vendor reference if found
    if (vendor && !invoice.vendorId) {
      await Invoice.findByIdAndUpdate(invoiceId, {
        vendorId: vendor._id
      });
    }

    // Update PO references if found
    if (purchaseOrders.length > 0) {
      await Invoice.findByIdAndUpdate(invoiceId, {
        purchaseOrderIds: purchaseOrders.map(po => po._id)
      });
    }

    // Run detection checks
    const { flags } = await checkInvoice({
      invoice,
      vendor,
      purchaseOrders,
      history
    });

    logger.info({
      invoiceId,
      flagCount: flags.length,
      flagTypes: flags.map(f => f.type)
    }, 'Detection checks completed');

    // Save flags to database
    if (flags.length > 0) {
      await Flag.deleteMany({ invoiceId }); // Clear old flags if any

      const flagDocs = flags.map(flag => ({
        invoiceId,
        type: flag.type,
        severity: flag.severity,
        evidence: flag.evidence
      }));

      await Flag.insertMany(flagDocs);
    }

    return flags;

  } catch (error) {
    logger.error({ invoiceId, error }, 'Check step failed');
    throw error;
  }
}

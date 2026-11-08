import Invoice from '../models/Invoice.js';
import Flag from '../models/Flag.js';

/**
 * Calculate system statistics
 */
export async function calculateStats() {
  const [
    totalInvoices,
    autoCleared,
    needsReview,
    blocked,
    approved,
    rejected,
    flagsGrouped
  ] = await Promise.all([
    Invoice.countDocuments(),
    Invoice.countDocuments({ status: 'auto_cleared' }),
    Invoice.countDocuments({ status: 'needs_review' }),
    Invoice.countDocuments({ status: 'blocked' }),
    Invoice.countDocuments({ status: 'approved' }),
    Invoice.countDocuments({ status: 'rejected' }),
    Flag.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ])
  ]);

  // Calculate money at risk (flagged invoices)
  const flaggedInvoices = await Invoice.find({
    status: { $in: ['needs_review', 'blocked'] }
  }).select('extracted.total');

  const moneyAtRisk = flaggedInvoices.reduce((sum, inv) =>
    sum + (inv.extracted?.total || 0), 0
  );

  // Estimate hours saved (assume 15 min per invoice reviewed)
  const estimatedHoursSaved = Math.round(autoCleared * 0.25);

  const flagsByType = {};
  flagsGrouped.forEach(item => {
    flagsByType[item._id] = item.count;
  });

  return {
    totalInvoices,
    autoCleared,
    needsReview,
    blocked,
    approved,
    rejected,
    flagsByType,
    moneyAtRisk: Math.round(moneyAtRisk),
    estimatedHoursSaved
  };
}

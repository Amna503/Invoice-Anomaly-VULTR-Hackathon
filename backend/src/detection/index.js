/**
 * Detection Module - STUB IMPLEMENTATION
 * This is a stub until the teammate delivers the real detection module.
 * The interface is stable - just swap this file when the real module arrives.
 */

/**
 * Check invoice for anomalies
 * @param {Object} params
 * @param {Object} params.invoice - Invoice with extracted data
 * @param {Object} params.vendor - Vendor record
 * @param {Array} params.purchaseOrders - Matching POs
 * @param {Array} params.history - Historical invoices from this vendor
 * @returns {Object} { flags: [{ type, severity, evidence }] }
 */
export async function checkInvoice({ invoice, vendor, purchaseOrders, history }) {
  const flags = [];
  const extracted = invoice.extracted || {};

  // 1. PRICE_OUTLIER - Amount significantly higher than historical average
  if (extracted.total && history && history.length > 0) {
    const avgHistorical = history.reduce((sum, h) => sum + (h.extracted?.total || 0), 0) / history.length;
    const threshold = avgHistorical * 2; // 2x average

    if (extracted.total > threshold && avgHistorical > 0) {
      flags.push({
        type: 'price_outlier',
        severity: extracted.total > threshold * 2 ? 'high' : 'medium',
        evidence: {
          invoiceAmount: extracted.total,
          avgHistorical: Math.round(avgHistorical),
          threshold: Math.round(threshold),
          historicalCount: history.length
        }
      });
    }
  }

  // 2. NO_MATCHING_PO - No purchase order number provided
  if (!extracted.poNumber || extracted.poNumber.trim() === '') {
    flags.push({
      type: 'no_matching_po',
      severity: extracted.total > 5000 ? 'high' : 'medium',
      evidence: {
        invoiceAmount: extracted.total,
        poNumber: null
      }
    });
  }

  // 3. OVER_PURCHASE_ORDER - Amount exceeds PO approved amount
  else if (purchaseOrders && purchaseOrders.length > 0) {
    const matchingPO = purchaseOrders[0];
    if (extracted.total > matchingPO.approvedAmount * 1.1) { // 10% tolerance
      flags.push({
        type: 'over_purchase_order',
        severity: 'high',
        evidence: {
          invoiceAmount: extracted.total,
          poAmount: matchingPO.approvedAmount,
          poNumber: matchingPO.poNumber,
          difference: extracted.total - matchingPO.approvedAmount
        }
      });
    }
  }

  // 4. BANK_DETAILS_CHANGED - Bank account different from vendor record
  if (vendor && vendor.bankAccount && extracted.bankAccount) {
    // Compare last 4 digits
    const vendorLast4 = vendor.bankAccount.slice(-4);
    const invoiceLast4 = extracted.bankAccount.replace(/\*/g, '').slice(-4);

    if (vendorLast4 !== invoiceLast4) {
      flags.push({
        type: 'bank_details_changed',
        severity: 'high',
        evidence: {
          expectedBank: `****${vendorLast4}`,
          invoiceBank: extracted.bankAccount,
          vendorName: vendor.name
        }
      });
    }
  }

  // 5. UNKNOWN_VENDOR - No vendor found in system
  if (!vendor) {
    flags.push({
      type: 'unknown_vendor',
      severity: 'medium',
      evidence: {
        invoiceVendorName: extracted.vendorName,
        invoiceAmount: extracted.total
      }
    });
  }

  // 6. MATH_ERROR - Line items don't add up to total
  if (extracted.lineItems && extracted.lineItems.length > 0) {
    const calculatedSubtotal = extracted.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const expectedTotal = calculatedSubtotal + (extracted.tax || 0);
    const tolerance = 0.02; // $0.02 for rounding

    if (Math.abs(expectedTotal - extracted.total) > tolerance) {
      flags.push({
        type: 'math_error',
        severity: 'medium',
        evidence: {
          invoiceTotal: extracted.total,
          calculatedTotal: Math.round(expectedTotal * 100) / 100,
          subtotal: Math.round(calculatedSubtotal * 100) / 100,
          tax: extracted.tax || 0,
          difference: Math.round((extracted.total - expectedTotal) * 100) / 100
        }
      });
    }
  }

  // 7. DUPLICATE_INVOICE - Same invoice number seen before
  if (extracted.invoiceNumber && history && history.length > 0) {
    const duplicate = history.find(h =>
      h.extracted?.invoiceNumber === extracted.invoiceNumber &&
      h._id.toString() !== invoice._id.toString()
    );

    if (duplicate) {
      flags.push({
        type: 'duplicate_invoice',
        severity: 'high',
        evidence: {
          invoiceNumber: extracted.invoiceNumber,
          duplicateId: duplicate._id.toString(),
          duplicateDate: duplicate.createdAt,
          duplicateStatus: duplicate.status
        }
      });
    }
  }

  return { flags };
}

/**
 * Calculate risk score and determine routing
 * @param {Array} flags - Flags from checkInvoice
 * @returns {Object} { riskScore, route }
 */
export function scoreAndRoute(flags) {
  if (!flags || flags.length === 0) {
    return {
      riskScore: 0,
      route: 'auto_cleared'
    };
  }

  // Calculate risk score
  const severityWeights = {
    high: 10,
    medium: 5,
    low: 2
  };

  const riskScore = flags.reduce((score, flag) => {
    return score + (severityWeights[flag.severity] || 0);
  }, 0);

  // Determine route
  let route;
  if (riskScore >= 10) {
    route = 'blocked'; // High risk - block immediately
  } else if (riskScore > 0) {
    route = 'needs_review'; // Some risk - needs human review
  } else {
    route = 'auto_cleared'; // No risk - auto clear
  }

  return { riskScore, route };
}

// Shared presentation metadata for anomaly flags.
// The mock API and the real backend use different type strings for the same
// anomaly, so everything is normalised to one canonical key here.

const ALIAS = {
  duplicate: 'duplicate',
  duplicate_invoice: 'duplicate',
  bank_changed: 'bank_changed',
  bank_details_changed: 'bank_changed',
  over_po: 'over_po',
  over_purchase_order: 'over_po',
  no_po: 'no_po',
  no_matching_po: 'no_po',
  price_outlier: 'price_outlier',
  math_error: 'math_error',
  unknown_vendor: 'unknown_vendor',
}

const META = {
  duplicate: {
    label: 'Duplicate invoice',
    field: 'invoice',
    action: 'Hold payment and confirm this invoice was not already paid.',
  },
  bank_changed: {
    label: 'Bank details changed',
    field: 'bank',
    action: 'Confirm the new account with the supplier using a known contact before paying.',
  },
  over_po: {
    label: 'Over purchase order',
    field: 'total',
    action: 'Request a purchase order amendment or written approval for the extra amount.',
  },
  no_po: {
    label: 'No matching purchase order',
    field: 'total',
    action: 'Ask for the PO reference, or route the spend through approval, before paying.',
  },
  price_outlier: {
    label: 'Price outlier',
    field: 'total',
    action: 'Ask the supplier to justify the unit price against the quoted rate.',
  },
  math_error: {
    label: 'Math or tax error',
    field: 'total',
    action: 'Request a corrected invoice where line items match the stated total.',
  },
  unknown_vendor: {
    label: 'Unknown vendor',
    field: 'vendor',
    action: 'Complete vendor onboarding and tax verification before releasing payment.',
  },
}

/**
 * Normalise any flag type string to its canonical key.
 * @param {string} type - Flag type from the mock API or the backend
 * @returns {string} Canonical flag key
 */
export const canonicalFlag = (type) => ALIAS[type] || type

/**
 * Presentation metadata for a flag type.
 * @param {string} type - Flag type from the mock API or the backend
 * @returns {{key: string, label: string, field: string, action: string}}
 */
export function flagMeta(type) {
  const key = canonicalFlag(type)
  const meta = META[key] || {
    label: String(type || 'Anomaly').replace(/_/g, ' '),
    field: 'total',
    action: 'Review this anomaly before releasing payment.',
  }
  return { key, ...meta }
}

/** Short label used in charts and distribution lists */
export const flagLabel = (type) => flagMeta(type).label

/** Recommended action text for a flag */
export const flagAction = (type) => flagMeta(type).action

/** Invoice field a flag points at (used to highlight extracted fields) */
export const flagField = (type) => flagMeta(type).field

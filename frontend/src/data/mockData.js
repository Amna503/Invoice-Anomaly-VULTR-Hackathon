// Fake data for building the screens. Shapes follow the PRD data model.

export const vendors = [
  { id: 'v1', name: 'Nova Supplies', initials: 'NS', taxId: 'PK-4471920', bank: '4417', email: 'accounts@novasupplies.example', terms: 'Net 30', trust: 92,
    priceHistory: { item: 'Paper ream', values: [4.1, 4.2, 4.2, 4.3, 4.2, 4.2] } },
  { id: 'v2', name: 'Apex Paper', initials: 'AP', taxId: 'PK-3320188', bank: '2210', email: 'billing@apexpaper.example', terms: 'Net 30', trust: 88,
    priceHistory: { item: 'Paper ream', values: [4.1, 4.2, 4.2, 4.3, 4.2, 6.1] } },
  { id: 'v3', name: 'Delta Print', initials: 'DP', taxId: 'PK-5509134', bank: '7731', email: 'finance@deltaprint.example', terms: 'Net 15', trust: 95,
    priceHistory: { item: 'Toner cartridge', values: [38, 39, 38, 40, 39, 39] } },
  { id: 'v4', name: 'Orbit Office', initials: 'OO', taxId: 'PK-6612740', bank: '5560', email: 'ar@orbitoffice.example', terms: 'Net 45', trust: 74,
    priceHistory: { item: 'Office chair', values: [95, 96, 94, 97, 96, 95] } },
]

export const purchaseOrders = [
  { id: 'PO-1042', vendor: 'Nova Supplies', approved: 2000, used: 2600, status: 'over' },
  { id: 'PO-1051', vendor: 'Apex Paper', approved: 2000, used: 800, status: 'open' },
  { id: 'PO-1060', vendor: 'Delta Print', approved: 600, used: 480, status: 'open' },
  { id: 'PO-1063', vendor: 'Orbit Office', approved: 1500, used: 920, status: 'open' },
]

// route: 'block' | 'review' | 'cleared'
// severity: 'high' | 'medium'
// decision: 'pending' | 'approved' | 'rejected' | 'queried'
export const invoices = [
  {
    id: 'INV-204', vendor: 'Nova Supplies', initials: 'NS', date: '2026-11-03', total: 2600, bank: '9082',
    route: 'block', risk: 88, decision: 'pending', file: 'inv_204_nova.pdf',
    lineItems: [{ name: 'Paper reams', qty: 400, unit: 4.2, amount: 1680 }, { name: 'Toner', qty: 20, unit: 38, amount: 760 }],
    flags: [
      { type: 'duplicate', title: 'Duplicate invoice', severity: 'high',
        evidence: { field: 'Invoice number', expected: 'INV-204 (received 28 Oct)', found: 'INV-204 (received 3 Nov)' },
        explanation: 'This invoice number and amount were already received from the same supplier last week. Paying it again would be a double payment.' },
      { type: 'bank_changed', title: 'Bank details changed', severity: 'high',
        evidence: { field: 'Bank account', expected: '…4417', found: '…9082' },
        explanation: 'The account on this invoice differs from the one on file. Confirm with the supplier before paying.' },
      { type: 'over_po', title: 'Over purchase order', severity: 'high',
        evidence: { field: 'Total vs PO-1042', expected: '2,000', found: '2,600 (+30%)' },
        explanation: 'The invoice total is 30% above the approved purchase order, which is over the 5% limit.' },
    ],
    email: { id: 'e1', status: 'draft', subject: 'Please confirm bank details for INV-204',
      body: 'Hello Nova Supplies,\n\nThe account on invoice INV-204 differs from our records. Could you confirm the correct bank details?\n\nThank you.' },
  },
  {
    id: 'INV-311', vendor: 'Apex Paper', initials: 'AP', date: '2026-11-04', total: 1320, bank: '2210',
    route: 'review', risk: 54, decision: 'pending', file: 'inv_311_apex.pdf',
    lineItems: [{ name: 'Paper reams', qty: 200, unit: 6.1, amount: 1220 }, { name: 'Delivery', qty: 1, unit: 100, amount: 100 }],
    flags: [
      { type: 'price_outlier', title: 'Price outlier', severity: 'medium',
        evidence: { field: 'Unit price (paper ream)', expected: '4.20 (median)', found: '6.10' },
        explanation: 'The unit price is about 45% above this supplier\'s usual price for the same item.' },
      { type: 'math_error', title: 'Math or tax error', severity: 'medium',
        evidence: { field: 'Lines total vs invoice total', expected: '1,320', found: '1,180' },
        explanation: 'The line items add up to a different amount than the invoice total.' },
    ],
    email: { id: 'e2', status: 'draft', subject: 'Question about pricing on INV-311',
      body: 'Hello Apex Paper,\n\nThe unit price on invoice INV-311 is higher than usual and the line items do not match the total. Could you review and send a corrected invoice?\n\nThank you.' },
  },
  {
    id: 'INV-318', vendor: 'Delta Print', initials: 'DP', date: '2026-11-04', total: 480, bank: '7731',
    route: 'cleared', risk: 6, decision: 'approved', file: 'inv_318_delta.csv',
    lineItems: [{ name: 'Toner cartridge', qty: 12, unit: 40, amount: 480 }], flags: [], email: null,
  },
  {
    id: 'INV-327', vendor: 'Orbit Office', initials: 'OO', date: '2026-11-05', total: 1150, bank: '5560',
    route: 'review', risk: 47, decision: 'pending', file: 'inv_327_orbit.pdf',
    lineItems: [{ name: 'Office chair', qty: 10, unit: 115, amount: 1150 }],
    flags: [
      { type: 'no_po', title: 'No matching purchase order', severity: 'medium',
        evidence: { field: 'Open PO for office chairs', expected: 'At least one open PO', found: 'None found' },
        explanation: 'There is no open purchase order for this supplier and item, so the purchase may not have been approved.' },
    ],
    email: { id: 'e3', status: 'draft', subject: 'Purchase order reference for INV-327',
      body: 'Hello Orbit Office,\n\nWe could not find a purchase order for invoice INV-327. Could you share the PO number this relates to?\n\nThank you.' },
  },
  {
    id: 'INV-330', vendor: 'Delta Print', initials: 'DP', date: '2026-11-05', total: 920, bank: '7731',
    route: 'cleared', risk: 8, decision: 'approved', file: 'inv_330_delta.pdf',
    lineItems: [{ name: 'Toner cartridge', qty: 23, unit: 40, amount: 920 }], flags: [], email: null,
  },
  {
    id: 'INV-335', vendor: 'Apex Paper', initials: 'AP', date: '2026-11-06', total: 760, bank: '2210',
    route: 'cleared', risk: 10, decision: 'approved', file: 'inv_335_apex.pdf',
    lineItems: [{ name: 'Paper reams', qty: 180, unit: 4.2, amount: 756 }, { name: 'Tax', qty: 1, unit: 4, amount: 4 }], flags: [], email: null,
  },
  {
    id: 'INV-341', vendor: 'Zenith Traders', initials: 'ZT', date: '2026-11-06', total: 1850, bank: '3098',
    route: 'review', risk: 52, decision: 'pending', file: 'inv_341_zenith.pdf',
    lineItems: [{ name: 'Packing material', qty: 500, unit: 3.7, amount: 1850 }],
    flags: [
      { type: 'unknown_vendor', title: 'Unknown vendor', severity: 'medium',
        evidence: { field: 'Vendor in master data', expected: 'A matching vendor record', found: 'Zenith Traders not found' },
        explanation: 'This supplier name and tax ID are not in the vendor master list.' },
    ],
    email: { id: 'e4', status: 'draft', subject: 'Vendor registration for Zenith Traders',
      body: 'Hello Zenith Traders,\n\nWe do not have your company in our supplier records. Could you send your registration details and tax ID?\n\nThank you.' },
  },
  {
    id: 'INV-348', vendor: 'Nova Supplies', initials: 'NS', date: '2026-11-07', total: 1400, bank: '4417',
    route: 'cleared', risk: 5, decision: 'approved', file: 'inv_348_nova.pdf',
    lineItems: [{ name: 'Paper reams', qty: 333, unit: 4.2, amount: 1398.6 }, { name: 'Rounding', qty: 1, unit: 1.4, amount: 1.4 }], flags: [], email: null,
  },
]

// actor: 'agent' (violet) or 'human' (blue)
export const auditEvents = [
  { id: 'a1', actor: 'agent', action: 'Invoice uploaded', invoice: 'INV-204', time: '10:02:11' },
  { id: 'a2', actor: 'agent', action: 'Fields extracted', invoice: 'INV-204', time: '10:02:14' },
  { id: 'a3', actor: 'agent', action: 'Duplicate flag raised, High', invoice: 'INV-204', time: '10:02:15' },
  { id: 'a4', actor: 'agent', action: 'Email draft created', invoice: 'INV-204', time: '10:02:18' },
  { id: 'a5', actor: 'human', action: 'Query approved by reviewer', invoice: 'INV-204', time: '10:05:40' },
  { id: 'a6', actor: 'human', action: 'Email moved to outbox', invoice: 'INV-204', time: '10:05:41' },
]

// Numbers shown on the dashboard (the real API will calculate these)
export const stats = {
  processed: 60,
  flagged: 18,
  moneyAtRisk: 24310,
  hoursSaved: 14,
  routing: { cleared: 70, review: 20, block: 10 },
  flagsByType: [
    { type: 'Duplicate', count: 6 },
    { type: 'Bank change', count: 4 },
    { type: 'Over PO', count: 5 },
    { type: 'Math error', count: 3 },
  ],
}
// One place for all data calls. Pages only import from this file.
// Later, Ammar's real API replaces the mock part (see Step 13).

import {
  vendors,
  purchaseOrders,
  invoices,
  auditEvents,
  stats,
} from '../data/mockData'

// Set to true to test how the pages look when the server fails
const SIMULATE_ERROR = false

// Copies, so approving an invoice during the demo really changes it
const db = {
  vendors: structuredClone(vendors),
  purchaseOrders: structuredClone(purchaseOrders),
  invoices: structuredClone(invoices),
  audit: structuredClone(auditEvents),
  stats: structuredClone(stats),
}

async function wait(ms = 400) {
  await new Promise((resolve) => setTimeout(resolve, ms))
  if (SIMULATE_ERROR) throw new Error('Server is not reachable (test)')
}

const now = () => new Date().toLocaleTimeString('en-GB')

function addAudit(actor, action, invoice) {
  db.audit.push({
    id: 'a' + (db.audit.length + 1),
    actor,
    action,
    invoice,
    time: now(),
  })
}

// GET /api/stats
export async function getStats() {
  await wait()
  return db.stats
}

// GET /api/invoices
// status: 'all' | 'cleared' | 'review' | 'block', search: text
export async function getInvoices({ status = 'all', search = '' } = {}) {
  await wait()
  const q = search.trim().toLowerCase()
  return db.invoices.filter((inv) => {
    const okStatus = status === 'all' || inv.route === status
    const okSearch =
      !q ||
      inv.vendor.toLowerCase().includes(q) ||
      inv.id.toLowerCase().includes(q)
    return okStatus && okSearch
  })
}

// GET /api/invoices/:id
export async function getInvoice(id) {
  await wait()
  const inv = db.invoices.find((i) => i.id === id)
  if (!inv) throw new Error('Invoice not found')
  return inv
}

// POST /api/invoices/:id/decision
// decision: 'approve' | 'reject' | 'query'
export async function decideInvoice(id, decision) {
  await wait()
  const inv = db.invoices.find((i) => i.id === id)
  if (!inv) throw new Error('Invoice not found')
  const map = { approve: 'approved', reject: 'rejected', query: 'queried' }
  inv.decision = map[decision]
  if (decision === 'query' && inv.email) inv.email.status = 'outbox'
  addAudit('human', `Invoice ${map[decision]} by reviewer`, id)
  return inv
}

// PUT /api/emails/:id  (edit a draft before sending)
export async function updateEmail(invoiceId, { subject, body }) {
  await wait(250)
  const inv = db.invoices.find((i) => i.id === invoiceId)
  if (!inv || !inv.email) throw new Error('Email not found')
  inv.email.subject = subject
  inv.email.body = body
  addAudit('human', 'Email draft edited', invoiceId)
  return inv.email
}

// Moves an email draft to the outbox
export async function approveEmail(invoiceId) {
  await wait(250)
  const inv = db.invoices.find((i) => i.id === invoiceId)
  if (!inv || !inv.email) throw new Error('Email not found')
  inv.email.status = 'outbox'
  addAudit('human', 'Email moved to outbox', invoiceId)
  return inv.email
}

// POST /api/invoices/upload
// (the Upload page shows fake progress itself)
export async function uploadInvoices(files) {
  await wait(300)
  return files.map((f, i) => ({
    jobId: 'job-' + Date.now() + '-' + i,
    name: f.name,
  }))
}

// GET /api/vendors, /api/purchase-orders
export async function getVendors() {
  await wait()
  return db.vendors
}

export async function getPurchaseOrders() {
  await wait()
  return db.purchaseOrders
}

// GET /api/audit
export async function getAudit() {
  await wait()
  return db.audit
}
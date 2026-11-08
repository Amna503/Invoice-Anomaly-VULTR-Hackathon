// Talks to the real backend (Express API).
// Same function names as mockApi.js, so no page needs to change.
//
// The backend wraps every payload as { ok, data } and uses its own field names
// (extracted.*, riskScore, status/route enums). This file unwraps the envelope
// and adapts each response to the shape the UI already consumes, so the pages
// work identically in mock and live mode.

import { canonicalFlag, flagMeta } from './flagMeta'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(BASE + path, options)
  } catch {
    throw new Error('Server is not reachable')
  }
  if (!res.ok) {
    let message = 'Request failed (' + res.status + ')'
    try {
      const body = await res.json()
      const err = body?.error
      message =
        (typeof err === 'string' && err) ||
        err?.message ||
        body?.message ||
        message
    } catch {
      // response was not JSON, keep the default message
    }
    throw new Error(message)
  }
  try {
    const body = await res.json()
    return body && typeof body === 'object' && 'data' in body ? body.data : body
  } catch {
    return null
  }
}

function json(method, data) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

/* ------------------------- adapters ------------------------- */

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '??'

const ROUTE_PARAM = { cleared: 'auto_cleared', review: 'needs_review', block: 'blocked' }
const ROUTE_FROM_ROUTE = { auto_cleared: 'cleared', needs_review: 'review', blocked: 'block' }
const DECISION_FROM_STATUS = {
  approved: 'approved',
  rejected: 'rejected',
  query_sent: 'queried',
}
const PENDING_STATUSES = ['received', 'queued', 'processing', 'failed']

const TERMS = {
  net15: 'Net 15',
  net30: 'Net 30',
  net45: 'Net 45',
  net60: 'Net 60',
  due_on_receipt: 'Due on receipt',
  other: 'Other',
}

/** Route bucket for display, derived from the scored route or the risk score */
function mapRoute(inv) {
  if (inv.route && ROUTE_FROM_ROUTE[inv.route]) return ROUTE_FROM_ROUTE[inv.route]
  if (inv.status === 'auto_cleared') return 'cleared'
  if (inv.status === 'blocked') return 'block'
  if (inv.status === 'needs_review') return 'review'
  const risk = inv.riskScore || 0
  if (risk >= 70) return 'block'
  if (risk >= 40) return 'review'
  return 'cleared'
}

function mapLineItems(inv) {
  return (inv.extracted?.lineItems || []).map((li) => ({
    name: li.description || 'Line item',
    qty: li.quantity ?? 0,
    unit: li.unitPrice ?? 0,
    amount: li.amount ?? 0,
  }))
}

function mapFlag(f) {
  const meta = flagMeta(f.type)
  return {
    type: canonicalFlag(f.type),
    title: meta.label,
    severity: f.severity || 'medium',
    evidence: f.evidence || {},
    explanation: f.explanation || '',
  }
}

function mapEmail(e) {
  if (!e) return null
  return {
    id: e._id || e.id,
    status: e.status === 'draft' ? 'draft' : 'outbox',
    subject: e.subject || '',
    body: e.body || '',
  }
}

function mapInvoice(inv, { detail = false } = {}) {
  const date = inv.extracted?.invoiceDate || inv.createdAt
  const status = inv.status
  const out = {
    id: String(inv._id || inv.id),
    vendor: inv.extracted?.vendorName || 'Unknown vendor',
    initials: initialsOf(inv.extracted?.vendorName || 'Unknown vendor'),
    date: String(date).slice(0, 10),
    total: inv.extracted?.total || 0,
    bank: inv.extracted?.bankAccount || '—',
    route: mapRoute(inv),
    risk: inv.riskScore || 0,
    decision: DECISION_FROM_STATUS[status] || 'pending',
    status,
    processing: PENDING_STATUSES.includes(status),
    file: inv.originalFileName || '',
    lineItems: mapLineItems(inv),
    flags: detail ? (inv.flags || []).map(mapFlag) : [],
    email: detail ? mapEmail(inv.emailDraft) : null,
  }
  return out
}

function mapStats(s) {
  const total = s.totalInvoices || 0
  const cleared = (s.autoCleared || 0) + (s.approved || 0)
  const review = s.needsReview || 0
  const block = s.blocked || 0
  const bucket = cleared + review + block || 1
  const pct = (n) => Math.round((n / bucket) * 100)

  const flagsByType = Object.entries(s.flagsByType || {})
    .map(([type, count]) => ({ type: flagMeta(type).label, key: canonicalFlag(type), count }))
    .sort((a, b) => b.count - a.count)

  return {
    processed: total,
    flagged: review + block,
    moneyAtRisk: s.moneyAtRisk || 0,
    hoursSaved: s.estimatedHoursSaved || 0,
    routing: { cleared: pct(cleared), review: pct(review), block: pct(block) },
    flagsByType,
    breakdown: {
      autoCleared: s.autoCleared || 0,
      needsReview: s.needsReview || 0,
      blocked: s.blocked || 0,
      approved: s.approved || 0,
      rejected: s.rejected || 0,
    },
  }
}

/* ------------------------- endpoints ------------------------- */

// GET /api/stats
export const getStats = async () => mapStats(await request('/api/stats'))

// GET /api/invoices
// status: 'all' | 'cleared' | 'review' | 'block', search: text
export function getInvoices({ status = 'all', search = '' } = {}) {
  const params = new URLSearchParams()
  if (status !== 'all' && ROUTE_PARAM[status]) params.set('route', ROUTE_PARAM[status])
  if (search.trim()) params.set('search', search.trim())
  const qs = params.toString()
  return request('/api/invoices' + (qs ? '?' + qs : '')).then((data) =>
    (data?.invoices || []).map((inv) => mapInvoice(inv))
  )
}

// GET /api/invoices/:id
export async function getInvoice(id) {
  const data = await request('/api/invoices/' + id)
  if (!data?.invoice) throw new Error('Invoice not found')
  return mapInvoice(data.invoice, { detail: true })
}

// POST /api/invoices/:id/decision
// decision: 'approve' | 'reject' | 'query'
export async function decideInvoice(id, decision) {
  const backendDecision = decision === 'query' ? 'send_query' : decision
  const data = await request(
    '/api/invoices/' + id + '/decision',
    json('POST', { decision: backendDecision })
  )
  return data?.invoice || null
}

// PUT /api/emails/:id  (edit a draft before sending)
export async function updateEmail(invoiceId, { subject, body }) {
  const inv = await getInvoice(invoiceId)
  if (!inv.email) throw new Error('Email not found')
  const data = await request('/api/emails/' + inv.email.id, json('PUT', { subject, body }))
  return mapEmail(data?.email)
}

// Moves an email draft to the outbox.
// The backend has no status endpoint: POST /api/invoices/:id/decision with
// send_query already flips the email to in_outbox, so nothing is sent here.
export async function approveEmail() {
  return { status: 'outbox' }
}

// POST /api/invoices/upload
export async function uploadInvoices(files) {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const data = await request('/api/invoices/upload', { method: 'POST', body: form })
  return (data?.invoices || []).map((inv) => ({
    jobId: inv.id,
    name: inv.originalFileName,
  }))
}

// GET /api/vendors
export async function getVendors() {
  const data = await request('/api/vendors')
  return (data?.vendors || []).map((v) => ({
    id: String(v._id || v.id),
    name: v.name,
    initials: initialsOf(v.name),
    taxId: v.taxId || '—',
    bank: v.bankAccount ? String(v.bankAccount).slice(-4) : '—',
    email: v.email || '—',
    terms: TERMS[v.paymentTerms] || 'Net 30',
    trust: null,
    priceHistory: null,
  }))
}

// GET /api/purchase-orders
export async function getPurchaseOrders() {
  const data = await request('/api/purchase-orders')
  return (data?.purchaseOrders || []).map((po) => ({
    id: po.poNumber,
    vendor: po.vendorId?.name || 'Unknown vendor',
    approved: po.approvedAmount || 0,
    used: null,
    status: po.status,
    lines: (po.lineItems || []).length,
  }))
}

// GET /api/audit
export async function getAudit() {
  const data = await request('/api/audit')
  return (data?.events || []).map((e) => {
    const at = new Date(e.createdAt || Date.now())
    return {
      id: String(e._id || e.id),
      actor: e.actor === 'agent' ? 'agent' : 'human',
      action: e.action,
      invoice: e.invoiceId ? String(e.invoiceId) : null,
      time: at.toTimeString().slice(0, 8),
      ts: at.getTime(),
    }
  })
}

// GET /api/health
export async function getHealth() {
  const data = await request('/api/health')
  return { ...data, mode: 'live' }
}

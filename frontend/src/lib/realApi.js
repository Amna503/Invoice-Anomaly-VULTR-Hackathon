// Talks to the real backend (Ammar's Express API).
// Same function names as mockApi.js, so no page needs to change.

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
      if (body.error || body.message) message = body.error || body.message
    } catch {
      // response was not JSON, keep the default message
    }
    throw new Error(message)
  }
  return res.json()
}

function json(method, data) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

// GET /api/stats
export const getStats = () => request('/api/stats')

// GET /api/invoices
export function getInvoices({ status = 'all', search = '' } = {}) {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (search.trim()) params.set('search', search.trim())
  const qs = params.toString()
  return request('/api/invoices' + (qs ? '?' + qs : ''))
}

// GET /api/invoices/:id
export const getInvoice = (id) => request('/api/invoices/' + id)

// POST /api/invoices/:id/decision
export const decideInvoice = (id, decision) =>
  request('/api/invoices/' + id + '/decision', json('POST', { decision }))

// PUT /api/emails/:id
export async function updateEmail(invoiceId, { subject, body }) {
  const inv = await getInvoice(invoiceId)
  const path = '/api/emails/' + inv.email.id
  return request(path, json('PUT', { subject, body }))
}

// Moves the email to the outbox (confirm this endpoint with Ammar)
export async function approveEmail(invoiceId) {
  const inv = await getInvoice(invoiceId)
  const path = '/api/emails/' + inv.email.id
  return request(path, json('PUT', { status: 'outbox' }))
}

// POST /api/invoices/upload
export function uploadInvoices(files) {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  return request('/api/invoices/upload', { method: 'POST', body: form })
}

// GET /api/vendors, /api/purchase-orders, /api/audit
export const getVendors = () => request('/api/vendors')
export const getPurchaseOrders = () => request('/api/purchase-orders')
export const getAudit = () => request('/api/audit')
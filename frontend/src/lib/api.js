// The switch. Every page imports from this file.
// VITE_USE_MOCK=true  -> fake data (mockApi.js)
// VITE_USE_MOCK=false -> real backend (realApi.js)

import * as mock from './mockApi'
import * as real from './realApi'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
const impl = useMock ? mock : real

export const getStats = impl.getStats
export const getInvoices = impl.getInvoices
export const getInvoice = impl.getInvoice
export const decideInvoice = impl.decideInvoice
export const updateEmail = impl.updateEmail
export const approveEmail = impl.approveEmail
export const uploadInvoices = impl.uploadInvoices
export const getVendors = impl.getVendors
export const getPurchaseOrders = impl.getPurchaseOrders
export const getAudit = impl.getAudit
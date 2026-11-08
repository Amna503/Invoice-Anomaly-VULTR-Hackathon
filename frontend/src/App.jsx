import { Suspense, lazy } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import { ToastProvider } from './components/Toast'
import { Loading } from './components/State'

// Split by route so the first paint only ships the shell + dashboard
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Upload = lazy(() => import('./pages/Upload'))
const Invoices = lazy(() => import('./pages/Invoices'))
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'))
const ReviewQueue = lazy(() => import('./pages/ReviewQueue'))
const Vendors = lazy(() => import('./pages/Vendors'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Audit = lazy(() => import('./pages/Audit'))
const Settings = lazy(() => import('./pages/Settings'))

// Wraps each page so a crash only affects that page
function page(element) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading text="Loading screen…" />}>{element}</Suspense>
    </ErrorBoundary>
  )
}

function NotFound() {
  return (
    <div className="text-center py-24 page-enter">
      <p className="text-5xl font-semibold text-grad">404</p>
      <p className="text-sm text-mu mt-3 mb-6">This page does not exist.</p>
      <Link
        to="/"
        className="inline-flex px-4 py-2.5 rounded-xl text-sm font-medium bg-ac-bg text-ac ring-1 ring-inset ring-ac/30 hover:ring-ac/60 transition-shadow"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={page(<Dashboard />)} />
          <Route path="/upload" element={page(<Upload />)} />
          <Route path="/invoices" element={page(<Invoices />)} />
          <Route path="/invoices/:id" element={page(<InvoiceDetail />)} />
          <Route path="/queue" element={page(<ReviewQueue />)} />
          <Route path="/vendors" element={page(<Vendors />)} />
          <Route path="/analytics" element={page(<Analytics />)} />
          <Route path="/audit" element={page(<Audit />)} />
          <Route path="/settings" element={page(<Settings />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

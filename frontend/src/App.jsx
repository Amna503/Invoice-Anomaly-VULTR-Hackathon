import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import ReviewQueue from './pages/ReviewQueue'
import Vendors from './pages/Vendors'
import Audit from './pages/Audit'

// Wraps each page so a crash only affects that page
function page(element) {
  return <ErrorBoundary>{element}</ErrorBoundary>
}

function NotFound() {
  return (
    <div className="text-center py-20">
      <p className="text-4xl font-medium mb-2">404</p>
      <p className="text-sm text-mu mb-4">This page does not exist.</p>
      <Link to="/" className="text-sm text-ac">
        Back to dashboard
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={page(<Dashboard />)} />
          <Route path="/upload" element={page(<Upload />)} />
          <Route path="/invoices" element={page(<Invoices />)} />
          <Route path="/invoices/:id" element={page(<InvoiceDetail />)} />
          <Route path="/queue" element={page(<ReviewQueue />)} />
          <Route path="/vendors" element={page(<Vendors />)} />
          <Route path="/audit" element={page(<Audit />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
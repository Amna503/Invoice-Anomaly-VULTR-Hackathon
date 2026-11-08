import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileText, Inbox, Building2, ScrollText, MoreHorizontal,
} from 'lucide-react'

const mainLinks = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/upload', label: 'Upload', short: 'Upload', icon: Upload },
  { to: '/invoices', label: 'Invoices', short: 'Invoices', icon: FileText },
  { to: '/queue', label: 'Review queue', short: 'Queue', icon: Inbox },
]
const moreLinks = [
  { to: '/vendors', label: 'Vendors & POs', icon: Building2 },
  { to: '/audit', label: 'Audit log', icon: ScrollText },
]

export default function Layout() {
  const [moreOpen, setMoreOpen] = useState(false)

  const sideClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
      isActive ? 'bg-ac-bg text-ac' : 'text-mu hover:text-tx'
    }`

  const tabClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-ac' : 'text-mu'}`

  return (
    <div className="min-h-screen bg-app">
      {/* Sidebar (desktop only) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col gap-1 border-r border-line bg-app p-4">
        <div className="mb-4">
          <p className="font-medium">Invoice Anomaly Desk</p>
          <p className="text-[11px] text-ac mt-0.5">● Agent live</p>
        </div>
        {[...mainLinks, ...moreLinks].map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={sideClass}>
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </aside>

      {/* Page content */}
      <main className="md:pl-56 pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* More menu (mobile only) */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 right-3 z-20 bg-card border border-line rounded-2xl p-2 shadow-lg">
          {moreLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMoreOpen(false)}
              className={sideClass}
            >
              <l.icon size={18} />
              {l.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Bottom nav (mobile only) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-10 flex justify-around border-t border-line bg-app pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        {mainLinks.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={tabClass} onClick={() => setMoreOpen(false)}>
            <l.icon size={20} />
            {l.short}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen(!moreOpen)} className="flex flex-col items-center gap-0.5 text-[10px] text-mu">
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>
    </div>
  )
}
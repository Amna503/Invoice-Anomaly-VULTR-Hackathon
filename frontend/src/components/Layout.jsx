import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Upload, FileText, Inbox, BarChart3, Building2, ScrollText,
  Settings as SettingsIcon, Search, Bell, ChevronLeft, Menu, X, Activity,
  Sparkles, ArrowUpRight, Command,
} from 'lucide-react'
import * as api from '../lib/api'

const sections = [
  {
    title: 'Workspace',
    links: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/upload', label: 'Upload Invoices', icon: Upload },
      { to: '/invoices', label: 'All Invoices', icon: FileText },
      { to: '/queue', label: 'AI Review Queue', icon: Inbox },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/vendors', label: 'Vendors & POs', icon: Building2 },
    ],
  },
  {
    title: 'System',
    links: [
      { to: '/audit', label: 'Audit Logs', icon: ScrollText },
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
]

const allLinks = sections.flatMap((s) => s.links)

const TITLES = Object.fromEntries(allLinks.map((l) => [l.to, l.label]))

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return saved === null ? initial : saved === '1'
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(key, value ? '1' : '0')
    } catch {
      // storage blocked — keep the in-memory value
    }
  }, [key, value])
  return [value, setValue]
}

/* ------------------------------ sidebar ------------------------------ */

function NavList({ collapsed, onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-mu/70">
              {section.title}
            </p>
          )}
          <div className="space-y-0.5">
            {section.links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={onNavigate}
                title={collapsed ? l.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-colors ${
                    collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-ac-bg text-ac shadow-[inset_0_0_0_1px_rgba(139,92,246,0.28)]'
                      : 'text-mu hover:text-tx hover:bg-line/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-ac transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <l.icon size={17} className="shrink-0" />
                    {!collapsed && <span className="truncate">{l.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Brand({ collapsed }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 h-14 border-b border-line ${
        collapsed ? 'justify-center px-0' : ''
      }`}
    >
      <span className="relative w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-gradient-to-br from-[#8b5cf6] to-[#4f8cff] shadow-[0_8px_20px_-10px_rgba(139,92,246,0.9)]">
        <Sparkles size={15} className="text-white" />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-tight truncate">
            Invoice Anomaly Desk
          </span>
          <span className="block text-[10px] text-mu leading-tight">AI risk review</span>
        </span>
      )}
    </div>
  )
}

/* ------------------------------ topbar ------------------------------ */

function StatusPill() {
  const [health, setHealth] = useState(null)
  useEffect(() => {
    let alive = true
    api
      .getHealth()
      .then((h) => alive && setHealth({ ok: true, h }))
      .catch(() => alive && setHealth({ ok: false }))
    return () => {
      alive = false
    }
  }, [])

  const label = !health
    ? 'Checking…'
    : health.ok
      ? health.h?.mode === 'live'
        ? 'Live API'
        : 'Demo data'
      : 'API offline'
  const tone = !health
    ? 'text-mu'
    : health.ok
      ? 'text-good'
      : 'text-warn'

  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium"
      title={health?.ok ? 'System status' : 'Could not reach the API'}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${!health ? 'bg-mu' : health.ok ? 'bg-good live-dot' : 'bg-warn'}`}
      />
      <span className={tone}>{label}</span>
    </span>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const wrap = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open || items) return
    api
      .getInvoices({ status: 'review' })
      .then((list) => setItems(list.slice(0, 5)))
      .catch(() => setItems([]))
  }, [open, items])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative w-9 h-9 grid place-items-center rounded-xl border border-line bg-card text-mu hover:text-tx hover:border-[#2e3854] transition-colors"
      >
        <Bell size={16} />
        {items && items.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ac text-white text-[10px] font-semibold grid place-items-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(88vw,340px)] surface border border-line rounded-2xl overflow-hidden shadow-[0_30px_70px_-35px_rgba(0,0,0,0.95)] page-enter z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mu">
              Needs attention
            </p>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/queue')
              }}
              className="text-[11px] text-ac hover:underline inline-flex items-center gap-0.5"
            >
              Review queue <ArrowUpRight size={11} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items === null ? (
              <div className="p-4 space-y-2" aria-hidden="true">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-3/5" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-xs text-mu text-center">
                Nothing waiting — all clear.
              </p>
            ) : (
              items.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => {
                    setOpen(false)
                    navigate(`/invoices/${inv.id}`)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-line last:border-0 hover:bg-ac-bg/50 transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      inv.route === 'block' ? 'bg-bad' : 'bg-warn'
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-mono truncate">{inv.id}</span>
                    <span className="block text-[11px] text-mu truncate">
                      {inv.vendor} · risk {inv.risk}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const navigate = useNavigate()
  const [name, setName] = useState('Finance Admin')

  useEffect(() => {
    const load = () => {
      try {
        const saved = window.localStorage.getItem('iad-name')
        setName(saved || 'Finance Admin')
      } catch {
        // ignore
      }
    }
    load()
    window.addEventListener('storage', load)
    window.addEventListener('iad-profile', load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('iad-profile', load)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div className="relative" ref={wrap}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full grid place-items-center text-[11px] font-semibold bg-ac-bg text-ac ring-1 ring-inset ring-ac/30 hover:ring-ac/60 transition-shadow"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 surface border border-line rounded-2xl overflow-hidden shadow-[0_30px_70px_-35px_rgba(0,0,0,0.95)] page-enter z-40">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-[11px] text-mu">Finance reviewer</p>
          </div>
          <button
            onClick={() => {
              setOpen(false)
              navigate('/settings')
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-tx2 hover:bg-line/40 flex items-center gap-2"
          >
            <SettingsIcon size={13} className="text-mu" /> Settings
          </button>
          <button
            onClick={() => {
              setOpen(false)
              navigate('/audit')
            }}
            className="w-full text-left px-4 py-2.5 text-xs text-tx2 hover:bg-line/40 flex items-center gap-2"
          >
            <ScrollText size={13} className="text-mu" /> Audit logs
          </button>
        </div>
      )}
    </div>
  )
}

function Topbar({ onOpenMenu, searchRef }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')

  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith('/invoices/') ? 'Invoice detail' : 'Dashboard')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchRef])

  function submit(e) {
    e.preventDefault()
    navigate(q.trim() ? `/invoices?q=${encodeURIComponent(q.trim())}` : '/invoices')
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-line bg-app/85 backdrop-blur-md">
      <div className="h-full px-3 md:px-5 flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="md:hidden w-9 h-9 grid place-items-center rounded-xl border border-line bg-card text-mu hover:text-tx"
        >
          <Menu size={17} />
        </button>

        <div className="hidden md:block min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
        </div>

        <form onSubmit={submit} className="flex-1 max-w-md ml-auto md:ml-4 relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mu pointer-events-none"
          />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoices, vendors…"
            aria-label="Search invoices"
            className="w-full bg-card border border-line rounded-xl pl-9 pr-12 py-2 text-sm text-tx placeholder:text-mu outline-none focus:border-ac/60 focus:ring-2 focus:ring-ac/15 transition-all"
          />
          <kbd className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] text-mu border border-line rounded px-1.5 py-0.5 pointer-events-none">
            <Command size={9} /> /
          </kbd>
        </form>

        <StatusPill />
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  )
}

/* ------------------------------ layout ------------------------------ */

export default function Layout() {
  const [collapsed, setCollapsed] = useLocalStorage('iad-collapsed', false)
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const searchRef = useRef(null)

  useEffect(() => {
    setDrawer(false)
  }, [location.pathname])

  const sideStyle = useMemo(() => ({ '--side': collapsed ? '72px' : '248px' }), [collapsed])

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        style={sideStyle}
        className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[var(--side)] flex-col border-r border-line bg-app/70 backdrop-blur-xl transition-[width] duration-200 ease-out"
      >
        <Brand collapsed={collapsed} />
        <NavList collapsed={collapsed} />
        <div className="px-3 py-3 border-t border-line space-y-2">
          <div
            className={`flex items-center gap-2 rounded-xl bg-good-bg px-2.5 py-2 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="AI agent is monitoring new invoices"
          >
            <Activity size={14} className="text-good shrink-0 live-dot" />
            {!collapsed && (
              <span className="text-[11px] text-good font-medium leading-tight">
                Agent live
                <span className="block text-[10px] text-good/60 font-normal">
                  6-step pipeline ready
                </span>
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] text-mu hover:text-tx hover:bg-line/40 transition-colors justify-center"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              size={14}
              className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[268px] bg-app border-r border-line flex flex-col page-enter">
            <div className="flex items-center justify-between pr-3">
              <Brand collapsed={false} />
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="text-mu hover:text-tx"
              >
                <X size={18} />
              </button>
            </div>
            <NavList collapsed={false} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Content */}
      <div style={sideStyle} className="md:pl-[var(--side)] transition-[padding] duration-200 ease-out">
        <Topbar onOpenMenu={() => setDrawer(true)} searchRef={searchRef} />
        <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-5 md:py-7 pb-28 md:pb-10">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-app/95 backdrop-blur-md pt-1.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      >
        <div className="flex justify-around">
          {allLinks.slice(0, 4).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 ${
                  isActive ? 'text-ac' : 'text-mu'
                }`
              }
            >
              <l.icon size={19} />
              {l.label.split(' ')[0]}
            </NavLink>
          ))}
          <button
            onClick={() => setDrawer(true)}
            className="flex flex-col items-center gap-0.5 text-[10px] text-mu px-2 py-1"
          >
            <Menu size={19} />
            More
          </button>
        </div>
      </nav>
    </div>
  )
}

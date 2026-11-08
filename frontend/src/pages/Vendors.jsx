import { useMemo, useState } from 'react'
import { Search, Building2, ScrollText } from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { Card, CardHeader, Avatar, Pill, Tabs, money } from '../components/ui'
import { Loading, ErrorBox, Empty } from '../components/State'

function trustTone(score) {
  if (score >= 90) return 'good'
  if (score >= 80) return 'agent'
  return 'warn'
}

// Small line chart of the vendor's past unit prices
function Sparkline({ values }) {
  const w = 120
  const h = 34
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - 4 - ((v - min) / span) * (h - 8)
    return [x, y]
  })
  const line = points.map((p) => p.join(',')).join(' ')
  const last = points[points.length - 1]

  const earlier = values.slice(0, -1)
  const avg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  const jump = values[values.length - 1] > avg * 1.3

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" aria-hidden="true">
      <polyline
        points={line}
        fill="none"
        stroke="var(--ac)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={jump ? 'var(--warn)' : 'var(--ac)'} />
    </svg>
  )
}

function VendorCard({ v }) {
  const hasHistory = Array.isArray(v.priceHistory?.values) && v.priceHistory.values.length > 1
  const latest = hasHistory ? v.priceHistory.values[v.priceHistory.values.length - 1] : null
  const jump =
    hasHistory &&
    v.priceHistory.values[v.priceHistory.values.length - 1] >
      (v.priceHistory.values.slice(0, -1).reduce((a, b) => a + b, 0) /
        Math.max(1, v.priceHistory.values.length - 1)) *
        1.3

  return (
    <Card hover className="topline">
      <div className="flex items-center gap-3">
        <Avatar initials={v.initials} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{v.name}</p>
          <p className="text-xs text-mu font-mono">Bank …{v.bank}</p>
        </div>
        {typeof v.trust === 'number' && <Pill tone={trustTone(v.trust)}>Trust {v.trust}</Pill>}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3.5 text-xs">
        <p className="text-mu">Tax ID</p>
        <p className="font-mono text-right text-tx2 truncate">{v.taxId}</p>
        <p className="text-mu">Payment terms</p>
        <p className="text-right text-tx2">{v.terms}</p>
        <p className="text-mu">Email</p>
        <p className="text-right truncate text-tx2" title={v.email}>
          {v.email}
        </p>
      </div>

      {hasHistory && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="flex justify-between text-[11px] text-mu mb-1">
            <span>{v.priceHistory.item} price history</span>
            <span className={`font-mono ${jump ? 'text-warn' : 'text-tx2'}`}>Latest {latest}</span>
          </div>
          <Sparkline values={v.priceHistory.values} />
        </div>
      )}
    </Card>
  )
}

const PO_TONES = {
  over: ['bad', 'Over budget'],
  open: ['good', 'Open'],
  pending: ['warn', 'Pending'],
  approved: ['good', 'Approved'],
  partially_received: ['agent', 'Part received'],
  completed: ['muted', 'Completed'],
  cancelled: ['bad', 'Cancelled'],
}

function PoCard({ po }) {
  const hasUsage = typeof po.used === 'number' && po.approved > 0
  const pct = hasUsage ? Math.round((po.used / po.approved) * 100) : 0
  const over = hasUsage && po.used > po.approved * 1.05
  const [tone, label] = PO_TONES[po.status] || ['muted', 'Open']

  return (
    <Card hover>
      <div className="flex items-center justify-between mb-0.5 gap-2">
        <p className="text-sm font-mono truncate">{po.id}</p>
        {over ? <Pill tone="bad">Over by {pct - 100}%</Pill> : <Pill tone={tone}>{label}</Pill>}
      </div>
      <p className="text-xs text-mu mb-3">{po.vendor}</p>

      {hasUsage ? (
        <>
          <div className="h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-gradient-to-r from-[#8b5cf6] to-[#4f8cff]'}`}
              style={{ width: Math.min(pct, 100) + '%' }}
            />
          </div>
          <p className="text-xs text-mu mt-2 font-mono num">
            {money(po.used)} of {money(po.approved)} used
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between text-xs">
          <span className="text-mu">Approved amount</span>
          <span className="font-mono num text-tx2">{money(po.approved)}</span>
        </div>
      )}
    </Card>
  )
}

export default function Vendors() {
  const [tab, setTab] = useState('vendors')
  const [search, setSearch] = useState('')

  const { data, loading, error, reload } = useAsync(async () => {
    const [vendors, pos] = await Promise.all([api.getVendors(), api.getPurchaseOrders()])
    return { vendors, pos }
  }, [])

  const header = (
    <CardHeader
      title="Vendors & purchase orders"
      sub="The master data every invoice is checked against."
      icon={Building2}
    />
  )

  const filtered = useMemo(() => {
    if (!data) return { vendors: [], pos: [] }
    const q = search.trim().toLowerCase()
    if (!q) return data
    return {
      vendors: data.vendors.filter(
        (v) => v.name.toLowerCase().includes(q) || v.taxId.toLowerCase().includes(q)
      ),
      pos: data.pos.filter(
        (p) => p.id.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q)
      ),
    }
  }, [data, search])

  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  const list = tab === 'vendors' ? filtered.vendors : filtered.pos

  return (
    <>
      {header}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'vendors', label: 'Vendors', count: data.vendors.length },
            { value: 'pos', label: 'Purchase orders', count: data.pos.length },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mu" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'vendors' ? 'Search vendor or tax ID…' : 'Search PO or vendor…'}
            aria-label="Search records"
            className="w-full bg-card border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm text-tx placeholder:text-mu outline-none focus:border-ac/60 focus:ring-2 focus:ring-ac/15 transition-all"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty
            text={search ? 'No records match your search' : 'No records yet'}
            hint={search ? 'Try another term.' : 'Vendor master data will appear here.'}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {tab === 'vendors'
            ? filtered.vendors.map((v) => <VendorCard key={v.id} v={v} />)
            : filtered.pos.map((p) => <PoCard key={p.id} po={p} />)}
        </div>
      )}

      {tab === 'pos' && (
        <p className="flex items-center gap-1.5 text-[11px] text-mu mt-4">
          <ScrollText size={12} /> Purchase orders over their approved amount are flagged as
          <span className="text-bad">Over PO</span> anomalies.
        </p>
      )}
    </>
  )
}

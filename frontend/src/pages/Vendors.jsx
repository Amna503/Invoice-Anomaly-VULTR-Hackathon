import { useState } from 'react'
import * as api from '../lib/mockApi'
import { useAsync } from '../lib/useAsync'
import { Card, Avatar, Pill, PageHeader, money } from '../components/ui'
import { Loading, ErrorBox, Empty } from '../components/State'

const TAB = 'px-4 py-1.5 rounded-xl text-sm'
const TAB_ON = 'bg-ac-bg text-ac'
const TAB_OFF = 'text-mu hover:text-tx'

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

  // Is the newest price much higher than the earlier average?
  const earlier = values.slice(0, -1)
  const avg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  const jump = values[values.length - 1] > avg * 1.3

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9">
      <polyline
        points={line}
        fill="none"
        stroke="var(--ac)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r="3.5"
        fill={jump ? 'var(--warn)' : 'var(--ac)'}
      />
    </svg>
  )
}

function VendorCard({ v }) {
  const latest = v.priceHistory.values[v.priceHistory.values.length - 1]
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar initials={v.initials} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{v.name}</p>
          <p className="text-xs text-mu font-mono">Bank …{v.bank}</p>
        </div>
        <Pill tone={trustTone(v.trust)}>Trust {v.trust}</Pill>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-3 text-xs">
        <p className="text-mu">Tax ID</p>
        <p className="font-mono text-right">{v.taxId}</p>
        <p className="text-mu">Payment terms</p>
        <p className="text-right">{v.terms}</p>
        <p className="text-mu">Email</p>
        <p className="text-right truncate">{v.email}</p>
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <div className="flex justify-between text-[11px] text-mu mb-1">
          <span>{v.priceHistory.item} price history</span>
          <span className="font-mono">Latest {latest}</span>
        </div>
        <Sparkline values={v.priceHistory.values} />
      </div>
    </Card>
  )
}

function PoCard({ po }) {
  const pct = Math.round((po.used / po.approved) * 100)
  const over = po.used > po.approved * 1.05
  const overBy = pct - 100
  return (
    <Card>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-sm font-mono">{po.id}</p>
        {over ? (
          <Pill tone="bad">Over by {overBy}%</Pill>
        ) : (
          <Pill tone="good">Open</Pill>
        )}
      </div>
      <p className="text-xs text-mu mb-2.5">{po.vendor}</p>

      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-ac'}`}
          style={{ width: Math.min(pct, 100) + '%' }}
        />
      </div>
      <p className="text-xs text-mu mt-1.5 font-mono">
        {money(po.used)} of {money(po.approved)} used
      </p>
    </Card>
  )
}

export default function Vendors() {
  const [tab, setTab] = useState('vendors')

  const { data, loading, error, reload } = useAsync(async () => {
    const [vendors, pos] = await Promise.all([
      api.getVendors(),
      api.getPurchaseOrders(),
    ])
    return { vendors, pos }
  }, [])

  const header = (
    <PageHeader
      title="Master data"
      subtitle="The records the agent checks every invoice against"
    />
  )

  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  const list = tab === 'vendors' ? data.vendors : data.pos

  return (
    <>
      {header}

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setTab('vendors')}
          className={`${TAB} ${tab === 'vendors' ? TAB_ON : TAB_OFF}`}
        >
          Vendors ({data.vendors.length})
        </button>
        <button
          onClick={() => setTab('pos')}
          className={`${TAB} ${tab === 'pos' ? TAB_ON : TAB_OFF}`}
        >
          Purchase orders ({data.pos.length})
        </button>
      </div>

      {list.length === 0 ? (
        <Empty text="No records yet" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tab === 'vendors'
            ? data.vendors.map((v) => <VendorCard key={v.id} v={v} />)
            : data.pos.map((p) => <PoCard key={p.id} po={p} />)}
        </div>
      )}
    </>
  )
}
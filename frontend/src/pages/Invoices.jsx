import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, ArrowUpDown } from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import {
  Card, Avatar, RoutePill, Pill, RiskBar, PageHeader, money, Button,
} from '../components/ui'
import { ErrorBox, Empty, SkeletonRows } from '../components/State'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'review', label: 'Review' },
  { value: 'block', label: 'Block' },
]

const DECISION = {
  approved: ['good', 'Approved'],
  rejected: ['bad', 'Rejected'],
  queried: ['human', 'Query sent'],
}

const COLUMNS = [
  { key: 'id', label: 'Invoice', align: 'left' },
  { key: 'vendor', label: 'Vendor', align: 'left' },
  { key: 'total', label: 'Amount', align: 'right' },
  { key: 'date', label: 'Date', align: 'right' },
  { key: 'route', label: 'Anomaly', align: 'left' },
  { key: 'risk', label: 'Risk', align: 'left' },
  { key: 'decision', label: 'Review', align: 'left' },
]

function DecisionPill({ inv }) {
  if (inv.processing) return <Pill tone="info">Processing</Pill>
  const [tone, label] = DECISION[inv.decision] || ['muted', 'Pending']
  return <Pill tone={tone}>{label}</Pill>
}

export default function Invoices() {
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('q') || '')
  const [query, setQuery] = useState(search)
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })

  // The top bar searches by navigating here with ?q=
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || ''
    setSearch(q)
    setQuery(q)
  }, [location.search])

  // Wait until the person stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, loading, error, reload } = useAsync(
    () => api.getInvoices({ status, search: query }),
    [status, query]
  )

  const rows = useMemo(() => {
    const list = data ? [...data] : []
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    const order = { cleared: 0, review: 1, block: 2 }
    list.sort((a, b) => {
      let av = a[key]
      let bv = b[key]
      if (key === 'route') {
        av = order[av] ?? 9
        bv = order[bv] ?? 9
      }
      if (key === 'decision') {
        av = a.decision
        bv = b.decision
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
      return String(av ?? '').localeCompare(String(bv ?? '')) * mul
    })
    return list
  }, [data, sort])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const header = (
    <PageHeader
      title="All invoices"
      subtitle="Every invoice the agent has ingested, scored and routed."
      right={
        data && (
          <span className="text-xs text-mu num mt-1.5">
            {rows.length} invoice{rows.length === 1 ? '' : 's'}
          </span>
        )
      }
    />
  )

  return (
    <>
      {header}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mu" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor or invoice number…"
            aria-label="Search invoices"
            className="w-full bg-card border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm text-tx placeholder:text-mu outline-none focus:border-ac/60 focus:ring-2 focus:ring-ac/15 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                status === f.value
                  ? 'bg-ac-bg text-ac border-ac/50 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
                  : 'border-line text-mu hover:text-tx hover:border-[#2e3854]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <Card className="!p-4">
          <SkeletonRows rows={6} />
        </Card>
      ) : rows.length === 0 ? (
        <Card className="!p-0">
          <Empty
            text="No invoices match your filters"
            hint="Try a different search term or clear the status filter."
            action={
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearch('')
                  setStatus('all')
                }}
              >
                Reset filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className={`!p-0 overflow-hidden hidden md:block transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-card2/60">
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`text-[11px] uppercase tracking-[0.1em] text-mu font-medium px-4 py-3 ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <button
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-tx transition-colors"
                        >
                          {col.label}
                          <ArrowUpDown
                            size={11}
                            className={sort.key === col.key ? 'text-ac' : 'opacity-40'}
                          />
                        </button>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="border-b border-line last:border-0 hover:bg-ac-bg/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={inv.initials} route={inv.route} size="sm" />
                          <span className="font-mono text-[13px]">{inv.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-tx2">{inv.vendor}</td>
                      <td className="px-4 py-3 text-right font-mono num">{money(inv.total)}</td>
                      <td className="px-4 py-3 text-right text-mu font-mono text-xs">{inv.date}</td>
                      <td className="px-4 py-3"><RoutePill route={inv.route} /></td>
                      <td className="px-4 py-3"><RiskBar score={inv.risk} /></td>
                      <td className="px-4 py-3"><DecisionPill inv={inv} /></td>
                      <td className="px-2 py-3 text-mu">
                        <ChevronRight size={15} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className={`md:hidden space-y-2.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {rows.map((inv) => (
              <Link key={inv.id} to={`/invoices/${inv.id}`}>
                <Card hover className="!p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar initials={inv.initials} route={inv.route} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[13px] truncate">{inv.id}</p>
                        <RoutePill route={inv.route} />
                      </div>
                      <p className="text-xs text-mu truncate mt-0.5">
                        {inv.vendor} · {inv.date}
                      </p>
                      <div className="flex items-center justify-between mt-2.5">
                        <p className="text-sm font-mono num">{money(inv.total)}</p>
                        <div className="flex items-center gap-2">
                          <RiskBar score={inv.risk} />
                          <DecisionPill inv={inv} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}

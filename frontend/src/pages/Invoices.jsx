import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import * as api from '../lib/mockApi'
import { useAsync } from '../lib/useAsync'
import { Card, Avatar, RoutePill, Pill, PageHeader, money } from '../components/ui'
import { Loading, ErrorBox, Empty } from '../components/State'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'review', label: 'Review' },
  { value: 'block', label: 'Block' },
]

export default function Invoices() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  // Wait until the person stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, loading, error, reload } = useAsync(
    () => api.getInvoices({ status, search: query }),
    [status, query]
  )

  return (
    <>
      <PageHeader
        title="Invoices"
        right={data && <span className="text-xs text-mu mt-1">{data.length} shown</span>}
      />

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mu" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor or invoice number"
          className="w-full bg-card border border-line rounded-xl pl-9 pr-3 py-2 text-sm text-tx placeholder:text-mu outline-none focus:border-ac"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`px-3.5 py-1 rounded-full text-xs border ${
              status === f.value
                ? 'bg-ac-bg text-ac border-ac'
                : 'border-line text-mu hover:text-tx'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : loading && !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty text="No invoices match your search" />
      ) : (
        <Card className={`!p-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {data.map((inv) => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="flex items-center gap-3 px-3 py-3 border-b border-line last:border-0 hover:bg-ac-bg/40"
            >
              <Avatar initials={inv.initials} route={inv.route} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono">{inv.id}</p>
                <p className="text-xs text-mu truncate">
                  {inv.vendor} · {inv.date}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-mono">{money(inv.total)}</p>
                <div className="flex gap-1 justify-end">
                  {inv.route !== 'cleared' && inv.decision !== 'pending' && (
                    <Pill tone="human">{inv.decision}</Pill>
                  )}
                  <RoutePill route={inv.route} />
                </div>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  )
}
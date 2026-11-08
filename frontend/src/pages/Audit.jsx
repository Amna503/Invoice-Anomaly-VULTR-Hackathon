import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText, Filter } from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { Card, CardHeader, Pill } from '../components/ui'
import { Loading, ErrorBox, Empty } from '../components/State'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'agent', label: 'Agent' },
  { value: 'human', label: 'Human' },
]

export default function Audit() {
  const [who, setWho] = useState('all')
  const { data, loading, error, reload } = useAsync(() => api.getAudit(), [])

  const header = (
    <CardHeader
      title="Audit logs"
      sub="Everything the agent and reviewers did, in chronological order."
      icon={ScrollText}
    />
  )

  const events = useMemo(() => {
    if (!data) return []
    const list = data.filter((e) => who === 'all' || e.actor === who)
    return [...list].sort((a, b) => (b.ts || 0) - (a.ts || 0))
  }, [data, who])

  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  const agentCount = data.filter((e) => e.actor === 'agent').length

  return (
    <>
      {header}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex gap-1 p-1 rounded-xl bg-card border border-line">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setWho(f.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                who === f.value
                  ? 'bg-ac-bg text-ac shadow-[inset_0_0_0_1px_rgba(139,92,246,0.28)]'
                  : 'text-mu hover:text-tx'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-mu num flex items-center gap-1.5">
          <Filter size={11} />
          {events.length} event{events.length === 1 ? '' : 's'}
          {who === 'all' && ` · ${agentCount} agent-generated`}
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <Empty text="No events yet" hint="Actions from the agent and reviewers will appear here." />
        </Card>
      ) : (
        <Card className="!p-5">
          <ol className="relative pl-6 space-y-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-line">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full ring-4 ring-card ${
                    e.actor === 'agent' ? 'bg-ac' : 'bg-info'
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-tx2">{e.action}</p>
                  <Pill tone={e.actor === 'agent' ? 'agent' : 'human'}>
                    {e.actor === 'agent' ? 'Agent' : 'Human'}
                  </Pill>
                </div>
                <p className="text-xs text-mu mt-1 flex items-center gap-2">
                  <span className="font-mono num">{e.time}</span>
                  {e.invoice && (
                    <Link to={`/invoices/${e.invoice}`} className="text-ac hover:underline">
                      {e.invoice} · view details
                    </Link>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  )
}

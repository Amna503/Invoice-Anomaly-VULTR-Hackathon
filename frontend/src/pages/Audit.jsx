import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/mockApi'
import { useAsync } from '../lib/useAsync'
import { Card, Pill, PageHeader } from '../components/ui'
import { Loading, ErrorBox, Empty } from '../components/State'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'agent', label: 'Agent' },
  { value: 'human', label: 'Human' },
]
const CHIP = 'px-3.5 py-1 rounded-full text-xs border'
const CHIP_ON = 'bg-ac-bg text-ac border-ac'
const CHIP_OFF = 'border-line text-mu hover:text-tx'

export default function Audit() {
  const [who, setWho] = useState('all')
  const { data, loading, error, reload } = useAsync(() => api.getAudit(), [])

  const header = (
    <PageHeader
      title="Audit log"
      subtitle="Everything the agent and reviewers did, in order"
    />
  )

  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  const events = data.filter((e) => who === 'all' || e.actor === who)

  return (
    <>
      {header}

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setWho(f.value)}
            className={`${CHIP} ${who === f.value ? CHIP_ON : CHIP_OFF}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <Empty text="No events yet" />
      ) : (
        <Card className="!p-4">
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-line" />
            {events.map((e) => (
              <div key={e.id} className="relative">
                <span
                  className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full
                    border-2 border-card ${
                      e.actor === 'agent' ? 'bg-ac' : 'bg-info'
                    }`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm">{e.action}</p>
                  <Pill tone={e.actor === 'agent' ? 'agent' : 'human'}>
                    {e.actor === 'agent' ? 'Agent' : 'Human'}
                  </Pill>
                </div>
                <p className="text-xs text-mu mt-0.5">
                  <span className="font-mono">{e.time}</span>
                  {e.invoice && (
                    <>
                      {' · '}
                      <Link to={`/invoices/${e.invoice}`} className="text-ac">
                        {e.invoice} · view details
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
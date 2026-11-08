import { Link } from 'react-router-dom'
import * as api from '../lib/mockApi'
import { useAsync } from '../lib/useAsync'
import { Card, RoutePill, Avatar, PageHeader } from '../components/ui'
import { Loading, ErrorBox } from '../components/State'

function StatCard({ label, value, danger }) {
  return (
    <Card className={danger ? 'bg-bad-bg border-bad/30' : ''}>
      <p className={`text-[11px] ${danger ? 'text-bad' : 'text-mu'}`}>{label}</p>
      <p className={`text-2xl font-medium ${danger ? 'text-bad' : ''}`}>{value}</p>
    </Card>
  )
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, invoices, audit] = await Promise.all([
      api.getStats(),
      api.getInvoices(),
      api.getAudit(),
    ])
    return { stats, invoices, audit }
  }, [])

  const header = (
    <PageHeader
      title="Dashboard"
      right={<span className="text-[11px] text-ac mt-1">● Agent live</span>}
    />
  )

  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  const { stats, invoices, audit } = data
  const maxFlag = Math.max(...stats.flagsByType.map((f) => f.count))
  const activity = [...audit].reverse().slice(0, 4)

  return (
    <>
      {header}

      {/* Top numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard label="Invoices processed" value={stats.processed} />
        <StatCard label="Flagged" value={stats.flagged} />
        <StatCard label="Money at risk" value={'$' + stats.moneyAtRisk.toLocaleString('en-US')} danger />
        <StatCard label="Time saved" value={`${stats.hoursSaved} hrs`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Left column */}
        <div className="space-y-3">
          <Card>
            <p className="text-[11px] text-mu mb-2">Routing</p>
            <div className="flex h-2 rounded-full overflow-hidden bg-line">
              <div className="bg-good" style={{ width: stats.routing.cleared + '%' }} />
              <div className="bg-warn" style={{ width: stats.routing.review + '%' }} />
              <div className="bg-bad" style={{ width: stats.routing.block + '%' }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-mu">
              <span><span className="text-good">●</span> Cleared {stats.routing.cleared}%</span>
              <span><span className="text-warn">●</span> Review {stats.routing.review}%</span>
              <span><span className="text-bad">●</span> Block {stats.routing.block}%</span>
            </div>
          </Card>

          <Card>
            <p className="text-[11px] text-mu mb-2">Flags by type</p>
            <div className="space-y-2.5">
              {stats.flagsByType.map((f) => (
                <div key={f.type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{f.type}</span>
                    <span className="text-mu">{f.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full bg-ac" style={{ width: (f.count / maxFlag) * 100 + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Card>
            <p className="text-[11px] text-mu mb-2">Agent activity</p>
            {activity.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 text-xs border-b border-line last:border-0">
                <span className="flex items-center gap-2">
                  <span className={e.actor === 'agent' ? 'text-ac' : 'text-info'}>●</span>
                  {e.action}
                </span>
                <span className="text-mu font-mono">{e.time}</span>
              </div>
            ))}
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[11px] text-mu">Recent invoices</p>
              <Link to="/invoices" className="text-[11px] text-ac">View all</Link>
            </div>
            {invoices.slice(0, 5).map((inv) => (
              <Link
                key={inv.id}
                to={`/invoices/${inv.id}`}
                className="flex items-center gap-3 py-2 border-b border-line last:border-0"
              >
                <Avatar initials={inv.initials} route={inv.route} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono">{inv.id}</p>
                  <p className="text-xs text-mu truncate">{inv.vendor}</p>
                </div>
                <RoutePill route={inv.route} />
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}
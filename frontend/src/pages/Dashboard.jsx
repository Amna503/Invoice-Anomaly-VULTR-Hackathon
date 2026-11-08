import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  FileText, ShieldAlert, Banknote, Clock, ArrowUpRight, Sparkles, Activity,
} from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { C, axis, ChartTip } from '../components/charts'
import { Card, CardHeader, StatTile, RoutePill, Avatar, Pill, PageHeader, money, moneyShort } from '../components/ui'
import { SkeletonCards, SkeletonChart, ErrorBox, Empty } from '../components/State'

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, invoices, audit] = await Promise.all([
      api.getStats(),
      api.getInvoices(),
      api.getAudit(),
    ])
    return { stats, invoices, audit }
  }, [])

  const charts = useMemo(() => {
    if (!data) return null
    const { invoices, audit } = data

    // Processing activity per day, split by route
    const days = {}
    invoices.forEach((inv) => {
      const d = inv.date || '—'
      days[d] ||= { day: d, cleared: 0, review: 0, block: 0, total: 0 }
      days[d][inv.route] = (days[d][inv.route] || 0) + 1
      days[d].total += 1
    })
    const activity = Object.values(days).sort((a, b) => a.day.localeCompare(b.day))

    // Risk severity buckets
    const buckets = { High: 0, Medium: 0, Low: 0 }
    invoices.forEach((inv) => {
      if (inv.risk >= 70) buckets.High += 1
      else if (inv.risk >= 40) buckets.Medium += 1
      else buckets.Low += 1
    })
    const severity = [
      { name: 'High risk', value: buckets.High, color: C.block },
      { name: 'Medium risk', value: buckets.Medium, color: C.review },
      { name: 'Low risk', value: buckets.Low, color: C.cleared },
    ].filter((s) => s.value > 0)

    // Money exposure by vendor (flagged invoices only)
    const exposure = {}
    let exposed = 0
    let protectedValue = 0
    invoices.forEach((inv) => {
      if (inv.route === 'cleared') {
        protectedValue += inv.total
        return
      }
      exposed += inv.total
      exposure[inv.vendor] = (exposure[inv.vendor] || 0) + inv.total
    })
    const exposureList = Object.entries(exposure)
      .map(([vendor, value]) => ({ vendor, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const recent = [...audit].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 6)

    return { activity, severity, exposureList, exposed, protectedValue, recent }
  }, [data])

  const header = (
    <PageHeader
      title="Financial risk overview"
      subtitle="Live view of everything the AI agent has processed, flagged and routed."
      right={
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-line text-tx2 hover:border-ac hover:text-ac transition-colors"
        >
          Open analytics <ArrowUpRight size={13} />
        </Link>
      }
    />
  )

  if (loading && !data) {
    return (
      <>
        {header}
        <SkeletonCards />
        <div className="grid lg:grid-cols-3 gap-3 mt-3">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonChart />
        </div>
      </>
    )
  }
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  const { stats } = data
  const { activity, severity, exposureList, exposed, protectedValue, recent } = charts
  const maxFlag = Math.max(1, ...stats.flagsByType.map((f) => f.count))
  const totalFlags = stats.flagsByType.reduce((a, f) => a + f.count, 0)

  return (
    <>
      {header}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 stagger">
        <StatTile
          label="Invoices processed"
          value={stats.processed.toLocaleString('en-US')}
          icon={FileText}
          hint={`via 6-step pipeline`}
        />
        <StatTile
          label="Suspicious invoices"
          value={stats.flagged.toLocaleString('en-US')}
          icon={ShieldAlert}
          tone="warn"
          hint={`${stats.routing.review}% review · ${stats.routing.block}% blocked`}
        />
        <StatTile
          label="Money at risk"
          value={money(stats.moneyAtRisk)}
          icon={Banknote}
          tone="bad"
          hint="exposure on flagged invoices"
        />
        <StatTile
          label="Time saved"
          value={`${stats.hoursSaved} hrs`}
          icon={Clock}
          tone="good"
          hint="manual review avoided"
        />
      </div>

      {/* Activity + severity */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Invoice processing activity"
            sub="Invoices ingested per day, split by routing outcome"
            icon={Activity}
            right={
              <div className="hidden sm:flex gap-3 text-[11px] text-mu">
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.cleared }} /> Cleared</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.review }} /> Review</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: C.block }} /> Block</span>
              </div>
            }
          />
          {activity.length === 0 ? (
            <Empty text="No processing activity yet" hint="Upload an invoice to see the pipeline at work." />
          ) : (
            <div className="h-56 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" {...axis} />
                  <YAxis allowDecimals={false} {...axis} width={34} />
                  <Tooltip cursor={{ fill: 'rgba(139,92,246,0.08)' }} content={<ChartTip />} />
                  <Bar dataKey="cleared" name="Cleared" stackId="a" fill={C.cleared} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="review" name="Review" stackId="a" fill={C.review} />
                  <Bar dataKey="block" name="Block" stackId="a" fill={C.block} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Risk severity breakdown" sub="Share of invoices by risk score" />
          {severity.length === 0 ? (
            <Empty text="Nothing to score yet" />
          ) : (
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity}
                    dataKey="value"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {severity.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-semibold num">{data.invoices.length}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-mu">invoices</p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-1.5 mt-3">
            {severity.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-mu">
                  <i className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="num text-tx2">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Anomaly distribution + exposure */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card>
          <CardHeader title="Anomaly distribution" sub={`${totalFlags} flags raised across all checks`} icon={ShieldAlert} />
          {stats.flagsByType.length === 0 ? (
            <Empty text="No anomalies detected" hint="Every check passed so far." />
          ) : (
            <div className="space-y-3">
              {stats.flagsByType.map((f) => (
                <div key={f.type}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-tx2">{f.type}</span>
                    <span className="num text-mu">{f.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#4f8cff]"
                      style={{ width: `${(f.count / maxFlag) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Financial risk overview"
            sub="Value held behind flags vs. cleared for payment"
            icon={Banknote}
            right={
              <span className="text-[11px] text-mu num">
                {money(protectedValue)} cleared
              </span>
            }
          />
          <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="space-y-2.5">
              <div className="rounded-xl bg-bad-bg border border-bad/25 px-3.5 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-bad/80">Exposure</p>
                <p className="text-xl font-semibold text-bad num mt-1">{moneyShort(exposed)}</p>
              </div>
              <div className="rounded-xl bg-good-bg border border-good/25 px-3.5 py-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-good/80">Cleared value</p>
                <p className="text-xl font-semibold text-good num mt-1">{moneyShort(protectedValue)}</p>
              </div>
            </div>
            <div className="h-44">
              {exposureList.length === 0 ? (
                <Empty text="No exposure — all invoices cleared" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={exposureList} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" {...axis} tickFormatter={(v) => moneyShort(v)} />
                    <YAxis type="category" dataKey="vendor" {...axis} width={96} />
                    <Tooltip
                      cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                      content={<ChartTip formatter={(v) => money(v)} />}
                    />
                    <Bar dataKey="value" name="At risk" fill={C.ac2} radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent invoices + agent timeline */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Recent invoice activity</p>
            <Link to="/invoices" className="text-[11px] text-ac hover:underline inline-flex items-center gap-0.5">
              View all <ArrowUpRight size={11} />
            </Link>
          </div>
          {data.invoices.length === 0 ? (
            <Empty text="No invoices yet" hint="Upload your first invoice to get started." />
          ) : (
            <div className="divide-y divide-line">
              {data.invoices.slice(0, 5).map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-ac-bg/40 transition-colors"
                >
                  <Avatar initials={inv.initials} route={inv.route} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-mono truncate">{inv.id}</p>
                    <p className="text-[11px] text-mu truncate">{inv.vendor} · {inv.date}</p>
                  </div>
                  <p className="text-[13px] font-mono num hidden sm:block">{money(inv.total)}</p>
                  <RoutePill route={inv.route} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="AI agent activity"
            sub="Latest pipeline and reviewer actions"
            icon={Sparkles}
            right={
              <Link to="/audit" className="text-[11px] text-ac hover:underline">
                Audit log
              </Link>
            }
          />
          {recent.length === 0 ? (
            <Empty text="No activity yet" />
          ) : (
            <ol className="relative pl-5 space-y-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-line">
              {recent.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-card ${
                      e.actor === 'agent' ? 'bg-ac' : 'bg-info'
                    }`}
                  />
                  <p className="text-xs text-tx2 leading-snug">{e.action}</p>
                  <p className="text-[11px] text-mu mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono">{e.time}</span>
                    {e.invoice && (
                      <Link to={`/invoices/${e.invoice}`} className="text-ac hover:underline">
                        {e.invoice}
                      </Link>
                    )}
                    <Pill tone={e.actor === 'agent' ? 'agent' : 'human'} className="!text-[9px]">
                      {e.actor === 'agent' ? 'Agent' : 'Human'}
                    </Pill>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  BarChart3, ShieldAlert, TrendingUp, Sparkles, ArrowUpRight, Gauge, Zap,
} from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { C, axis, ChartTip } from '../components/charts'
import {
  Card, CardHeader, StatTile, RoutePill, Pill, Avatar, money, moneyShort,
} from '../components/ui'
import { SkeletonCards, SkeletonChart, ErrorBox, Empty } from '../components/State'

export default function Analytics() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [stats, invoices, audit] = await Promise.all([
      api.getStats(),
      api.getInvoices(),
      api.getAudit(),
    ])
    return { stats, invoices, audit }
  }, [])

  const model = useMemo(() => {
    if (!data) return null
    const { invoices, audit, stats } = data

    // Daily throughput
    const days = {}
    invoices.forEach((inv) => {
      const d = inv.date || '—'
      days[d] ||= { day: d, cleared: 0, review: 0, block: 0 }
      days[d][inv.route] = (days[d][inv.route] || 0) + 1
    })
    const trend = Object.values(days).sort((a, b) => a.day.localeCompare(b.day))

    // Risk buckets
    const buckets = [
      { name: 'High (70–100)', value: 0, color: C.block },
      { name: 'Medium (40–69)', value: 0, color: C.review },
      { name: 'Low (0–39)', value: 0, color: C.cleared },
    ]
    invoices.forEach((inv) => {
      if (inv.risk >= 70) buckets[0].value += 1
      else if (inv.risk >= 40) buckets[1].value += 1
      else buckets[2].value += 1
    })

    // Exposure by vendor (flagged only)
    const exposure = {}
    let exposed = 0
    let clearedValue = 0
    invoices.forEach((inv) => {
      if (inv.route === 'cleared') clearedValue += inv.total
      else {
        exposed += inv.total
        exposure[inv.vendor] = (exposure[inv.vendor] || 0) + inv.total
      }
    })
    const exposureList = Object.entries(exposure)
      .map(([vendor, value]) => ({ vendor, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    // Who acted
    const actors = [
      { name: 'Agent actions', value: audit.filter((e) => e.actor === 'agent').length, color: C.ac },
      { name: 'Reviewer actions', value: audit.filter((e) => e.actor === 'human').length, color: C.ac2 },
    ].filter((a) => a.value > 0)

    const totalFlags = stats.flagsByType.reduce((n, f) => n + f.count, 0)
    const avgRisk = invoices.length
      ? Math.round(invoices.reduce((n, i) => n + i.risk, 0) / invoices.length)
      : 0

    // Highest risk invoices for the watchlist
    const watchlist = [...invoices]
      .filter((i) => i.route !== 'cleared')
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 5)

    return {
      trend, buckets, exposureList, actors, totalFlags, avgRisk, watchlist,
      exposed, clearedValue,
    }
  }, [data])

  const header = (
    <CardHeader
      title="Analytics"
      sub="Every chart below is computed from your invoice, flag and audit data."
      icon={BarChart3}
      right={
        <Link
          to="/"
          className="text-[11px] text-ac hover:underline inline-flex items-center gap-0.5"
        >
          Dashboard <ArrowUpRight size={11} />
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
  const m = model
  const autoClear = stats.routing.cleared

  return (
    <>
      {header}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 stagger">
        <StatTile
          label="Auto-clear rate"
          value={`${autoClear}%`}
          icon={Zap}
          tone="good"
          hint="cleared without a human"
        />
        <StatTile
          label="Flags raised"
          value={m.totalFlags}
          icon={ShieldAlert}
          tone="warn"
          hint={`${data.invoices.length} invoices analysed`}
        />
        <StatTile
          label="Average risk score"
          value={m.avgRisk}
          icon={Gauge}
          tone={m.avgRisk >= 70 ? 'bad' : m.avgRisk >= 40 ? 'warn' : 'good'}
          hint="across all invoices"
        />
        <StatTile
          label="Exposure"
          value={moneyShort(m.exposed)}
          icon={TrendingUp}
          tone="bad"
          hint="value behind flags"
        />
      </div>

      {/* Trend + distribution */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Processing trend"
            sub="Daily volume by routing outcome"
            icon={TrendingUp}
          />
          {m.trend.length === 0 ? (
            <Empty text="No data yet" hint="Upload invoices to build a trend line." />
          ) : (
            <div className="h-60 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.trend} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="gCleared" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.cleared} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.cleared} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gReview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.review} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.review} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gBlock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.block} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={C.block} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" {...axis} />
                  <YAxis allowDecimals={false} {...axis} width={34} />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="cleared"
                    name="Cleared"
                    stackId="1"
                    stroke={C.cleared}
                    strokeWidth={2}
                    fill="url(#gCleared)"
                  />
                  <Area
                    type="monotone"
                    dataKey="review"
                    name="Review"
                    stackId="1"
                    stroke={C.review}
                    strokeWidth={2}
                    fill="url(#gReview)"
                  />
                  <Area
                    type="monotone"
                    dataKey="block"
                    name="Block"
                    stackId="1"
                    stroke={C.block}
                    strokeWidth={2}
                    fill="url(#gBlock)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Anomaly distribution" sub={`${m.totalFlags} flags by type`} icon={ShieldAlert} />
          {stats.flagsByType.length === 0 ? (
            <Empty text="No anomalies" hint="All checks passed." />
          ) : (
            <>
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.flagsByType}
                      dataKey="count"
                      nameKey="type"
                      innerRadius="60%"
                      outerRadius="92%"
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {stats.flagsByType.map((_, i) => (
                        <Cell
                          key={i}
                          fill={[C.ac, C.ac2, C.cyan, C.block, C.review, C.cleared][i % 6]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-semibold num">{m.totalFlags}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-mu">flags</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                {stats.flagsByType.map((f, i) => (
                  <div key={f.type} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-mu truncate">
                      <i
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: [C.ac, C.ac2, C.cyan, C.block, C.review, C.cleared][i % 6] }}
                      />
                      <span className="truncate">{f.type}</span>
                    </span>
                    <span className="num text-tx2">{f.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Severity + routing + actors */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card>
          <CardHeader title="Risk severity" sub="Invoices by risk score band" />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.buckets} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" {...axis} interval={0} tick={{ fill: C.tick, fontSize: 10 }} />
                <YAxis allowDecimals={false} {...axis} width={34} />
                <Tooltip cursor={{ fill: 'rgba(139,92,246,0.08)' }} content={<ChartTip />} />
                <Bar dataKey="value" name="Invoices" radius={[6, 6, 0, 0]} barSize={34}>
                  {m.buckets.map((b) => (
                    <Cell key={b.name} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Routing outcomes" sub="How the agent split the workload" icon={Sparkles} />
          <div className="space-y-4 pt-1">
            {[
              ['Cleared', stats.routing.cleared, 'bg-good', 'auto-approved'],
              ['Needs review', stats.routing.review, 'bg-warn', 'human decision'],
              ['Blocked', stats.routing.block, 'bg-bad', 'stopped payment'],
            ].map(([label, value, bar, hint]) => (
              <div key={label}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-tx2">{label}</span>
                  <span className="text-sm font-semibold num">{value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
                </div>
                <p className="text-[10px] text-mu mt-1">{hint}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Who acted" sub="Agent automation vs. reviewer input" />
          {m.actors.length === 0 ? (
            <Empty text="No activity yet" />
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.actors} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" {...axis} tick={{ fill: C.tick, fontSize: 10 }} />
                  <YAxis allowDecimals={false} {...axis} width={34} />
                  <Tooltip cursor={{ fill: 'rgba(139,92,246,0.08)' }} content={<ChartTip />} />
                  <Bar dataKey="value" name="Actions" radius={[6, 6, 0, 0]} barSize={40}>
                    {m.actors.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[11px] text-mu mt-1">
            Automation saved an estimated <span className="text-good num">{stats.hoursSaved} hrs</span>{' '}
            of manual review.
          </p>
        </Card>
      </div>

      {/* Exposure + watchlist */}
      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Exposure by vendor"
            sub="Flagged invoice value, highest first"
            icon={TrendingUp}
            right={<span className="text-[11px] text-mu num">{money(m.exposed)} total</span>}
          />
          {m.exposureList.length === 0 ? (
            <Empty text="No exposure" hint="All invoices are cleared for payment." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.exposureList} layout="vertical" margin={{ top: 0, right: 14, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" {...axis} tickFormatter={(v) => moneyShort(v)} />
                  <YAxis type="category" dataKey="vendor" {...axis} width={100} />
                  <Tooltip
                    cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                    content={<ChartTip formatter={(v) => money(v)} />}
                  />
                  <Bar dataKey="value" name="At risk" fill={C.ac2} radius={[0, 6, 6, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Risk watchlist</p>
            <Link to="/queue" className="text-[11px] text-ac hover:underline">
              Review queue
            </Link>
          </div>
          {m.watchlist.length === 0 ? (
            <Empty text="Nothing needs attention" />
          ) : (
            <div className="divide-y divide-line">
              {m.watchlist.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-ac-bg/40 transition-colors"
                >
                  <Avatar initials={inv.initials} route={inv.route} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-mono truncate">{inv.id}</p>
                    <p className="text-[11px] text-mu truncate">{inv.vendor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-mono num">{money(inv.total)}</p>
                    <p
                      className={`text-[11px] num ${
                        inv.risk >= 70 ? 'text-bad' : 'text-warn'
                      }`}
                    >
                      risk {inv.risk}
                    </p>
                  </div>
                  <RoutePill route={inv.route} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-mu mt-4">
        <Pill tone="agent">Live</Pill>
        Figures update from the same API the review screens use.
      </p>
    </>
  )
}

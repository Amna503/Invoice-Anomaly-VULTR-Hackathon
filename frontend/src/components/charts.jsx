// Shared Recharts styling so every chart in the app looks the same.

export const C = {
  cleared: '#34d399',
  review: '#fbbf24',
  block: '#fb7185',
  ac: '#8b5cf6',
  ac2: '#4f8cff',
  cyan: '#22d3ee',
  grid: '#1e2537',
  tick: '#7e87a6',
}

export const axis = {
  stroke: C.grid,
  tick: { fill: C.tick, fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

/**
 * Dark tooltip used by all dashboard charts.
 * @param {{active?: boolean, payload?: Array, label?: string, formatter?: (v: any) => string}} props
 */
export function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <p className="text-tx font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={p.dataKey ?? i} className="text-mu flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="text-tx num">{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

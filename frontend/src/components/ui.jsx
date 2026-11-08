export function Card({ className = '', children }) {
  return (
    <div className={`bg-card border border-line rounded-2xl p-3 ${className}`}>
      {children}
    </div>
  )
}

const tones = {
  bad: 'bg-bad-bg text-bad',
  warn: 'bg-warn-bg text-warn',
  good: 'bg-good-bg text-good',
  agent: 'bg-ac-bg text-ac',
  human: 'bg-info/15 text-info',
  muted: 'bg-line text-mu',
}

export function Pill({ tone = 'muted', children }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  )
}

// route: 'block' | 'review' | 'cleared'
export function RoutePill({ route }) {
  const map = {
    block: ['bad', 'Block'],
    review: ['warn', 'Review'],
    cleared: ['good', 'Cleared'],
  }
  const [tone, label] = map[route] || ['muted', route]
  return <Pill tone={tone}>{label}</Pill>
}

// severity: 'high' | 'medium'
export function SeverityPill({ severity }) {
  return severity === 'high'
    ? <Pill tone="bad">High</Pill>
    : <Pill tone="warn">Medium</Pill>
}

export function Avatar({ initials, route }) {
  const color = { block: 'bg-bad-bg text-bad', review: 'bg-warn-bg text-warn', cleared: 'bg-good-bg text-good' }
  return (
    <div className={`w-9 h-9 rounded-full grid place-items-center text-xs font-medium shrink-0 ${color[route] || 'bg-ac-bg text-ac'}`}>
      {initials}
    </div>
  )
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-medium">{title}</h1>
        {subtitle && <p className="text-xs text-mu mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'

/* ---------- Surfaces ---------- */

export function Card({ className = '', hover = false, children }) {
  return (
    <div
      className={`surface border border-line rounded-2xl p-4 ${
        hover ? 'card-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, sub, right, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-mu flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-ac" />}
          {title}
        </p>
        {sub && <p className="text-xs text-mu/80 mt-1">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/* ---------- Badges ---------- */

const tones = {
  bad: 'bg-bad-bg text-bad ring-bad/25',
  warn: 'bg-warn-bg text-warn ring-warn/25',
  good: 'bg-good-bg text-good ring-good/25',
  agent: 'bg-ac-bg text-ac ring-ac/30',
  human: 'bg-info/12 text-info ring-info/25',
  info: 'bg-info/12 text-info ring-info/25',
  cyan: 'bg-cyan/10 text-cyan ring-cyan/25',
  muted: 'bg-line/60 text-mu ring-line',
}

export function Pill({ tone = 'muted', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ring-1 ring-inset ${
        tones[tone] || tones.muted
      } ${className}`}
    >
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

// severity: 'high' | 'medium' | 'low'
export function SeverityPill({ severity }) {
  const map = { high: ['bad', 'High'], medium: ['warn', 'Medium'], low: ['info', 'Low'] }
  const [tone, label] = map[severity] || ['muted', severity]
  return <Pill tone={tone}>{label}</Pill>
}

export function Avatar({ initials, route, size = 'md' }) {
  const color = {
    block: 'bg-bad-bg text-bad ring-bad/30',
    review: 'bg-warn-bg text-warn ring-warn/30',
    cleared: 'bg-good-bg text-good ring-good/30',
  }
  const dims = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div
      className={`${dims} rounded-full grid place-items-center font-semibold shrink-0 ring-1 ring-inset ${
        color[route] || 'bg-ac-bg text-ac ring-ac/30'
      }`}
    >
      {initials}
    </div>
  )
}

/* ---------- Buttons & inputs ---------- */

const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium ' +
  'transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none select-none'

const btnVariants = {
  primary:
    'text-white bg-gradient-to-r from-[#8b5cf6] to-[#4f8cff] hover:brightness-110 ' +
    'shadow-[0_12px_28px_-16px_rgba(139,92,246,0.95)] active:brightness-95',
  secondary: 'bg-card2 border border-line text-tx hover:border-[#2e3854] hover:bg-[#151c30]',
  ghost: 'text-mu hover:text-tx hover:bg-line/50',
  danger: 'border border-bad/40 text-bad bg-bad-bg hover:bg-[#33161f]',
  success: 'bg-good text-[#04211a] hover:brightness-110',
  outline: 'border border-line text-tx hover:border-ac hover:text-ac',
}

const btnSizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5',
  lg: 'px-5 py-3 text-[15px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export const inputClass =
  'w-full bg-app border border-line rounded-xl px-3.5 py-2.5 text-sm text-tx ' +
  'placeholder:text-mu outline-none transition-colors focus:border-ac/70 ' +
  'focus:ring-2 focus:ring-ac/20'

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.12em] text-mu">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-[11px] text-mu mt-1 block">{hint}</span>}
    </label>
  )
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex gap-1 p-1 rounded-xl bg-card border border-line ${className}`}>
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              on ? 'bg-ac-bg text-ac shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]' : 'text-mu hover:text-tx'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className={`ml-1.5 ${on ? 'text-ac/80' : 'text-mu/70'}`}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Data display ---------- */

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-mu mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function StatTile({ label, value, delta, tone = 'default', icon: Icon, hint }) {
  const tones = {
    default: 'text-tx',
    bad: 'text-bad',
    good: 'text-good',
    warn: 'text-warn',
    ac: 'text-ac',
  }
  return (
    <Card hover className="topline relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-mu">{label}</p>
        {Icon && (
          <span className="w-8 h-8 rounded-lg grid place-items-center bg-ac-bg text-ac ring-1 ring-inset ring-ac/25">
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className={`text-[26px] leading-none font-semibold mt-3 num ${tones[tone]}`}>{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {delta && (
          <span
            className={`text-[11px] font-medium ${
              delta.startsWith('-') ? 'text-bad' : 'text-good'
            }`}
          >
            {delta}
          </span>
        )}
        {hint && <p className="text-[11px] text-mu">{hint}</p>}
      </div>
    </Card>
  )
}

export function RiskBar({ score, className = '' }) {
  const tone = score >= 70 ? 'bg-bad' : score >= 40 ? 'bg-warn' : 'bg-good'
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 w-16 rounded-full bg-line overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-xs num text-mu">{score}</span>
    </div>
  )
}

export function ProgressBar({ value, tone = 'ac', className = '' }) {
  const bar = { ac: 'bg-ac', good: 'bg-good', bad: 'bg-bad', warn: 'bg-warn', cyan: 'bg-cyan' }[tone]
  return (
    <div className={`h-1.5 rounded-full bg-line overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${bar}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function money(n) {
  return (
    '$' +
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

export function moneyShort(n) {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(1) + 'k'
  return '$' + v.toFixed(0)
}

/* ---------- Overlays ---------- */

export function Modal({ open, onClose, title, children, footer, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${width} surface border border-line rounded-2xl p-5 page-enter shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)]`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-mu hover:text-tx">
            <X size={16} />
          </button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2 mt-5">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
            tone === 'danger' ? 'bg-bad-bg text-bad' : 'bg-ac-bg text-ac'
          }`}
        >
          <AlertTriangle size={16} />
        </span>
        <p className="text-sm text-tx2 leading-relaxed">{message}</p>
      </div>
    </Modal>
  )
}

export function SuccessNote({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-good">
      <CheckCircle2 size={13} /> {children}
    </p>
  )
}

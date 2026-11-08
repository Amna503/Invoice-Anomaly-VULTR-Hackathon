import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-line border-t-ac spin ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}

export function Loading({ text = 'Loading…' }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 py-16 text-mu text-sm"
      role="status"
      aria-live="polite"
    >
      <Spinner size={16} />
      {text}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="bg-bad-bg border border-bad/30 rounded-2xl p-4 text-sm text-bad flex items-start gap-3"
    >
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-xs opacity-80 mt-0.5">{error?.message || 'Please try again.'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-bad/15 hover:bg-bad/25 transition-colors"
          >
            <RefreshCw size={12} /> Try again
          </button>
        )}
      </div>
    </div>
  )
}

export function Empty({ text = 'Nothing here yet', hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 px-6 text-center">
      <span className="w-12 h-12 rounded-2xl grid place-items-center bg-card2 border border-line text-mu">
        <Inbox size={22} />
      </span>
      <p className="text-sm text-tx2 font-medium">{text}</p>
      {hint && <p className="text-xs text-mu max-w-sm">{hint}</p>}
      {action}
    </div>
  )
}

/** Block of shimmer lines — used while a page's first load is pending */
export function SkeletonRows({ rows = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-2.5 w-1/2" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface border border-line rounded-2xl p-4">
          <div className="skeleton h-2.5 w-24" />
          <div className="skeleton h-7 w-20 mt-4" />
          <div className="skeleton h-2.5 w-16 mt-3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`surface border border-line rounded-2xl p-4 ${className}`} aria-hidden="true">
      <div className="skeleton h-2.5 w-32" />
      <div className="flex items-end gap-2 h-40 mt-5">
        {[45, 70, 35, 85, 60, 95, 55, 75].map((h, i) => (
          <div key={i} className="skeleton flex-1 rounded-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

import { AlertTriangle, Inbox } from 'lucide-react'

export function Loading({ text = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-mu text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-line border-t-ac animate-spin" />
      {text}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="bg-bad-bg border border-bad/30 rounded-2xl p-4 text-sm text-bad flex items-start gap-3">
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-xs opacity-80">{error?.message || 'Please try again.'}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-xs underline">Try again</button>
        )}
      </div>
    </div>
  )
}

export function Empty({ text = 'Nothing here yet' }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-mu text-sm">
      <Inbox size={28} />
      {text}
    </div>
  )
}
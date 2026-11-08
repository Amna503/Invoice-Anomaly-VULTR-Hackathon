import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const styles = {
  success: { icon: CheckCircle2, cls: 'text-good border-good/30 bg-good-bg' },
  error: { icon: AlertTriangle, cls: 'text-bad border-bad/30 bg-bad-bg' },
  info: { icon: Info, cls: 'text-info border-info/30 bg-info/10' },
}

/**
 * Global toast notifications.
 * Usage: const toast = useToast(); toast.success('Saved');
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, tone = 'info', ms = 3800) => {
      const id = Date.now() + Math.random()
      setToasts((list) => [...list, { id, message, tone }])
      if (ms) setTimeout(() => dismiss(id), ms)
      return id
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (m, ms) => push(m, 'success', ms),
      error: (m, ms) => push(m, 'error', ms),
      info: (m, ms) => push(m, 'info', ms),
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[60] bottom-20 md:bottom-5 right-4 flex flex-col gap-2 w-[min(92vw,340px)]"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const { icon: Icon, cls } = styles[t.tone] || styles.info
          return (
            <div
              key={t.id}
              className={`page-enter flex items-start gap-2.5 border rounded-xl px-3.5 py-3 text-sm shadow-[0_24px_50px_-30px_rgba(0,0,0,0.95)] ${cls}`}
            >
              <Icon size={15} className="shrink-0 mt-0.5" />
              <p className="flex-1 text-tx2 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-mu hover:text-tx shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

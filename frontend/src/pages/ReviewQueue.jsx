import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, Send, RotateCcw, Sparkles, ShieldAlert, Inbox } from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import {
  Card, CardHeader, Pill, RoutePill, SeverityPill, Button, ConfirmDialog, RiskBar, money,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { Loading, ErrorBox, Empty } from '../components/State'
import { flagAction } from '../lib/flagMeta'

const INPUT =
  'w-full bg-app border border-line rounded-xl px-3 py-2.5 text-xs ' +
  'text-tx outline-none focus:border-ac/60 focus:ring-2 focus:ring-ac/15 transition-all'

const DONE_TEXT = {
  approve: 'approved.',
  reject: 'blocked.',
  query: 'query sent — email moved to outbox.',
}

export default function ReviewQueue() {
  const { data, loading, error, reload } = useAsync(async () => {
    const all = await api.getInvoices()
    return all.filter((i) => i.route !== 'cleared' && i.decision === 'pending')
  }, [])

  const [selectedId, setSelectedId] = useState(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const toast = useToast()

  const queue = data || []
  const current = queue.find((i) => i.id === selectedId) || queue[0] || null
  const currentId = current ? current.id : null

  // Full detail (flags + email draft) for the selected invoice
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    reload: reloadDetail,
  } = useAsync(
    () => (currentId ? api.getInvoice(currentId) : Promise.resolve(null)),
    [currentId]
  )

  const savedSubject = detail?.email?.subject ?? ''
  const savedBody = detail?.email?.body ?? ''
  const edited = detail?.email ? subject !== savedSubject || body !== savedBody : false

  // Load the saved email into the editor when the invoice changes
  useEffect(() => {
    setSubject(savedSubject)
    setBody(savedBody)
  }, [currentId, savedSubject, savedBody])

  async function act(kind) {
    if (!detail || busy) return
    setBusy(true)
    try {
      if (kind === 'query' && detail.email) {
        await api.updateEmail(detail.id, { subject, body })
        await api.approveEmail(detail.id)
      }
      await api.decideInvoice(detail.id, kind)
      toast.success(`${detail.id} ${DONE_TEXT[kind]}`)
      await Promise.all([reload(), reloadDetail()])
    } catch (e) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  // Keyboard shortcuts: A approve, R reject, Q send query
  useEffect(() => {
    function onKey(e) {
      if (confirm) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'a') act('approve')
      if (key === 'r') setConfirm('reject')
      if (key === 'q') setConfirm('query')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const header = (
    <CardHeader
      title="AI review queue"
      sub="Flagged invoices waiting for a human decision. The draft email is editable."
      icon={ShieldAlert}
      right={
        data && (
          <span className="text-[11px] text-mu num">{queue.length} waiting</span>
        )
      }
    />
  )

  if (loading && !data) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  return (
    <>
      {header}

      {!current ? (
        <Card>
          <Empty
            text="All caught up"
            hint="No flagged invoices are waiting for your decision."
            action={
              <Link to="/invoices" className="text-xs text-ac hover:underline mt-1">
                Browse all invoices
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Waiting invoices */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
            {queue.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs border transition-colors ${
                  i.id === currentId
                    ? 'bg-ac-bg text-ac border-ac/50 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
                    : 'border-line text-mu hover:text-tx hover:border-[#2e3854]'
                }`}
              >
                <span className="font-mono">{i.id}</span>
                <span className="ml-1.5 opacity-70">{i.vendor.split(' ')[0]}</span>
                <span className="ml-2 num opacity-70">{money(i.total)}</span>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-3 items-start">
            {/* Left: why it was flagged */}
            <Card>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <p className="text-sm font-mono">{current.id}</p>
                  <RoutePill route={current.route} />
                  <RiskBar score={current.risk} className="hidden sm:flex" />
                </div>
                <Link to={`/invoices/${current.id}`} className="text-xs text-ac hover:underline shrink-0">
                  Full details →
                </Link>
              </div>

              {detailLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-20 rounded-xl" />
                  <div className="skeleton h-20 rounded-xl" />
                </div>
              ) : detailError ? (
                <ErrorBox error={detailError} onRetry={reloadDetail} />
              ) : !detail || detail.flags.length === 0 ? (
                <Empty text="No flags on this invoice" />
              ) : (
                <div className="space-y-2.5">
                  {detail.flags.map((f) => (
                    <div key={f.type + f.title} className="bg-app border border-line rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <SeverityPill severity={f.severity} />
                        <p className="text-xs font-medium">{f.title}</p>
                      </div>
                      <p className="text-xs text-mu leading-relaxed flex gap-1.5">
                        <Sparkles size={12} className="text-ac shrink-0 mt-0.5" />
                        {f.explanation}
                      </p>
                      <p className="text-[11px] text-warn/90 mt-2 flex gap-1.5">
                        <Inbox size={11} className="shrink-0 mt-0.5" />
                        {flagAction(f.type)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Right: email draft + decision */}
            <div className="space-y-3">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Email draft</p>
                  <div className="flex gap-1.5">
                    {edited && <Pill tone="warn">Edited</Pill>}
                    <Pill tone={detail?.email?.status === 'outbox' ? 'good' : 'agent'}>
                      {detail?.email?.status === 'outbox' ? 'In outbox' : 'Draft'}
                    </Pill>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="space-y-2">
                    <div className="skeleton h-8 rounded-lg" />
                    <div className="skeleton h-32 rounded-lg" />
                  </div>
                ) : detail?.email ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-mu mb-1.5">Subject</p>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={INPUT}
                        aria-label="Email subject"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-mu mb-1.5">Body</p>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={8}
                        className={INPUT}
                        aria-label="Email body"
                      />
                    </div>
                    <button
                      disabled={!edited}
                      onClick={() => {
                        setSubject(savedSubject)
                        setBody(savedBody)
                      }}
                      className="flex items-center gap-1.5 text-xs text-mu hover:text-tx disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw size={13} /> Revert my changes
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-mu">No email draft for this invoice.</p>
                )}
              </Card>

              <Card>
                <p className="text-[11px] uppercase tracking-[0.14em] text-mu mb-3">Your decision</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="success" disabled={busy} onClick={() => act('approve')} className="w-full">
                    <Check size={15} /> Approve
                  </Button>
                  <Button variant="danger" disabled={busy} onClick={() => setConfirm('reject')} className="w-full">
                    <X size={15} /> Block
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => setConfirm('query')} className="w-full">
                    <Send size={15} /> Query
                  </Button>
                </div>
                <p className="text-[11px] text-mu mt-3 leading-relaxed hidden md:block">
                  Shortcuts: <span className="font-mono text-tx2">A</span> approve ·{' '}
                  <span className="font-mono text-tx2">R</span> block ·{' '}
                  <span className="font-mono text-tx2">Q</span> send query. Query saves your email
                  edits and moves the draft to the outbox.
                </p>
              </Card>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm === 'reject'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('reject')}
        busy={busy}
        title="Block this invoice?"
        message={`${current?.id} will be marked as rejected by a reviewer and written to the audit log.`}
        confirmLabel="Block invoice"
      />
      <ConfirmDialog
        open={confirm === 'query'}
        onClose={() => setConfirm(null)}
        onConfirm={() => act('query')}
        busy={busy}
        tone="info"
        title="Send query to supplier?"
        message="Your email edits are saved and the draft moves to the outbox. The invoice stays in review until the supplier replies."
        confirmLabel="Send query"
      />
    </>
  )
}

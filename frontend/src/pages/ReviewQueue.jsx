import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, Send, RotateCcw, Sparkles } from 'lucide-react'
import * as api from '../lib/mockApi'
import { useAsync } from '../lib/useAsync'
import { Card, Pill, RoutePill, SeverityPill, PageHeader } from '../components/ui'
import { Loading, ErrorBox, Empty } from '../components/State'

const BTN =
  'flex items-center justify-center gap-1.5 py-2.5 rounded-xl ' +
  'text-sm font-medium disabled:opacity-50'
const BTN_OK = 'bg-good text-[#06241c]'
const BTN_NO = 'border border-bad text-bad'
const BTN_PLAIN = 'border border-line'

const INPUT =
  'w-full bg-app border border-line rounded-xl px-3 py-2 text-xs ' +
  'text-tx outline-none focus:border-ac'
const LABEL = 'text-[11px] text-mu mb-1'
const CHIP = 'shrink-0 px-3 py-1.5 rounded-xl text-xs border'
const CHIP_ON = 'bg-ac-bg text-ac border-ac'
const CHIP_OFF = 'border-line text-mu hover:text-tx'

const DONE_TEXT = {
  approve: 'Invoice approved.',
  reject: 'Invoice rejected.',
  query: 'Query sent. Email moved to outbox.',
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
  const [msg, setMsg] = useState(null)

  const queue = data || []
  const current = queue.find((i) => i.id === selectedId) || queue[0] || null
  const currentId = current ? current.id : null
  const savedSubject = current?.email?.subject ?? ''
  const savedBody = current?.email?.body ?? ''
  const edited = subject !== savedSubject || body !== savedBody

  // Load the saved email into the editor when the invoice changes
  useEffect(() => {
    setSubject(savedSubject)
    setBody(savedBody)
  }, [currentId, savedSubject, savedBody])

  async function act(kind) {
    if (!current || busy) return
    setBusy(true)
    setMsg(null)
    try {
      if (kind === 'query' && current.email) {
        await api.updateEmail(current.id, { subject, body })
        await api.approveEmail(current.id)
      }
      await api.decideInvoice(current.id, kind)
      setMsg({ tone: 'good', text: `${current.id}: ${DONE_TEXT[kind]}` })
      await reload()
    } catch (e) {
      setMsg({ tone: 'bad', text: e.message || 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  // Keyboard shortcuts: A approve, R reject, Q send query
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'a') act('approve')
      if (key === 'r') act('reject')
      if (key === 'q') act('query')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const header = (
    <PageHeader
      title="Review queue"
      subtitle="Flagged invoices waiting for your decision"
      right={
        data && (
          <span className="text-xs text-mu mt-1">{queue.length} waiting</span>
        )
      }
    />
  )

  if (loading && !data) return <>{header}<Loading /></>
  if (error) return <>{header}<ErrorBox error={error} onRetry={reload} /></>

  return (
    <>
      {header}

      {msg && (
        <p
          className={`text-xs mb-3 ${
            msg.tone === 'good' ? 'text-good' : 'text-bad'
          }`}
        >
          {msg.text}
        </p>
      )}

      {!current ? (
        <Card>
          <Empty text="All caught up. No invoices are waiting." />
        </Card>
      ) : (
        <>
          {/* Waiting invoices */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {queue.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className={`${CHIP} ${i.id === currentId ? CHIP_ON : CHIP_OFF}`}
              >
                <span className="font-mono">{i.id}</span>
                <span className="ml-1.5 opacity-70">{i.vendor.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-3 items-start">
            {/* Left: why it was flagged */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-mono">{current.id}</p>
                <div className="flex items-center gap-2">
                  <RoutePill route={current.route} />
                  <Link
                    to={`/invoices/${current.id}`}
                    className="text-xs text-ac"
                  >
                    Full details →
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                {current.flags.map((f) => (
                  <div
                    key={f.type}
                    className="bg-app border border-line rounded-xl p-2.5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityPill severity={f.severity} />
                      <p className="text-xs font-medium">{f.title}</p>
                    </div>
                    <p className="text-xs text-mu flex gap-1.5">
                      <Sparkles size={12} className="text-ac shrink-0 mt-0.5" />
                      {f.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right: email draft + decision */}
            <div className="space-y-3">
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-mu">Email draft</p>
                  <div className="flex gap-1.5">
                    {edited && <Pill tone="warn">Edited</Pill>}
                    <Pill tone="agent">Draft</Pill>
                  </div>
                </div>

                {current.email ? (
                  <div className="space-y-2.5">
                    <div>
                      <p className={LABEL}>Subject</p>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <p className={LABEL}>Body</p>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={7}
                        className={INPUT}
                      />
                    </div>
                    <button
                      disabled={!edited}
                      onClick={() => {
                        setSubject(savedSubject)
                        setBody(savedBody)
                      }}
                      className="flex items-center gap-1.5 text-xs text-mu
                        hover:text-tx disabled:opacity-40"
                    >
                      <RotateCcw size={13} /> Revert my changes
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-mu">
                    No email draft for this invoice.
                  </p>
                )}
              </Card>

              <Card>
                <p className={LABEL}>Your decision</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={busy}
                    onClick={() => act('approve')}
                    className={`${BTN} ${BTN_OK}`}
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act('reject')}
                    className={`${BTN} ${BTN_NO}`}
                  >
                    <X size={16} /> Reject
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act('query')}
                    className={`${BTN} ${BTN_PLAIN}`}
                  >
                    <Send size={16} /> Query
                  </button>
                </div>
                <p className="text-[11px] text-mu mt-2.5 hidden md:block">
                  Shortcuts: A approve · R reject · Q send query
                </p>
                <p className="text-[11px] text-mu mt-1">
                  Send query saves your email edits and moves it to the outbox.
                </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}
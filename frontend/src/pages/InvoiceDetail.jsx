import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, X, Send, Sparkles, ShieldAlert,
  Lightbulb, FileText, CircleCheck,
} from 'lucide-react'
import * as api from '../lib/api'
import { useAsync } from '../lib/useAsync'
import {
  Card, CardHeader, Pill, RoutePill, SeverityPill, Button, ConfirmDialog, money,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { Loading, ErrorBox } from '../components/State'
import { flagAction, flagField } from '../lib/flagMeta'

const DECISION_TEXT = {
  approved: ['good', 'Approved by reviewer'],
  rejected: ['bad', 'Blocked by reviewer'],
  queried: ['human', 'Query sent — email moved to outbox'],
}

/* ------------------------------ helpers ------------------------------ */

const prettyKey = (k) =>
  String(k)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())

function prettyVal(key, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') {
    const k = key.toLowerCase()
    if (/amount|total|price|threshold|difference|po/.test(k)) return money(value)
    return String(value)
  }
  return String(value)
}

function Evidence({ evidence }) {
  // Mock shape: { field, expected, found } — rendered as an expected vs found diff
  if (evidence && 'expected' in evidence && 'found' in evidence) {
    return (
      <div>
        <p className="text-[11px] text-mu mb-1.5">{evidence.field}</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
          <div className="bg-app border border-line rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-mu mb-0.5">Expected</p>
            <p className="font-mono break-words text-tx2">{evidence.expected}</p>
          </div>
          <ArrowRight size={14} className="text-mu shrink-0" />
          <div className="bg-bad-bg border border-bad/30 rounded-lg px-2.5 py-2 text-bad">
            <p className="text-[10px] opacity-80 mb-0.5">On this invoice</p>
            <p className="font-mono break-words">{evidence.found}</p>
          </div>
        </div>
      </div>
    )
  }

  // Backend shape: free-form evidence object — rendered as key/value pairs
  const entries = Object.entries(evidence || {})
  if (!entries.length) return null
  return (
    <div>
      <p className="text-[11px] text-mu mb-1.5">Evidence</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        {entries.map(([k, v]) => (
          <div key={k} className="bg-app border border-line rounded-lg px-2.5 py-2">
            <dt className="text-[10px] text-mu">{prettyKey(k)}</dt>
            <dd className="font-mono text-tx2 break-words mt-0.5">{prettyVal(k, v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ------------------------------ risk gauge ------------------------------ */

function RiskGauge({ score, route }) {
  const color = { block: '#fb7185', review: '#fbbf24', cleared: '#34d399' }[route] || '#8b5cf6'
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c
  return (
    <div className="relative w-[92px] h-[92px] shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e2537" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-xl font-semibold num leading-none" style={{ color }}>
            {score}
          </p>
          <p className="text-[9px] uppercase tracking-[0.12em] text-mu mt-1">risk</p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ flag card ------------------------------ */

function FlagCard({ flag }) {
  const action = flagAction(flag.type)
  return (
    <Card className="topline">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <SeverityPill severity={flag.severity} />
          <p className="text-sm font-medium truncate">{flag.title}</p>
        </div>
        {typeof flag.confidence === 'number' && (
          <span className="text-[11px] text-mu num shrink-0">
            {Math.round(flag.confidence * 100)}% confidence
          </span>
        )}
      </div>

      <Evidence evidence={flag.evidence} />

      <div className="mt-3 rounded-xl bg-ac-bg/70 border border-ac/20 px-3 py-2.5">
        <p className="text-[11px] font-medium text-ac flex items-center gap-1.5 mb-1">
          <Sparkles size={12} /> AI explanation
        </p>
        <p className="text-xs text-tx2 leading-relaxed">{flag.explanation}</p>
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-xl bg-warn-bg/60 border border-warn/20 px-3 py-2.5">
        <Lightbulb size={13} className="text-warn shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-medium text-warn">Recommended action</p>
          <p className="text-xs text-tx2 leading-relaxed mt-0.5">{action}</p>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------ page ------------------------------ */

export default function InvoiceDetail() {
  const { id } = useParams()
  const { data: inv, loading, error, reload } = useAsync(() => api.getInvoice(id), [id])
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [actionError, setActionError] = useState(null)
  const toast = useToast()

  const back = (
    <Link
      to="/invoices"
      className="inline-flex items-center gap-1.5 text-xs text-mu hover:text-tx mb-4 transition-colors"
    >
      <ArrowLeft size={14} /> All invoices
    </Link>
  )

  if (loading && !inv) return <>{back}<Loading text="Running agent analysis…" /></>
  if (error) return <>{back}<ErrorBox error={error} onRetry={reload} /></>

  const hotFields = new Set(inv.flags.map((f) => flagField(f.type)))
  const decided = inv.decision !== 'pending'
  const [decisionTone, decisionLabel] = DECISION_TEXT[inv.decision] || []

  async function decide(decision) {
    setBusy(true)
    setActionError(null)
    try {
      await api.decideInvoice(inv.id, decision)
      await reload()
      toast.success(
        decision === 'approve'
          ? `${inv.id} approved and released for payment.`
          : decision === 'reject'
            ? `${inv.id} blocked. It will not be paid.`
            : `${inv.id} — supplier query moved to the outbox.`
      )
    } catch (e) {
      const msg = e.message || 'Could not save the decision'
      setActionError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <>
      {back}

      {/* Header */}
      <Card className="topline mb-3">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <span className="w-11 h-11 rounded-xl grid place-items-center bg-ac-bg text-ac ring-1 ring-inset ring-ac/25 shrink-0">
              <FileText size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-semibold font-mono">{inv.id}</h1>
                <RoutePill route={inv.route} />
                {inv.processing && <Pill tone="info">Processing</Pill>}
              </div>
              <p className="text-xs text-mu mt-1 truncate">
                {inv.vendor} · {inv.date} · {inv.file || 'uploaded document'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xl font-semibold num">{money(inv.total)}</p>
              <p className="text-[11px] text-mu">Invoice total</p>
            </div>
            <RiskGauge score={inv.risk} route={inv.route} />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-3 items-start">
        {/* Left: what the agent read */}
        <div className="space-y-3">
          <Card>
            <CardHeader title="Extracted fields" sub="What the vision model read from the document" />
            <div className="grid sm:grid-cols-[1fr_1.15fr] gap-3">
              {/* Document preview */}
              <div className="bg-white rounded-lg p-3 text-[10px] leading-snug text-slate-500 min-h-40">
                <p className="font-semibold text-slate-700 uppercase">{inv.vendor}</p>
                <p>Invoice {inv.id}</p>
                <div className="my-2.5 space-y-1.5" aria-hidden="true">
                  <i className="block h-1 rounded bg-slate-200" />
                  <i className="block h-1 rounded bg-slate-200 w-4/5" />
                  <i className="block h-1 rounded bg-slate-200 w-3/5" />
                </div>
                <p className="font-semibold text-slate-700">Total {inv.total.toLocaleString('en-US')}</p>
                <p className="mt-3 text-slate-400 truncate">{inv.file}</p>
              </div>

              <div className="space-y-0.5">
                {[
                  ['Vendor', inv.vendor, 'vendor', false],
                  ['Invoice', inv.id, 'invoice', true],
                  ['Date', inv.date, null, false],
                  ['Bank', inv.bank === '—' ? '—' : '…' + inv.bank, 'bank', true],
                  ['Total', money(inv.total), 'total', true],
                ].map(([label, value, hot, mono]) => (
                  <div
                    key={label}
                    className={`flex justify-between gap-3 px-2.5 py-2 rounded-lg text-xs ${
                      hotFields.has(hot) ? 'bg-bad-bg text-bad' : ''
                    }`}
                  >
                    <span className={hotFields.has(hot) ? '' : 'text-mu'}>{label}</span>
                    <span className={mono ? 'font-mono' : ''}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Line items" sub={`${inv.lineItems.length} item${inv.lineItems.length === 1 ? '' : 's'} on this invoice`} />
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs min-w-[320px]">
                <thead>
                  <tr className="text-mu text-left">
                    <th className="font-normal pb-2">Item</th>
                    <th className="font-normal pb-2 text-right">Qty</th>
                    <th className="font-normal pb-2 text-right">Unit</th>
                    <th className="font-normal pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {inv.lineItems.map((li, i) => (
                    <tr key={li.name + i} className="border-t border-line">
                      <td className="py-2 font-sans text-tx2">{li.name}</td>
                      <td className="py-2 text-right num">{li.qty}</td>
                      <td className="py-2 text-right num">{li.unit}</td>
                      <td className="py-2 text-right num">{li.amount.toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line">
                    <td className="py-2 font-sans font-medium" colSpan={3}>
                      Total
                    </td>
                    <td className="py-2 text-right font-medium num">{money(inv.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: what the agent found, and what you decide */}
        <div className="space-y-3">
          {inv.flags.length === 0 ? (
            <Card className="bg-good-bg border-good/30">
              <div className="flex items-start gap-3">
                <CircleCheck size={18} className="text-good shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-good font-medium">No problems found</p>
                  <p className="text-xs text-good/80 mt-1">
                    All detection checks passed. This invoice was cleared automatically.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 px-1">
                <ShieldAlert size={14} className="text-bad" />
                <p className="text-[11px] uppercase tracking-[0.14em] text-mu">
                  {inv.flags.length} anomal{inv.flags.length === 1 ? 'y' : 'ies'} detected
                </p>
              </div>
              {inv.flags.map((f) => (
                <FlagCard key={f.type + f.title} flag={f} />
              ))}
            </>
          )}

          {inv.email && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Email draft</p>
                <Pill tone={inv.email.status === 'outbox' ? 'good' : 'agent'}>
                  {inv.email.status === 'outbox' ? 'In outbox' : 'Draft'}
                </Pill>
              </div>
              <div className="bg-app border border-line rounded-xl p-3 text-xs space-y-2">
                <p>
                  <span className="text-mu">Subject </span>
                  <span className="text-tx2">{inv.email.subject}</span>
                </p>
                <p className="whitespace-pre-line text-mu leading-relaxed">{inv.email.body}</p>
              </div>
              <Link to="/queue" className="text-xs text-ac mt-2.5 inline-flex items-center gap-1 hover:underline">
                Edit in review queue <ArrowRight size={12} />
              </Link>
            </Card>
          )}

          {/* Decision */}
          <Card>
            {decided ? (
              <div className="flex items-center gap-3">
                <Pill tone={decisionTone}>{decisionLabel}</Pill>
                <span className="text-xs text-mu">Recorded in the audit log</span>
              </div>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.14em] text-mu mb-3">Your decision</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="success"
                    disabled={busy}
                    onClick={() => decide('approve')}
                    className="w-full"
                  >
                    <Check size={15} /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => setConfirm('reject')}
                    className="w-full"
                  >
                    <X size={15} /> Block
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirm('query')}
                    className="w-full"
                  >
                    <Send size={15} /> Query
                  </Button>
                </div>
                <p className="text-[11px] text-mu mt-3 leading-relaxed">
                  Approve releases payment · Block stops payment · Query emails the supplier and
                  moves the invoice to review.
                </p>
                {actionError && <p className="text-xs text-bad mt-2">{actionError}</p>}
              </>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'reject'}
        onClose={() => setConfirm(null)}
        onConfirm={() => decide('reject')}
        busy={busy}
        title="Block this invoice?"
        message={`${inv.id} from ${inv.vendor} (${money(
          inv.total
        )}) will be stopped and marked as rejected by a reviewer. This decision is written to the audit log.`}
        confirmLabel="Block invoice"
      />
      <ConfirmDialog
        open={confirm === 'query'}
        onClose={() => setConfirm(null)}
        onConfirm={() => decide('query')}
        busy={busy}
        tone="info"
        title="Send query to supplier?"
        message={`An email about ${inv.id} will be moved to the outbox and the invoice stays in review until the supplier replies.`}
        confirmLabel="Send query"
      />
    </>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X, Send, Sparkles } from 'lucide-react'
import * as api from '../lib/mockApi'
import { useAsync } from '../lib/useAsync'
import { Card, Pill, RoutePill, SeverityPill, money } from '../components/ui'
import { Loading, ErrorBox } from '../components/State'

// Class names kept in short pieces so nothing breaks while pasting
const BTN =
  'flex items-center justify-center gap-1.5 py-2.5 rounded-xl ' +
  'text-sm font-medium disabled:opacity-50'
const BTN_OK = 'bg-good text-[#06241c]'
const BTN_NO = 'border border-bad text-bad'
const BTN_PLAIN = 'border border-line'

const PAPER =
  'bg-white rounded-lg p-3 text-[10px] leading-snug ' +
  'text-slate-500 min-h-40'

const BOX = 'bg-app border border-line rounded-lg px-2.5 py-1.5'
const BOX_BAD =
  'bg-bad-bg border border-bad/30 rounded-lg px-2.5 py-1.5 text-bad'
const AI_BOX = 'bg-ac-bg rounded-xl px-3 py-2 mt-3 text-xs'
const AI_TITLE = 'text-ac font-medium flex items-center gap-1 mb-0.5'
const LABEL = 'text-[11px] text-mu mb-2'

// Which field on the left gets highlighted for each flag type
const FLAG_FIELD = {
  duplicate: 'invoice',
  bank_changed: 'bank',
  over_po: 'total',
  math_error: 'total',
  price_outlier: 'total',
  unknown_vendor: 'vendor',
  no_po: 'total',
}

const DECISION_TEXT = {
  approved: ['good', 'Approved by reviewer'],
  rejected: ['bad', 'Rejected by reviewer'],
  queried: ['human', 'Query sent. Email moved to outbox'],
}

function Field({ label, value, hot, mono }) {
  const row = 'flex justify-between gap-3 px-2 py-1.5 rounded-lg text-xs'
  return (
    <div className={hot ? `${row} bg-bad-bg text-bad` : row}>
      <span className={hot ? '' : 'text-mu'}>{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  )
}

// A simple fake paper that stands in for the real PDF preview
function PdfPreview({ inv }) {
  return (
    <div className={PAPER}>
      <p className="font-semibold text-slate-700 uppercase">{inv.vendor}</p>
      <p>Invoice {inv.id}</p>
      <div className="my-2 space-y-1">
        <i className="block h-1 rounded bg-slate-200" />
        <i className="block h-1 rounded bg-slate-200 w-4/5" />
        <i className="block h-1 rounded bg-slate-200 w-3/5" />
      </div>
      <p className="font-semibold text-slate-700">
        Total {inv.total.toLocaleString('en-US')}
      </p>
      <p className="mt-2 text-slate-400">{inv.file}</p>
    </div>
  )
}

function FlagCard({ flag }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <SeverityPill severity={flag.severity} />
        <p className="text-sm font-medium">{flag.title}</p>
      </div>

      <p className="text-[11px] text-mu mb-1">{flag.evidence.field}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className={BOX}>
          <p className="text-[10px] text-mu">Expected</p>
          <p className="font-mono break-words">{flag.evidence.expected}</p>
        </div>
        <ArrowRight size={14} className="text-mu" />
        <div className={BOX_BAD}>
          <p className="text-[10px] opacity-80">On this invoice</p>
          <p className="font-mono break-words">{flag.evidence.found}</p>
        </div>
      </div>

      <div className={AI_BOX}>
        <p className={AI_TITLE}>
          <Sparkles size={12} /> AI explanation
        </p>
        <p>{flag.explanation}</p>
      </div>
    </Card>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const { data: inv, loading, error, reload } = useAsync(
    () => api.getInvoice(id),
    [id]
  )
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const back = (
    <Link
      to="/invoices"
      className="inline-flex items-center gap-1 text-xs text-mu mb-3"
    >
      <ArrowLeft size={14} /> All invoices
    </Link>
  )

  if (loading && !inv) {
    return <>{back}<Loading text="Loading invoice…" /></>
  }
  if (error) {
    return <>{back}<ErrorBox error={error} onRetry={reload} /></>
  }

  const hotFields = new Set(inv.flags.map((f) => FLAG_FIELD[f.type]))
  const decided = inv.decision !== 'pending'
  const [decisionTone, decisionLabel] = DECISION_TEXT[inv.decision] || []

  async function decide(decision) {
    setBusy(true)
    setActionError(null)
    try {
      await api.decideInvoice(inv.id, decision)
      await reload()
    } catch (e) {
      setActionError(e.message || 'Could not save the decision')
    } finally {
      setBusy(false)
    }
  }

  const scoreColor = {
    block: 'text-bad',
    review: 'text-warn',
    cleared: 'text-good',
  }[inv.route]

  return (
    <>
      {back}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium font-mono">{inv.id}</h1>
          <RoutePill route={inv.route} />
        </div>
        <div className="text-right">
          <p className={`text-2xl font-medium leading-none ${scoreColor}`}>
            {inv.risk}
          </p>
          <p className="text-[11px] text-mu">Risk score</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {/* Left: what the agent read */}
        <div className="space-y-3">
          <Card>
            <p className={LABEL}>Extracted fields</p>
            <div className="grid sm:grid-cols-[1fr_1.2fr] gap-3">
              <PdfPreview inv={inv} />
              <div className="space-y-0.5">
                <Field
                  label="Vendor"
                  value={inv.vendor}
                  hot={hotFields.has('vendor')}
                />
                <Field
                  label="Invoice"
                  value={inv.id}
                  hot={hotFields.has('invoice')}
                  mono
                />
                <Field label="Date" value={inv.date} />
                <Field
                  label="Bank"
                  value={'…' + inv.bank}
                  hot={hotFields.has('bank')}
                  mono
                />
                <Field
                  label="Total"
                  value={money(inv.total)}
                  hot={hotFields.has('total')}
                  mono
                />
              </div>
            </div>
          </Card>

          <Card>
            <p className={LABEL}>Line items</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[320px]">
                <thead>
                  <tr className="text-mu text-left">
                    <th className="font-normal pb-1">Item</th>
                    <th className="font-normal pb-1 text-right">Qty</th>
                    <th className="font-normal pb-1 text-right">Unit</th>
                    <th className="font-normal pb-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {inv.lineItems.map((li) => (
                    <tr key={li.name} className="border-t border-line">
                      <td className="py-1.5 font-sans">{li.name}</td>
                      <td className="py-1.5 text-right">{li.qty}</td>
                      <td className="py-1.5 text-right">{li.unit}</td>
                      <td className="py-1.5 text-right">
                        {li.amount.toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: what the agent found, and what you decide */}
        <div className="space-y-3">
          {inv.flags.length === 0 ? (
            <Card className="bg-good-bg border-good/30">
              <p className="text-sm text-good font-medium">
                No problems found
              </p>
              <p className="text-xs text-good/80 mt-0.5">
                All 7 checks passed. This invoice was cleared automatically.
              </p>
            </Card>
          ) : (
            inv.flags.map((f) => <FlagCard key={f.type} flag={f} />)
          )}

          {inv.email && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-mu">Email draft</p>
                <Pill tone={inv.email.status === 'outbox' ? 'good' : 'agent'}>
                  {inv.email.status === 'outbox' ? 'In outbox' : 'Draft'}
                </Pill>
              </div>
              <div className="bg-app border border-line rounded-xl p-3 text-xs space-y-1.5">
                <p>
                  <span className="text-mu">Subject </span>
                  {inv.email.subject}
                </p>
                <p className="whitespace-pre-line text-mu">{inv.email.body}</p>
              </div>
              <Link to="/queue" className="text-xs text-ac mt-2 inline-block">
                Edit in review queue →
              </Link>
            </Card>
          )}

          {/* Decision */}
          <Card>
            {decided ? (
              <div className="flex items-center gap-2 text-sm">
                <Pill tone={decisionTone}>{decisionLabel}</Pill>
                <span className="text-xs text-mu">Saved in the audit log</span>
              </div>
            ) : (
              <>
                <p className={LABEL}>Your decision</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={busy}
                    onClick={() => decide('approve')}
                    className={`${BTN} ${BTN_OK}`}
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide('reject')}
                    className={`${BTN} ${BTN_NO}`}
                  >
                    <X size={16} /> Reject
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide('query')}
                    className={`${BTN} ${BTN_PLAIN}`}
                  >
                    <Send size={16} /> Query
                  </button>
                </div>
                {actionError && (
                  <p className="text-xs text-bad mt-2">{actionError}</p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud, FileText, FileSpreadsheet, X, CheckCircle2, AlertTriangle,
  ArrowRight, Sparkles,
} from 'lucide-react'
import * as api from '../lib/api'
import {
  Card, CardHeader, Pill, RoutePill, Button, ConfirmDialog, ProgressBar,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { Empty } from '../components/State'

const STEPS = ['Ingest', 'Extract', 'Check', 'Score', 'Explain', 'Draft']
const OK_TYPES = ['pdf', 'csv']
const MAX_MB = 10
const MAX_FILES = 10

// Fake result, only for the mock demo. The real API will decide this.
function fakeResult(name) {
  const n = name.toLowerCase()
  if (n.includes('204')) return { route: 'block', note: 'Duplicate found.' }
  if (['311', '327', '341'].some((x) => n.includes(x))) return { route: 'review', note: 'Needs review.' }
  return { route: 'cleared', note: 'No problems found.' }
}

// Moves one file through the 6 steps, one step every 0.7 seconds
function runFile(id, name, update) {
  let step = 0
  update(id, { status: 'running', step: 0 })
  const timer = setInterval(() => {
    step += 1
    if (step >= STEPS.length) {
      clearInterval(timer)
      update(id, { status: 'done', step: STEPS.length, ...fakeResult(name) })
    } else {
      update(id, { step })
    }
  }, 700)
}

const fmtSize = (bytes) =>
  bytes >= 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB'

function PipelineExplainer() {
  return (
    <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="surface border border-line rounded-xl px-3 py-3">
          <p className="text-[10px] font-mono text-ac">0{i + 1}</p>
          <p className="text-xs font-medium mt-1">{s}</p>
          <p className="text-[10px] text-mu mt-0.5 leading-snug">
            {['File lands', 'Vision reads', '7 checks', '0–100 score', 'Why it fired', 'Email draft'][i]}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Upload() {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const inputRef = useRef(null)
  const toast = useToast()

  const update = (id, patch) =>
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  async function addFiles(fileList) {
    const picked = Array.from(fileList)
    if (!picked.length) return
    if (files.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files per batch.`)
      return
    }

    const room = MAX_FILES - files.length
    const items = picked.slice(0, room).map((file, i) => {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      const tooBig = file.size > MAX_MB * 1024 * 1024
      const ok = OK_TYPES.includes(ext) && !tooBig
      return {
        id: Date.now() + '-' + i,
        name: file.name,
        size: file.size,
        ext,
        file,
        step: 0,
        status: ok ? 'queued' : 'error',
        error: !OK_TYPES.includes(ext)
          ? 'Only PDF or CSV files are supported'
          : tooBig
            ? `Larger than the ${MAX_MB} MB limit`
            : null,
      }
    })
    setFiles((list) => [...items, ...list])

    if (picked.length > room) toast.info(`Only ${room} file(s) fit in this batch.`)

    const valid = items.filter((i) => i.status === 'queued')
    if (!valid.length) {
      toast.error('No supported files in that selection.')
      return
    }

    try {
      await api.uploadInvoices(valid.map((v) => v.file))
    } catch (e) {
      valid.forEach((v) => update(v.id, { status: 'error', error: e.message || 'Upload failed. Please try again.' }))
      toast.error('Upload failed. Please try again.')
      return
    }
    toast.success(`${valid.length} file${valid.length === 1 ? '' : 's'} queued for analysis.`)
    valid.forEach((v, i) => setTimeout(() => runFile(v.id, v.name, update), i * 400))
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const stats = useMemo(() => {
    const done = files.filter((f) => f.status === 'done')
    const failed = files.filter((f) => f.status === 'error')
    const stepSum = files.reduce(
      (n, f) => n + (f.status === 'done' ? STEPS.length : f.status === 'error' ? 0 : f.step),
      0
    )
    const total = files.filter((f) => f.status !== 'error').length * STEPS.length
    return {
      done,
      failed,
      running: files.some((f) => f.status === 'running' || f.status === 'queued'),
      progress: total ? Math.round((stepSum / total) * 100) : 0,
      byRoute: {
        block: done.filter((f) => f.route === 'block').length,
        review: done.filter((f) => f.route === 'review').length,
        cleared: done.filter((f) => f.route === 'cleared').length,
      },
    }
  }, [files])

  const anyDone = stats.done.length > 0

  return (
    <>
      <CardHeader
        title="Upload invoices"
        sub="Drop PDFs or CSVs and watch the agent run all six pipeline stages."
        icon={Sparkles}
        right={
          <span className="text-[11px] text-mu num">
            {files.length}/{MAX_FILES} files
          </span>
        }
      />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3 items-start">
        {/* Dropzone */}
        <div>
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`w-full rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-all duration-200 ${
              dragging
                ? 'border-ac bg-ac/10 scale-[1.005]'
                : 'border-ac/45 bg-ac-bg/70 hover:border-ac hover:bg-ac-bg'
            }`}
          >
            <span
              className={`w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-3 bg-gradient-to-br from-[#8b5cf6] to-[#4f8cff] shadow-[0_14px_30px_-16px_rgba(139,92,246,0.9)] ${
                dragging ? 'scale-110' : ''
              } transition-transform`}
            >
              <UploadCloud size={22} className="text-white" />
            </span>
            <p className="text-sm font-medium">
              Drop invoices here, or <span className="text-ac underline underline-offset-2">browse files</span>
            </p>
            <p className="text-xs text-mu mt-1.5">
              Up to {MAX_FILES} files · {MAX_MB} MB each · PDF or CSV
            </p>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.csv"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />

          <div className="flex flex-wrap gap-2 mt-3">
            <Pill tone="agent">PDF</Pill>
            <Pill tone="cyan">CSV</Pill>
            <Pill tone="muted">Magic-byte verified</Pill>
            <Pill tone="muted">Max {MAX_FILES} per batch</Pill>
          </div>

          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu mb-2">
              What happens after upload
            </p>
            <PipelineExplainer />
          </div>
        </div>

        {/* Live progress / results */}
        <Card className="lg:sticky lg:top-20">
          <CardHeader
            title="Processing"
            sub={
              files.length === 0
                ? 'No files in this batch yet'
                : stats.running
                  ? 'The agent is working through the pipeline'
                  : 'Batch finished'
            }
            icon={Sparkles}
            right={
              files.length > 0 ? (
                <span className="text-[11px] num text-mu">{stats.progress}%</span>
              ) : null
            }
          />

          {files.length === 0 ? (
            <Empty
              text="Your batch is empty"
              hint="Add files on the left. Each one runs through ingest → extract → check → score → explain → draft."
            />
          ) : (
            <>
              <ProgressBar
                value={stats.progress}
                tone={stats.progress === 100 ? 'good' : 'ac'}
                className="mb-3"
              />

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  ['Done', stats.done.length, 'text-good'],
                  ['Running', files.filter((f) => f.status === 'running' || f.status === 'queued').length, 'text-ac'],
                  ['Failed', stats.failed.length, 'text-bad'],
                ].map(([label, value, cls]) => (
                  <div key={label} className="rounded-xl bg-app border border-line px-3 py-2">
                    <p className={`text-lg font-semibold num ${cls}`}>{value}</p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-mu">{label}</p>
                  </div>
                ))}
              </div>

              {anyDone && (
                <div className="flex items-center justify-between rounded-xl bg-app border border-line px-3 py-2.5 mb-3">
                  <div className="flex gap-3 text-[11px]">
                    <span className="text-good num">✓ {stats.byRoute.cleared} cleared</span>
                    <span className="text-warn num">! {stats.byRoute.review} review</span>
                    <span className="text-bad num">✕ {stats.byRoute.block} blocked</span>
                  </div>
                  <Link to="/invoices" className="text-[11px] text-ac hover:underline">
                    View all
                  </Link>
                </div>
              )}

              <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                {files.map((f) => (
                  <div key={f.id} className="rounded-xl border border-line bg-app px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                          f.status === 'error'
                            ? 'bg-bad-bg text-bad'
                            : f.status === 'done'
                              ? 'bg-good-bg text-good'
                              : 'bg-ac-bg text-ac'
                        }`}
                      >
                        {f.ext === 'csv' ? <FileSpreadsheet size={15} /> : <FileText size={15} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate">{f.name}</p>
                        <p className="text-[10px] text-mu">{fmtSize(f.size)}</p>
                      </div>
                      {f.status === 'queued' && <Pill>Queued</Pill>}
                      {f.status === 'running' && <Pill tone="agent">Checking…</Pill>}
                      {f.status === 'done' && <RoutePill route={f.route} />}
                      {f.status === 'error' && <Pill tone="bad">Failed</Pill>}
                      <button
                        onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))}
                        aria-label={`Remove ${f.name}`}
                        className="text-mu hover:text-bad transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {f.status !== 'error' && (
                      <>
                        <div className="flex gap-1 mt-2.5">
                          {STEPS.map((s, i) => {
                            const done = f.status === 'done' || i < f.step
                            const current = f.status === 'running' && i === f.step
                            return (
                              <span
                                key={s}
                                title={s}
                                className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                                  done ? 'bg-good' : current ? 'bg-ac animate-pulse' : 'bg-line'
                                }`}
                              />
                            )
                          })}
                        </div>
                        <p className="text-[10px] mt-1.5 text-mu flex items-center gap-1">
                          {f.status === 'queued' && 'Waiting to start'}
                          {f.status === 'running' && (
                            <>
                              Step {f.step + 1} of {STEPS.length} · {STEPS[f.step]}
                            </>
                          )}
                          {f.status === 'done' && (
                            <>
                              <CheckCircle2 size={11} className="text-good" /> {STEPS.length}/6 done ·{' '}
                              {f.note}
                            </>
                          )}
                        </p>
                      </>
                    )}
                    {f.status === 'error' && (
                      <p className="text-[10px] mt-1.5 text-bad flex items-center gap-1">
                        <AlertTriangle size={11} /> {f.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
                  Clear batch
                </Button>
                {anyDone && (
                  <Link to="/invoices">
                    <Button variant="primary" size="sm">
                      Review invoices <ArrowRight size={13} />
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          setFiles([])
          setConfirmClear(false)
          toast.info('Batch cleared.')
        }}
        title="Clear this batch?"
        message="The file list and its progress will be removed. Invoices already processed stay in All Invoices."
        confirmLabel="Clear batch"
      />
    </>
  )
}

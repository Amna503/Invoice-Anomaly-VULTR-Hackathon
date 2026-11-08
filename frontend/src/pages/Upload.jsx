import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { UploadCloud } from 'lucide-react'
import * as api from '../lib/mockApi'
import { Card, Pill, RoutePill, PageHeader } from '../components/ui'

const STEPS = ['Ingest', 'Extract', 'Check', 'Score', 'Explain', 'Draft']
const OK_TYPES = ['pdf', 'csv']

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

export default function Upload() {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const update = (id, patch) =>
    setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  async function addFiles(fileList) {
    const picked = Array.from(fileList)
    if (!picked.length) return

    const items = picked.map((file, i) => {
      const ext = file.name.split('.').pop().toLowerCase()
      const ok = OK_TYPES.includes(ext)
      return {
        id: Date.now() + '-' + i,
        name: file.name,
        file,
        step: 0,
        status: ok ? 'queued' : 'error',
        error: ok ? null : 'Only PDF or CSV files are supported',
      }
    })
    setFiles((list) => [...items, ...list])

    const valid = items.filter((i) => i.status === 'queued')
    if (!valid.length) return

    try {
      await api.uploadInvoices(valid.map((v) => v.file))
    } catch {
      valid.forEach((v) => update(v.id, { status: 'error', error: 'Upload failed. Please try again.' }))
      return
    }
    valid.forEach((v, i) => setTimeout(() => runFile(v.id, v.name, update), i * 400))
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const anyDone = files.some((f) => f.status === 'done')

  return (
    <>
      <PageHeader
        title="Upload invoices"
        subtitle="PDF or CSV. You can add many files at once."
      />

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`w-full rounded-2xl border-2 border-dashed border-ac px-4 py-10 text-center text-ac transition-colors ${
          dragging ? 'bg-ac/25' : 'bg-ac-bg'
        }`}
      >
        <UploadCloud className="mx-auto mb-2" size={28} />
        <p className="text-sm">Drop PDFs or CSVs here, or <span className="underline">browse files</span></p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.csv"
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3 mt-4">
          {files.map((f) => (
            <Card key={f.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-mono truncate">{f.name}</p>
                {f.status === 'queued' && <Pill>Queued</Pill>}
                {f.status === 'running' && <Pill tone="agent">Checking…</Pill>}
                {f.status === 'done' && <RoutePill route={f.route} />}
                {f.status === 'error' && <Pill tone="bad">Failed</Pill>}
              </div>

              {f.status !== 'error' && (
                <div className="flex gap-1 mt-2.5">
                  {STEPS.map((s, i) => {
                    const done = f.status === 'done' || i < f.step
                    const current = f.status === 'running' && i === f.step
                    return (
                      <i
                        key={s}
                        className={`flex-1 h-1.5 rounded-full ${
                          done ? 'bg-good' : current ? 'bg-ac' : 'bg-line'
                        }`}
                      />
                    )
                  })}
                </div>
              )}

              <p className={`text-xs mt-2 ${f.status === 'error' ? 'text-bad' : 'text-mu'}`}>
                {f.status === 'queued' && 'Waiting to start'}
                {f.status === 'running' && `Step ${f.step + 1} of ${STEPS.length}: ${STEPS[f.step]}`}
                {f.status === 'done' && `${STEPS.length} of ${STEPS.length} steps done. ${f.note}`}
                {f.status === 'error' && f.error}
              </p>
            </Card>
          ))}

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setFiles([])} className="text-xs text-mu hover:text-tx">
              Clear list
            </button>
            {anyDone && (
              <Link to="/invoices" className="text-xs text-ac">View in invoices →</Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
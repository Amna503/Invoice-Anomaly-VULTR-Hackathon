import { useEffect, useState } from 'react'
import {
  Settings as SettingsIcon, User, Database, Keyboard, ShieldCheck, RotateCcw, Check,
} from 'lucide-react'
import { isMock, getHealth } from '../lib/api'
import {
  Card, CardHeader, Button, Field, Pill, ConfirmDialog, inputClass,
} from '../components/ui'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/State'

const PIPELINE = ['Ingest', 'Extract', 'Check', 'Score', 'Explain', 'Draft']

const SHORTCUTS = [
  ['/', 'Focus the global search'],
  ['A', 'Approve the invoice in the review queue'],
  ['R', 'Block the invoice in the review queue'],
  ['Q', 'Send a supplier query from the review queue'],
  ['Esc', 'Close any open dialog'],
]

function fmtUptime(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m < 60) return `${m}m ${s}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function Settings() {
  const toast = useToast()
  const [name, setName] = useState('Finance Admin')
  const [health, setHealth] = useState(null)
  const [healthError, setHealthError] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sessionSecs, setSessionSecs] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setSessionSecs((performance.now() - start) / 1000), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('iad-name')
      if (stored) setName(stored)
    } catch {
      // storage unavailable — keep the default
    }
    let alive = true
    getHealth()
      .then((h) => alive && setHealth(h))
      .catch(() => alive && setHealthError(true))
    return () => {
      alive = false
    }
  }, [])

  function saveProfile(e) {
    e.preventDefault()
    try {
      window.localStorage.setItem('iad-name', name.trim() || 'Finance Admin')
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('iad-profile'))
    setSaved(true)
    toast.success('Profile preferences saved.')
    setTimeout(() => setSaved(false), 2500)
  }

  function resetPreferences() {
    try {
      window.localStorage.removeItem('iad-collapsed')
      window.localStorage.removeItem('iad-name')
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('iad-profile'))
    setName('Finance Admin')
    setConfirmReset(false)
    toast.info('Preferences reset to defaults.')
  }

  return (
    <>
      <CardHeader
        title="Settings"
        sub="Profile, connection status and shortcuts for this workspace."
        icon={SettingsIcon}
      />

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {/* Profile */}
        <Card className="topline">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-ac" />
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Profile</p>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Display name" hint="Shown in the account menu and used on this device.">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                className={inputClass}
                placeholder="Finance Admin"
              />
            </Field>
            <Field label="Role">
              <div className="flex items-center gap-2">
                <Pill tone="agent">Finance reviewer</Pill>
                <Pill tone="muted">Approve · Block · Query</Pill>
              </div>
            </Field>
            <div className="flex items-center gap-2">
              <Button variant="primary" type="submit">
                {saved ? <Check size={14} /> : null} {saved ? 'Saved' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Connection */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-ac" />
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Data & connection</p>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-app border border-line px-3.5 py-3">
              <span className="text-mu text-xs">Mode</span>
              <Pill tone={isMock ? 'warn' : 'good'}>
                {isMock ? 'Demo data' : 'Live API'}
              </Pill>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-app border border-line px-3.5 py-3">
              <span className="text-mu text-xs">API health</span>
              {healthError ? (
                <Pill tone="bad">Unreachable</Pill>
              ) : !health ? (
                <span className="flex items-center gap-2 text-xs text-mu">
                  <Spinner size={12} /> Checking…
                </span>
              ) : (
                <Pill tone={health.status === 'healthy' ? 'good' : 'warn'}>
                  {health.status || 'Unknown'}
                </Pill>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-app border border-line px-3.5 py-3">
              <span className="text-mu text-xs">Data source</span>
              <span className="text-xs text-tx2">
                {health?.database || (isMock ? 'Bundled demo dataset' : '—')}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-app border border-line px-3.5 py-3">
              <span className="text-mu text-xs">Session uptime</span>
              <span className="text-xs text-tx2 num">
                {fmtUptime(
                  typeof health?.uptime === 'number' ? health.uptime : sessionSecs
                )}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-mu mt-3 leading-relaxed">
            Demo mode ships with a realistic dataset so every screen works offline. Point the app
            at the Express API to work against live invoices.
          </p>
        </Card>

        {/* Shortcuts */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Keyboard size={14} className="text-ac" />
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Keyboard shortcuts</p>
          </div>
          <ul className="space-y-2">
            {SHORTCUTS.map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-tx2">{label}</span>
                <kbd className="font-mono text-[11px] text-mu border border-line bg-app rounded-md px-2 py-1">
                  {key}
                </kbd>
              </li>
            ))}
          </ul>
        </Card>

        {/* Pipeline + reset */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={14} className="text-ac" />
            <p className="text-[11px] uppercase tracking-[0.14em] text-mu">Pipeline & preferences</p>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PIPELINE.map((s, i) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-lg bg-app border border-line px-2.5 py-1.5 text-[11px] text-tx2"
              >
                <span className="text-ac font-mono">0{i + 1}</span> {s}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-mu leading-relaxed mb-4">
            Invoices always travel through all six stages in order — nothing is skipped, and every
            action is written to the audit log.
          </p>
          <Button variant="secondary" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={14} /> Reset device preferences
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetPreferences}
        title="Reset preferences?"
        message="Your display name and sidebar state on this device will return to their defaults. Invoices and audit history are not affected."
        confirmLabel="Reset"
      />
    </>
  )
}

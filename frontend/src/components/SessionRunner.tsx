import { useEffect, useMemo, useState } from 'react'
import { getSessionsList, triggerSession, getSessionStatus, type SessionItem } from '../lib/api'

type Props = {
  projectId?: number
  className?: string
}

export default function SessionRunner(props: Props) {
  const { projectId = 1, className } = props
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [execId, setExecId] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    let stop = false
    ;(async () => {
      try {
        const list = await getSessionsList()
        if (!stop) setSessions(list)
      } catch {}
    })()
    return () => {
      stop = true
    }
  }, [])

  const selected = useMemo(() => sessions.find((s) => s.id === selectedId), [sessions, selectedId])
  const paramNames: string[] = useMemo(() => {
    const p = selected?.params
    if (!p) return []
    if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'string') return p as string[]
    if (Array.isArray(p)) return (p as any[]).map((x) => (typeof x === 'string' ? x : x?.name).trim()).filter(Boolean)
    return []
  }, [selected])

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const k of paramNames) {
      next[k] = form[k] ?? ''
    }
    setForm(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (!execId) return
    let stop = false
    const t = setInterval(async () => {
      try {
        const s = await getSessionStatus(execId)
        if (!stop) setStatus((s as any)?.status || '')
      } catch {}
    }, 2000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [execId])

  const disabled = !selectedId || paramNames.some((k) => !(form[k] ?? '').trim())

  async function onSubmit() {
    if (disabled) return
    setSubmitting(true)
    try {
      const cleanParams: Record<string, any> = {}
      for (const [k, v] of Object.entries(form)) cleanParams[k] = v
      const res = await triggerSession({ project_id: projectId, session_id: selectedId, params: cleanParams })
      if (res?.exec_id) {
        setExecId(res.exec_id)
        setStatus('running')
      }
    } catch {}
    setSubmitting(false)
  }

  return (
    <div className={['session-runner', className].filter(Boolean).join(' ')}>
      <div style={{ fontWeight: 600, color: '#6b6b6b', fontSize: 12, padding: '4px 8px 8px 8px', borderBottom: '1px solid #eee' }}>Sessions</div>
      <div style={{ padding: 8 }}>
        <label className="vscode-label">选择 Session</label>
        <select
          className="vscode-input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">请选择</option>
          {sessions.map((s) => (
            <option
              key={s.id}
              value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {paramNames.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label className="vscode-label">必填参数</label>
            <div style={{ display: 'grid', gap: 8 }}>
              {paramNames.map((k) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{k}</div>
                  <input
                    className="vscode-input"
                    value={form[k] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    placeholder={`请输入 ${k}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="vscode-btn primary"
            disabled={disabled || submitting}
            onClick={onSubmit}>
            {submitting ? '运行中…' : '运行'}
          </button>
          {execId ? (
            <span style={{ fontSize: 12, color: '#555' }}>
              exec_id: {execId} {status ? `(${status})` : ''}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

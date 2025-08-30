import { useEffect, useRef, useState } from 'react'

type Props = {
  open: boolean
  defaultValues?: { name?: string; desc?: string }
  onCancel: () => void
  onSubmit: (data: { name: string; desc: string }) => void
}

export default function FeatureDialog({ open, defaultValues, onCancel, onSubmit }: Props) {
  const [name, setName] = useState<string>(defaultValues?.name ?? '')
  const [desc, setDesc] = useState<string>(defaultValues?.desc ?? '')
  const [touched, setTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setName(defaultValues?.name ?? '')
    setDesc(defaultValues?.desc ?? '')
    setTouched(false)
    const id = setTimeout(() => nameRef.current?.focus(), 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, defaultValues, onCancel])

  if (!open) return null

  const nameError = touched && !name.trim() ? '请输入功能名称' : ''

  return (
    <div
      className="vscode-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}>
      <div
        className="vscode-modal"
        role="dialog"
        aria-modal="true">
        <div className="vscode-modal__header">新建功能</div>
        <div className="vscode-modal__body">
          <label className="vscode-label">功能名称</label>
          <input
            ref={nameRef}
            className={`vscode-input ${nameError ? 'invalid' : ''}`}
            placeholder="请输入功能名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (name.trim()) {
                  const el = document.getElementById('feature-desc') as HTMLTextAreaElement | null
                  el?.focus()
                } else {
                  setTouched(true)
                }
              }
            }}
          />
          {nameError && <div className="vscode-field-error">{nameError}</div>}

          <label
            className="vscode-label"
            style={{ marginTop: 10 }}>
            描述
          </label>
          <textarea
            id="feature-desc"
            className="vscode-textarea"
            placeholder="可选：请输入功能描述"
            rows={4}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div className="vscode-modal__footer">
          <button
            className="vscode-btn"
            onClick={onCancel}>
            取消
          </button>
          <button
            className="vscode-btn primary"
            onClick={() => {
              setTouched(true)
              if (!name.trim()) return
              onSubmit({ name: name.trim(), desc: desc.trim() })
            }}>
            创建
          </button>
        </div>
      </div>
    </div>
  )
}

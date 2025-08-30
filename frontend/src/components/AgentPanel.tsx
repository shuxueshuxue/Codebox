import { useMemo, useState, useRef } from 'react'
import type { Agent, AgentRole } from '../types/agent'
import { roleOrder } from '../types/agent'

type GroupKey = AgentRole

type Props = {
  className?: string
  agents: Agent[]
  assignedAgentIds?: Set<string> | string[]
  onAgentsChange?: (next: Agent[]) => void
  folded?: boolean
  onToggleFold?: () => void
}

export default function AgentPanel(props: Props) {
  const { className, agents, assignedAgentIds, onAgentsChange, folded, onToggleFold } = props
  const [collapsed, setCollapsed] = useState<Record<GroupKey, boolean>>({
    规划: false,
    前端: false,
    后端: false,
    测试: false,
    数据: false,
    运维: false,
  })
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<{ name: string; role: GroupKey; desc: string }>(() => ({ name: '', role: '规划', desc: '' }))

  const groups = useMemo(() => {
    const map: Record<GroupKey, Agent[]> = { 规划: [], 前端: [], 后端: [], 测试: [], 数据: [], 运维: [] }
    agents.forEach((a) => map[a.role].push(a))
    return map
  }, [agents])

  const [dragId, setDragId] = useState<string | null>(null)
  const assignedSet: Set<string> = useMemo(() => {
    if (!assignedAgentIds) return new Set()
    return Array.isArray(assignedAgentIds) ? new Set(assignedAgentIds) : assignedAgentIds
  }, [assignedAgentIds])

  // 自定义拖拽预览（参考 FileTree.tsx）
  const overlayRef = useRef<null | { el: HTMLDivElement; cleanup: () => void }>(null)
  function createTransparentCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, 1, 1)
    return c
  }
  function makeAgentDragPreviewCanvas(text: string, role: string): HTMLCanvasElement {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const paddingX = 12 * dpr
    const paddingY = 6 * dpr
    const fontSize = 13 * dpr
    const gap = 8 * dpr
    const badgeGap = 10 * dpr
    const maxWidth = 260 * dpr
    const icon = '🤖'
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    ctx.font = `${fontSize}px ${fontFamily}`
    function measure(str: string) {
      return Math.ceil(ctx.measureText(str).width)
    }
    function ellipsis(str: string, maxTextWidth: number) {
      if (measure(str) <= maxTextWidth) return { label: str, width: measure(str) }
      const ell = '…'
      let left = 0,
        right = str.length,
        best = ell
      while (left <= right) {
        const mid = (left + right) >> 1
        const candidate = str.slice(0, Math.max(1, mid)) + ell
        const w = measure(candidate)
        if (w <= maxTextWidth) {
          best = candidate
          left = mid + 1
        } else {
          right = mid - 1
        }
      }
      return { label: best, width: measure(best) }
    }
    const iconW = Math.ceil(ctx.measureText(icon).width)
    const badgeText = role
    const badgeFontSize = Math.round(fontSize * 0.85)
    ctx.font = `${badgeFontSize}px ${fontFamily}`
    const badgeTextW = Math.ceil(ctx.measureText(badgeText).width)
    ctx.font = `${fontSize}px ${fontFamily}`
    const contentMax = maxWidth - paddingX - iconW - gap - (badgeText ? badgeGap + badgeTextW + 12 * dpr : 0) - paddingX
    const { label, width: textW } = ellipsis(text, Math.max(40 * dpr, contentMax))
    const height = Math.ceil(fontSize * 1.9 + paddingY)
    const width = Math.ceil(paddingX + iconW + gap + textW + (badgeText ? badgeGap + badgeTextW + 12 * dpr : 0) + paddingX)
    canvas.width = width
    canvas.height = height
    // 背景 + 阴影
    const r = 10 * dpr
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 10 * dpr
    ctx.shadowOffsetY = 2 * dpr
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(width - r, 0)
    ctx.quadraticCurveTo(width, 0, width, r)
    ctx.lineTo(width, height - r)
    ctx.quadraticCurveTo(width, height, width - r, height)
    ctx.lineTo(r, height)
    ctx.quadraticCurveTo(0, height, 0, height - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, 'rgba(255,255,255,0.98)')
    bg.addColorStop(1, 'rgba(250,250,250,0.98)')
    ctx.fillStyle = bg
    ctx.fill()
    ctx.restore()
    // 边框
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1 * dpr
    ctx.stroke()
    // 内容
    const cy = Math.floor(height / 2)
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#1f2328'
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillText(icon, paddingX, cy)
    ctx.fillText(label, paddingX + iconW + gap, cy)
    // 角色角标
    if (badgeText) {
      const badgeH = Math.round(fontSize * 1.2)
      const badgeR = Math.round(badgeH / 2)
      const badgeW = Math.round(badgeTextW + 12 * dpr)
      const bx = Math.round(paddingX + iconW + gap + textW + badgeGap)
      const by = Math.round(cy - badgeH / 2)
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(bx + badgeR, by)
      ctx.lineTo(bx + badgeW - badgeR, by)
      ctx.quadraticCurveTo(bx + badgeW, by, bx + badgeW, by + badgeR)
      ctx.lineTo(bx + badgeW, by + badgeH - badgeR)
      ctx.quadraticCurveTo(bx + badgeW, by + badgeH, bx + badgeW - badgeR, by + badgeH)
      ctx.lineTo(bx + badgeR, by + badgeH)
      ctx.quadraticCurveTo(bx, by + badgeH, bx, by + badgeH - badgeR)
      ctx.lineTo(bx, by + badgeR)
      ctx.quadraticCurveTo(bx, by, bx + badgeR, by)
      ctx.closePath()
      ctx.fillStyle = '#2563eb'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `${badgeFontSize}px ${fontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badgeText, bx + badgeW / 2, by + badgeH / 2)
      ctx.restore()
    }
    return canvas
  }
  function applyDragPreview(ev: React.DragEvent, name: string, role: GroupKey, phase: 'capture' | 'bubble' = 'capture') {
    const img = makeAgentDragPreviewCanvas(name, role)
    if (phase === 'capture') {
      try {
        overlayRef.current?.cleanup()
      } catch {}
      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const overlay = document.createElement('div')
        overlay.style.position = 'fixed'
        overlay.style.left = '0'
        overlay.style.top = '0'
        overlay.style.pointerEvents = 'none'
        overlay.style.zIndex = '2147483647'
        overlay.style.willChange = 'transform'
        const cssW = Math.round(img.width / dpr)
        const cssH = Math.round(img.height / dpr)
        img.style.width = cssW + 'px'
        img.style.height = cssH + 'px'
        overlay.appendChild(img)
        document.body.appendChild(overlay)
        const offX = 12
        const offY = Math.floor(cssH * 0.6)
        const move = (e: DragEvent) => {
          const x = Math.round((e.clientX || 0) - offX)
          const y = Math.round((e.clientY || 0) - offY)
          overlay.style.transform = `translate(${x}px, ${y}px)`
        }
        const end = () => {
          try {
            document.removeEventListener('dragover', move)
          } catch {}
          try {
            window.removeEventListener('drag', move, true)
          } catch {}
          try {
            window.removeEventListener('dragend', end, true)
          } catch {}
          try {
            window.removeEventListener('drop', end, true)
          } catch {}
          try {
            overlay.remove()
          } catch {}
          overlayRef.current = null
        }
        document.addEventListener('dragover', move)
        window.addEventListener('drag', move, true)
        window.addEventListener('dragend', end, true)
        window.addEventListener('drop', end, true)
        try {
          const initX = (ev as any).clientX || 0
          const initY = (ev as any).clientY || 0
          move({ clientX: initX, clientY: initY } as DragEvent)
        } catch {}
        overlayRef.current = { el: overlay, cleanup: end }
      } catch {}
    }
    try {
      const blank = createTransparentCanvas()
      ev.dataTransfer!.setDragImage(blank, 0, 0)
      requestAnimationFrame(() => {
        try {
          ev.dataTransfer!.setDragImage(blank, 0, 0)
        } catch {}
      })
    } catch {}
  }

  const onDragStart = (e: React.DragEvent, id: string, name: string, role: GroupKey) => {
    if (assignedSet.has(id)) return
    setDragId(id)
    e.dataTransfer.setData('application/x-agent', JSON.stringify({ id }))
    try {
      e.dataTransfer.setData('text/plain', name)
    } catch {}
    e.dataTransfer.effectAllowed = 'move'
    applyDragPreview(e, name, role, 'bubble')
  }

  const onDropToRole = (e: React.DragEvent, role: GroupKey) => {
    e.preventDefault()
    const payload = e.dataTransfer.getData('application/x-agent')
    const parsed = payload ? (JSON.parse(payload) as { id: string } | null) : null
    const id = (parsed?.id || dragId) as string | null
    if (!id || !onAgentsChange) return
    const idx = agents.findIndex((x) => x.id === id)
    if (idx < 0) return
    const next = agents.slice()
    next[idx] = { ...next[idx], role }
    onAgentsChange(next)
    setDragId(null)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onReorderWithinRole = (draggingId: string, targetId: string) => {
    if (draggingId === targetId || !onAgentsChange) return
    const dragIdx = agents.findIndex((x) => x.id === draggingId)
    const targetIdx = agents.findIndex((x) => x.id === targetId)
    if (dragIdx < 0 || targetIdx < 0) return
    if (agents[dragIdx].role !== agents[targetIdx].role) return
    const clone = agents.slice()
    const [removed] = clone.splice(dragIdx, 1)
    clone.splice(targetIdx, 0, removed)
    onAgentsChange(clone)
  }

  const handleCreate = () => {
    if (!draft.name.trim() || !onAgentsChange) return
    const id = `a-${Date.now()}`
    onAgentsChange([{ id, name: draft.name.trim(), role: draft.role, desc: draft.desc.trim() }, ...agents])
    setDraft({ name: '', role: draft.role, desc: '' })
    setCreating(false)
  }

  return (
    <div className={['agent-panel', className].filter(Boolean).join(' ')}>
      <div className="agent-toolbar">
        <div className="agent-toolbar__title">AGENTS</div>
        <div className="spacer" />
        <button
          className="icon-btn"
          title={folded ? '展开' : '折叠'}
          onClick={onToggleFold}>
          {folded ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M6 10l6 6 6-6" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="M6 14l6-6 6 6" />
            </svg>
          )}
        </button>
        <button
          className="icon-btn"
          title="新建 Agent"
          onClick={() => setCreating(true)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {!folded && (
        <div className="agent-groups">
          {roleOrder.map((role) => {
            const items = groups[role]
            const isCollapsed = collapsed[role]
            return (
              <div
                key={role}
                className="agent-group"
                onDragOver={onDragOver}
                onDrop={(e) => onDropToRole(e, role)}>
                <div
                  className="agent-group__header"
                  onClick={() => setCollapsed((c) => ({ ...c, [role]: !c[role] }))}>
                  <span className="agent-group__caret">{isCollapsed ? '▶' : '▼'}</span>
                  <span className="agent-group__label">{role}</span>
                  <span className="agent-group__count">{items.length}</span>
                </div>
                {!isCollapsed && (
                  <div className="agent-list">
                    {items.map((a) => (
                      <div
                        key={a.id}
                        className={['agent-item', assignedSet.has(a.id) ? 'assigned' : ''].filter(Boolean).join(' ')}
                        draggable={!assignedSet.has(a.id)}
                        onDragStartCapture={(e) => applyDragPreview(e, a.name, a.role, 'capture')}
                        onDragStart={(e) => onDragStart(e, a.id, a.name, a.role)}
                        onDragOver={(e) => {
                          onDragOver(e)
                          const dragging = dragId
                          if (dragging) onReorderWithinRole(dragging, a.id)
                        }}
                        title={a.desc || ''}>
                        <div
                          className="agent-item__avatar"
                          aria-hidden>
                          {a.name.slice(0, 1)}
                        </div>
                        <div className="agent-item__main">
                          <div className="agent-item__name">{a.name}</div>
                          {a.desc ? <div className="agent-item__desc">{a.desc}</div> : null}
                          {assignedSet.has(a.id) ? <div className="agent-item__desc">已分配</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <div
          className="vscode-modal-overlay"
          onClick={() => setCreating(false)}>
          <div
            className="vscode-modal"
            onClick={(e) => e.stopPropagation()}>
            <div className="vscode-modal__header">新建 Agent</div>
            <div className="vscode-modal__body">
              <label className="vscode-label">名称</label>
              <input
                className="vscode-input"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="如：需求澄清官"
              />
              <div style={{ height: 10 }} />
              <label className="vscode-label">角色</label>
              <select
                className="vscode-input"
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as GroupKey }))}>
                {roleOrder.map((r) => (
                  <option
                    key={r}
                    value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <label className="vscode-label">描述</label>
              <textarea
                className="vscode-textarea"
                rows={3}
                value={draft.desc}
                onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
                placeholder="简要说明 Agent 的职责"
              />
            </div>
            <div className="vscode-modal__footer">
              <button
                className="vscode-btn"
                onClick={() => setCreating(false)}>
                取消
              </button>
              <button
                className="vscode-btn primary"
                onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

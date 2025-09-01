import { memo, useMemo, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Tree } from 'react-arborist'
import { useEffect } from 'react'
import { listChildren } from '../lib/api'

type NodeData = {
  id: string
  name: string
  isDir?: boolean
  children?: NodeData[]
}

type RowProps = {
  node: any
  innerRef: (el: HTMLDivElement | null) => void
  attrs: React.HTMLAttributes<any>
  onToggleDir: (node: any) => Promise<void>
  loading?: boolean
}

function Row({ node, innerRef, attrs, onToggleDir }: RowProps) {
  const isDir = !!node.data.isDir
  const { style: baseStyle, onDragStart: arboristDragStart, draggable: arboristDraggable, ...rest } = attrs as any
  const isDraggable = !isDir
  const overlayRef = useRef<null | { el: HTMLDivElement; cleanup: () => void }>(null)

  function makeDragPreviewCanvas(text: string, isFolder: boolean, count: number = 1): HTMLCanvasElement {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const paddingX = 12 * dpr
    const paddingY = 6 * dpr
    const fontSize = 13 * dpr
    const gap = 8 * dpr
    const badgeGap = 10 * dpr
    const maxWidth = 260 * dpr
    const icon = isFolder ? '📁' : '📄'
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
      let left = 0
      let right = str.length
      let best = ell
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
    const badgeText = count > 1 ? String(count) : ''
    const badgeFontSize = Math.round(fontSize * 0.85)
    ctx.font = `${badgeFontSize}px ${fontFamily}`
    const badgeTextW = badgeText ? Math.ceil(ctx.measureText(badgeText).width) : 0
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

    // 多选数量角标
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

  function createTransparentCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, 1, 1)
    return c
  }

  function applyDragPreview(ev: React.DragEvent, phase: 'capture' | 'bubble' = 'capture') {
    const name: string = node.data.name
    try {
      ev.dataTransfer?.setData('text/plain', name)
    } catch {}
    try {
      ev.dataTransfer?.setData('application/x-honeycomb-node-id', node.data.id)
    } catch {}
    try {
      if (!ev.dataTransfer) return
      ev.dataTransfer.effectAllowed = 'copy'
      const selectedIds = (node as any)?.tree?.selectedIds ?? (node as any)?.tree?.selection ?? null
      let selectedCount = 1
      if (selectedIds && typeof selectedIds === 'object') {
        if (typeof (selectedIds as any).size === 'number') selectedCount = (selectedIds as any).size
        else if (Array.isArray(selectedIds)) selectedCount = (selectedIds as any).length
      }
      const img = makeDragPreviewCanvas(name, isDir, selectedCount)

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
          // 初始化位置
          try {
            const initX = (ev as any).clientX || 0
            const initY = (ev as any).clientY || 0
            move({ clientX: initX, clientY: initY } as DragEvent)
          } catch {}
          overlayRef.current = { el: overlay, cleanup: end }
        } catch {}
      }

      // 设置透明拖拽图隐藏系统预览，防止重影
      try {
        const blank = createTransparentCanvas()
        ev.dataTransfer.setDragImage(blank, 0, 0)
        requestAnimationFrame(() => {
          try {
            ev.dataTransfer!.setDragImage(blank, 0, 0)
          } catch {}
        })
      } catch {}
    } catch {}
    // 交给 arborist 的原处理（如果它同样监听冒泡阶段，不会被替换）
  }

  function handleDragStartCapture(ev: React.DragEvent) {
    try {
      try {
        if (!(node as any).isSelected && typeof (node as any).select === 'function') (node as any).select()
      } catch {}
      try {
        if (!(node as any).isFocused && typeof (node as any).focus === 'function') (node as any).focus()
      } catch {}
    } catch {}
    applyDragPreview(ev, 'capture')
  }

  // 冒泡阶段重新设置一次 setDragImage，以覆盖库内部可能的设置
  return (
    <div
      className="vscode-row"
      ref={innerRef}
      {...rest}
      draggable={isDraggable}
      onMouseDownCapture={() => {
        try {
          if (!(node as any).isSelected && typeof (node as any).select === 'function') (node as any).select()
        } catch {}
        try {
          if (!(node as any).isFocused && typeof (node as any).focus === 'function') (node as any).focus()
        } catch {}
      }}
      onDragStartCapture={handleDragStartCapture}
      onDragStart={(e) => {
        if (typeof arboristDragStart === 'function') arboristDragStart(e)
        try {
          applyDragPreview(e, 'bubble')
        } catch {}
      }}
      style={{ ...(baseStyle || {}), paddingLeft: node.level * 14 + 8 }}
      onDoubleClick={async () => {
        if (isDir) {
          await onToggleDir(node)
        } else {
          node.toggle()
        }
      }}>
      <span
        className="vscode-row__caret"
        onClick={async (e) => {
          e.stopPropagation()
          if (isDir) await onToggleDir(node)
        }}
        aria-hidden>
        {isDir ? (node.isOpen ? '▾' : '▸') : ''}
      </span>
      <span
        className="vscode-row__icon"
        aria-hidden
        draggable={isDraggable}>
        {isDir ? (node.isOpen ? '📂' : '📁') : '📄'}
      </span>
      <span
        className="vscode-row__label"
        draggable={isDraggable}>
        {node.data.name}
      </span>
    </div>
  )
}

const FileTree = memo(function FileTree() {
  const [treeData, setTreeData] = useState<NodeData[]>([])
  const [search, setSearch] = useState('')
  const projectId = 1 // TODO: 可接入项目选择器
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

  // 首次加载：直接加载顶层目录（懒加载，服务端仅刷新当前层级）
  useEffect(() => {
    ;(async () => {
      try {
        const rows = await listChildren(projectId, null, false, 500, 0, true)
        const roots: NodeData[] = (rows as any[]).map((r: any) => ({
          id: r.path || r.id || r.name,
          name: r.path ? r.path.split('/').pop() || r.path : r.name,
          isDir: r.is_dir === 1,
        }))
        setTreeData(roots)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [projectId])

  const [menu, setMenu] = useState<{ x: number; y: number; targetId: string } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const treeRef = useRef<any>(null)
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const apply = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: Math.max(0, Math.floor(rect.width)), height: Math.max(0, Math.floor(rect.height)) })
    }
    apply()
    const ro = new ResizeObserver(() => apply())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // helpers: 移除节点 & 插入节点
  function removeNodeById(list: NodeData[], id: string): { removed?: NodeData; next: NodeData[] } {
    const next: NodeData[] = []
    let removed: NodeData | undefined
    for (const n of list) {
      if (n.id === id) {
        removed = n
        continue
      }
      if (n.children && n.children.length) {
        const res = removeNodeById(n.children, id)
        if (res.removed) removed = res.removed
        next.push({ ...n, children: res.next })
      } else {
        next.push(n)
      }
    }
    return { removed, next }
  }

  function insertNodeAt(list: NodeData[], parentId: string | null, index: number, node: NodeData): NodeData[] {
    if (!parentId) {
      const copy = list.slice()
      copy.splice(Math.max(0, Math.min(index, copy.length)), 0, node)
      return copy
    }
    return list.map((n) => {
      if (n.id === parentId) {
        const children = n.children ? n.children.slice() : []
        children.splice(Math.max(0, Math.min(index, children.length)), 0, node)
        return { ...n, children }
      }
      if (n.children && n.children.length) {
        return { ...n, children: insertNodeAt(n.children, parentId, index, node) }
      }
      return n
    })
  }

  function findParentId(list: NodeData[], id: string, parentId: string | null = null): string | null {
    for (const n of list) {
      if (n.id === id) return parentId
      if (n.children && n.children.length) {
        const pid = findParentId(n.children, id, n.id)
        if (pid !== null) return pid
      }
    }
    return null
  }

  function attachChildren(list: NodeData[], parentId: string, kids: NodeData[]): NodeData[] {
    return list.map((n) => {
      if (n.id === parentId) {
        return { ...n, isDir: true, children: kids }
      }
      if (n.children && n.children.length) {
        return { ...n, children: attachChildren(n.children, parentId, kids) }
      }
      return n
    })
  }

  // 搜索过滤：保留命中的分支
  const visibleData = useMemo<NodeData[]>(() => {
    if (!search.trim()) return treeData
    const term = search.toLowerCase()
    const filter = (list: NodeData[]): NodeData[] => {
      const out: NodeData[] = []
      for (const n of list) {
        const nameHit = n.name.toLowerCase().includes(term)
        const kids = n.children ? filter(n.children) : []
        if (nameHit || kids.length) out.push({ ...n, children: kids.length ? kids : undefined })
      }
      return out
    }
    return filter(treeData)
  }, [treeData, search])

  const onContextMenuRow = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, targetId: id })
  }, [])

  const closeMenu = useCallback(() => setMenu(null), [])

  // CRUD
  const doNew = useCallback(
    (isFolder: boolean) => {
      if (!menu) return
      const nameInput = prompt(isFolder ? '新建文件夹名称' : '新建文件名称')?.trim()
      if (!nameInput) return
      const safeName: string = nameInput
      const newNode: NodeData = { id: Math.random().toString(36).slice(2), name: safeName, children: isFolder ? [] : undefined }
      const targetId = menu.targetId
      const pid = findParentId(treeData, targetId)
      const parentId = pid ?? targetId
      setTreeData((prev) => insertNodeAt(prev, parentId, 0, newNode))
      setMenu(null)
    },
    [menu, treeData]
  )

  const doRename = useCallback(() => {
    if (!menu) return
    const input = prompt('重命名为')?.trim()
    if (!input) return
    const safeName: string = input
    const targetId = menu.targetId
    function rename(list: NodeData[]): NodeData[] {
      return list.map((n) => {
        if (n.id === targetId) return { ...n, name: safeName }
        if (n.children && n.children.length) return { ...n, children: rename(n.children) }
        return n
      })
    }
    setTreeData((prev) => rename(prev))
    setMenu(null)
  }, [menu])

  const doDelete = useCallback(() => {
    if (!menu) return
    const targetId = menu.targetId
    const { next } = removeNodeById(treeData, targetId)
    setTreeData(next)
    setMenu(null)
  }, [menu, treeData])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="tree-toolbar">
        <input
          className="tree-search"
          placeholder="搜索文件..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="spacer" />
        <button
          className="icon-btn"
          aria-label="刷新"
          title="刷新（重新扫描）"
          onClick={async () => {
            try {
              const rows = await listChildren(projectId, null, false, 500, 0, true)
              const roots: NodeData[] = (rows as any[]).map((r: any) => ({
                id: r.path || r.id || r.name,
                name: r.path ? r.path.split('/').pop() || r.path : r.name,
                isDir: r.is_dir === 1,
              }))
              setTreeData(roots)
            } catch (e) {
              console.error(e)
            }
          }}>
          ⟳
        </button>
        <button
          className="icon-btn"
          aria-label="全部展开"
          title="全部展开"
          onClick={() => treeRef.current?.openAll?.()}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1"
            />
            <path d="M6.5 5.5v2.5M5.25 6.75h2.5" />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="1"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="1"
            />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="1"
            />
          </svg>
        </button>
        <button
          className="icon-btn"
          aria-label="全部折叠"
          title="全部折叠"
          onClick={() => treeRef.current?.closeAll?.()}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1"
            />
            <path d="M5.25 6.75h2.5" />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="1"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="1"
            />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="1"
            />
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {size.width > 0 && size.height > 0 && (
          <Tree<NodeData>
            ref={treeRef as any}
            className="vscode-tree"
            data={visibleData}
            openByDefault={true}
            width={size.width}
            height={size.height - 32}
            rowHeight={24}
            indent={14}
            overscanCount={8}
            // Tree v5 的 selection 是 string（单选）。此处用 follow focus + 多选快捷键。
            selectionFollowsFocus
            renderRow={(props) => {
              const onToggleDir = async (node: any) => {
                if (!node.data.isDir) return
                // 如果已加载则只切换
                if (node.data.children && node.data.children.length) {
                  node.toggle()
                  return
                }
                // 先占位“加载中...”，再展开，再异步拉取
                setTreeData((prev) => attachChildren(prev, node.id, [{ id: node.id + '::loading', name: '加载中...', isDir: false }]))
                setLoadingIds((prev) => ({ ...prev, [node.id]: true }))
                // 等待一次渲染帧，确保占位子节点已插入到树中后再展开
                try {
                  await new Promise<void>((resolve) => {
                    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
                    else setTimeout(resolve, 0)
                  })
                  if (typeof (node as any).open === 'function') (node as any).open()
                  else if (typeof (node as any).toggle === 'function') (node as any).toggle()
                } catch {}
                try {
                  const rows = await listChildren(projectId, node.id, false, 500, 0, true)
                  const kids: NodeData[] = (rows as any[]).map((r: any) => ({
                    id: r.path || r.id || r.name,
                    name: r.path ? r.path.split('/').pop() || r.path : r.name,
                    isDir: r.is_dir === 1,
                    children: r.is_dir === 1 ? [] : undefined,
                  }))
                  setTreeData((prev) => attachChildren(prev, node.id, kids))
                  setLoadingIds((prev) => {
                    const n = { ...prev }
                    delete n[node.id]
                    return n
                  })
                } catch (e) {
                  console.error(e)
                  setLoadingIds((prev) => {
                    const n = { ...prev }
                    delete n[node.id]
                    return n
                  })
                }
              }
              return (
                <div onContextMenu={(e) => onContextMenuRow(e, (props as any).node.id)}>
                  <Row
                    {...(props as any)}
                    onToggleDir={onToggleDir}
                    loading={!!loadingIds[(props as any).node.id]}
                  />
                </div>
              )
            }}
            onMove={(args: any) => {
              const parentId: string | null = args.parentId ?? null
              const index: number = args.index ?? 0
              const moving = (args.dragNodes ?? args.nodes ?? []) as Array<{ data: NodeData }>
              if (!moving || moving.length === 0) return
              const id = moving[0].data.id
              const { removed, next } = removeNodeById(treeData, id)
              if (!removed) return
              const updated = insertNodeAt(next, parentId, index, removed)
              setTreeData(updated)
            }}
          />
        )}
      </div>

      {menu && (
        <div
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={closeMenu}>
          <div
            className="context-item"
            onClick={() => doNew(true)}>
            新建文件夹
          </div>
          <div
            className="context-item"
            onClick={() => doNew(false)}>
            新建文件
          </div>
          <div className="context-sep" />
          <div
            className="context-item"
            onClick={doRename}>
            重命名
          </div>
          <div
            className="context-item danger"
            onClick={doDelete}>
            删除
          </div>
        </div>
      )}
    </div>
  )
})

export default FileTree

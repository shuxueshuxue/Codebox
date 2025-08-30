import { memo, useMemo, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Tree } from 'react-arborist'
import data from '../assets/tree.json'

type NodeData = {
  id: string
  name: string
  children?: NodeData[]
}

type RowProps = {
  node: any
  innerRef: (el: HTMLDivElement | null) => void
  attrs: React.HTMLAttributes<any>
}

function Row({ node, innerRef, attrs }: RowProps) {
  const isDir = !!node.data.children && node.data.children.length > 0
  const { style: baseStyle, ...rest } = attrs as any

  function makeDragPreviewCanvas(text: string, isFolder: boolean): HTMLCanvasElement {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const paddingX = 10 * dpr
    const paddingY = 6 * dpr
    const fontSize = 14 * dpr
    const gap = 8 * dpr
    const icon = isFolder ? '📄' : '📄' // 这里文件用同一图标，也可区分
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
    const textW = Math.ceil(ctx.measureText(text).width)
    const iconW = Math.ceil(ctx.measureText(icon).width)
    const height = Math.ceil(fontSize * 1.8 + paddingY)
    const width = Math.ceil(paddingX + iconW + gap + textW + paddingX)
    canvas.width = width
    canvas.height = height
    // 背景
    const r = 8 * dpr
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1 * dpr
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
    ctx.fill()
    ctx.stroke()
    // 内容
    ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#222'
    const cy = Math.floor(height / 2)
    ctx.fillText(icon, paddingX, cy)
    ctx.fillText(text, paddingX + iconW + gap, cy)
    return canvas
  }

  function startFileDrag(ev: React.DragEvent) {
    if (isDir) {
      ev.preventDefault()
      return
    }
    const name: string = node.data.name
    ev.dataTransfer?.setData('text/plain', name)
    ev.dataTransfer?.setData('application/x-honeycomb-node-id', node.data.id)
    try {
      ev.dataTransfer!.effectAllowed = 'copy'
    } catch {}
    try {
      const img = makeDragPreviewCanvas(name, isDir)
      // 稍偏左上，光标不遮住文字
      ev.dataTransfer!.setDragImage(img, 12, Math.floor(img.height * 0.6))
    } catch {}
  }
  return (
    <div
      className="vscode-row"
      ref={innerRef}
      {...rest}
      draggable={!isDir}
      onDragStart={startFileDrag}
      style={{ ...(baseStyle || {}), paddingLeft: node.level * 14 + 8 }}
      onDoubleClick={() => node.toggle()}>
      <span
        className="vscode-row__caret"
        onClick={(e) => {
          e.stopPropagation()
          if (isDir) node.toggle()
        }}
        aria-hidden>
        {isDir ? (node.isOpen ? '▾' : '▸') : ''}
      </span>
      <span
        className="vscode-row__icon"
        aria-hidden
        draggable={!isDir}
        onDragStart={startFileDrag}>
        {isDir ? (node.isOpen ? '📂' : '📁') : '📄'}
      </span>
      <span
        className="vscode-row__label"
        draggable={!isDir}
        onDragStart={startFileDrag}>
        {node.data.name}
      </span>
    </div>
  )
}

const FileTree = memo(function FileTree() {
  const initial = useMemo<NodeData[]>(() => data as unknown as NodeData[], [])
  const [treeData, setTreeData] = useState<NodeData[]>(initial)
  const [search, setSearch] = useState('')

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
          aria-label="全部展开"
          title="全部展开"
          onClick={() => treeRef.current?.openAll?.()}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
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
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
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
            renderRow={(props) => (
              <div onContextMenu={(e) => onContextMenuRow(e, (props as any).node.id)}>
                <Row {...(props as any)} />
              </div>
            )}
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

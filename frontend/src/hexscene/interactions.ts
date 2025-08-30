import * as THREE from 'three'
import type { Layout } from '../lib/hexagons'
import type { PrismItem } from './types'
import { hexAtClientXY } from './raycast'
import { buildPrismObject, activatePrism, hexKey, updateLabelSprite } from './prism'

export function attachInteractions(opts: {
  renderer: THREE.WebGLRenderer
  camera: THREE.Camera
  layout: Layout
  fillGroup: THREE.Group
  prismGroup: THREE.Group
  defaultFillMat: THREE.Material
  hoverFillMat: THREE.Material
  placed: Map<string, PrismItem>
  onRequestFeature?: (hexKey: string, defaults?: { name?: string; desc?: string }) => void
  onActivatedPrismClick?: (item: PrismItem, event: MouseEvent) => void
  onPrismRemove?: (item: PrismItem) => void
}) {
  const { renderer, camera, layout, fillGroup, prismGroup, defaultFillMat, hoverFillMat, placed, onRequestFeature, onActivatedPrismClick, onPrismRemove } = opts
  const rc = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let highlighted: THREE.Mesh | null = null

  const onPointerMove = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    rc.setFromCamera(mouse, camera)
    const inter = rc.intersectObjects(fillGroup.children, false)
    if (highlighted && (!inter.length || inter[0].object !== highlighted)) {
      highlighted.material = defaultFillMat
      highlighted = null
    }
    if (inter.length) {
      const obj = inter[0].object as THREE.Mesh
      if (obj !== highlighted) {
        obj.material = hoverFillMat
        highlighted = obj
      }
    }
  }

  let down = { x: 0, y: 0, button: -1 }
  const onPointerDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, button: e.button }
  }
  const onPointerUp = (e: PointerEvent) => {
    const dx = e.clientX - down.x,
      dy = e.clientY - down.y
    if (dx * dx + dy * dy >= 9) return
    const hex = hexAtClientXY(renderer, camera, layout, e.clientX, e.clientY)
    if (!hex) return
    const key = hexKey(hex)
    if (down.button === 0 && !placed.has(key)) {
      const item = buildPrismObject(layout, hex)
      prismGroup.add(item.group)
      placed.set(key, item)
    } else if (down.button === 0 && placed.has(key)) {
      const item = placed.get(key)!
      if (item && item.isActivated && onActivatedPrismClick) onActivatedPrismClick(item, e as MouseEvent)
    } else if (down.button === 2) {
      const item = placed.get(key)
      if (item) {
        prismGroup.remove(item.group)
        item.mesh.geometry.dispose()
        if (Array.isArray(item.mesh.material as any)) {
          ;(item.mesh.material as THREE.Material[]).forEach((m) => m.dispose())
        } else {
          ;(item.mesh.material as THREE.Material).dispose()
        }
        const sm = item.sprite.material as THREE.SpriteMaterial
        if (sm.map) sm.map.dispose()
        sm.dispose()
        if (onPrismRemove) onPrismRemove(item)
        placed.delete(key)
      }
    }
  }

  const onDblClick = (e: MouseEvent) => {
    const hex = hexAtClientXY(renderer, camera, layout, e.clientX, e.clientY)
    if (!hex) return
    const item = placed.get(hexKey(hex))
    if (!item) return
    if (onRequestFeature) {
      onRequestFeature(item.key, item.functionName ? { name: item.functionName, desc: item.description } : undefined)
    } else {
      const fname = prompt('功能名称：')?.trim()
      if (!fname) return
      const desc = prompt('描述：')?.trim() ?? null
      activatePrism(item, fname, desc)
    }
  }

  const onFeatureConfirm = (e: Event) => {
    const { hexKey: key, name, desc } = (e as CustomEvent<{ hexKey: string; name: string; desc: string }>).detail || ({} as any)
    if (!key || !name) return
    const item = placed.get(key)
    if (!item) return
    activatePrism(item, name, desc)
  }

  const onContextMenu = (e: MouseEvent) => e.preventDefault()
  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const name = e.dataTransfer?.getData('text/plain')?.trim()
    if (!name) return
    const hex = hexAtClientXY(renderer, camera, layout, e.clientX, e.clientY)
    if (!hex) return
    const item = placed.get(hexKey(hex))
    if (!item) return
    item.fileName = name
    if (!item.functionName) {
      updateLabelSprite(item.sprite, name)
      item.label = name
    }
  }

  const el = renderer.domElement
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('dblclick', onDblClick)
  el.addEventListener('contextmenu', onContextMenu)
  el.addEventListener('dragover', onDragOver)
  el.addEventListener('drop', onDrop)
  window.addEventListener('feature:confirm' as any, onFeatureConfirm as any)

  return () => {
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('dblclick', onDblClick)
    el.removeEventListener('contextmenu', onContextMenu)
    el.removeEventListener('dragover', onDragOver)
    el.removeEventListener('drop', onDrop)
    window.removeEventListener('feature:confirm' as any, onFeatureConfirm as any)
  }
}

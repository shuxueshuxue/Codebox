import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createScene } from './setup'
import { createLayout, createHexGrid } from './grid'
import { buildPrismObject, hexKey } from './prism'
import { attachInteractions } from './interactions'
import { TreeSystem } from './tree'
import { update as tweenUpdate } from '@tweenjs/tween.js'
import type { PrismItem } from './types'
import { Hex, HexOps } from '../lib/hexagons'

type Props = {
  width?: number
  height?: number
  onRequestFeature?: (hexKey: string, defaults?: { name?: string; desc?: string }) => void
}

export function useHexScene({ width, height, onRequestFeature }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    while (container.firstChild) container.removeChild(container.firstChild)

    const { scene, camera, renderer, controls, cleanup: cleanupScene } = createScene(container, width, height)

    const layout = createLayout()
    const radius = 15
    const { cellGroup, fillGroup, defaultFillMat, hoverFillMat } = createHexGrid(layout, radius)
    scene.add(cellGroup, fillGroup)

    const prismGroup = new THREE.Group()
    scene.add(prismGroup)

    const placed = new Map<string, PrismItem>()
    // 初始化：偏中心的随机少量
    const initialCount = Math.min(30, Math.max(10, Math.floor(radius * 1.2)))
    const centerHex = new Hex(0, 0, 0)
    const used = new Set<string>()
    let attempts = 0
    while (used.size < initialCount && attempts++ < 1000) {
      const r = Math.floor(Math.pow(Math.random(), 1.7) * (radius + 1))
      const ring = r === 0 ? [centerHex] : HexOps.ring(centerHex, r)
      const pick = ring[Math.floor(Math.random() * ring.length)]
      const key = hexKey(pick)
      if (placed.has(key) || used.has(key)) continue
      const item = buildPrismObject(layout, pick)
      prismGroup.add(item.group)
      placed.set(key, item)
      used.add(key)
    }

    const tree = new TreeSystem(scene, camera, renderer, controls)

    const detach = attachInteractions({
      renderer,
      camera,
      layout,
      fillGroup,
      prismGroup,
      defaultFillMat,
      hoverFillMat,
      placed,
      onRequestFeature,
      onActivatedPrismClick: (item) => tree.showTreeForPrism(item),
      onPrismRemove: (item) => tree.disposeTreeForKey(item.key),
    })

    let raf = 0
    let last = performance.now()
    const loop = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      controls.update()
      tweenUpdate(now)
      tree.update(now, dt)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()

    const onResize = () => {
      const newW = width ?? (container.clientWidth || window.innerWidth)
      const newH = height ?? (container.clientHeight || window.innerHeight)
      renderer.setSize(newW, newH)
      const aspect = newW / newH
      const ortho = camera as THREE.OrthographicCamera
      const frustumSize = (ortho as any).userData?.frustumSize ?? 120
      ortho.left = (-frustumSize * aspect) / 2
      ortho.right = (frustumSize * aspect) / 2
      ortho.top = frustumSize / 2
      ortho.bottom = -frustumSize / 2
      ortho.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      detach()
      tree.dispose()
      cleanupScene()
    }
  }, [width, height, onRequestFeature])

  return ref
}

import * as THREE from 'three'
import { Hex, Layout, HexOps } from '../lib/hexagons'
import type { PrismItem } from './types'

export const hexKey = (h: Hex) => `${h.q},${h.r},${h.s}`

export function buildBeveledPrism(layout: Layout, hex: Hex) {
  const corners = HexOps.corners(layout, hex)
  const shape = new THREE.Shape()
  const cx = corners.reduce((s, p) => s + p.x, 0) / corners.length
  const cy = corners.reduce((s, p) => s + p.y, 0) / corners.length
  const shrink = 0.96
  const sx0 = cx + (corners[0].x - cx) * shrink
  const sy0 = -(cy + (corners[0].y - cy) * shrink)
  shape.moveTo(sx0, sy0)
  for (let i = 1; i < corners.length; i++) {
    const sx = cx + (corners[i].x - cx) * shrink
    const sy = -(cy + (corners[i].y - cy) * shrink)
    shape.lineTo(sx, sy)
  }
  shape.closePath()

  const height = 0.1
  const bevelSize = 0.16
  const bevelThickness = 0.16
  const geom = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize,
    bevelThickness,
  })
  geom.rotateX(-Math.PI / 2)
  geom.computeVertexNormals()

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x9aa0a6),
    transparent: true,
    opacity: 0.5,
    roughness: 0.25,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
    transmission: 0.85,
    ior: 1.5,
    thickness: 0.3,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geom, mat)
  ;(mesh as any).userData.hex = hex
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function createLabelSprite(text?: string) {
  const mat = new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true, opacity: 1 })
  const sprite = new THREE.Sprite(mat)
  sprite.renderOrder = 2
  sprite.visible = false
  if (text) updateLabelSprite(sprite, text)
  return sprite
}

export function updateLabelSprite(sprite: THREE.Sprite, text: string) {
  const dpr = 5
  const padding = 8 * dpr
  const fontSize = 20 * dpr // 增大字体
  const gap = 10 * dpr
  const accentW = 4 * dpr
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
  const metrics = ctx.measureText(text)
  const textW = Math.ceil(metrics.width)
  const textH = Math.ceil(fontSize * 1.4)
  const w = Math.ceil(accentW + gap + textW + padding)
  const h = Math.ceil(textH + padding * 2)
  canvas.width = w
  canvas.height = h

  const r = 8 * dpr
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 6 * dpr
  ctx.shadowOffsetY = 2 * dpr
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.quadraticCurveTo(w, 0, w, r)
  ctx.lineTo(w, h - r)
  ctx.quadraticCurveTo(w, h, w - r, h)
  ctx.lineTo(r, h)
  ctx.quadraticCurveTo(0, h, 0, h - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.6)' // 提高不透明度
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.quadraticCurveTo(w, 0, w, r)
  ctx.lineTo(w, h - r)
  ctx.quadraticCurveTo(w, h, w - r, h)
  ctx.lineTo(r, h)
  ctx.quadraticCurveTo(0, h, 0, h - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = 'rgba(0, 120, 212,0.6)'
  ctx.fillRect(0, 0, accentW, h)
  ctx.restore()

  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#1f1f1f'
  ctx.fillText(text, accentW + gap, Math.floor(h / 2))

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  const mat = sprite.material as THREE.SpriteMaterial
  if (mat.map) mat.map.dispose()
  mat.map = tex
  const worldW = 5.8 // 略增世界宽度
  let worldH = (worldW * canvas.height) / canvas.width
  const maxWorldH = 1.6 // 略增最大高度
  let finalW = worldW
  if (worldH > maxWorldH) {
    const s = maxWorldH / worldH
    finalW = worldW * s
    worldH = maxWorldH
  }
  sprite.scale.set(finalW, worldH, 1)
  sprite.visible = true
}

export function buildPrismObject(layout: Layout, hex: Hex): PrismItem {
  const mesh = buildBeveledPrism(layout, hex)
  ;(mesh.geometry as THREE.BufferGeometry).computeBoundingBox()
  const bb = (mesh.geometry as THREE.BufferGeometry).boundingBox!
  const center = new THREE.Vector3()
  bb.getCenter(center)
  const sprite = createLabelSprite()
  const topY = bb.max.y
  sprite.position.set(center.x, topY + 0.16, center.z)
  const group = new THREE.Group()
  group.add(mesh)
  group.add(sprite)
  const key = hexKey(hex)
  return { hex, key, group, mesh, sprite, isActivated: false }
}

export function activatePrism(item: PrismItem, functionName: string, description?: string | null) {
  const mat = item.mesh.material as THREE.MeshPhysicalMaterial
  mat.color = new THREE.Color(0x50c878)
  mat.opacity = 0.5
  mat.transmission = 1.0
  item.functionName = functionName
  item.description = description ?? undefined
  item.isActivated = true
  updateLabelSprite(item.sprite, functionName)
}

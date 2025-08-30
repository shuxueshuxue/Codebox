import * as THREE from 'three'
import { Hex, Point, Layout, HexOps } from '../lib/hexagons'

export function createLayout() {
  const size = new Point(2.5, 2.5)
  return new Layout(Layout.flat, size, new Point(0, 0))
}

export function createHexGrid(layout: Layout, radius: number) {
  const centerHex = new Hex(0, 0, 0)
  const cells = HexOps.hexagon(centerHex, radius)

  const lineMat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.75 })
  const defaultFillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false })
  const hoverFillMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })

  const cellGroup = new THREE.Group()
  const fillGroup = new THREE.Group()

  for (const hex of cells) {
    const seg = buildHexBorder(layout, hex, lineMat)
    const fill = buildHexFill(layout, hex, defaultFillMat)
    ;(seg as any).userData.hex = hex
    ;(fill as any).userData.hex = hex
    cellGroup.add(seg)
    fillGroup.add(fill)
  }
  return { cells, cellGroup, fillGroup, defaultFillMat, hoverFillMat }
}

function buildHexBorder(layout: Layout, hex: Hex, mat: THREE.LineBasicMaterial) {
  const corners = HexOps.corners(layout, hex)
  const positions: number[] = []
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % corners.length]
    positions.push(a.x, 0, a.y, b.x, 0, b.y)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(geom, mat)
}

function buildHexFill(layout: Layout, hex: Hex, mat: THREE.Material) {
  const corners = HexOps.corners(layout, hex)
  const positions: number[] = []
  for (let i = 1; i < corners.length - 1; i++) {
    const p0 = corners[0]
    const p1 = corners[i]
    const p2 = corners[i + 1]
    positions.push(p0.x, 0, p0.y, p1.x, 0, p1.y, p2.x, 0, p2.y)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.computeVertexNormals()
  return new THREE.Mesh(geom, mat)
}

import * as THREE from 'three'
import { Tween, Easing, update as tweenUpdate } from '@tweenjs/tween.js'
import type { PrismItem } from './types'
import { createLabelSprite, updateLabelSprite } from './prism'
import type { MapControls } from 'three/addons/controls/MapControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

// 树系统：为激活的棱柱生成并展示“文件节点树”，含力导向物理与曲线生长动画

type GraphNode = {
  id: string
  name: string
  sprite: THREE.Sprite
  pinned: boolean
  velocity: THREE.Vector3
  mass: number
  depth: number
  parentId?: string
  // 记录标签目标尺寸，便于生长动画按比例缩放
  targetScale?: THREE.Vector2
}

type GraphEdge = {
  fromId: string
  toId: string
  // 可见对象：使用 THREE.Line + BufferGeometry，支持 drawRange 实现“生长”
  line: THREE.Line
  geom: THREE.BufferGeometry
  color: THREE.Color
  // 动画状态
  growT: { t: number }
}

type TreeInstance = {
  group: THREE.Group
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
  rootId: string
  // 物理参数
  physics: {
    repulsionStrength: number
    springStrength: number
    springRestLength: number
    upwardForce: number
    damping: number
  }
}

function worldPositionOf(obj: THREE.Object3D) {
  const v = new THREE.Vector3()
  obj.getWorldPosition(v)
  return v
}

function makeBezierPoints(p0: THREE.Vector3, p1: THREE.Vector3, segments: number) {
  // 二次贝塞尔：控制点投影到 p1 的垂直线（同 xz，较低的 y）
  // 这样：
  //  - 起点切线 = p0->ctrl，因 y 差小而更“横”；
  //  - 终点切线 = ctrl->p1，因 xz 接近而更“竖”。
  const tY = 0.1 // 控制点 y 接近起点的比例（越小越水平）
  const ctrlY = Math.min(THREE.MathUtils.lerp(p0.y, p1.y, tY), p1.y - 0.1)
  const ctrl = new THREE.Vector3(p1.x, ctrlY, p1.z)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = new THREE.Vector3().lerpVectors(p0, ctrl, t)
    const b = new THREE.Vector3().lerpVectors(ctrl, p1, t)
    const p = new THREE.Vector3().lerpVectors(a, b, t)
    pts.push(p)
  }
  return pts
}

function createGrowingLine(color: THREE.Color, segments: number) {
  const positions = new Float32Array((segments + 1) * 3)
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setDrawRange(0, 0)
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
  const line = new THREE.Line(geom, mat)
  line.renderOrder = 1
  return { line, geom }
}

function randomFileName(idx: number, depth: number) {
  const exts = ['.ts', '.tsx', '.js', '.json', '.cs', '.go', '.py']
  const bases = ['app', 'core', 'utils', 'hooks', 'service', 'api', 'widget', 'store', 'engine', 'scene']
  const base = bases[(idx + depth) % bases.length]
  const ext = exts[(idx * 3 + depth) % exts.length]
  return `${base}-${idx}${ext}`
}

export class TreeSystem {
  private scene: THREE.Scene
  private trees = new Map<string, TreeInstance>()
  // 为了便于节流曲线更新：复用临时数组
  private tmpVec = new THREE.Vector3()
  // 交互依赖
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private controls: MapControls | { enabled: boolean }
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private transformControls: TransformControls
  private transformHelper?: THREE.Object3D
  private selected: { key?: string; nodeId?: string; lockY?: number } = {}

  private detachHandlers: (() => void)[] = []

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, controls: MapControls | { enabled: boolean }) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.controls = controls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
    this.transformControls.setMode('translate')
    this.transformControls.setSpace('world')
    this.transformHelper = this.transformControls.getHelper()
    this.scene.add(this.transformHelper)
    this.hideTransformGizmoVisuals()

    // 在拖拽中禁用相机控制器；并在 change 时锁定 Y 保持水平移动
    const onDraggingChanged = (e: any) => {
      const dragging: boolean = !!e.value
      this.controls.enabled = !dragging
      const obj = this.transformControls.object as THREE.Object3D | null
      if (!obj) return
      // 找到对应节点，开始拖拽时 pin，结束时解除
      let found: { key: string; nodeId: string; node: GraphNode } | null = null
      this.trees.forEach((tree, treeKey) => {
        tree.nodes.forEach((n) => {
          if (!found && n.sprite === obj) {
            found = { key: treeKey, nodeId: n.id, node: n }
          }
        })
      })
      if (!found) return
      const f = found as { key: string; nodeId: string; node: GraphNode }
      if (dragging) {
        this.selected = { key: f.key, nodeId: f.nodeId, lockY: f.node.sprite.position.y }
        f.node.pinned = true
        f.node.velocity.set(0, 0, 0)
      } else {
        f.node.pinned = false
        f.node.velocity.set(0, 0, 0)
        this.selected = {}
      }
    }

    const onChange = () => {
      const obj = this.transformControls.object as THREE.Object3D | null
      if (!obj) return
      if (this.selected.lockY !== undefined) {
        obj.position.y = this.selected.lockY
      }
    }

    this.transformControls.addEventListener('dragging-changed', onDraggingChanged)
    this.transformControls.addEventListener('change', onChange)

    this.detachHandlers.push(() => {
      this.transformControls.removeEventListener('dragging-changed', onDraggingChanged)
      this.transformControls.removeEventListener('change', onChange)
    })

    this.attachPointerHandlers()
  }

  update(nowMs?: number, dtSec?: number) {
    // 推进补间动画
    tweenUpdate(nowMs)
    // 物理更新
    if (dtSec === undefined) return
    this.trees.forEach((tree) => this.stepPhysics(tree, dtSec))
    // 曲线几何跟随节点位置刷新
    this.trees.forEach((tree) => this.updateEdgesGeometry(tree))
  }

  showTreeForPrism(item: PrismItem) {
    const key = item.key
    if (this.trees.has(key)) return // 已存在则不重复生成
    const rootSprite = item.sprite // 根节点使用已有 label sprite
    const rootPos = worldPositionOf(rootSprite)
    const group = new THREE.Group()
    group.name = `tree:${key}`
    this.scene.add(group)

    const nodes = new Map<string, GraphNode>()
    const edges: GraphEdge[] = []

    // 物理参数（可按需调参）
    const physics = {
      repulsionStrength: 3.2,
      springStrength: 2.6,
      springRestLength: 5.2 * 1.5, // 1.5x
      upwardForce: 2.0 * 1.5, // 1.5x
      damping: 0.86,
    }

    // 构建根节点
    const rootId = 'root'
    nodes.set(rootId, {
      id: rootId,
      name: item.functionName || item.label || 'Root',
      sprite: rootSprite,
      pinned: true,
      velocity: new THREE.Vector3(),
      mass: 1,
      depth: 0,
    })

    // 生成假数据（两到三层）
    const level1 = this.spawnChildren(group, nodes, edges, rootId, rootPos, 4 + Math.floor(Math.random() * 3))
    level1.forEach((n, i) => {
      if (Math.random() < 0.85) this.spawnChildren(group, nodes, edges, n.id, worldPositionOf(n.sprite), 2 + (i % 2))
    })

    const tree: TreeInstance = { group, nodes, edges, rootId, physics }
    this.trees.set(key, tree)

    // 生长动画：按层次依次生长
    this.playGrowthAnimation(tree)
  }

  disposeTreeForKey(key: string) {
    const tree = this.trees.get(key)
    if (!tree) return
    // 若当前控件附着在该树的节点上，则先分离
    const attached = this.transformControls.object as THREE.Object3D | null
    if (attached) {
      let belongs = false
      tree.nodes.forEach((n) => {
        if (n.sprite === attached) belongs = true
      })
      if (belongs) this.transformControls.detach()
    }
    this.trees.delete(key)
    // 还原根节点状态（不移除 sprite）
    tree.edges.forEach((e) => {
      e.geom.dispose()
      ;(e.line.material as THREE.Material).dispose()
    })
    // 移除并释放子节点 sprite
    tree.nodes.forEach((n) => {
      if (n.id === tree.rootId) return
      const sm = n.sprite.material as THREE.SpriteMaterial
      if (sm.map) sm.map.dispose()
      sm.dispose()
      tree.group.remove(n.sprite)
    })
    this.scene.remove(tree.group)
  }

  dispose() {
    Array.from(this.trees.keys()).forEach((k) => this.disposeTreeForKey(k))
    // 移除事件
    this.detachHandlers.forEach((fn) => fn())
    this.detachHandlers = []
    if (this.transformHelper) {
      this.scene.remove(this.transformHelper)
      ;(this.transformHelper as any).dispose?.()
      this.transformHelper = undefined
    }
    ;(this.transformControls as any).dispose?.()
  }

  private spawnChildren(group: THREE.Group, nodes: Map<string, GraphNode>, edges: GraphEdge[], parentId: string, parentWorldPos: THREE.Vector3, count: number) {
    const created: GraphNode[] = []
    const parent = nodes.get(parentId)!
    const depth = parent.depth + 1
    const radius = (4.6 + depth * 1.75) * 1.5 // 1.5x 水平散布
    for (let i = 0; i < count; i++) {
      const id = `${parentId}-${i}`
      const name = randomFileName(i, depth)
      const sprite = createLabelSprite(name)
      updateLabelSprite(sprite, name)
      const scaleTarget = new THREE.Vector2(sprite.scale.x, sprite.scale.y)
      sprite.position.copy(parentWorldPos)
      sprite.scale.set(0, 0, 1) // 初始不可见，保持 z=1
      sprite.renderOrder = 3
      group.add(sprite)
      const node: GraphNode = {
        id,
        name,
        sprite,
        pinned: false,
        velocity: new THREE.Vector3(),
        mass: 1,
        depth,
        parentId,
        targetScale: scaleTarget,
      }
      nodes.set(id, node)
      created.push(node)

      // 预设一个目标初始位置：围绕父节点的水平散布，并整体向上
      const ang = ((i + Math.random() * 0.5) / Math.max(1, count)) * Math.PI * 2
      const dx = Math.cos(ang) * radius
      const dz = Math.sin(ang) * radius
      const dy = (2.2 + depth * 1.1 + Math.random() * 0.8) * 1.5 // 1.5x 垂直抬升
      sprite.position.set(parentWorldPos.x + dx, parentWorldPos.y + dy, parentWorldPos.z + dz)

      // 边对象：曲线折线（Line），后续每帧更新点位
      const color = new THREE.Color(0x5aa2ff)
      const { line, geom } = createGrowingLine(color, 48)
      group.add(line)
      const edge: GraphEdge = { fromId: parentId, toId: id, line, geom, color, growT: { t: 0 } }
      edges.push(edge)
    }
    return created
  }

  private playGrowthAnimation(tree: TreeInstance) {
    // 按深度排序，逐层生长
    const edgesByDepth = tree.edges.slice().sort((a, b) => {
      const da = tree.nodes.get(a.toId)!.depth
      const db = tree.nodes.get(b.toId)!.depth
      return da - db
    })
    let delayAcc = 0
    edgesByDepth.forEach((edge, idx) => {
      const depth = tree.nodes.get(edge.toId)!.depth
      const dur = 550 + depth * 120
      const delay = delayAcc + Math.min(400, depth * 150) + (idx % 3) * 90
      new Tween(edge.growT)
        .to({ t: 1 }, dur)
        .delay(delay)
        .easing(Easing.Cubic.Out)
        .onUpdate(() => {
          const totalVertices = (edge.geom.getAttribute('position') as THREE.BufferAttribute).count
          const visible = Math.max(2, Math.floor(totalVertices * edge.growT.t))
          edge.geom.setDrawRange(0, visible)
        })
        .onComplete(() => {
          // 线生长完成，放大子节点
          const child = tree.nodes.get(edge.toId)!
          const from = { s: 0 }
          new Tween(from)
            .to({ s: 1 }, 420)
            .easing(Easing.Back.Out)
            .onUpdate(() => {
              const sx = Math.max(0.0001, from.s) * (child.targetScale?.x || 1)
              const sy = Math.max(0.0001, from.s) * (child.targetScale?.y || 1)
              child.sprite.scale.set(sx, sy, 1)
            })
            .start()
        })
        .start()
      if (idx % 4 === 3) delayAcc += 160 // 形成轻微的波次
    })
  }

  private stepPhysics(tree: TreeInstance, dtSec: number) {
    const nodesArr = Array.from(tree.nodes.values())
    const posArr = nodesArr.map((n) => worldPositionOf(n.sprite))
    const count = nodesArr.length
    const { repulsionStrength, springStrength, springRestLength, upwardForce, damping } = tree.physics

    // 计算力并积分（根节点固定）
    for (let i = 0; i < count; i++) {
      const ni = nodesArr[i]
      if (ni.pinned) continue
      const pi = ni.sprite.position
      const vi = ni.velocity
      // 初始化力为向上
      const force = new THREE.Vector3(0, upwardForce, 0)
      // 斥力（简化 O(N^2)）
      for (let j = 0; j < count; j++) {
        if (i === j) continue
        const pj = posArr[j]
        const dir = this.tmpVec.copy(pi).sub(pj)
        const distSq = Math.max(0.25, dir.lengthSq())
        dir.normalize()
        const mag = repulsionStrength / distSq
        force.addScaledVector(dir, mag)
      }
      // 连边弹簧力（只与父节点简化），目标长度随深度略增
      if (ni.parentId) {
        const parent = tree.nodes.get(ni.parentId)!
        const anchor = worldPositionOf(parent.sprite)
        const dir = this.tmpVec.copy(anchor).sub(pi)
        const dist = dir.length() || 0.0001
        dir.normalize()
        const rest = springRestLength + ni.depth * (0.9 * 1.5) // 1.5x 随深度增长
        const mag = (dist - rest) * springStrength
        force.addScaledVector(dir, mag)
      }
      // 积分
      vi.addScaledVector(force, dtSec / ni.mass)
      vi.multiplyScalar(damping)
      pi.addScaledVector(vi, dtSec)
    }
  }

  private updateEdgesGeometry(tree: TreeInstance) {
    tree.edges.forEach((e) => {
      const from = tree.nodes.get(e.fromId)!.sprite
      const to = tree.nodes.get(e.toId)!.sprite
      const p0 = worldPositionOf(from)
      const p1 = worldPositionOf(to)
      const segments = (e.geom.getAttribute('position') as THREE.BufferAttribute).count - 1
      const pts = makeBezierPoints(p0, p1, segments)
      const pos = e.geom.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        pos.setXYZ(i, p.x, p.y, p.z)
      }
      pos.needsUpdate = true
      e.geom.computeBoundingSphere()
    })
  }

  // ============= 交互：节点选择 + TransformControls 拖拽 =============
  private attachPointerHandlers() {
    const el = this.renderer.domElement

    const getIntersectedNode = (clientX: number, clientY: number): { key: string; nodeId: string; sprite: THREE.Sprite } | null => {
      const rect = el.getBoundingClientRect()
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -(((clientY - rect.top) / rect.height) * 2 - 1)
      this.raycaster.setFromCamera(this.mouse, this.camera)

      // 收集所有可拖拽的 sprite（排除根节点）
      const targets: THREE.Object3D[] = []
      this.trees.forEach((tree) => {
        tree.nodes.forEach((n) => {
          if (n.id === tree.rootId) return
          targets.push(n.sprite)
        })
      })
      if (!targets.length) return null
      const inters = this.raycaster.intersectObjects(targets, false)
      if (!inters.length) return null
      const hit = inters[0].object as THREE.Sprite
      let hitKey: string | undefined
      let hitNode: string | undefined
      this.trees.forEach((tree, key) => {
        tree.nodes.forEach((n) => {
          if (n.sprite === hit) {
            hitKey = key
            hitNode = n.id
          }
        })
      })
      if (!hitKey || !hitNode) return null
      return { key: hitKey, nodeId: hitNode, sprite: hit }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const found = getIntersectedNode(e.clientX, e.clientY)
      if (!found) return
      const tree = this.trees.get(found.key)!
      const node = tree.nodes.get(found.nodeId)!
      if (!node || node.id === tree.rootId) return
      // 附着到 TransformControls，等待用户拖拽手柄
      this.transformControls.attach(found.sprite)
      // 锁定高度（仅在 change 中强制）
      this.selected = { key: found.key, nodeId: found.nodeId, lockY: node.sprite.position.y }
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    el.addEventListener('pointerdown', onPointerDown)
    this.detachHandlers.push(() => {
      el.removeEventListener('pointerdown', onPointerDown)
    })
  }

  private hideTransformGizmoVisuals() {
    if (!this.transformHelper) return
    const helper = this.transformHelper as any
    // 隐藏可视 Gizmo/Helper，仅保留 Picker（透明、但参与射线）
    helper.traverse((obj: any) => {
      if (obj && obj.isTransformControlsGizmo) {
        const hideMap = (map: any) => {
          if (!map) return
          Object.values(map).forEach((o: any) => {
            if (o && typeof o.visible === 'boolean') o.visible = false
          })
        }
        hideMap(obj.gizmo)
        hideMap(obj.helper)

        const makePickerTransparent = (root: any) => {
          if (!root) return
          if (typeof root.traverse === 'function') {
            root.traverse((n: any) => {
              if (n && n.material) {
                n.material.transparent = true
                n.material.opacity = 0.0
                n.material.depthWrite = false
                // 保持可被射线命中
                n.material.visible = true
              }
            })
          }
        }

        const picker = obj.picker
        if (picker) {
          const maybeObjects: any[] = []
          if (typeof picker.traverse === 'function') {
            maybeObjects.push(picker)
          } else {
            Object.values(picker).forEach((o: any) => maybeObjects.push(o))
          }
          maybeObjects.forEach((o) => makePickerTransparent(o))
        }
      }
    })
    // 放大拾取范围，便于无箭头状态下拖拽
    this.transformControls.setSize(1.6)
  }
}

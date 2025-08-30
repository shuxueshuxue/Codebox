# hexagons.ts 使用说明

基于 Red Blob Games 的六边形网格算法（CC0）的小型 TypeScript 实现，并在其上增加了若干常用工具方法 `HexOps`，用于在平面坐标与六边形网格坐标之间转换、生成网格形状、邻接搜索等。

- 位置与坐标：采用立方体坐标（cube coords）`(q, r, s)`，满足不变量 `q + r + s = 0`。
- 渲染与交互：示例 `HexScene.tsx` 展示了在 Three.js 中如何将六边形角点转换为几何、如何从鼠标射线命中点反推网格坐标。

## 目录

- 概念与坐标系
- 核心类与方法
- `HexOps` 扩展
- 与 Three.js 集成要点
- 常见用法示例
- 注意事项

---

## 概念与坐标系

### 立方体坐标（Cube）

- 每个六边形用 `(q, r, s)` 表示，并且 `q + r + s = 0`。
- 距离（边数）为 `(|q| + |r| + |s|) / 2`。

### 轴向坐标（Axial）

- 常用 `(q, r)` 形式，第三个分量可由 `s = -q - r` 推得。
- 本库通过 `HexOps.axialToCube` 和 `HexOps.cubeToAxial` 提供互转。

### 偏移坐标（Offset）与双倍坐标（Doubled）

- `OffsetCoord`：适合与二维栅格互转（分 `q` 偏移与 `r` 偏移两种，且有 `EVEN/ODD` 两个约定）。
- `DoubledCoord`：`qdoubled` / `rdoubled` 两种形式，适合某些布局与算法。

### 布局（Layout）与朝向（Orientation）

- `Layout.flat`：平顶六边形（flat-topped）。
- `Layout.pointy`：尖顶六边形（pointy-topped）。
- `Layout` 负责：
  - 六边形 ↔ 平面像素坐标转换
  - 计算多边形角点
- `size: Point(x, y)` 控制六边形的“半径”（水平方向与竖直方向的缩放）。
- `origin: Point(x, y)` 为像素坐标系的原点偏移。

---

## 核心类与方法

### `class Point { x: number; y: number }`

- 简单二维点。

### `class Hex { q: number; r: number; s: number }`

- 构造时检查不变量 `q + r + s === 0`。
- 基本运算：
  - `add(b) / subtract(b) / scale(k)`
  - `rotateLeft() / rotateRight()`：围绕原点旋转 60°。
  - `neighbor(direction)`：六个方向（0..5）。
  - `diagonalNeighbor(direction)`：对角方向（0..5）。
  - `len()`：到原点距离。
  - `distance(b)`：到另一六边形距离。
  - `round()`：将小数坐标四舍五入回合法的 cube 坐标。
  - `lerp(b, t)`：线性插值（用于插值路径）。
  - `linedraw(b)`：在 A→B 的最短路径上采样整点六边形（含端点）。
- 静态：`Hex.directions`、`Hex.diagonals`。

### `class OffsetCoord { col: number; row: number }`

- 与 cube 坐标互转（q-offset / r-offset 两套）：
  - `qoffsetFromCube(offset, h)` / `qoffsetToCube(offset, oc)`
  - `roffsetFromCube(offset, h)` / `roffsetToCube(offset, oc)`
- 与 doubled 坐标互转：
  - `qoffsetFromQdoubled(offset, dc)` / `qoffsetToQdoubled(offset, oc)`
  - `roffsetFromRdoubled(offset, dc)` / `roffsetToRdoubled(offset, oc)`
- 常量：`OffsetCoord.EVEN = 1`，`OffsetCoord.ODD = -1`。

### `class DoubledCoord { col: number; row: number }`

- 与 cube 互转：
  - `qdoubledFromCube(h)` / `qdoubledToCube()`
  - `rdoubledFromCube(h)` / `rdoubledToCube()`

### `class Orientation`

- 存放从 cube↔ 像素的线性变换系数与起始角，用于 `Layout`。

### `class Layout`

- 构造：`new Layout(orientation, size: Point, origin: Point)`
- 方法：
  - `hexToPixel(h: Hex): Point`
  - `pixelToHexFractional(p: Point): Hex`（小数坐标）
  - `pixelToHexRounded(p: Point): Hex`（取整后的合法坐标）
  - `hexCornerOffset(cornerIndex: number): Point`
  - `polygonCorners(h: Hex): Point[]`（六个角点）
- 预设朝向：`Layout.pointy`、`Layout.flat`。

---

## `HexOps` 扩展

便捷工具集合：

- 坐标互转：
  - `axialToCube(q, r): Hex`
  - `cubeToAxial(hex): { q, r }`
- 标识：
  - `key(hex): string` / `fromKey(key): Hex`
- 邻接与范围：
  - `neighbors(hex): Hex[]`
  - `range(center, radius): Hex[]`（以中心为半径的六边形区域，含中心）
  - `ring(center, radius): Hex[]`（单圈）
  - `spiral(center, radius): Hex[]`（从中心开始到给定半径的所有环）
- 像素/角点：
  - `pixelToHex(layout, x, y): Hex`（等价于 `layout.pixelToHexRounded`）
  - `hexToPixel(layout, hex): Point`
  - `corners(layout, hex): Point[]`
- 别名与辅助：
  - `hexagon(center, radius)` 等价 `range(center, radius)`
  - `rectangleOddR(width, height): Hex[]`（Odd-R 偏移布局下的矩形区域）

---

## 与 Three.js 集成要点

> 参考 `hexagonsjs/src/HexScene.tsx` 中的实际做法。

- 坐标对应：库的 2D 像素坐标 `(x, y)` 通常映射到 Three.js 的 `(X, Z)`，将世界 `Y` 作为“上”。
- 角点转几何（边框线）：

```ts
const corners = HexOps.corners(layout, hex)
const positions: number[] = []
for (let i = 0; i < corners.length; i++) {
  const a = corners[i]
  const b = corners[(i + 1) % corners.length]
  positions.push(a.x, 0, a.y, b.x, 0, b.y)
}
const geom = new THREE.BufferGeometry()
geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
const line = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: 0x999999 }))
```

- 角点转几何（面片，用于填充/拾取）：

```ts
const corners = HexOps.corners(layout, hex)
const positions: number[] = []
for (let i = 1; i < corners.length - 1; i++) {
  const p0 = corners[0],
    p1 = corners[i],
    p2 = corners[i + 1]
  positions.push(p0.x, 0, p0.y, p1.x, 0, p1.y, p2.x, 0, p2.y)
}
const geom = new THREE.BufferGeometry()
geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
const mesh = new THREE.Mesh(geom, material)
```

- 射线拾取回推六边形坐标：

```ts
const raycaster = new THREE.Raycaster()
// 鼠标标准化坐标 -> 相机射线 -> 与 y=0 平面相交
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()
if (raycaster.ray.intersectPlane(plane, hit)) {
  const hex = HexOps.pixelToHex(layout, hit.x, hit.z)
}
```

- 在 `HexScene.tsx` 中：
  - 采用 `Layout.flat`（平顶六边形）。
  - 网格生成：`HexOps.hexagon(centerHex, radius)`。
  - 悬停高亮：为每个六边形生成不可见面片，使用射线相交检测并替换材质实现高亮。
  - 左键生成 3D 六棱柱（`ExtrudeGeometry`，挤出后绕 `X` 轴旋转，使厚度沿世界 `Y`）。

---

## 常见用法示例

### 新建布局、生成区域

```ts
import { Hex, Point, Layout, HexOps } from './hexagons'

const size = new Point(2.5, 2.5)
const layout = new Layout(Layout.flat, size, new Point(0, 0))

const center = new Hex(0, 0, 0)
const cells = HexOps.hexagon(center, 2) // 含中心，半径=2 的区域
```

### 六边形 ↔ 像素坐标

```ts
const p = HexOps.hexToPixel(layout, center) // Point(x, y)
const h = HexOps.pixelToHex(layout, p.x, p.y) // 回到中心 hex
```

### 路径与邻居

```ts
const a = new Hex(0, 0, 0)
const b = new Hex(3, -2, -1)
const path = a.linedraw(b) // 最短路径上的格子序列
const nbs = HexOps.neighbors(a) // 六个方向邻居
```

### 偏移/双倍坐标互转（示意）

```ts
import { OffsetCoord, DoubledCoord } from './hexagons'

const oc = OffsetCoord.qoffsetFromCube(OffsetCoord.ODD, new Hex(1, -2, 1))
const cube = OffsetCoord.qoffsetToCube(OffsetCoord.ODD, oc)

const dc = DoubledCoord.qdoubledFromCube(new Hex(1, -2, 1))
const cube2 = dc.qdoubledToCube()
```

---

## 注意事项

- `Hex` 构造会校验不变量；使用 `round()` 将小数坐标修正为合法 cube 坐标。
- 选择合适的 `Layout` 朝向（`flat`/`pointy`）和 `size`，否则角点与像素映射会不符合预期。
- 偏移坐标的 `EVEN/ODD` 约定需与网格行/列对齐策略一致。
- Three.js 集成时，通常将库的 `(x, y)` 映射到 Three.js 的 `(X, Z)`，将世界 `Y` 作为厚度/高度方向。
- 大规模网格建议复用材质、合并几何或使用 Instancing 以降低开销。

---

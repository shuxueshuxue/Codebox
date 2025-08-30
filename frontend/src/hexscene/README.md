### @hexscene 开发文档

本目录提供了一个基于 three.js 的六边格交互场景，用于在平面六边格网格上放置“棱柱（Prism）”并附带标签与简易“功能”标注交互。其核心由以下模块构成：

- `setup.ts`: three.js 场景、相机、渲染器、控制器与光照的创建与销毁。
- `grid.ts`: 六边格布局与网格（边框线与填充面）的构建。
- `prism.ts`: 单个六边格棱柱与文本标签的创建、激活与更新工具。
- `raycast.ts`: 将屏幕坐标映射到世界平面，再映射到六边格坐标。
- `interactions.ts`: 指针事件（移动/点击/双击/拖放/上下文菜单）与业务事件绑定。
- `useHexScene.ts`: React Hook，封装了完整生命周期与渲染循环。
- `types.ts`: 交互与对象的数据类型定义（`PrismItem`）。

## 快速开始

推荐两种集成方式：

- 方案 A：直接使用封装好的 React 组件 `HexScene`（见 `src/HexScene.tsx`）。
- 方案 B：在自定义组件中使用 `useHexScene`，自行控制容器与对话框联动等。

示例（方案 A）：

```tsx
import HexScene from './HexScene'

export default function Page() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HexScene />
    </div>
  )
}
```

示例（方案 B）：

```tsx
import { useState } from 'react'
import { useHexScene } from './hexscene/useHexScene'

export default function CustomHexPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaults, setDefaults] = useState<{ name?: string; desc?: string }>()
  const ref = useHexScene({
    onRequestFeature: (_hexKey, d) => {
      setDefaults(d)
      setDialogOpen(true)
    },
  })

  return (
    <div
      style={{ width: '100vw', height: '100vh' }}
      ref={ref}
    />
  )
}
```

## 运行时行为与交互映射

- 摄像机与控制器（`OrbitControls`）：

  - 左键：平移（PAN）
  - 右键：旋转（ROTATE）
  - 中键/滚轮：缩放（DOLLY）

- 六边格网：由 `grid.ts` 生成两组对象：

  - `cellGroup`（线段）：展示网格边框。
  - `fillGroup`（面片）：用于命中测试与 hover 高亮。

- 棱柱与标签：

  - 棱柱使用 `MeshPhysicalMaterial`，具备半透明与 clearcoat/transmission 玻璃感。
  - 标签为 `THREE.Sprite`，由 `canvas` 动态绘制，支持清晰缩放与阴影。

- 默认交互（见 `interactions.ts`）：
  - 指针移动：高亮当前命中的六边格填充面。
  - 左键单击：若该格未放置棱柱，则放置一个棱柱。
  - 右键单击：若该格已有棱柱，则移除（并正确释放几何体/材质/纹理）。
  - 双击：若该格已有棱柱，则请求编辑其“功能名称/描述”（详见下文业务事件）。
  - 拖拽放置（drag & drop 文本）：在已有棱柱上设置 `fileName`，若尚无功能名，则用作临时标签。
  - 上下文菜单：被禁用（`contextmenu.preventDefault()`）。

## 业务事件与表单联动

当用户双击已放置棱柱时：

- 若 `useHexScene` 传入了 `onRequestFeature` 回调，则由宿主应用打开表单并在提交后回填；
- 否则直接使用 `prompt` 简单收集名称与描述并调用 `activatePrism`。

宿主应用提交表单后，通过窗口事件回填：

```ts
window.dispatchEvent(
  new CustomEvent('feature:confirm', {
    detail: { hexKey: 'q,r,s', name: '功能名称', desc: '可选描述' },
  })
)
```

`interactions.ts` 会监听该事件并调用 `activatePrism`：

- 将棱柱材质变为激活态（绿色、完全透射等），
- 记录 `functionName/description`，
- 更新标签文字为功能名。

## 坐标系与网格布局

- 世界坐标系采用 three.js 默认：Y 轴朝上，六边格位于 XZ 平面。
- 射线拾取使用 `raycast.ts`：将屏幕坐标投射到 `y=0` 平面得到命中点 `(x,z)`，再由 `HexOps.pixelToHex` 转换为六边格坐标。
- `grid.ts` 的 `createLayout()` 使用 `Layout.flat`（平顶）与尺寸 `(2.5, 2.5)`。如需更改边长或改为尖顶（`Layout.pointy`），可在此调整。

## 模块 API 参考

### setup.ts

- `createScene(container: HTMLDivElement, width?: number, height?: number)` → `{ scene, camera, renderer, controls, cleanup }`
  - 创建 three.js 基础对象，附带环境贴图、辅助网格与地面；返回 `cleanup` 负责释放资源与移除挂载的 canvas。

### grid.ts

- `createLayout()` → `Layout`
- `createHexGrid(layout: Layout, radius: number)` → `{ cells, cellGroup, fillGroup, defaultFillMat, hoverFillMat }`
  - `radius` 为六边形半径（以格为单位），同时产出供命中测试用的填充面组与两种材质（默认/高亮）。

### prism.ts

- `hexKey(hex: Hex)` → `string`：以 `q,r,s` 形成哈希键。
- `buildBeveledPrism(layout: Layout, hex: Hex)` → `THREE.Mesh`：构建带倒角的六边形挤出体。
- `createLabelSprite(text?: string)` → `THREE.Sprite`：创建标签精灵（初始隐藏）。
- `updateLabelSprite(sprite: THREE.Sprite, text: string)`：将文本绘制到 `canvas` 并更新为 `Sprite` 纹理，自动计算世界尺寸与显示。
- `buildPrismObject(layout: Layout, hex: Hex)` → `PrismItem`：打包为 `Group`（包含 `mesh` 与 `sprite`），并计算标签摆放高度。
- `activatePrism(item: PrismItem, functionName: string, description?: string | null)`：设为激活态并更新标签。

### raycast.ts

- `hexAtClientXY(renderer, camera, layout, clientX, clientY)` → `Hex | null`：屏幕坐标 → 世界平面 → 六边格。

### interactions.ts

- `attachInteractions(opts)` → `() => void`
  - `opts` 关键字段：
    - `renderer, camera, layout`：拾取与转换所需对象。
    - `fillGroup, defaultFillMat, hoverFillMat`：高亮逻辑所需对象与材质。
    - `prismGroup, placed: Map<string, PrismItem>`：放置/删除/双击定位等依赖。
    - `onRequestFeature?: (hexKey: string, defaults?: { name?: string; desc?: string }) => void`：表单联动。
  - 返回的函数用于移除事件监听。

### types.ts

- `PrismItem`：
  - `hex, key, group, mesh, sprite`
  - `label?, functionName?, description?, fileName?, isActivated?`

### useHexScene.ts

- `useHexScene({ width?, height?, onRequestFeature? })` → `Ref<HTMLDivElement>`
  - 内部流程：创建场景 → 生成网格 → 随机初始化少量棱柱 → 绑定交互 → 启动渲染循环与窗口自适应 → 卸载时完整清理。

## 可定制点

- 主题与材质：

  - 背景、地面与光照定义在 `setup.ts`，可调整色值与强度以适配浅色/深色主题。
  - 网格线材质与填充材质在 `grid.ts`，高亮颜色/透明度可调。
  - 棱柱材质在 `prism.ts`，可按需调整 `roughness/metalness/transmission/clearcoat` 等。

- 六边形布局与尺寸：

  - 修改 `createLayout()` 的 `Layout` 类型与 `size` 以改变格子大小与朝向。
  - 修改 `useHexScene` 中的 `radius` 控制网格范围与初始化棱柱数量的上限。

- 标签样式：

  - 重写或拷贝 `updateLabelSprite` 调整字体、圆角、阴影与配色；注意同步更新纹理过滤与世界尺寸计算。

- 交互策略：
  - 默认左键放置、右键删除、双击编辑；如需改动，可在 `interactions.ts` 调整对应分支逻辑。

## 资源释放与性能

- 事件解绑：`attachInteractions` 返回的 `detach()` 会在 Hook 卸载时调用。
- three.js 资源：
  - 删除棱柱时会主动 `dispose()` 几何体、材质与 `SpriteMaterial.map` 纹理。
  - 场景卸载时 `cleanup()` 会释放 PMREM 与渲染器并移除 DOM。
- 渲染循环：`requestAnimationFrame` 在组件卸载时取消。

## 已知限制

- hover/点击检测基于 `fillGroup` 的面片，若自行改动图层分组需保持拾取对象正确。
- 射线直接投向 `y=0` 平面，不考虑物体遮挡；如需“被棱柱遮挡时不可点击后方格子”，需改造拾取策略。
- 当前未内置多选、拖动移动棱柱等编辑功能，可按需要在 `interactions.ts` 扩展。

## 依赖环境

- three `^0.179.x`
- React `^19.x`
- 构建：Vite + TypeScript

如需进一步封装/自定义，建议从 `useHexScene` 与 `interactions.ts` 两处入手。

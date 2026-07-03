# ADR-03：core 补齐任意轮廓 `contour` shape——让正交投影生成的图元仍是可连接 Node

> 起源：跨包能力请求（plot → core，2026-06-15）。原作为仓库根独立 note 提出，现迁入本 milestone 为 **alpha.3 ADR-03**，与路径补强（[ADR-01](./01-polyline-rounded-corners.md) / [ADR-02](./02-smooth-curve-through-points.md)）一并实现——三者共享 core `geometry/contour.ts` 轮廓引擎（ADR-01 扩开放折线 seam，ADR-03 复用闭合顶点环路径，互不冲突）。

- 状态：Accepted（2026-06-16 收尾：builtin `contour` shape 已实现 + 文档同步 + 评审/对账通过；自动按 AABB 中心居中、compass anchor 回退 AABB、`boundaryPoint` 精确。plot 侧消费归 plot alpha.11）
- 决策日期：2026-06-15
- 发起方：plot（Tier 2），消费方需求见 [plot v0.1 roadmap alpha.11](../../../../../../viz/_notes/decisions/v0/v0.1/roadmap.md)
- 关联：[alpha.3 roadmap](./roadmap.md) · [alpha.3 ADR-01 任意折线圆角（同享 contour fillet 引擎）](./01-polyline-rounded-corners.md) · [plot-design §8.3 mark 几何 × coordinate](../../../../../../viz/_notes/architecture/plot-design.md) · [plot-design §8.1 id 绑定与可连接性](../../../../../../viz/_notes/architecture/plot-design.md) · core `geometry/contour.ts` · core `shapes/polygon.ts`

## 背景

塑造本决策的硬约束：

- plot 把区间类 mark（`interval` / `rect` / `sector`）下沉成 core 图元时，几何 = `f(mark 类型, 坐标系)`：cartesian2D bar 走 `rectangle`、polar2D bar / rose 走 `sector`。这成立是因为「正交 cell `[u0,u1]×[v0,v1]` 经坐标系投影后的边界」恰好是 core 已注册的闭式 shape（轴对齐矩形 / 环楔）。
- plot 支持自定义坐标系后，x 轴可以是曲线，正交 cell 投影出一个四边可能都弯的「旗帜形」曲边四边形——core 没有、也不该有这种闭式 shape，于是 custom / ternary2D / 1D 坐标系下的 interval / sector 只能 fail-loud，曲线轴上画不出柱子。
- raw `Path` 能描出这条闭合轮廓，但 `Path` 不是 Node：没有 shape 的 `anchor` / `boundaryPoint`，就丢掉「连一条线指向第 3 根柱顶 / 取它的边界交点」这种 plot-design §8.1 列为硬约束的可连接性。
- core 里「可连接」不是 Node 自带，而是 Node 所挂 shape 提供的 `anchor` + `boundaryPoint` 两个函数。射线 ∩ 任意轮廓的全部数学（`geometry/contour.ts` 的 `boundaryFromContour` + fillet 引擎）已被 polygon / star / sector / rectangle 共享，唯独缺一个「接受任意顶点环作 params」的注册 shape（`polygon` 是正多边形，params 是 `sides`/`rotate`，喂不进投影顶点）。

## 决策：core 新增 builtin 参数化 shape `contour`，吃任意闭合顶点环，复用现有轮廓引擎实现 emit / boundaryPoint / fillet

新增一个几何驱动（非文本容器）的注册 shape `contour`，per-instance params 为一圈**局部系顶点**（隐式闭合）+ 可选 `cornerRadius`。它通过实现 `ShapeDefinition` 的 `anchor` + `boundaryPoint`，使「正交投影出来的任意轮廓」挂到 Node 上后**与 rectangle / sector 同等可连接**；`emit` / `boundaryPoint` / 圆角全部委托现有 `geometry/contour.ts` + `shapes/contour.ts` helper（与 `polygon` 同一条实现路径，仅顶点来源不同：polygon 由 rect+sides 推导，contour 直接取 params）。

**core 自动居中**（2026-06-15 拍板，去 footgun）：`points` 可在**任意局部原点**给出，core 按其 **AABB 中心**自动归一化——把 Node `position` 对齐到轮廓的几何（AABB）中心，调用方**无需预居中**。机制 = shape 内部对每个顶点减去 `aabbCenterOf(points)` 再 `localToWorld`，rect 仍中心在 position（`circumscribeOffset` 维持 `[0,0]`）。这复用 `circumscribeOffset` 的本职取向（让 bbox/anchor 罩住完整形状），但把归一化收进 shape，schema 防不住的「未居中」隐患从此不存在。

IR 层**零改动**：`ir/shape.ts` 的 `ShapeRefSchema.type` 已是开放字符串、参数化 shape 走 `{ type, params }`，故 `contour` 只是又一个注册项，不动 `ir/node.ts` 的 `BuiltinShape` 常量（那只管 4 个有字符串简写的具名 shape）。params 校验复用 compile/node.ts 现有**双护栏**（先 `JsonObjectSchema.parse(raw params)` 守 JSON-safe，再 `paramsSchema.parse` 校验字段），本 ADR **不改 compile/node.ts**。

核心 params（字面形态即决策——任意原点顶点环 + 可选统一圆角）：

```ts
type ContourParams = {
  /** 闭合顶点环（局部系，任意原点——core 按 points 的 AABB 中心自动归一化对齐到 Node position），≥3，隐式闭合；段间直线 */
  points: Array<Position>;       // Position = [number, number]
  /** 逐顶点统一 fillet 半径（user units，可选，逐角夹紧）；省略 / 0 = 尖角。复用 rounded-contour */
  cornerRadius?: number;
};
```

各 hook 的实现取向：`circumscribe` 由 `points` 的 AABB 半边算（平移不变）、`circumscribeOffset` 维持 `[0,0]`（rect 中心仍在 position）；`emit` / `boundaryPoint` 内部对每顶点减 `aabbCenterOf(points)` 再 `localToWorld`（自动居中），段化后委托 `geometry/contour.ts`；`anchor` 返回 `undefined`（compass 名回退外接 AABB）；`scaleParams` 把 `points` 按轴各向异性缩、`cornerRadius` 按几何均值缩（同 polygon）。注册进 `BUILTIN_SHAPES` 并从 `src/index.ts` re-export 为公开 API。

理由：

1. **可连接性是 §8.1 硬约束，不能为「支持曲线轴」而牺牲**。raw Path 丢 anchor，contour shape 经 `boundaryPoint` 保住「指向式连接」（连一条线指向这个图元、取边界交点），让曲线轴上的柱/格仍是一等可连接 Node。
2. **能力归 core、不在 plot 自造**（AGENTS.md：子组遇 core 表达不了的通用能力先补 core，不绕开 IR/Scene 造平行渲染）。plot 只负责算正交 cell 的边界顶点，渲染 + 连接 + 圆角全归 core。
3. **近乎零新几何**：emit / boundaryPoint / fillet 全部复用 `geometry/contour.ts`（`boundaryFromContour` / `contourCommands`）+ `shapes/contour.ts`（`verticesToSegments` / `contourToPathCommands` / `contourToPathPrimitive`），`polygon` 就是这条路径的现成范例。renderer 无需改动——emit 仍出 `PathPrim`。
4. **IR 零改动**：`ShapeRefSchema.type` 已开放，contour 走 `{type:'contour', params}`，对既有 IR / 序列化 / 反序列化透明。
5. **通用价值超出 plot**：「任意路径当 node 形状」是 TikZ 早有的表达力（任意 shape 作 node），core 拥有它对 graph / 自定义图元等后续 Tier 2 都有用，不是 plot 专用桥。

关键取舍（理由，非候选清单）：

- **params = 纯顶点环 `points`（全直线边），v1 不收 `segments`**：足以承载「密采样曲边」兜底形态（plot 把弯边采样成多点），params 紧凑、不把 contour 做成第二套 path DSL。精确弧边变体留后续，见「不在本 ADR 范围」。
- **`cornerRadius` = 每顶点统一圆角**：core 对每个顶点都 fillet（真尖角精确倒、密采样近共线顶点退化≈no-op）。契约：调用方控制顶点存在性（想只在真角倒角就别密采样直边），core 不自动识别真角。per-vertex 不同半径留后续。
- **命名 anchor 暂不做**：`anchor` 返回 `undefined` → compile 回退外接 AABB（star/sector/arc 同此）；`boundaryPoint`（指向式）始终精确命中轮廓。语义锚点（base/top）后续按需另议。
- **`points` 坐标系 = core 自动居中**：调用方在任意局部原点给点，core 按 AABB 中心归一化、Node position = 几何中心，无需预居中 / 无需 helper——schema 防不住的「未居中」隐患从此不存在。
- **builtin（非扩展 shape）**：每个 consumer（react / vanilla / SSR）直接可用，无需各自 `CompileOptions.shapes` 注入。

> 实现：core `e43809f8`（contour 注册 + paramsSchema + spec）→ `cddea5fe`（几何实现：自动按 AABB 中心居中 + 复用轮廓引擎），清理 `8b9f60da`；测试 `packages/kernel/core/tests/shapes/contour.test.ts`；最终 schema / 行为以代码为准。

## DSL 表面

字面形态即决策：contour 是纯 `shape` ref（`{ type:'contour', params }`），不引入新 step / `way` 文法；它仍是 Node，所以另一条 Path 能按 id 连到它（`boundaryPoint` 给射线 ∩ 轮廓交点）——这正是本 ADR 的主目标。

```tsx
// 任意轮廓直接当 node 形状（局部系顶点，任意原点——core 自动按 AABB 中心居中），可圆角
<Node
  position={[0, 0]}
  shape={{ type: 'contour', params: { points: [[-24, 40], [24, 28], [24, -40], [-24, -40]], cornerRadius: 4 } }}
  fill="steelblue"
/>
// 它仍是 Node：<Path> 里 line to 此节点 → boundaryPoint 给射线 ∩ 轮廓交点
```

react `<Node shape>` 与 vanilla `node({ shape })` 是同一字段、同一 zod schema 的两种写法，天然对等。完整双语示例见文档站 contour shape 页。

> plot 侧消费形态归 plot alpha.11，不在本 ADR。

## 影响

- **对外 API**：新增公开 shape `contour` + 其 params（`points` / `cornerRadius`），非 breaking（纯新增）；IR 无 schema 改动（`ShapeRefSchema.type` 已开放）、renderer 无改动（emit 出既有 `PathPrim`）、适配器透传现有 `IRShapeRef`。
- **与 alpha.3 ADR-01 协同**：两者都用 `geometry/contour.ts`——ADR-01 修改它（加开放折线 seam），ADR-03 只读它（闭合顶点环走现有闭合路径，同 polygon）；ADR-01 须保证现有闭合 seam 语义不回退。不同入口，无 merge 冲突。

## 不在本 ADR 范围

- **plot 侧 lowering 规则**：「坐标系声明投影后 cell 是闭式 shape（走 rectangle/sector）还是退 contour」的三级阶梯、坐标系声明契约 → 归 **plot alpha.11**，另起 plot ADR。本 ADR 只交付 core 这块使能图元。
- **精确弧边 params**（`segments: Array<Line|Arc>`）：后续**加** `segments` 变体扩展，不改 `points` 语义。
- **语义命名 anchor**（base/top/边中点等曲边块专属锚点）：后续按需。
- **小 IR 优化**：contour 是 O(顶点) IR，不解决 plot-design §16.1 软肋 #1（高基数 O(N) Node）；密采样曲线柱 IR 偏大，采样密度旋钮归 plot 侧。

> 🔖 本文件压缩前完整施工蓝图 = `git show fd0a8598:_notes/decisions/core/v0/v0.4/alpha.3/03-core-contour-shape.md`（封板全文）。

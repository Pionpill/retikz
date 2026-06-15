# ADR-03：core 补齐任意轮廓 `contour` shape——让正交投影生成的图元仍是可连接 Node

> 起源：跨包能力请求（plot → core，2026-06-15）。原作为仓库根独立 note 提出，现迁入本 milestone 为 **alpha.3 ADR-03**，与路径补强（[ADR-01](./01-polyline-rounded-corners.md) / [ADR-02](./02-smooth-curve-through-points.md)）一并实现——三者共享 core `geometry/contour.ts` 轮廓引擎（ADR-01 扩开放折线 seam，ADR-03 复用闭合顶点环路径，互不冲突）。

- 状态：Proposed
- 决策日期：2026-06-15
- 发起方：plot（Tier 2），消费方需求见 [plot v0.1 roadmap alpha.11](../../../../plot/v0/v0.1/roadmap.md)
- 关联：[alpha.3 roadmap](./roadmap.md) · [alpha.3 ADR-01 任意折线圆角（同享 contour fillet 引擎）](./01-polyline-rounded-corners.md) · [plot-design §8.3 mark 几何 × coordinate](../../../../../architecture/plot-design.md) · [plot-design §8.1 id 绑定与可连接性](../../../../../architecture/plot-design.md) · core `geometry/contour.ts` · core `shapes/polygon.ts`

## 背景

plot 把 mark 下沉成 core 图元时，区间类 mark（`interval` / `rect` / `sector`）的几何 = `f(mark 类型, 坐标系)`。现状（`packages/plot/plot/src/lower/mark.ts`）：

- **cartesian2D bar** → core Node + `rectangle` shape（`barStyle`，`mark.ts:89`）。
- **polar2D bar / rose** → core Node + `sector` shape（`sectorNode`，`mark.ts:199`）。

这两条之所以成立，是因为「数据空间的正交 cell `[u0,u1]×[v0,v1]` 经坐标系投影后的边界」**恰好是 core 已注册的闭式参数化 shape**（轴对齐矩形 / 环楔）。但 plot 已支持自定义坐标系（alpha.9 的 `projectRoles` / `frameAlong`），**当 x 轴是一条曲线时，正交 cell 投影出来是一个四边可能都弯的「旗帜形」曲边四边形，core 没有、也不该有这种闭式 shape**。于是现在的代码对 custom / ternary2D / 1D 坐标系下的 interval / sector 直接 fail-loud（`mark.ts:488-498`，只放行 point）——曲线轴上根本画不出柱子。

通用解法（plot-design §8.3 路线 (i)）是：**让坐标系把正交 cell 的边界投影到屏幕，描成一条闭合轮廓**。core 的 `Path` 完全能表达这条轮廓（12 种 step，含 `line` / `arc` / `cubic`）。**但 raw `Path` 不是 Node**——它没有 shape 的 `anchor` / `boundaryPoint`，于是丢掉「连一条线指向第 3 根柱顶 / 取它的边界交点」这种 §8.1 列为硬约束的可连接性，连接只能退到 plot 维护的 datum 锚点（line / area 现状即如此）。

矛盾点：core 里「可连接」不是 Node 自带，而是 **Node 所挂 shape 提供的两个函数**（`shapes/types.ts` 的 `anchor` + `boundaryPoint`）。要让「正交投影生成的曲边块」仍可连接，它必须是 **Node + 一个能吃任意边界的 shape**。core 已经有这件事的全部数学——`geometry/contour.ts` 的 `boundaryFromContour`（射线 ∩ 任意 Line/Arc 段轮廓）+ 圆角 fillet 引擎，被 polygon / star / sector / rectangle 共享——**唯独缺一个「接受任意顶点环作 params」的注册 shape**（现有 `polygon` 是正多边形，params 是 `sides`/`rotate`，喂不进投影顶点）。

## 决策：core 新增 builtin 参数化 shape `contour`，吃任意闭合顶点环，复用现有轮廓引擎实现 emit / boundaryPoint / fillet

新增一个几何驱动（非文本容器）的注册 shape `contour`，per-instance params 为一圈**局部系顶点**（隐式闭合）+ 可选 `cornerRadius`。它通过实现 `ShapeDefinition` 的 `anchor` + `boundaryPoint`，使「正交投影出来的任意轮廓」挂到 Node 上后**与 rectangle / sector 同等可连接**；`emit` / `boundaryPoint` / 圆角全部委托现有 `geometry/contour.ts` + `shapes/contour.ts` helper（与 `polygon` 同一条实现路径，仅顶点来源不同：polygon 由 rect+sides 推导，contour 直接取 params）。

**core 自动居中**（2026-06-15 拍板，去 footgun）：`points` 可在**任意局部原点**给出，core 按其 **AABB 中心**自动归一化——把 Node `position` 对齐到轮廓的几何（AABB）中心，调用方**无需预居中**。机制 = shape 内部对每个顶点减去 `aabbCenterOf(points)` 再 `localToWorld`，rect 仍中心在 position（`circumscribeOffset` 维持 `[0,0]`）。这复用 `circumscribeOffset` 的本职取向（让 bbox/anchor 罩住完整形状），但把归一化收进 shape，schema 防不住的「未居中」隐患从此不存在。

IR 层**零改动**：`ir/shape.ts` 的 `ShapeRefSchema.type` 已是开放字符串、参数化 shape 走 `{ type, params }`，故 `contour` 只是又一个注册项，不动 `ir/node.ts` 的 `BuiltinShape` 常量（那只管 4 个有字符串简写的具名 shape）。params 校验复用 compile/node.ts 现有**双护栏**（先 `JsonObjectSchema.parse(raw params)` 守 JSON-safe，再 `paramsSchema.parse` 校验字段），本 ADR **不改 compile/node.ts**。

```ts
// 新建 packages/core/core/src/shapes/contour-shape.ts
type ContourParams = {
  /** 闭合顶点环（局部系，任意原点——core 按 points 的 AABB 中心自动归一化对齐到 Node position），≥3，隐式闭合；段间直线 */
  points: Array<Position>;       // Position = [number, number]
  /** 逐顶点统一 fillet 半径（user units，可选，逐角夹紧）；省略 / 0 = 尖角。复用 rounded-contour */
  cornerRadius?: number;
};

// AABB 中心；core 用它自动居中（调用方无需预居中）
const aabbCenterOf = (points: Array<Position>): Position => { /* min/max → 中点 */ };

export const contour = defineShape({
  paramsSchema: z.strictObject({
    points: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(3)
      .describe('Closed local-frame vertex ring (any local origin — core auto-centers on the points\' AABB center so Node position aligns to the geometric center; no caller pre-centering needed), >=3 points; edges are straight lines, last point auto-connects to first.'),
    cornerRadius: z.number().finite().nonnegative().optional()
      .describe('Uniform per-vertex fillet radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.'),
  }),
  // 几何驱动：AABB 半边由 points 算（平移不变，无需先居中）；rect 中心维持在 position
  circumscribe: (_hw, _hh, params) => halfExtentsOf(params.points),
  circumscribeOffset: () => [0, 0],
  boundaryPoint: (rect, toward, params) => {
    const c = aabbCenterOf(params.points);
    const verts = params.points.map(p => localToWorld(rect, point.sub(p, c))); // 减 AABB 中心 = 自动居中
    const segments = verticesToSegments(verts);
    const center: Position = [rect.x, rect.y];
    return boundaryFromContour(segments, params.cornerRadius, center, toward) ?? center;
  },
  // compass 名交回退（compile 回退到外接 AABB rect）；曲边块上没有有意义的真·命名方位
  anchor: () => undefined,
  *emit (rect, style, round, params) {
    const c = aabbCenterOf(params.points);
    const verts = params.points.map(p => localToWorld(rect, point.sub(p, c)));
    const segments = verticesToSegments(verts);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);
    yield contourToPathPrimitive(commands, style);
  },
  // points 是长度（按轴各向异性缩）；cornerRadius 是长度（几何均值因子，同 polygon）
  scaleParams: (params, sx, sy) => ({
    points: params.points.map(([x, y]) => [x * sx, y * sy]),
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) }),
  }),
});
```

```ts
// packages/core/core/src/shapes/index.ts —— 注册
export const BUILTIN_SHAPES: Record<
  Exclude<BuiltinShapeName, 'circle' | 'diamond'> | 'sector' | 'arc' | 'polygon' | 'star' | 'contour',
  ShapeDefinition
> = { rectangle, ellipse, sector, arc, polygon, star, contour };
export { contour };
// 并在 packages/core/core/src/index.ts re-export contour（公开 API）
```

理由：

1. **可连接性是 §8.1 硬约束，不能为「支持曲线轴」而牺牲**。raw Path 丢 anchor，contour shape 经 `boundaryPoint` 保住「指向式连接」（连一条线指向这个图元、取边界交点），让曲线轴上的柱/格仍是一等可连接 Node。
2. **能力归 core、不在 plot 自造**（AGENTS.md：子组遇 core 表达不了的通用能力先补 core，不绕开 IR/Scene 造平行渲染）。plot 只负责算正交 cell 的边界顶点，渲染 + 连接 + 圆角全归 core。
3. **近乎零新几何**：emit / boundaryPoint / fillet 全部复用 `geometry/contour.ts`（`boundaryFromContour` / `contourCommands`）+ `shapes/contour.ts`（`verticesToSegments` / `contourToPathCommands` / `contourToPathPrimitive`），`polygon` 就是这条路径的现成范例。renderer 无需改动——emit 仍出 `PathPrim`。
4. **IR 零改动**：`ShapeRefSchema.type` 已开放，contour 走 `{type:'contour', params}`，对既有 IR / 序列化 / 反序列化透明。
5. **通用价值超出 plot**：「任意路径当 node 形状」是 TikZ 早有的表达力（任意 shape 作 node），core 拥有它对 graph / 自定义图元等后续 Tier 2 都有用，不是 plot 专用桥。

## 已定决策（2026-06-15 多 LLM 评审 + 人工拍板）

> 原「待决策点」四项的倾向经外部评审 decision 建议背书，已全部拍板，并入决策；genuinely 延后项见「不在本 ADR 范围」。

- **params = 纯顶点环 `points`（全直线边），v1 不收 `segments`**：足以承载「密采样曲边」兜底形态（plot 把弯边采样成多点），params 紧凑、不把 contour 一次做成第二套 path DSL。**精确弧边**（`Array<LineSegment | ArcSegment>`，对齐 `ContourSegment`）留后续**加** `segments` 变体，不改 `points` 语义——见「不在本 ADR 范围」。
- **`cornerRadius` = 每顶点统一圆角**，与 ADR-01/02 共用 contour fillet helper。core 对**每个顶点**都 fillet：真尖角精确倒、密采样近共线顶点退化≈no-op。**契约：调用方（plot）控制顶点存在性**（想只在真角倒角，就别密采样直边）；core 不自动识别真角。per-vertex 不同半径留后续。
- **命名 anchor 暂不做**：`anchor` 返回 `undefined` → compile 回退外接 AABB（已验证：`shapes/types.ts:63-69` 契约 + `compile/node.ts:298-316` fallback，star/sector/arc 同此）。`boundaryPoint`（指向式）**始终精确命中轮廓**。语义锚点（base/top）后续按需另议。此行为在 ADR 与测试（`contour-anchor-fallback`）写清。
- **`points` 坐标系 = core 自动居中**：调用方在任意局部原点给点，core 按 AABB 中心归一化、Node position = 几何中心，**无需预居中 / 无需 helper**（见「决策」段机制）。测试 `contour-offcenter-autocentered` 覆盖未居中点集。
- **builtin（非扩展 shape）**：每个 consumer（react / vanilla / SSR）直接可用，无需各自 `CompileOptions.shapes` 注入。

## DSL 表面

```tsx
// 任意轮廓直接当 node 形状（局部系顶点，任意原点——core 自动按 AABB 中心居中），可圆角
<Node
  position={[0, 0]}
  shape={{
    type: 'contour',
    params: {
      points: [[-24, 40], [24, 28], [24, -40], [-24, -40]], // 一个「旗帜形」曲边块的顶点
      cornerRadius: 4,
    },
  }}
  fill="steelblue"
/>

// 关键价值：它仍是 Node —— 另一条 Path 能连到它（boundaryPoint 给射线 ∩ 轮廓交点）
<Path>
  <Step kind="move" to="originNode" />
  <Step kind="line" to={{ node: 'thatContourNode' }} />
</Path>
```

vanilla（`node` builder；与 react 同消费 `IRShapeRef`，零漂移）：

```ts
import { figure, node, draw } from '@retikz/vanilla';

const fig = figure([
  node('flag', {
    position: [0, 0],
    shape: {
      type: 'contour',
      params: {
        points: [[-24, 40], [24, 28], [24, -40], [-24, -40]],
        cornerRadius: 4,
      },
    },
    fill: 'steelblue',
  }),
  // flag 仍是 Node —— way 里直接按 id 连到它，boundaryPoint 给射线 ∩ 轮廓交点
  draw(['(origin)', '(flag)']),
]);
```

### 适配器对等说明

contour 是纯 `shape` ref（`{ type:'contour', params }`），不引入新 step / `way` 文法——react `<Node shape>` 与 vanilla `node({ shape })` 是同一字段、同一 zod schema 的两种写法，天然对等，无需额外 sugar。

> plot 侧消费形态（仅示意，归 plot alpha.11，不在本 ADR）：曲线坐标系把正交 cell 投影 + 密采样成 `points` → `lowerInterval` / `lowerRect` 产 `Node + {type:'contour', params}`，曲线轴上的柱状图 / heatmap 格因此仍可被同级 Path 连接、标注。

## 测试设计

`packages/core/core/tests/shapes/contour.test.ts`（新建）覆盖：

- emit 路径命令正确性（含尖角 / 圆角两态、与 polygon/rectangle 同源 fillet）
- boundaryPoint 射线求交（凸 / 凹轮廓、圆角后轮廓）
- circumscribe AABB / scaleParams 各向异性缩放
- 与 Node rotate / scale / compile 回退 anchor 的交互
- schema 拒绝非法 params

具体 case 拆分见下「实现契约 § 测试象限」。

## 影响

- **新增文件**：`packages/core/core/src/shapes/contour-shape.ts`（shape 定义）。
- **与 alpha.3 ADR-01 协同**：两者都依赖 `geometry/contour.ts`——ADR-01 **修改**它（加开放折线 seam 支持），ADR-03 **只读**它（闭合顶点环走现有闭合路径，同 polygon）。并行实现时 ADR-01 的改动须保证现有闭合 seam 语义不回退（其测试已含闭合 contour 回归），ADR-03 不动该文件。无 merge 冲突风险（不同入口）。
- **适配器零改动**：contour 是开放 `ShapeRefSchema.type` 的又一注册项，react `<Node shape>` / vanilla `node({ shape })` 透传现有 `IRShapeRef`，无需各自加代码（若两侧 shape prop 类型恰为闭合 union，需顺手放开为 `IRShapeRef`——属同字段类型放宽，非新表面）。
- **改动**：`packages/core/core/src/shapes/index.ts`（注册 `contour` + 扩 `BUILTIN_SHAPES` key 类型）；`packages/core/core/src/index.ts`（re-export `contour`）。
- **IR**：无 schema 改动（`ShapeRefSchema.type` 已开放字符串）。
- **renderer**：无改动（emit 出既有 `PathPrim`）。
- **文档站**：`apps/docs/src/contents/core/components/shapes/contour/` 新增 `contour` 页（双语 + 「任意轮廓当可连接 node / 自动居中」demo + 「连到 contour」demo）；shapes 分组页 + 总览 demo 收录；标注「命名 anchor 回退 AABB、`boundaryPoint` 精确、core 自动按 AABB 中心居中」。
- **对外 API**：新增公开 shape `contour` + 其 params（`points` / `cornerRadius`）。非 breaking（纯新增）。

## 不在本 ADR 范围

- **plot 侧 lowering 规则**：「坐标系声明投影后 cell 是闭式 shape（走 rectangle/sector）还是退 contour」的三级阶梯、坐标系声明契约 → 归 **plot alpha.11**，另起 plot ADR。本 ADR 只交付 core 这块使能图元。
- **精确弧边 params**（`segments: Array<Line|Arc>`）：见上「已定决策」第 1 条，后续**加** `segments` 变体扩展。
- **语义命名 anchor**（base/top/边中点等曲边块专属锚点）：后续按需。
- **小 IR 优化**：contour 是 O(顶点) IR，不解决 plot-design §16.1 软肋 #1（高基数 O(N) Node）；密采样曲线柱 IR 偏大，采样密度旋钮归 plot 侧。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段的硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/core/core/src/index.ts`（公开 API re-export）+ 新增 builtin shape（跨 renderer 消费的基础图元）。虽不改 `ir/**`，但触 `src/index.ts` 公共面，取 **red**。

### Schema 改动

IR schema（`ir/**`）**无改动**——`ShapeRefSchema.type` 已是开放字符串，`contour` 经 `{ type:'contour', params }` 进 IR。新增的是 **shape 自身的 `paramsSchema`**，校验走 **compile/node.ts 现有双护栏顺序**（不改 node.ts）：① `JsonObjectSchema.parse(raw params)` 守 JSON-safe（跑在**原始入参**上，才能稳拦 function / undefined——见 `node.ts:472-477` 注释）；② `paramsSchema.parse` 校验字段形态。

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/shapes/contour-shape.ts` | 加 | `points` | `z.array(z.tuple([z.number().finite(), z.number().finite()])).min(3)` | — | 闭合顶点环（局部系，任意原点；core 按 AABB 中心自动居中），≥3，隐式闭合，边为直线 |
| `packages/core/core/src/shapes/contour-shape.ts` | 加 | `cornerRadius` | `z.number().finite().nonnegative().optional()` | `undefined`（尖角） | 逐顶点统一 fillet 半径，逐角夹紧，复用 rounded-contour |
| `packages/core/core/src/shapes/index.ts` | 改 | `BUILTIN_SHAPES` key 类型 | 并入 `| 'contour'` | — | 注册项穷尽性 key 加 contour |

字段名写死，下游不得改；需改回本 ADR 加条。

### 文件 scope

白名单：

- `packages/core/core/src/shapes/contour-shape.ts`（新建）
- `packages/core/core/src/shapes/index.ts`（修改：注册 + key 类型 + export）
- `packages/core/core/src/index.ts`（修改：re-export `contour`）
- `packages/core/core/tests/shapes/contour.test.ts`（新建）
- `apps/docs/src/contents/core/components/shapes/contour/index.zh.mdx`（新建：contour 说明，source of truth）
- `apps/docs/src/contents/core/components/shapes/contour/index.en.mdx`（新建：英文同步）
- `apps/docs/src/contents/core/components/shapes/contour/node-contour.demo.tsx`（新建：任意轮廓当 node + 自动居中）
- `apps/docs/src/contents/core/components/shapes/contour/contour-connect.demo.tsx`（新建：另一 Path 连到 contour node，验证可连接性）
- `apps/docs/src/contents/core/components/shapes/index.{zh,en}.mdx` + `shapes-family.{zh,en}.demo.tsx`（修改：shape 家族分组页 + 总览 demo 收录 contour）

**compile/node.ts 不在 scope**：params 双护栏校验复用现状（见 Schema 改动段），contour 走既有 `normalizeShape` → 查表 → 双 parse → 装配路径，无需改 node.ts。`circumscribeOffset` 维持 `[0,0]`、自动居中收在 shape 内部（减 AABB 中心），不依赖 node.ts 装配改动。若实现期确证某处装配缺口非改 node.ts 不可，必须**回本 ADR 加条说明缺口**再动，不在本契约默许范围。偏离白名单同样需加条目自注解或开新 ADR。

### 测试象限

至少 9 case：

**Happy path（≥3）**：
- `contour-renders-quad`：4 顶点矩形轮廓 → emit 出等价 `PathPrim`（move + 3 line + close，与 rectangle 视觉一致）
- `contour-renders-flag`：非矩形「旗帜形」4 顶点（含一条斜边）→ emit 顶点顺序 / close 正确
- `contour-fillet`：`cornerRadius>0` → 每个顶点插入与两侧相切的 fillet 弧（与 polygon fillet 同引擎、同口径）
- `contour-offcenter-autocentered`：points 整体偏移（AABB 中心 ≠ 原点，如全部 +100）→ 渲染 / 连接结果与「预居中等价点集」逐字一致（core 自动按 AABB 中心居中，Node position = 几何中心）

**边界（≥2）**：
- `contour-min-three`：恰好 3 顶点（三角）→ 正常出形
- `contour-corner-clamp`：`cornerRadius` 远大于边长 → 逐角夹紧到最大非自交 fillet，不自交不抛错

**错误路径（≥2）**：
- `contour-reject-too-few`：`points.length < 3` → schema 拒绝
- `contour-reject-non-finite`：含 `NaN`/`Infinity` 顶点 → `paramsSchema` 拒绝；params 含函数 / `undefined` → 第一道 JSON-safe 护栏（`JsonObjectSchema.parse` 跑在 raw params 上，**先于** `paramsSchema`）拦下

**交互（≥2）**：
- `contour-rotate`：Node `rotate` × contour → `boundaryPoint` 收带 rotate 的 rect，交点随旋转正确（localToWorld 处理）
- `contour-scale-corner`：Node `scale`（各向异性 sx≠sy）→ points 按轴缩、`cornerRadius` 按几何均值缩（`scaleParams`）
- `contour-connect-boundary`：另一 Path `to` 此 contour Node → compile 经 `boundaryPoint` 解析出射线 ∩ 轮廓交点（验证可连接性 = 本 ADR 主目标）
- `contour-anchor-fallback`：取 compass 名（如 `north`）→ `anchor` 返回 undefined、compile 回退外接 AABB rect（不抛错）

### 依赖的现有元素

- `geometry/contour.ts` 的 `boundaryFromContour` / `contourCommands` / `ContourSegment`（位于 `packages/core/core/src/geometry/contour.ts`）—— 引用，contour shape 的 boundaryPoint / emit 直接委托。
- `shapes/contour.ts` 的 `verticesToSegments` / `contourToPathCommands` / `contourToPathPrimitive`（位于 `packages/core/core/src/shapes/contour.ts`）—— 引用，顶点环 → 段 → path 命令 → PathPrim。
- `shapes/define.ts` 的 `defineShape` + `shapes/types.ts` 的 `ShapeDefinition`/`ShapeStyle`（`packages/core/core/src/shapes/`）—— 用于定义新 shape。
- `geometry/transform.ts` 的 `localToWorld`（`packages/core/core/src/geometry/transform.ts`）—— 局部顶点 → 世界系。
- `geometry/point.ts` 的 `point.sub`（`packages/core/core/src/geometry/point.ts`，或 re-export 自 `@retikz/math`）—— 引用，自动居中时每顶点减 AABB 中心。
- `aabbCenterOf(points)` —— **新增**小 helper（contour-shape.ts 内或 `geometry/` 复用既有 AABB 工具），算点集 AABB 中心供自动居中；与 `circumscribe` 用的 `halfExtentsOf` 同源。
- `shapes/polygon.ts`（`packages/core/core/src/shapes/polygon.ts`）—— **参考实现**：contour 的 emit / boundaryPoint / scaleParams 模式与 polygon 几乎一致，差别仅顶点来源（polygon 由 rect+sides 推导，contour 取 params.points）。

# ADR-06：连接面与视觉形状解耦——`boundary`（node 默认）+ edge `boundary`（单边覆盖），复用 shape 注册表借边界

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · **前置**：[ADR-01 shape 参数化泛化](./01-shape-params-generalization.md)（`circumscribe` 精确 AABB 契约 + 擦除注册表）· **借用的内置形状**：[ADR-02 circle/ellipse](./02-circle-ellipse.md)（`rectangle` / `ellipse` def 被连接面复用）· 参照：[core-design.md §7 AI 友好](../../../../architecture/core-design.md)

## 背景

「一个形状的 Node 只有一套连接规则吗？」——一个五角星 Node 连外部时，既可以按自己的尖端连（形状自身边界），也应能**当成圆 / 矩形 / 椭圆**去连（连接点稳定、不随尖端乱跳、视觉更干净）。这是 TikZ 用户的真实痛点（常借 `outer sep` + 圆形节点凑干净连接）。

现状的关键事实（决定了本 ADR 默认 `'shape'` 对 boundary 类近乎零变更、对 compass 是 additive 修正）：

- **`ShapeDefinition` 本就把「长什么样」与「怎么连」拆成不同函数**——视觉是 `emit`；连接是 `boundaryPoint`（真实边界射线求交）/ `anchor`（命名点）/ `edgePoint`；包络是 `circumscribe`（精确 AABB）。它们只是被**同一个 registry key + 同一个 `Node.shape`** 绑死。
- **compass / 9 个 rect 锚点的处理今天是 shape-by-shape、不统一**——`star.ts` 的 `anchor`：`tip-N` / `notch-N` 描真实星形，`north` / `south-east` 这些**显式 fallback 到 `rectGeometry.anchor(AABB)`**；但 `sector.ts` / `arc.ts` 的 `anchor` 只认自己的专属名（`apex` / `outer-arc-mid` …），对 `north` 走 `default → undefined`，编译期抛 Unknown anchor。即现状是混合且不齐：boundary = 真实形状，compass = **star 走 AABB、sector/arc 根本不支持**。
- 所以缺的不是新能力，而是两件事：① **把「连接面」从「视觉形状」这一轴里独立出来**的旋钮；② 顺手**把 compass 统一到 compile 层走 AABB**，消除 shape 间的不一致（sector/arc 因此新增 compass 支持，additive）。

**漂亮的实现洞察**：「连接成 X」≈ **借 X 形状的 `boundaryPoint` / `anchor`，作用在本节点的 AABB 上**。`rectangle` / `ellipse` 只是其中 params 为空、开箱即用的两个特例。于是连接面**直接复用 ADR-01 的 shape 注册表**，不另立 mode 枚举，自定义形状自动可当连接面。

## 决策：连接面 = 正交轴，`'shape'` 哨兵 ∪ 借用已注册 shape；node 设默认、edge 可覆盖

### 模型：作用域 + 三类取值

连接面**只改两件事**，其余恒走视觉形状：

连接面影响的 anchor 分两类——**boundary 类**（未命名自动求交 + 数字角度 anchor `anchor:30`，本质都走 `boundaryPoint(toward)`）与 **compass 类**（9 个 rect 方位名 north/east/…）：

| boundary 取值 | boundary 类（自动求交 + 数字角度 anchor） | compass（north/east…·compile 层统一） | 形状专属锚点（tip-N / outer-arc-mid） | edgePoint |
|---|---|---|---|---|
| `'shape'`（默认·保留字） | 节点自身 `boundaryPoint` | AABB 矩形 anchor | 自身 | 自身 |
| `'circle'`（保留字·真圆） | 真圆求交（r = max 半轴） | 真圆 anchor | 自身 | 自身 |
| `'rectangle'` | rectangle.boundaryPoint(AABB) | AABB 矩形 anchor | 自身 | 自身 |
| `'ellipse'` | ellipse.boundaryPoint(AABB) | ellipse.anchor(AABB) | 自身 | 自身 |
| `{type, params}` / 自定义注册名 | 该 shape.boundaryPoint(AABB) | 该 shape.anchor(AABB) | 自身 | 自身 |

**兼容性（精确表述，非笼统「零变更」）**：默认 `'shape'` 下——

- **boundary 类 + 形状专属锚点 + edgePoint 逐字段等于现状**（star/sector/arc/4 内置形状的 `boundaryPoint`、数字角度、专属 anchor、edgePoint 不变）。
- **compass 类是 additive 修正**：现状 star 的 compass 已走 AABB（不变）；**sector/arc 等今天对 `north` 抛 Unknown anchor 的形状，将新增 AABB compass 支持**——这是行为新增（之前是 error，非合法返回值），不破坏任何现有合法用法，故仍 **non-BREAKING**，但**不**宣称「逐字段零变更」，并配回归 / 新增测试覆盖。

贯穿语义：

1. **layout-neutral**：连接面**只改「边在哪相交 + compass/anchor 解析」，绝不动布局 / AABB / bbox**——借用形状只取其 `boundaryPoint` / `anchor`，**不调它的 `circumscribe`**（节点 footprint 仍由视觉 `shape` 决定）。
2. **形状专属命名锚点恒走自身**：`tip-0` / `outer-arc-mid` 是用户点名要的具体点，任何 mode 下都解析到视觉形状；`edgePoint`（「我这条边的 t 比例点」）同理不借用。
3. **`'shape'` / `'circle'` 是保留关键字**（编译期消解，与 node.ts 既有的 `circle` / `diamond` preset 别名同范式）：`'shape'` = 用节点自身视觉形状；`'circle'` = 真圆、半径 = 节点 AABB 较长半轴 `max(halfWidth, halfHeight)`（≠ 借 circle 形状——后者按 rect 半轴会退化成椭圆）。其余字符串 = 借用同名已注册 shape。
4. **借用参数化形状**：`rectangle` / `ellipse` 空 params 开箱即用；借 `{type:'star', params:{…}}` 这类带参形状时 params 由引用显式给出、AABB rect 提供 center + rotate。**自动按 AABB 适配带参形状尺寸 = out-of-scope**（YAGNI，作者自负责给合适 params）。
5. **compass 统一到 compile 层走 AABB（前置改造）**：本 ADR 把 9 个 rect/compass anchor 名的解析**从各 shape 的 `anchor()` 上提到 compile 层统一处理**——任何形状的 `north` / `south-east` 等都按「连接面 def 作用于 layout AABB」解析（默认 `'shape'`/`'rectangle'` → AABB 矩形；`'ellipse'` → 椭圆；`'circle'` → 真圆）。各 shape 的 `anchor()` 只再负责**专属名**（star 的 `tip-N`、sector 的 `apex` / `outer-arc-mid`）。**sector/arc 因此新增 compass 支持**（additive）。star 现有的 `asRectAnchor → rectGeometry.anchor` fallback 由 compile 层接管后可删（行为等价）。
6. **boundary 字段精确作用域（留 NodeTargetSchema，不拆 schema）**：`boundary` 复用 `NodeTargetSchema`（与现有 `anchor` 同住），但语义精确划定——**仅在以下两处生效**：(a) path 端点 **auto-clip**（`anchor` 省略、有 toward = 朝邻居方向）选连接面求交；(b) 该端点的 **compass / 数字角度 anchor** 选连接面。在**无 toward 的引用场景**（`refPointOfTarget` 取节点中心、`between` 端点、`offset.of` 参考点——见 `anchor.ts` / `between-position.ts`）：boundary **无可裁剪对象 → no-op 忽略，不报错**（节点中心不随连接面变；若该处显式给了 compass/角度 anchor，则照 (b) 生效）。
7. **anchor cache key 纳入连接面**：现有 `anchor-cache.ts` 缓存 key 是 `(layout, anchorName)`；boundary 类 + compass 类的解析结果随 `edge.boundary ?? node.boundary` 变，故 **boundary-dependent 解析的 cache key 须加入连接面判别**（如 `${boundaryKey}|${anchorName}`，`boundaryKey` = `'shape'` / `'circle'` / 借用 shape 的稳定序列化）。boundary-independent 的解析（专属命名 anchor、`edgePoint`）key 不含连接面、维持现状。防「同节点同 `north` 在 circle / shape 两条边串缓存」。

### IR 侧（`boundary` 进 Node、`boundary` 进端点引用，均进 IR、JSON 可序列化）

```ts
// packages/core/core/src/ir/boundary.ts（新建）—— 复用 ShapeRefSchema，保留字编译期消解
export const BoundarySchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe(
    'Connection surface: how edges meet this node and how compass anchors resolve, independent of the visual `shape`. Reserved keywords: "shape" (default — the node\'s own visual shape) and "circle" (true circle, radius = larger AABB half-axis). Any other registered shape name ("rectangle" / "ellipse" / "polygon" / …) or `{ type, params }` borrows that shape\'s boundary over this node\'s bounding box. Layout-neutral: never changes the node footprint. Named shape-specific anchors and edge proportional points always resolve against the visual shape.',
  );

// packages/core/core/src/ir/node.ts —— 新增字段，缺省 'shape'
boundary: BoundarySchema.optional().describe(
  'Default connection surface for edges meeting this node (see BoundarySchema). Defaults to "shape" (use the visual shape). Per-edge overridable via the edge endpoint `boundary` field.',
)

// packages/core/core/src/ir/path/target.ts —— NodeTargetSchema 加 boundary（单边覆盖 node.boundary）
boundary: BoundarySchema.optional().describe(
  'Per-edge override of the target node connection surface for THIS endpoint only; omitted = the node\'s boundary (default "shape"). Effective only where a connection surface is meaningful: path-endpoint auto-clip (no explicit anchor) and this endpoint\'s compass / angle anchor. In toward-less reference contexts (between endpoints, offset `of`, node center) it is a no-op.',
)
```

**保留字常量（暴露给用户，`DrawWay` 风格，裸字面量仍第一形态）：**

```ts
// packages/core/core/src/ir/boundary.ts
/** 连接面保留关键字：非「借用已注册 shape」的两个内置语义（编译期消解） */
export const Boundary = {
  /** 连接面 = 节点自身视觉形状（默认） */
  Self: 'shape',
  /** 真圆：半径 = 节点 AABB 较长半轴 max(halfWidth, halfHeight) */
  Circle: 'circle',
} as const;
/** 连接面保留关键字联合（'shape' | 'circle'；其余取值为借用的 shape 引用） */
export type BoundaryKeyword = ValueOf<typeof Boundary>;
```

### 编译期分派

边界 / compass anchor 解析处，按 `edge.boundary ?? node.boundary ?? 'shape'` 选定连接面，再分派：

```ts
const boundary = target.boundary ?? node.boundary ?? Boundary.Self;
// 选 def：
//   'shape'  → 视觉形状自身 def（boundary 类现状路径不变）
//   'circle' → 真圆：把 AABB squared 到 max 半轴（hw=hh=max）后跑 ellipse def
//   其余     → normalizeShape(boundary) → lookupShape(type) → 用本节点 layout AABB（含 circumscribeOffset）当 rect

// 按 anchor 种类路由（compass 提到 compile 层、不再进各 shape.anchor）：
//   boundary 类（auto-clip toward / 数字角度 anchor） → boundaryDef.boundaryPoint(AABB, toward)
//   compass 类（9 个 rect 方位名）                    → boundaryDef.anchor(AABB, name)   ['shape' 等同 'rectangle']
//   形状专属命名 anchor（tip-N / outer-arc-mid …）    → 视觉形状 def.anchor（恒不借用）
//   edgePoint（{ side, t }）                          → 视觉形状 def.edgePoint（恒不借用）

// cache：boundary-dependent（boundary 类 + compass 类）key 含 boundaryKey；
//        boundary-independent（专属 anchor / edgePoint）key 不含 boundary
```

借用形状**不调 `circumscribe`**（不重新布局）；AABB rect 即本节点 layout 已算好的外接框（含 `circumscribeOffset`，sector 等偏心形状也对）。`'shape'` 在 compass 类等同 `'rectangle'`（都落 AABB 矩形），区别只在 boundary 类（`'shape'` 走真实轮廓、`'rectangle'` 走 AABB 边）。

理由：

1. **复用 ADR-01 注册表，零新几何**——rect/ellipse/自定义连接面都是「借已注册 shape 的 boundaryPoint 喂 AABB」，core 不写边界数学；唯一特例 `'circle'`（squared 到 max 半轴）。
2. **默认零变更**——`'shape'` 逐字段同现状，现有 IR / DSL / vanilla / 渲染零改动。
3. **正交可扩展**——经 `CompileOptions.shapes` 注册的自定义 shape 自动可当连接面，无独立机制。
4. **layout-neutral**——只动「边在哪相交」，bbox / viewBox / scope 不受影响，避免连接面与布局耦合。

## 待决策点 🔻

- **`'circle'` 命名**：值产出真圆（max 半轴），与「借 circle 形状（按 rect 半轴→椭圆）」语义不同，故列为保留字。若日后嫌 `'circle'` 与 shape 名 `circle` 易混，可改 `'true-circle'` / `'bounding-circle'`——暂用 `'circle'`（用户心智「连成圆」最直觉）。
- **保留字撞名**：用户经 `CompileOptions.shapes` 注册名为 `shape` / `circle` 的形状时，连接面语义优先保留字、不进借用。ADR 声明二者为连接面保留字，注册同名 shape 仍可作视觉 `Node.shape`（那条路径不查保留字），仅不能经 `boundary` 借用。

## DSL 表面（react + vanilla 双示例）

```tsx
// react —— node 设默认连接面（五角星，但默认连成圆）
<Node id="star" shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: 50 } }} boundary="circle" />
// 默认（连到该节点）即走 circle；单条 edge 破例连真实尖端：
<Path from={{ id: 'star', boundary: 'shape' }} to={[120, 0]} />
// 借矩形连接面
<Node id="box-like" shape={{ type: 'polygon', params: { sides: 6 } }} boundary="rectangle" />
```

```ts
// vanilla builder —— 同一份 IR（node + draw(way, config?)，无 path() builder）
node('star', { shape: { type: 'star', params: { points: 5, innerRadius: 20, outerRadius: 50 } }, boundary: 'circle', position: [0, 0] });
// 默认连到该节点即走 circle：
draw(['star', [120, 0]]);
// edge 覆盖：way 里节点目标用对象形态（{ id, anchor? }）携带 boundary
draw([{ id: 'star', boundary: 'shape' }, [120, 0]]);
```

## 测试设计

`packages/core/core/tests/shapes/boundary.test.ts`（新建）+ `tests/compile/node-shape.test.ts`（扩）+ `tests/ir/path-target.test.ts`（扩）覆盖：

- 三类取值解析（保留字 `shape` / `circle`、内置名 `rectangle` / `ellipse`、`{type, params}` 借用、自定义注册名借用）
- **`boundary:'shape'` boundary 类 + 专属锚点 + edgePoint 等价回归**（star/sector/arc/4 内置形状的 `boundaryPoint`、数字角度、专属 anchor、`edgePoint` 全等现状）
- **compass compile 层统一（additive）**：star compass 仍 = AABB（回归）；**sector/arc 的 `north` 由「现状 throw Unknown anchor」变为「返回 AABB 方位点」**（新增行为，专测）
- `circle` 真圆求交：r = max 半轴，非正方 AABB 下连接点在主轴外
- `ellipse` 借用：按 AABB 宽高比求交
- compass 受连接面影响（`ellipse` 档 north 落椭圆、`shape`/`rectangle` 档 north 落 AABB、`circle` 档落真圆）
- **数字角度 anchor（`anchor:30`）跟连接面**（属 boundary 类：`circle` 档落真圆、`shape` 档落真实轮廓）
- 形状专属锚点（`tip-0` / `outer-arc-mid`）+ `edgePoint` 任何连接面下恒走视觉形状
- edge `boundary` 覆盖 node `boundary`；都省略 = `'shape'`
- **boundary 字段 toward-less no-op**：`between` 端点 / `offset.of` 引用里带 `boundary` 取中心时被忽略、不报错；但同处显式 `anchor:'north'` + `boundary:'ellipse'` 仍落椭圆
- **anchor cache 不串扰**：同节点同 `north`，一条边 `boundary:'circle'`、另一条 `boundary:'shape'`，两次解析互不污染（连接面进 cache key）
- layout-neutral：改 `boundary` 不改 viewBox / scope bbox
- 借用形状不调其 `circumscribe`
- 保留字优先级（注册同名 `circle` shape 时 `boundary:'circle'` 仍真圆）
- rotate / scale × 连接面交互；IR round-trip 自描述

## 影响

- **`packages/core/core/src/ir/boundary.ts`**（新建）：`BoundarySchema` + `Boundary` 常量 + `BoundaryKeyword`。
- **`packages/core/core/src/ir/node.ts`**（修改）：`NodeSchema` 加 `boundary`（缺省 `'shape'`）。
- **`packages/core/core/src/ir/path/target.ts`**（修改）：`NodeTargetSchema` 加 `boundary`。
- **`packages/core/core/src/ir/index.ts`**（修改）：导出 `BoundarySchema` / `Boundary`。
- **`packages/core/core/src/compile/**`**（修改）：① boundary 类（auto-clip + 数字角度）/ compass 类解析按 `boundary ?? boundary ?? 'shape'` 选连接面 def——借内置 `rectangle` / `ellipse` + `'circle'` squared 特例；专属锚点 / edgePoint 恒走视觉形状。② **compass 9 名上提到 compile 层统一走 AABB**（从各 shape.anchor 抽出）。③ `boundary` 在 `refPointOfTarget`（`compile/**/anchor.ts`）的 toward-less 取中心路径 = no-op。
- **`packages/core/core/src/compile/**/anchor-cache.ts`**（修改）：boundary-dependent 解析 cache key 加入 boundaryKey；boundary-independent 维持现状。防 per-edge 串扰。
- **`packages/core/core/src/shapes/star.ts`**（修改）：删除 `anchor` 里 `asRectAnchor → rectGeometry.anchor` 的 compass fallback（compile 层接管，行为等价）；其余形状 `anchor` 只留专属名。
- **`packages/core/core/src/index.ts`**（修改）：导出 `Boundary` / `BoundarySchema`。
- **对外 API**：`NodeSchema` additive（`boundary` 可选）；端点引用 additive（`boundary` 可选）。boundary 类 / 专属 anchor / edgePoint 默认逐字段等价现状；**sector/arc compass 为新增行为**（之前 throw）。整体 **非 BREAKING**（无现有合法用法被破坏）。
- **render / vanilla**：emit 不变 → 渲染零改动；连接点解析在 core，runtime 透明。
- **文档**：shape reference 页补「连接面 boundary」+ path 连接页补端点 `boundary`；`<ComponentPreview>` 演示星形 boundary="circle" 与 edge boundary 覆盖。

## 不在本 ADR 范围

- **自动按 AABB 适配带参借用形状的尺寸**（借 `{type:'star', params}` 时据 AABB 反推半径）→ 作者显式给 params，自动适配另开。
- **连接面影响 outer sep / 间距**→ 与 TikZ `outer sep` 的交互另案；本 ADR 连接面 layout-neutral。
- **per-edge 连接面动画 / 过渡** → 顺延动画线（v0.3-alpha.5）。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `packages/core/core/src/ir/**`（node / path target / 新 boundary schema）+ `src/compile/**`（连接面分派）→ red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/boundary.ts` | 新建 schema | `BoundarySchema` | `z.union([z.string().min(1), ShapeRefSchema])` | — | 连接面：保留字 shape/circle 或借用已注册 shape，layout-neutral |
| `src/ir/boundary.ts` | 新建常量 | `Boundary` | `{ Self:'shape', Circle:'circle' } as const` | — | 连接面保留关键字（编译期消解） |
| `src/ir/node.ts` | 加字段 | `boundary` | `BoundarySchema.optional()` | `'shape'`（编译期） | 节点默认连接面，edge 可覆盖 |
| `src/ir/path/target.ts` | 加字段 | `boundary` | `BoundarySchema.optional()` | 省略 = node.boundary | 单边覆盖连接面；仅 path 端点 clip + 该端点 compass/角度生效，toward-less 引用 no-op |

### 文件 scope

- `packages/core/core/src/ir/boundary.ts`（新建）
- `packages/core/core/src/ir/node.ts`（修改：boundary）
- `packages/core/core/src/ir/path/target.ts`（修改：boundary）
- `packages/core/core/src/ir/index.ts`（修改：导出）
- `packages/core/core/src/compile/**`（修改：连接面分派 + compass 9 名上提 compile 层 + `refPointOfTarget` toward-less boundary no-op）
- `packages/core/core/src/compile/**/anchor-cache.ts`（修改：cache key 纳入 boundaryKey）
- `packages/core/core/src/shapes/star.ts`（修改：删 compass fallback，compile 层接管）
- `packages/core/core/src/index.ts`（修改：导出 Boundary / BoundarySchema）
- `packages/core/core/tests/shapes/boundary.test.ts`（新建）
- `packages/core/core/tests/compile/anchor-cache.test.ts`（扩：surface 不串扰）
- `packages/core/core/tests/compile/node-shape.test.ts`（扩）
- `packages/core/core/tests/ir/path-target.test.ts`（扩）

### 测试象限

**Happy path（≥ 3）**：

- `boundary_self_default_equivalent`：省略 `boundary` ≡ `'shape'`，boundaryPoint / compass / 专属锚点 / edgePoint 逐字段等现状（快照回归）
- `boundary_rectangle_borrows_aabb`：星形 `boundary:'rectangle'` → boundaryPoint 落 AABB 矩形边
- `boundary_ellipse_borrows_aspect`：`boundary:'ellipse'` → 按 AABB 宽高比椭圆求交
- `boundary_circle_true_circle`：`boundary:'circle'` → r = max 半轴真圆
- `sector_compass_additive_aabb`：sector `north`（现状 throw）→ compile 层统一后返回 AABB 方位点（additive 新增行为）

**边界（≥ 2）**：

- `edge_boundary_overrides_node`：node `boundary:'circle'` + edge `boundary:'shape'` → 该边连真实形状、其余边连圆
- `both_omitted_is_self`：node / edge 都省略 → `'shape'`
- `circle_keyword_beats_registered_circle`：注册同名 `circle` shape 时 `boundary:'circle'` 仍真圆（保留字优先）
- `boundary_noop_in_between`：`between` / `offset.of` 端点带 `boundary` 取中心 → 忽略不报错；同处 `anchor:'north'`+`boundary:'ellipse'` → 落椭圆

**错误路径（≥ 2）**：

- `boundary_unregistered_throws`：`boundary:'nope'`（非保留字、未注册）→ 编译期 throw
- `boundary_bad_params_rejected`：`boundary:{type:'sector', params:{innerRadius:'a'}}` → 借用形状 paramsSchema reject

**交互（≥ 2）**：

- `specific_anchor_ignores_boundary`：`boundary:'circle'` + `anchor:'tip-0'` → 仍解析到星形尖端（专属锚点不受连接面）
- `edge_point_ignores_boundary`：`boundary:'circle'` + `anchor:{side,t}` → edgePoint 走视觉形状
- `compass_follows_boundary`：`boundary:'ellipse'` 的 `north` 落椭圆、`'shape'`/`'rectangle'` 的 `north` 落 AABB、`'circle'` 落真圆
- `angle_anchor_follows_boundary`：`anchor:30` 属 boundary 类——`boundary:'circle'` 落真圆、`'shape'` 落真实轮廓
- `star_compass_equals_today`：star `north` 在 compile 层统一后 = 迁移前 AABB 值（回归）
- `cache_no_cross_pollination`：同 layout 同 `north`，`boundary:'circle'` 与 `boundary:'shape'` 两路解析不串（连接面进 key）
- `layout_neutral`：改 `boundary` 前后 viewBox / scope bbox 不变
- `boundary_with_rotate_scale`：连接面 × node rotate / scale 协同正确
- `roundtrip_self_describing`：含 node.boundary / 端点 boundary 的 IR → JSON → parse → 等价

### 依赖的现有元素

- `ShapeRefSchema`（`src/ir/shape.ts`，[ADR-01](./01-shape-params-generalization.md)）—— **复用**：连接面取值的 `{type, params}` 形态。
- `ShapeDefinition` 注册表 / `lookupShape` / `normalizeShape`（`src/shapes/**`，[ADR-01](./01-shape-params-generalization.md)）—— **复用**：借用形状的 boundaryPoint / anchor。
- 内置 `rectangle` / `ellipse` def（`src/shapes/{rectangle,ellipse}.ts`，[ADR-02](./02-circle-ellipse.md)）—— **借用**：rect / ellipse / circle 连接面的边界实现。
- `RECT_ANCHORS` / `asRectAnchor` / `rectGeometry.anchor`（`src/geometry/rect.ts` / `src/shapes/_shared.ts`）—— **上提**：compass 9 名从各 shape.anchor 抽到 compile 层统一走 AABB（star fallback 删除、sector/arc 新增支持）。
- `resolveAnchor` / `angleBoundaryOf` / `anchorOf` / cache（`src/compile/**/anchor-cache.ts` + `compile/node`）—— **修改**：cache key 纳入 boundaryKey；数字角度 anchor（boundary 类）按连接面选 def；防 per-edge 串扰。
- `refPointOfTarget` / `isNodeTarget` / `isBetween`（`src/compile/**/anchor.ts`）—— **依赖**：toward-less 取中心路径里 `boundary` = no-op；between / offset.of 嵌套 NodeTarget 同理。
- `NodeTargetSchema` / `AnchorRefSchema`（`src/ir/path/target.ts`）+ 复用方 `BetweenPositionSchema` / `OffsetPositionSchema`（`src/ir/position/**`）—— **修改 + 注意**：`NodeTargetSchema` 加 `boundary`（被 between / offset.of 复用，故精确语义见决策 §贯穿语义 6）；专属锚点 / `{side,t}` edgePoint 恒走视觉形状。
- `circumscribe` 精确 AABB + `circumscribeOffset`（`src/shapes/types.ts`，[ADR-01](./01-shape-params-generalization.md)）—— **依赖**：借用连接面喂的 AABB rect 即 layout 已算的外接框（含偏心 offset）。
- node.ts `circle` / `diamond` preset 别名「保留 shape 名、编译期消解」（`src/ir/node.ts:11`）—— **参照**：`'shape'` / `'circle'` 连接面保留字同范式。

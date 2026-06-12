# ADR-07：`outerSep` 对齐 TikZ outer sep——外推所有 border anchor 并计入布局占位

- 状态：Accepted
- 决策日期：2026-06-11
- 实现日期：2026-06-12（实现 + 测试 + 文档已完成并全绿；改动留工作树待人工提交——`compile/node.ts`、`ir/node.ts` 上有用户并行 WIP，无法干净分离故未代提交）
- 关联：[v0.3-beta.1 roadmap](./roadmap.md) · **部分 supersede**：[v0.3-alpha.4 ADR-06 连接面](../v0.3-alpha.4/06-connection-surface.md)（其「不在范围 §连接面影响 outer sep / 间距 → 另案」即本 ADR） · 参照：[core-design.md §7 AI 友好](../../../../architecture/core-design.md)

## 背景

retikz 的 `outerSep`（对称别名 `margin`）声称对应 TikZ 的 `outer sep`，但当前实现把它**窄化成「只作用于自动连线端点」**，与 TikZ 语义不一致：

- TikZ 的 `outer sep` 是「border 外的一层均匀偏移」：**所有 border 类 anchor（compass `north`/`east`…、数字角度 `(a.30)`、自动连线落点）都落在 border 外 `outer sep` 处**；node 的定位 / 占位也基于这层 anchor。默认 `outer sep = 0.5×线宽`，目的就是让连线接到描边外缘。即 **TikZ 里 outer sep 会拉开 shape 与 anchor/boundary 的距离，对显式 anchor 同样生效**。
- retikz 现状（`compile/node.ts`）：只有 `boundaryPointOf`（自动连线 auto-clip）会 `inflateRect(rect, margin)`；`anchorOf`（compass）与 `angleBoundaryOf`（数字角度）**都不加 margin**，落在视觉 shape 上。外接框 / viewBox / 布局占位也明确「不含 margin」。
- 后果：同一个 Node，`way={['A','B']}` 接到 `shape + margin`，而 `'A.north'` / `'A.30'` 接到 `shape` 本身——一个节点出现了**两条互不一致的外边界**，取决于引用方式。这违反最小惊讶，且 `node.ts` `anchorOf` 注释「TikZ 语义中 explicit anchor 取视觉边界点不涉及 outer sep」对 TikZ 的描述是**错误**的（TikZ 显式 anchor 含 outer sep）。

alpha.4 ADR-06 当时把这块显式留作「另案」（连接面 layout-neutral，不碰 outer sep 交互）。现在借文档梳理「外层边界」一节暴露出该不一致；0.x 阶段以正确设计为准、不背兼容包袱，正是把 `outerSep` 收敛成真·TikZ outer sep 的窗口。

## 决策：`outerSep` = 真·TikZ outer sep——border 外的一层均匀偏移，统一作用于所有 border 类引用，并计入布局占位

`outerSep`（≥ 0，缺省 **0**）定义节点连接面外的一层均匀偏移 `m`。语义统一为：

### 1. margin 在**引用解析层**施加，不入 `anchorOf` / `angleBoundaryOf` 本体

`anchorOf(layout, name, boundary)` 与 `angleBoundaryOf(layout, angle, boundary)` 保持「在传入的 `layout.rect` 上求边界点」的**纯函数语义不变**——不在它们内部偷偷加 m。外扩由**调用方**决定，做法与现状 `boundaryPointOf` 一致：把一个 **rect 已外扩 m 的 layout** 喂给它们。受影响的解析入口三处归一：

- **自动连线 auto-clip**（`boundaryPointOf`）：现状已 `def.boundaryPoint(inflateRect(rect, m), …)`，**行为不变**。
- **path / position 对 `'A.north'`（compass）的引用**（`anchor-cache.ts` 的 `resolveAnchor` → `computeAnchor` → `anchorOf`）：**新增**——在 outer-inflated layout 上解析。
- **path / position 对 `'A.30'`（数字角度）的引用**（同上 → `angleBoundaryOf`）：**新增**——同上。

### 2. label border point **不含 outerSep**（避免双偏移）

`labelBorderPoint`（`compile/node.ts`）直接调 `anchorOf` / `angleBoundaryOf` 求 label 在节点边上的附着点，再叠加 `label.distance`。**label 的附着点恒走视觉 shape（不加 m）**，否则 `label.position='north'` 会先被 m 推远、再叠加 distance，双重外移。即「§1 的外扩只发生在 path/position 的 anchor 引用解析路径，不发生在 label 路径」——这也是为什么 §1 坚持「margin 不入 `anchorOf` 本体」：让 label 这个共用 `anchorOf` 的调用方天然不被波及。

### 3. 哪些恒走视觉 shape（不加 m）

`center`、形状专属命名 anchor（`tip-N` / `apex` / `outer-arc-mid`）、`edgePoint`（`{side,t}`）、**label 附着点**——都是「点名要的具体特征点 / 视觉附着」而非「这条边连出去的落点」，沿用 ADR-06「形状专属命名锚点恒走自身」。

### 4. 数据契约：`rect` 仍是视觉 AABB，外边界是派生量

- `NodeLayout.rect`（`compile/node.ts:163`）**语义不变 = 视觉边界框**——emit / 裁剪 / `circumscribeOffset` / `edgePoint` / 视觉 anchor 全部继续读它。**不得把 `rect` 改成外扩值**（否则真实图形被画大）。
- 外边界 = `outerRectOf(layout) = inflateRect(layout.rect, layout.margin)`，**单一 helper 派生、不另存状态**（避免与 `rect` 漂移）。消费方仅三处：§1 的 anchor 解析、`boundaryPointOf`（已隐含等价）、§5 的 bbox 聚合。
- 二者恰对应文档「盒模型」节的 **shape**（`rect`）与 **外框 / outer frame**（`outerRectOf`）。

### 5. 布局占位 / viewBox 基于外边界 AABB

bbox 聚合处（`compile.ts:536`，现状 push `globalLayout.rect` 四角进 `allPoints` → `computeLayout`）改为 push `outerRectOf(globalLayout)` 四角——使 border anchor 不会落到 viewBox 外、相对布局间距按 TikZ 把 outer sep 计入。（**不用「命中范围」一词**：core compile 不做 renderer pointer hit-test；本 ADR 只管 bbox / viewBox / 布局 extent，真实命中测试在 render 层、不在本 scope。）

### 6. footprint 永远 = 视觉 AABB + outerSep，**与 `boundary` override 无关**

布局占位 = `outerRectOf`（视觉 node AABB + m），**不受借用连接面影响**：`boundary='circle'` 等只改「连接点在哪求交」，**绝不改 footprint**。即「借用连接面 layout-neutral」（ADR-06）与「outer sep 计入占位」是两根正交轴——连接面定外边界的**形状**、`outerSep` 定它沿视觉 AABB **外扩多少**；footprint 永远由视觉 AABB + m 算，不由借用圆/矩形算。

```ts
// 单一派生 helper（不另存字段）
const outerRectOf = (l: NodeLayout): Rect => inflateRect(l.rect, l.margin);

// 解析层（anchorOf / angleBoundaryOf 本体不变；调用方喂 outer-inflated layout）
boundaryPointOf:   def.boundaryPoint(inflateRect(rect, m), toward, params)        // 现状·不变
resolveAnchor →    anchorOf({ ...layout, rect: outerRectOf(layout) }, name, b)    // 新增 inflate
                   angleBoundaryOf({ ...layout, rect: outerRectOf(layout) }, …)   // 新增 inflate
labelBorderPoint:  anchorOf(aaLayout=visual rect, …)                              // 不变·不含 m
center/tip-N/apex/edgePoint:                                                       // 不变·视觉 rect

// bbox 聚合（compile.ts:536）：push outer 四角而非视觉四角
allPoints.push(...corners(outerRectOf(globalLayout)))                              // 改：视觉 → outer
emitNodePrimitives(layout, …)                                                      // 不变·读视觉 rect
```

理由：

1. **TikZ parity / 最小惊讶**——retikz 是 TikZ-inspired，`outerSep` 既已借 TikZ 词汇，就该是 TikZ 语义；`(a.north)` 含 outer sep 是 TikZ 用户的肌肉记忆。
2. **单一外边界 + 解析层施加**——消除「自动连线移、显式 anchor 不移」的双边界；inflate 只发生在引用解析路径（不进 `anchorOf` 本体），label 等视觉附着天然不被误伤。
3. **缺省 0 → 破坏面最小**——所有不设 `margin` 的节点逐字段不变；行为变化仅命中显式 `margin>0` 的用法，符合 0.x「正确设计优先、不留别名」。

## 待决策点 🔻

> 经多 LLM 评审一轮后，以下子决策**已按推荐全部落定**（封板时并入「决策」段）。保留此处仅作审计 trail——记录它们曾被审议过、定成什么、为什么。无剩余悬而未决项；真正延后的在「不在本 ADR 范围」。

- **布局占位 / viewBox 计入 m** → **定：计入**（决策 §5/§6）。这是「`outerSep` = 真 TikZ outer sep」的承重选择：显式大 `margin` 会撑大 footprint、推开邻居，正是 TikZ 行为、也是本 ADR 立项诉求。若未来要「不影响布局的纯连线 clearance」，那是另一个概念、应另起名，不在本 ADR。
- **缺省值** → **定：0**（不跟 TikZ 的 `0.5×线宽`）。retikz 无掩盖线宽需求，0 更干净且把破坏面压到「仅显式 `margin>0`」。
- **形状专属命名 anchor 不外推** → **定：否**（决策 §3 + 「不在范围」）。保持 feature point 贴视觉 shape，符合 ADR-06；与严格 TikZ 的有意偏离已记录。
- **外边界 = 派生 helper** → **定：`outerRectOf(layout)` helper**，不另存字段（决策 §4）。单一真源、不与 `rect` 漂移；仅当 profiling 证明 inflate 是热点才考虑缓存字段。
- **anchor cache key 不含 m** → **定：不含**。`WeakMap<NodeLayout>` 已按 layout 实例隔离 m，单 layout 内 m 恒定（无 per-edge margin）；key 含 `boundaryKey` 仅因 boundary 会 per-edge 覆盖。仅未来出现跨 layout 共享 cache 或 per-edge margin 才需加。
- **`circumscribeOffset` × m** → **定：不破坏**。偏心形状（sector）在含 offset 的视觉 AABB 上各向外扩 m，中心不变；实现以 `margin-x-borrowed-boundary` / sector 回归 case 兜底验证。

## DSL 表面

```tsx
// react：margin>0 时，自动连线与显式 anchor 都接到 border 外 margin 处（TikZ 一致）
<Layout>
  <Node id="A" position={[0, 0]} margin={12}>A</Node>
  <Node id="B" position={[120, 0]}>B</Node>
  <Draw way={['A', 'B']} arrow="->" />        {/* 端点在 A 的 shape 外 12 */}
  <Draw way={['A.north', 'B']} arrow="->" />  {/* A.north 也在 shape 顶外 12（改动点）*/}
</Layout>
```

```ts
// vanilla：同一 IR / schema，builder 表达一致
scope.node({ id: 'A', position: [0, 0], margin: 12, text: 'A' });
scope.node({ id: 'B', position: [120, 0], text: 'B' });
scope.draw({ way: ['A', 'B'], arrow: '->' });
scope.draw({ way: ['A.north', 'B'], arrow: '->' }); // A.north 含 margin
```

## 测试设计

`packages/core/core/tests/compile/node-*.test.ts` / `boundary` / `anchor` 相关覆盖：

- border 类 anchor（compass / 角度 / auto-clip）三处一致外扩 m
- center / 专属 anchor / edgePoint / **label 附着点** 不受 m 影响
- 布局占位 / viewBox 含 m；footprint 不受 borrowed boundary 影响
- m=0 回归（逐字段同改前）
- m × rotate / scale / 借用连接面 交互

具体 case 见下「实现契约 § 测试象限」。

## 影响

- ⚠️ **BREAKING（仅 `margin>0` 用法）**：显式 `'A.north'` / `'A.30'` 落点从「视觉 shape 上」变为「shape 外 margin 处」；设了 `margin` 的节点 footprint / viewBox 变大。迁移路径（真实可用、不引入新语法）：把该节点 `margin`（或 `outerSep`）设 `0`、改用形状专属 anchor（如 `'star.tip-0'`）、显式坐标或 `{side,t}` 边比例点。`margin` 缺省 0，未显式设置者**零影响**；label（`label.position` 的 `'north'` 风格）落点不变（决策 §2）。
- **代码**：`compile/node.ts`（新增 `outerRectOf` helper；`resolveAnchor` 解析路径喂 outer-inflated layout；**`anchorOf` / `angleBoundaryOf` 本体不改**、`labelBorderPoint` 不改）、`compile.ts:536`（bbox 聚合 push outer 四角）。`anchor-cache.ts` key **无需改**（WeakMap per-layout 已隔离 m，见待决策点）；`compile/boundary.ts` 视 dispatch 复用按需。
- **IR**：无字段增删；`ir/node.ts` 中 `outerSep` / `margin` 的 `describe` 改写（语义从「to path attachment point」→「uniform outer offset of the connection boundary; applies to all border anchors and the layout footprint」）。
- **文档站**：`primitive-model` 三节重写——「模型解剖」anatomy 表（外接框含 / 不含 margin 的口径）、「盒模型」（外框 = 外边界 / border anchor 落点，margin 计入占位）、「外层边界」（连接面贴 shape、outer sep 是外扩量）。`node-frames` / `bbox-boundary` demo 视情况补标注。
- **cross-test**：补 / 跑 `cross-test-parity` 对齐 TikZ outer sep。

## 不在本 ADR 范围

- **`outerXSep` / `outerYSep` 轴分离**（TikZ 有 outer xsep/ysep）：本 ADR 不新增公开字段（beta.1 约束），只对称 `outerSep`/`margin`；轴分离延后。
- **形状专属命名 anchor（tip-N 等）随 outer sep 外推**：有意偏离严格 TikZ，保持 feature point 贴视觉 shape。
- **缺省值改为 `0.5×线宽`**：保持 0。
- **per-edge `margin` 覆盖**（端点级 outer sep）：顺延，先做 node 级。

---

## 实现契约（必填）🔻

> 下游 implement / test / document / wrapup 的硬契约。偏离需回本 ADR 加条或开新 ADR。
> 注：本 ADR 为 red 级改动，按 `develop-design` 需经多 LLM 评估 + 人工 review 填板后方可进 implement；当前为 AI 起草初稿。

### Level

`red`——动 `packages/core/core/src/compile/**`（边界 / anchor / layout 解析）与 `packages/core/core/src/ir/node.ts`（describe）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/node.ts` | 改 describe | `outerSep` | `z.number().min(0).optional()` | `0`（回退 `margin`） | 连接面外的均匀外偏移；作用于所有 border 类 anchor（compass / 角度 / 自动连线）并计入布局占位 / viewBox；不改视觉 shape |
| `packages/core/core/src/ir/node.ts` | 改 describe | `margin` | `z.number().min(0).optional()` | `0` | `outerSep` 的对称别名；axis-specific 字段优先 |

> 仅改 `describe` 文案，**字段名 / 类型 / 默认值不变**（无新增公开字段，符合 beta.1 约束）。

### 文件 scope

- `packages/core/core/src/compile/node.ts`（修改：新增 `outerRectOf` helper；`anchorOf` / `angleBoundaryOf` **本体不改**——由 `anchor-cache.ts` 调用方喂 outer-inflated layout；`labelBorderPoint` 不改）
- `packages/core/core/src/compile/anchor-cache.ts`（修改：`computeAnchor` 对 compass / 角度走 `outerRectOf(layout)` 解析；cache key **无需纳入 m**，见待决策点）
- `packages/core/core/src/compile/compile.ts`（修改：bbox 聚合 `:536` 处 push `outerRectOf(globalLayout)` 四角而非视觉 `rect` 四角；`labelExtentPoints` 已基于视觉附着点，不动）
- `packages/core/core/src/compile/scope.ts`（**实现期新增 scope**：`computeScopeBoundingBox` 同样 push `outerRectOf(layout)` 四角——scope.id bbox 与顶层 viewBox 同口径；不加则 scope 内含 margin 节点的 bbox 与 viewBox 不一致）
- `packages/core/core/src/ir/node.ts`（修改：`outerSep` / `margin` describe）
- `packages/core/core/tests/compile/node-outer-sep.test.ts`（新建：12 case 覆盖 4 象限）
- `packages/core/core/tests/compile/shape-baseline-snapshot.test.ts` 的 `__snapshots__`（**实现期新增**：含 `outerSep:5` 旋转节点的回归快照 viewBox 随 footprint 计入 margin 更新；primitive 字节零变更，仅 layout 4 字段）
- 文档（**实现期按用户指示扩到「概念 / 组件 / 扩展」全部相关页**，原 scope 仅列 primitive-model）：
  - `apps/docs/.../concepts/core/primitive-model/index.{zh,en}.mdx`（模型解剖表 / 盒模型 / 外层边界口径）
  - `apps/docs/.../concepts/core/primitive-relations/index.{zh,en}.mdx`（margin 节：显式锚点也吃 margin；center/边比例点/标签不吃）
  - `apps/docs/.../components/node/overview/index.{zh,en}.mdx`（`outerSep`/`margin` prop 行 + margin vs padding 节）
  - `apps/docs/.../reference/extending/shape-registry/index.{zh,en}.mdx`（boundaryPoint/anchor：rect 已由引擎外扩，自定义 shape 不处理 outer sep）
- 未动：`compile/boundary.ts`（dispatch 无需改）；`cross-test-parity`（repo 无 TikZ 参考 harness，几何 parity 由 node-outer-sep.test.ts 以 TikZ 等价坐标断言；用户 WIP 的 vanilla cross-test-parity 未触碰）。

偏离白名单需加条或开新 ADR——上列「实现期新增」三项（scope.ts / snapshot / 扩展文档面）即本次追加，理由随条注明。

### 测试象限（≥ 9）

**Happy path（≥ 3）**：

- `compass-margin`：`Node margin=10`，`'A.north'` → 视觉 shape 顶外 10。
- `angle-margin`：`'A.30'` → shape 外 10 沿 30° 射线交点（外扩后边界）。
- `autoclip-margin-regression`：`way={['A','B']}` 端点仍在 shape 外 10（行为不变回归）。
- `layout-footprint`：`margin=10` 时占位 / viewBox 含外扩 10，邻居间距 +10。

**边界（≥ 2）**：

- `margin-zero-identity`：`margin=0`（缺省）→ 所有 anchor / 占位逐字段同改前。
- `center-unaffected`：`'A.center'` 不随 margin 变（恒视觉中心）。

**错误路径（≥ 2）**：

- `negative-margin-rejected`：`margin=-1` → schema 拒绝（`.min(0)`）。
- `named-anchor-no-margin`：`'star.tip-0'`（专属 anchor）在 `margin>0` 下仍落视觉 shape 尖端（不外扩，验证有意偏离）。
- `label-no-margin`：`Node margin=10` + `label.position='north'`，label 附着点在视觉 shape 顶（不含 m），再叠加 `label.distance`——验证 label 不被 outer sep 双偏移（决策 §2）。

**交互（≥ 2）**：

- `margin-x-rotate`：`margin × rotate` → 外扩后边界随旋转一致（compass / 角度在旋转系下仍 +m）。
- `margin-x-borrowed-boundary`：`boundary='circle' + margin=10` → 真圆半径外再扩 10；借用连接面仍 layout-neutral（footprint 由视觉 shape + m 决定，不由借用圆决定）。
- `margin-x-scale`（可选第 3 交互）：`margin × scale` → m 受 scale 影响（`m * max(sx,sy)`，沿用现状）。

### 依赖的现有元素

- `inflateRect`（`compile/node.ts`）—— 复用：把 AABB 各向外扩 m，封进 `outerRectOf` helper，供 anchor 解析 / bbox 聚合。
- `boundaryPointOf` / `anchorOf` / `angleBoundaryOf`（`compile/node.ts`）—— `boundaryPointOf` 不变（已 inflate）；`anchorOf` / `angleBoundaryOf` **本体不改**，由 `resolveAnchor` 喂 outer-inflated layout。
- `resolveAnchor` / `computeAnchor`（`compile/anchor-cache.ts`）—— 修改：compass / 角度走 `outerRectOf(layout)`；cache key 不变（不含 m）。
- `labelBorderPoint`（`compile/node.ts:314`）—— 引用：确认其调 `anchorOf` / `angleBoundaryOf` 时喂的是**视觉** rect（不经 `outerRectOf`），保证 label 不含 m。
- `allPoints` bbox 聚合（`compile.ts:536`，`rectOps.anchor(globalLayout.rect, …)` 四角）—— 修改：改用 `outerRectOf(globalLayout)` 四角。
- ADR-06 连接面 dispatch（`edge.boundary ?? node.boundary ?? 'shape'`）—— 扩展：连接面定外边界**形状**、outer sep 定**外扩量**，footprint 恒由视觉 AABB + m 算，不受 boundary override 影响（决策 §6）。
- shape `circumscribe`（含 `circumscribeOffset`）—— 引用：视觉 AABB（`rect`）来源，`outerRectOf` 外扩前的基准。

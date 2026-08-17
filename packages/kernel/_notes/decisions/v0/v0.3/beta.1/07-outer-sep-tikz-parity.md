# ADR-07：`outerSep` 对齐 TikZ outer sep——外推所有 border anchor 并计入布局占位

- 状态：Accepted
- 决策日期：2026-06-11
- 实现日期：2026-06-12（实现 + 测试 + 文档已完成并全绿；改动留工作树待人工提交——`compile/node.ts`、`ir/node.ts` 上有用户并行 WIP，无法干净分离故未代提交）
- 关联：[v0.3-beta.1 roadmap](./roadmap.md) · **部分 supersede**：[v0.3-alpha.4 ADR-06 连接面](../alpha.4/06-connection-surface.md)（其「不在范围 §连接面影响 outer sep / 间距 → 另案」即本 ADR） · 参照：

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

## 长期边界

- **`outerXSep` / `outerYSep` 轴分离**（TikZ 有 outer xsep/ysep）：本 ADR 不新增公开字段（beta.1 约束），只对称 `outerSep`/`margin`；轴分离延后。
- **形状专属命名 anchor（tip-N 等）随 outer sep 外推**：有意偏离严格 TikZ，保持 feature point 贴视觉 shape。
- **缺省值改为 `0.5×线宽`**：保持 0。
- **per-edge `margin` 覆盖**（端点级 outer sep）：顺延，先做 node 级。

---

> **实现指针**：本 ADR 已随 kernel v0.3-beta.1 落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在历史中。

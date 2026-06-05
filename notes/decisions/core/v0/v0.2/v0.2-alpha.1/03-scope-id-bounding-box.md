# ADR-03：`scope.id` 注册 synthetic bounding-box 进父 namespace frame

- 状态：Accepted（已实现）
- 决策日期：2026-05-16
- 关联：[v0.2-alpha.1 plan](./roadmap.md) · [本 milestone ADR-01](./01-scope-ir-and-compile.md) · [本 milestone ADR-02](./02-node-index-anchor-resolution.md) · [本 milestone ADR-04](./04-relative-position-in-scope.md)

## 背景 / 约束

- ADR-01 给 `<Scope>` 加了可选 `id` 字段；ADR-02 决策 scope.id 与 node.id / coordinate.id 共享命名空间、冲突走 `DUPLICATE_NODE_ID`。但 **scope.id 设值时 nodeIndex 里存什么 layout** 还未拍——本 ADR 处理。
- 用户诉求：把 scope 内多个 node 视为整体，从外部画线到它的边界、用它做 polar / at / offset 的 referent。
- TikZ 对应 `\begin{scope}[local bounding box=name]`：给 scope 内容算 axis-aligned bbox、注册为 rectangle 命名实体，外部可写 `(name.north)` / `(name.30)`。retikz 把 `scope.id` 直接当此能力入口，**不单独加 `boundingBox` 字段**（一字段一职责）。

## 决策：`scope.id` 设值 → 注册 synthetic rectangle `NodeLayout` 进父 namespace frame

- Pass 1 完成 scope 子树后**立即**算 bbox（不延迟到 Pass 2，因 Pass 2 path 引用时 bbox 须已就位）：取子树**全部** NodeLayout（含嵌套 scope 内的 + Coordinate 的 0×0 layout）的 4 角点集合（`rect.anchor` 的 north-west / north-east / south-west / south-east），求 axis-aligned bbox。每个 layout 4 角已是 scope transform 累积后的全局坐标（ADR-01 Pass 1 保证），故 bbox 自动是全局 AABB。
- 用 bbox 构造 synthetic `NodeLayout`：`shape: 'rectangle'`、`rect.rotate: 0`、textWidth/Height = bbox 尺寸，其余文字字段（fontSize / margin / padding 等）全 0（synthetic layout 不参与文字布局；rectangle anchor 不依赖文字字段）。
- 注册到**父 namespace frame**（NameStack 栈顶，ADR-02）——**不受当前 scope 的 `localNamespace` 影响**，scope.id 是外部句柄。
- 外部用 `cluster` / `cluster.north` / `cluster.30` / `{ origin: 'cluster', ... }` 引用——anchor / referent 解析走与普通 rectangle Node **完全一致**的 `rect.anchor()` / `boundaryPoint()` 路径（referent 取 bbox 中心），lookup 走 NameStack inside-out。**无新代码路径 / 无新测试矩阵**。

### 设计细节（具体决策）

- **path 不计入 bbox**：bbox 只反映 scope 内 node / coordinate 占据的空间，与 TikZ `local bounding box` 默认一致。
- **空 scope（无 node / coordinate）+ scope.id 设值**：bbox = scope 局部原点经 transform 链后的全局点、0×0 尺寸（退化为 coordinate 风格占位点）；synthetic layout 仍注册——保持"设了 id 必有引用目标"的语义不破缺（与 v0.1 `<Coordinate>` 0×0 layout 一致）。
- **嵌套 scope.id**：外层 bbox 递归包含所有内层 node 4 角；内层 scope 自带 id 时两条 synthetic layout 都注册（外层覆盖内层 bbox 区域，逻辑独立）。
- **rotate 下默认 axis-aligned 全局 bbox**："取所有 layout 4 角求 AABB"的自然实现，与 TikZ 默认一致；rotation-aware 留后续。
- **synthetic layout 不发 ScenePrimitive**：只进 NameStack（compile 内部数据），不影响渲染输出；scope 视觉表达仍是 GroupPrim（ADR-01）。

### 被否决的选项

- **B：单独 `<Fit id of={['A','B','C']}>` 组件，scope 不带 id** —— scope 职责单一，但用户须知道 scope 内每个 node id 才能 fit、维护成本高；TikZ 也是把 bbox 计算挂在 scope 选项上而非单独构造。
- **C：用户加 `<Coordinate>` 占位表达 scope 代表点** —— 零新机制，但失去"画到 scope 边缘"的能力（coordinate 是 0×0 无边界）、用户得手算坐标。

选 A 核心理由：直接对应 `local bounding box=name`（TikZ 用户可迁移）；scope.id 已是 ADR-01 字段，设值即激活、不引入第二字段 / 组件（YAGNI + 一字段一职责）；synthetic layout 是 rectangle shape，复用现有 anchor 路径无新代码。v0.2 alpha.1 只 rectangle，自定义 boundingShape（circle / ellipse 包络）待 ShapeRegistry 落地后另开 ADR。

## 不在本 ADR 范围

- scope id 冲突检测的命名空间归属 → [ADR-02](./02-node-index-anchor-resolution.md)。
- scope.id 自定义 boundingShape（rectangle 以外）→ ShapeRegistry 落地后另开 ADR。
- scope.id bbox 包含 path 走线 → 本 ADR 决策"path 不计入"；TikZ 高级用法（`scope/.style`）可选包路径，本 ADR 不引入。
- scope rotate 下 bbox axis-aligned vs rotation-aware → 本 ADR 默认 axis-aligned 全局 bbox，rotation-aware 留后续。
- scope.id 用于 Scene 渲染（visibility toggle / animation target）→ scope.id 不出现在 Scene primitive 输出，如需渲染层引用另开 ADR。

---

> **实现指针**：level `red`（动 compile，无 schema 改动——`scope.id` 字段 schema 在 ADR-01；synthetic layout 是 compile 内部数据、不动公开 API）、非 breaking。真源以代码为准——`computeScopeBoundingBox` / `registerScopeAsLayout`（`core/src/compile/scope.ts`，构造方式参考 `coordinateAsLayout`）、Pass 1 scope 子树结束时注册（`core/src/compile/compile.ts`）；synthetic layout 复用 `NodeLayout` 类型（`core/src/compile/node.ts`）+ `rect.anchor()` / `boundaryPoint()`（`core/src/geometry/rect.ts`）；path / position 引用 scope.id 走与普通 rectangle node 同一路径（`compile/path/*`、`resolvePosition` 不改）。测试在 `core/tests/compile/scope-bbox.test.ts`。完整施工契约（5 项决策细节 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

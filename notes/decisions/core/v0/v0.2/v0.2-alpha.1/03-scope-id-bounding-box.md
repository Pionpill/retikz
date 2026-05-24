# ADR-03：`scope.id` 注册 synthetic bounding-box 进父 namespace frame

- 状态：Accepted
- 决策日期：2026-05-16
- 关联：[v0.2-alpha.1 plan](./roadmap.md) · [本 milestone ADR-01](./01-scope-ir-and-compile.md) · [本 milestone ADR-02](./02-node-index-anchor-resolution.md) · [本 milestone ADR-04](./04-relative-position-in-scope.md)

## 背景

ADR-01 给 `<Scope>` schema 加了可选 `id: string` 字段；ADR-02 决策"scope.id 与 node.id / coordinate.id 共享全局扁平命名空间，冲突走 DUPLICATE_NODE_ID"。但 **scope.id 设值时，nodeIndex 里到底存什么 layout** 还未拍——这是本 ADR 处理的事。

**用户诉求**：把 scope 内多个 node 视为一个整体，从外部画线到它的边界、用它做 polar / at / offset 的 referent。例如：

```tsx
<Scope id="cluster" transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
  <Node id="A" position={[0, 0]}>A</Node>
  <Node id="B" position={[40, 30]}>B</Node>
  <Node id="C" position={[80, -20]}>C</Node>
</Scope>
<Node id="external" position={[0, 100]} />
<Path arrow="->">
  <Step kind="move" to="external" />
  <Step to="cluster.north" /> {/* ← 这个 cluster 引用就是本 ADR 处理的事 */}
</Path>
```

**TikZ 对应**：`\begin{scope}[local bounding box=name]` —— 给 scope 内容算 axis-aligned bbox、注册为 `name` 命名实体（rectangle shape），外部可写 `(name.north)` / `(name.east)` / `(name.30)` 等。retikz 把 `scope.id` 直接当 TikZ 这个能力的入口，不再单独加 `boundingBox` 字段（一字段一职责，避免双概念）。

## 选项

### A. `scope.id` 设值 → 注册 synthetic rectangle `NodeLayout` 进父 namespace frame（**推荐**）

- Pass 1 完成 scope 子树后，**计算子树全部 NodeLayout 在全局坐标系的 axis-aligned bbox**（取每个 layout `rect.anchor()` 的 4 角点集合的 AABB）
- 用此 bbox 构造 synthetic `NodeLayout`：`shape: 'rectangle'`、`rect: { x, y, width, height, rotate: 0 }`、`textWidth/Height = bbox 尺寸`、`margin = 0`、`fontSize = 0`、`align = 'middle'`、`lineHeight = 0`
- 注册到**父 namespace frame**（NameStack 栈顶，由 ADR-02 决策）——**不受当前 scope 的 `localNamespace` 影响**，scope.id 是外部句柄
- 外部用 `cluster` / `cluster.north` / `cluster.30` / `{ origin: 'cluster', ... }` 引用——anchor / referent 解析走与普通 rectangle Node 完全一致的路径（复用 `rect.anchor()` / `boundaryPoint()`）；lookup 走 NameStack inside-out

### B. 单独 `<Fit>` 组件，scope 不带 id

```tsx
<Scope>...</Scope>
<Fit id="cluster" of={['A', 'B', 'C']} />  {/* 单独组件计算 bbox */}
```

- 优：scope 职责单一（只承担分组 / transform / 样式作用域）
- 缺：用户得知道 scope 内每个 node 的 id 才能 fit；维护成本高；TikZ 也是把 bbox 计算挂在 scope 选项上而非单独构造

### C. 用户加 `<Coordinate>` 占位

让用户在 scope 内手动加 coordinate 表达 scope 整体的"代表点"——不算 bbox，只是一个引用点。

- 优：零新机制
- 缺：失去"画到 scope 边缘"的能力（coordinate 是 0×0 占位，没有边界）；用户得手算坐标

## 决策：A（scope.id → synthetic rectangle NodeLayout）

理由：

1. **TikZ 对齐**：直接对应 `local bounding box=name`，retikz 用户能从 TikZ 迁移
2. **YAGNI + 一字段一职责**：scope.id 是 ADR-01 已加的字段；设值即激活 bbox 注册，不引入第二个字段 / 第二个组件
3. **复用现有 anchor 路径**：synthetic layout 是 rectangle shape——`cluster.north` / `cluster.30` 等所有 anchor 形态走与普通 rectangle Node **完全一致**的 `rect.anchor()` / `boundaryPoint()` 路径；无新代码路径 / 无新测试矩阵
4. **不污染 Scene**：synthetic layout 只进 NameStack（compile 内部数据），**不发 ScenePrimitive**——不影响渲染输出；scope 自身的视觉表达仍是 GroupPrim（ADR-01）
5. **YAGNI 拒绝 boundingShape 自定义**：v0.2 alpha.1 只 rectangle；alpha.3 ShapeRegistry 落地后再考虑给 scope 注入自定义 bounding shape

## 决策细节

> 选项 A 锁后，5 项细节均拍板：

1. **bbox 计算时机**：scope 子树 Pass 1 全部完成后**立即**算 bbox 注册 synthetic layout——即在递归遍历 scope tree 返回时一次性完成；不延迟到 Pass 2。理由：path Pass 2 引用 scope.id 时 bbox 必须已就位
2. **bbox 计算输入**：scope 子树**全部** NodeLayout（含嵌套 scope 内的 + Coordinate 的 0×0 layout）的 `rect.anchor('north-west')` / `north-east` / `south-west` / `south-east` 4 角点集合（与 v0.1 `compile.ts` Pass 1 累积 `allPoints` 模式一致），求 axis-aligned bbox。每个 layout 的 4 角已是 scope transform 累积后的全局坐标（ADR-01 Pass 1 保证），所以 bbox 自动是全局 AABB
3. **path 不计入 bbox**：path step.to 端点（含跨 scope path）**不**计入 scope bbox。bbox 只反映"scope 内 node / coordinate 占据的空间"，与 TikZ `local bounding box` 默认行为一致
4. **空 scope（无 node / coordinate 子节点）+ scope.id 设值**：bbox = scope **局部原点经过 scope transform 链后的全局点**，0×0 尺寸（退化为 coordinate 风格的占位点）；synthetic layout 仍注册——保持"设了 id 必有引用目标"的语义不破缺。与 v0.1 `<Coordinate>` 注册 0×0 layout 模式一致
5. **嵌套 scope.id**：外层 scope.id 的 bbox 包含**所有**内层 scope 内 node 的 layout 4 角（递归计算）；内层 scope 自己也有 id 时，两条 synthetic layout 都注册（外层覆盖内层 bbox 区域，逻辑独立）

## 待决策点

> 选项 A 已锁，但实施前再判：

- **scope rotate 下 bbox 是 axis-aligned 还是 rotation-aware**：本 ADR 默认 **axis-aligned 全局 bbox**（"取所有 layout 4 角点求 AABB"自然实现），与 TikZ `local bounding box` 默认一致。如未来需要 rotation-aware（保留 scope 局部坐标系下的旋转 bbox，再投影），另开 ADR
- **scope.id 作为 referent（polar.origin / at.of / offset.of）的语义**：synthetic layout 是 rectangle shape，referent 取 bbox **中心**作为坐标——与普通 rectangle Node referent 行为一致。本 ADR 默认允许，alpha.1 实施期再判是否要做特殊"不能引用 scope.id 做相对定位"的限制（倾向不限制）
- **scope.id 与 boundingShape 自定义**：v0.2 alpha.1 只 rectangle；alpha.3 ShapeRegistry 落地后可考虑给 scope 注入自定义 bounding shape（circle / ellipse 包络等），届时另开 ADR
- **synthetic layout 的 `fontSize` / `margin` / `padding` 等字段**：本 ADR 决策全 0（synthetic layout 不参与文字布局），但 `NodeLayout` 类型当前要求这些字段——确认 0 值不破坏现有 `rect.anchor()` / `boundaryPoint()` 计算（rectangle anchor 不依赖文字字段）

## DSL 表面

```tsx
// 基本：scope.id 作为整体引用
<TikZ>
  <Scope id="cluster" transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={[40, 30]}>B</Node>
    <Node id="C" position={[80, -20]}>C</Node>
  </Scope>
  <Node id="external" position={[0, 100]}>ext</Node>
  <Path arrow="->">
    <Step kind="move" to="external.south" />
    <Step to="cluster.north" /> {/* bbox 顶边中点 */}
  </Path>
  <Path arrow="->">
    <Step kind="move" to="external" />
    <Step to="cluster.30" /> {/* bbox 30° 数字角度 anchor */}
  </Path>
</TikZ>

// scope.id 作为另一 node 的 referent（polar / at / offset）
<TikZ>
  <Scope id="left-cluster">
    <Node id="L1" position={[0, 0]}>L1</Node>
    <Node id="L2" position={[30, 30]}>L2</Node>
  </Scope>
  <Node position={{ direction: 'right', of: 'left-cluster', distance: 50 }}>
    right-of-cluster {/* 取 left-cluster bbox 中心点作为 referent */}
  </Node>
  <Coordinate id="anchor-point" position={{ of: 'left-cluster', offset: [10, 0] }} />
</TikZ>

// 嵌套 scope.id：内外各自 bbox，互不污染
<TikZ>
  <Scope id="outer" transforms={[{ kind: 'translate', x: 50, y: 0 }]}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Scope id="inner" transforms={[{ kind: 'translate', x: 20, y: 0 }]}>
      <Node id="B" position={[0, 0]}>B</Node>
      <Node id="C" position={[10, 10]}>C</Node>
    </Scope>
  </Scope>
  {/* outer.bbox 包 {A, B, C} 全部全局坐标；inner.bbox 只包 {B, C} */}
</TikZ>

// 空 scope.id：bbox 退化为 scope 局部原点的全局位置（0×0）
<TikZ>
  <Scope id="anchor-point" transforms={[{ kind: 'translate', x: 50, y: 50 }]}>
    {/* 无 children */}
  </Scope>
  <Node position={{ of: 'anchor-point', offset: [10, 0] }}>
    relative-to-empty-scope {/* 引用退化点 (50, 50)，加 offset → (60, 50) */}
  </Node>
</TikZ>

// scope.id 冲突走 ADR-02 命名空间规则
<TikZ>
  <Node id="foo" position={[0, 0]}>foo-node</Node>
  <Scope id="foo">  {/* ❌ DUPLICATE_NODE_ID，与 node.id 冲突 */}
    <Node id="bar" position={[10, 0]}>bar</Node>
  </Scope>
</TikZ>
```

## 测试设计

`packages/core/tests/compile/scope-bbox.test.ts`（新建）覆盖：

- scope.id 设值时 synthetic layout 注册到父 NameStack frame（外部可见，不受 localNamespace 影响）
- bbox = 子 layout 4 角的全局 AABB
- 不同 transform（translate / rotate / scale / polar-translate）下的 bbox
- bbox anchor：keyword（north / east / south-west）+ 数字角度（30 / 90 / 180）
- scope.id 作为 polar.origin / at.of / offset.of 的 referent
- 嵌套 scope.id：内外各算各
- 空 scope.id：退化 0×0 占位点
- scope.id × ADR-02 冲突检测（scope vs node、scope vs scope）

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/compile/scope.ts`**（ADR-01 已建，本 ADR **扩**）：`computeScopeBoundingBox(childLayouts: NodeLayout[]): Rect` helper + `registerScopeAsLayout(id: string, bbox: Rect): NodeLayout` synthetic 构造
- **`packages/core/src/compile/compile.ts`**（修改）：Pass 1 进 scope 前 push frame（若 localNamespace=true）+ scope.id 注册到**父 frame**（NameStack 栈顶在 push frame 之前的状态）；Pass 1 递归遍历 scope 子树返回时，若 scope.id 设值则调用上述 helper 计算 bbox + 用 layout 填充已注册的占位（或先算 bbox 再 register；具体顺序由实施决定）
- **`packages/core/src/compile/node.ts`** `NodeLayout` 类型 —— **引用**：synthetic layout 完全复用此类型（shape='rectangle' + rect.rotate=0 + textWidth/Height = bbox 尺寸）
- **`packages/core/src/compile/compile.ts`** `coordinateAsLayout` —— **引用模板**：scope synthetic layout 构造方式参考此函数（同样把"非真实 node"压成 NodeLayout 注入 nodeIndex）
- **`packages/core/src/geometry/rect.ts`** —— **引用**：bbox 4 角投影 / `rect.anchor()` / `boundaryPoint()` 已存在，scope bbox 复用
- **`packages/core/src/compile/path/*.ts`** —— **不改**：path 引用 scope.id 时通过 nodeIndex 查到 synthetic layout，anchor 解析走 rectangle 路径
- **`packages/core/src/compile/position.ts`** `resolvePosition` —— **不改**：polar / at / offset referent 取 layout 中心点的方式不变
- **测试**：core compile（scope.id bbox 计算 + anchor 解析 + 嵌套 + 空 scope + referent 用法）
- **文档**：scope overview mdx 新增"作为引用整体"章节 + 4 个 demo（基础引用、referent 用法、嵌套、空 scope）
- **AGENTS.md**：加"scope.id 注册 bbox synthetic layout 到父 namespace frame（外部句柄，不受 localNamespace 影响）"规则

## 不在本 ADR 范围

- **scope id 冲突检测的命名空间归属**（与 node.id / coordinate.id 共享） → [ADR-02](./02-node-index-anchor-resolution.md)
- **scope.id 自定义 boundingShape**（rectangle 以外，如 circle / ellipse 包络）：v0.2 alpha.3 ShapeRegistry 落地后另开 ADR
- **scope.id bbox 包含 path 走线**：本 ADR 决策"path 不计入 bbox"，与 TikZ `local bounding box` 默认一致；TikZ 有 `local bounding box=name, scope/.style={...}` 等高级用法可选包路径，本 ADR 不引入
- **scope rotate 下 bbox axis-aligned vs rotation-aware**：决策细节 + 待决策点已说明：本 ADR 默认 axis-aligned 全局 bbox；rotation-aware 留待后续
- **scope.id 用于 Scene 渲染（visibility toggle / animation target）**：本 ADR 仅注册 NameStack（compile 内部数据），scope.id 不出现在 Scene primitive 输出中；如未来需要渲染层引用另开 ADR

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/compile/**`（新建 helper 在 `compile/scope.ts` + `compile.ts` 调用点）
- 不动 schema（schema 改动在 ADR-01）
- 不动公开 API（synthetic layout 是 compile 内部数据）
- 跨级取最高 = red（compile 改动）

### Schema 改动

无 schema 改动（本 ADR 仅 compile 行为定义；`scope.id` 字段 schema 在 ADR-01）。

### 文件 scope

- `packages/core/src/compile/scope.ts`（ADR-01 已建文件，本 ADR 扩 `computeScopeBoundingBox` + `registerScopeAsLayout` helpers）
- `packages/core/src/compile/compile.ts`（修改：Pass 1 scope 子树结束时调用 helper 注册 synthetic layout）
- `packages/core/tests/compile/scope-bbox.test.ts`（新建）
- `apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx`（扩"作为引用整体"章节）
- `apps/docs/src/contents/core/components/tikz/scope/scope-id-reference.demo.tsx`（新建：基本 anchor 引用 demo）
- `apps/docs/src/contents/core/components/tikz/scope/scope-id-nested.demo.tsx`（新建：嵌套 scope.id demo）
- `apps/docs/src/contents/core/components/tikz/scope/scope-id-referent.demo.tsx`（新建：scope.id 作为 polar/at/offset referent demo）
- `apps/docs/src/contents/core/components/tikz/scope/scope-id-empty.demo.tsx`（新建：空 scope.id 退化点 demo）
- `AGENTS.md`（修改：加 scope.id bbox 注册规则）

### 测试象限

#### Happy path（≥ 3）

- `scope_id_bbox_basic`：`<Scope id="g">` 内三 node A/B/C → nodeIndex 含 'g' synthetic layout，rect 包 3 个 layout 全局 4 角的 AABB
- `scope_id_north_anchor`：path `to="g.north"` → bbox 顶边中点
- `scope_id_east_anchor`：path `to="g.east"` → bbox 右边中点
- `scope_id_numeric_anchor_30`：path `to="g.30"` → bbox 30° boundaryPoint
- `scope_id_numeric_anchor_negative`：path `to="g.-45"` → bbox -45° boundaryPoint
- `scope_id_referent_polar`：另一 node `{ origin: 'g', angle: 0, radius: 50 }` → 取 g bbox 中心点作为 origin
- `scope_id_referent_at`：另一 node `{ direction: 'right', of: 'g', distance: 30 }` → 同上
- `scope_id_referent_offset`：另一 node `{ of: 'g', offset: [10, 0] }` → 同上

#### 边界（≥ 2）

- `scope_id_empty_bbox_translate`：`<Scope id="g" transforms={[translate(50,50)]}>` 无 children → bbox = (50, 50) 0×0
- `scope_id_empty_bbox_no_transform`：`<Scope id="g">` 无 children 无 transform → bbox = (0, 0) 0×0
- `scope_id_single_child_bbox`：scope 内仅 1 个 node → bbox = 该 node 的 layout AABB
- `scope_id_includes_coordinate`：scope 含 node + coordinate → bbox 同时包含 coordinate 的 0×0 点（视作有效 bbox 输入）
- `scope_id_anchor_center`：path `to="g"`（无 .anchor 后缀） → 返回 bbox 中心点（与普通 rectangle node 一致）

#### 错误路径（≥ 2）

- `scope_id_collision_with_node`：`<Scope id="foo">` + `<Node id="foo">` → 抛 DUPLICATE_NODE_ID（与 ADR-02 命名空间规则一致）
- `scope_id_collision_with_scope_nested`：外 scope id="g" + 内 scope id="g" → 抛 DUPLICATE_NODE_ID（嵌套也共享命名空间）
- `scope_id_collision_with_coordinate`：scope id="A" + coordinate id="A" → 抛 DUPLICATE_NODE_ID
- `scope_id_forward_reference_rejected`：node A polar.origin → 'g' 但 `<Scope id="g">` 在 A 后定义 → 抛错（scope.id 注册时机 = Pass 1 scope 子树结束，A 在前则 g 尚未注册）
- `scope_id_unknown_anchor_name`：path `to="g.invalid"` → ANCHOR_RESOLUTION_FAILED warn + fallback 到 g 中心

#### 交互（≥ 2）

- `scope_id_bbox_rotated_scope`：`<Scope id="g" transforms={[rotate(45)]}>` 内 4 个 node → bbox = 4 node 旋转后全局坐标的 AABB（验证 axis-aligned 全局 bbox 默认）
- `scope_id_nested_bbox_outer_includes_inner`：嵌套 scope id="outer" 含 id="inner"；outer bbox 必须包 inner 内所有 node 的全局 4 角
- `scope_id_as_at_target_with_nodeDistance`：另一 node `position={{ direction: 'right', of: 'g' }}` + `CompileOption.nodeDistance=20` → g referent 取 bbox 中心 + 距离 20 偏移
- `scope_id_in_polar_translate_scope`：`<Scope id="g" transforms={[polar-translate(angle:30, radius:50)]}>` 内 node → polar-translate 展平为 Cartesian、bbox 走全局 AABB
- `scope_id_bbox_with_inner_rotate_node`：scope 内 node 自身 rotate 30 → node rect.rotate=30 折平，其 4 角点（旋转后矩形 4 角）参与 bbox AABB

### 依赖现有元素

- `packages/core/src/compile/scope.ts`（ADR-01 新建）—— **扩**：补 `computeScopeBoundingBox` / `registerScopeAsLayout`
- `packages/core/src/compile/compile.ts` 的 `nodeIndex` —— **修改使用方式**：scope.id 时写入 synthetic layout
- `packages/core/src/compile/compile.ts` 的 `coordinateAsLayout` —— **引用模板**：synthetic layout 构造方式参考此函数
- `packages/core/src/compile/node.ts` 的 `NodeLayout` 类型 —— **引用**：synthetic layout 完全复用
- `packages/core/src/geometry/rect.ts` 的 `rect.anchor()` / `boundaryPoint()` —— **引用**：scope bbox anchor 完全复用现有 rectangle 路径
- `packages/core/src/compile/position.ts` 的 `resolvePosition` —— **引用**：scope.id referent 走 synthetic layout 中心点；现有逻辑无需改
- `packages/core/src/compile/path/*.ts` 的 path / anchor 解析 —— **引用**：path 引用 scope.id 时 nodeIndex 查到 synthetic layout，与普通 rectangle node 走同一路径
- 本 milestone [ADR-01](./01-scope-ir-and-compile.md) —— **强依赖**：scope.id 字段 schema 由 ADR-01 定义；Pass 1 累积 transform 算全局坐标也是 ADR-01 决策
- 本 milestone [ADR-02](./02-node-index-anchor-resolution.md) —— **强依赖**：scope.id 与 node.id / coordinate.id 共享命名空间 + 冲突走 DUPLICATE_NODE_ID 是 ADR-02 决策

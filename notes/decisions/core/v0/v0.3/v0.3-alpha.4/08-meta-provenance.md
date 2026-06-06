# ADR-08：IR `meta` provenance 透传——Node / Scope / Path 携带来源元数据，compile 原样 stamp 进 Scene，renderer 忽略

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · **机制先例**：[v0.3-alpha.3 ADR-01 水合](../v0.3-alpha.3/01-hydration.md)（`ScenePrimitive.id?` + compile 把 user id stamp 进 emit 图元）· **下游动机**：`@retikz/plot`（root/series/mark 下沉 Scope、datum 下沉 Node，需把数据来源带进 Scene 供交互命中）· **roadmap 伏笔**：[v0.3 总计划 §AI 增量渲染预留](../roadmap.md)（「IR / lowering 应鼓励稳定 id、layer、`meta` 来源信息」）· 参照：[core-design.md §4.4 IR 100% JSON 可序列化 / §7 AI 友好](../../../../architecture/core-design.md)

## 背景

`@retikz/plot`（Tier 2）把高层图表节点经 `lowerComposites` 下沉成 Tier 1 Kernel：root / series / mark 层下沉成 `Scope`，datum 下沉成 `Node`（可见 mark）。下沉后 IR 里**只剩纯几何**——「这个 Node 是 series `sales` 的第 5 个 datum」「这个 Scope 是 `bar` series 层」这类**来源信息在下沉那一刻丢失**。v0.3 交互层（水合）命中一个渲染图元后，无从把它映射回原始 datum / series。

roadmap 早有伏笔（[v0.3 §AI 增量渲染预留](../roadmap.md)：「IR / lowering 应鼓励稳定 id、layer、`meta` 来源信息，方便后续按块更新」「Tier 2 mark / guide 来源信息，应为后续 progressive layer rendering 留空间」）。本 ADR 兑现 core 侧这条最小能力：**IR 元素可携带一段不透明的 provenance 元数据，compile 原样保留进 Scene 输出**。

**关键先例（决定本 ADR 几乎是 alpha.3 机制的平移）**：alpha.3 水合 ADR 已建好同款通路——`ScenePrimitive` 加了可选 `id?`，compile 把 IR 元素的 user `id` **stamp 到 emit 出的每个 top-level 图元**（纯几何 Node 逐个平铺图元、文本 / rotate Node 的 `GroupPrim`、Path 的 `PathPrim`、Scope 的 `GroupPrim`）。`meta` 就是沿这条已验证、已测试的 stamp 通路再加一个**与 `id` 并列的兄弟字段**——同样的载体、同样的 stamp 落点、同样「命中图元即可读」的 hit-test 可达性。**唯一不对称**：`id` 可被引用、能让空 scope 免于 prune；`meta` 不可引用、永不创造或保留图元（见 §编译期 stamp 末条）。

## 决策：`meta` 是 `id` 的兄弟——IR 三载体携带、compile 同款 stamp、Scene 图元承载、renderer 忽略

### 模型

`meta` 是一段**不透明的、100% JSON 可序列化的对象**，core **不解释、不参与 layout / 连接 / 样式 / bbox**，只负责「带着它从 IR 走到 Scene」。语义高度平行于 alpha.3 的 `id`，区别仅在：`id` 是单字符串稳定句柄（兼作命名空间引用、可被路径 / 定位引用），`meta` 是任意 JSON 对象（纯随行数据，不进命名空间、不可被引用）——也因此 `id` 能让空 scope 免于 prune、`meta` 不能（见 §编译期 stamp）。

**载体 = 能产 Scene primitive 且已带 `id` 的三类**：`Node` / `Scope` / `Path`。

- **`Coordinate` 不加 `meta`**：coordinate 产 0 个 Scene primitive（仅注册一个命名点供引用），按 id-stamp 机制其 `meta` 无处落进 Scene——与它的 `id` 同样不进 Scene 图元同理。plot 把 datum provenance 挂**可见的 `Node`**（不可见的 coordinate 没有可命中的渲染物，provenance 无意义）。如此机制最自洽、不留「进 IR 不进 Scene」的悬空字段。

### IR 侧（三载体各加 `meta?`，复用 `JsonObjectSchema`）

```ts
// 复用 src/ir/json.ts 的 JsonObjectSchema —— 守 IR 100% JSON 可序列化（core-design §4.4）：
// 函数 / undefined / Symbol / Date / Map / Set 因 parsedType 不符在 parse 阶段被拒；
// 带可枚举字段的 class 实例会被当普通对象解析（原型方法丢弃，非硬拒）。收紧 json.ts 拒非 plain-object 属另案、不在本 ADR。
// 三处 NodeSchema / ScopeSchema / PathSchema 用同一段 describe（英文）：
meta: JsonObjectSchema.optional().describe(
  'Opaque provenance metadata carried by this element (e.g. a Tier 2 lowering tagging which datum / series / layer it came from). Provenance passthrough: preserved verbatim into the Scene primitive(s) this element emits, ignored by renderers, and never interpreted by the compiler — it does not affect layout, connection, style, or bounding box. Must be a JSON object (fully serializable). Not inherited across scopes; not part of the every-X style defaults.',
)
```

- **`Node.meta`**（`src/ir/node.ts`）、**`Path.meta`**（`src/ir/path/path.ts`）、**`Scope.meta`**（`src/ir/scope.ts`）三处加同款可选字段。
- **不进 every-X 默认通道**：`meta` 是实例级 provenance、非可继承样式，故从 `NodeDefaultSchema.omit(...)`（现 omit `type/id/position/text/label/zIndex`）与 `PathDefaultSchema.omit(...)`（现 omit `type/children/arrow/arrowDetail/zIndex`）**一并排除**——与 `id` / `zIndex` 同样待遇（`scope.ts` 派生这两个 default schema）。
- **不跨 scope 继承**：每个元素的 `meta` 只属于它自己；scope 的 `meta` 落在 scope 自己的 `GroupPrim`、**不下传**给子元素。

### Scene 侧（由 core 定：`meta` 作 `ScenePrimitive` 上 `id` 的兄弟字段）

> plot 不指挥 core 内部表示——Scene 怎么承载 provenance 由 core 决定。选定**镜像 `id`**：零新 Scene 顶层结构、与既有 hit-test 通路一致（命中的图元直接带 `meta`，无需二次查表）、随 `GroupPrim` 嵌套天然传递。

5 个 `ScenePrimitive` 成员（`RectPrim` / `EllipsePrim` / `TextPrim` / `PathPrim` / `GroupPrim`）各加可选 `meta?: IRJsonObject`（与各自已有的 `id?: string` 并列；type-only import `IRJsonObject` 自 `../ir/json`，单一真源、无运行时耦合）。中文 JSDoc，与 `id` 的 JSDoc 同风格。

### 编译期 stamp（与 alpha.3 `id` stamp **完全同路**，不新增遍历）

compile 在已有的「把 user `id` stamp 到 emit 图元」处，**紧贴着多 stamp 一个 `meta`**（取自同一 IR 元素）：

| 载体 | emit 形态 | `id` 现状落点（alpha.3） | `meta` 落点（本 ADR，同点） |
|---|---|---|---|
| 纯几何 Node（不含文本 / rotate） | 平铺 shape 图元（可多个） | 每个 shape 图元（多 shape 共享同 id；label / pin 不 stamp） | 每个 shape 图元（同款复制；label / pin 不 stamp） |
| 文本 / rotate Node | 单层 `GroupPrim` 包 | `GroupPrim`（子图元不重复 stamp） | 同 `GroupPrim` |
| Path | `PathPrim` | `PathPrim` | 同 `PathPrim` |
| Scope | `GroupPrim` | `GroupPrim` | 同 `GroupPrim` |

- **落点与 `id` 逐一对齐**——`meta` 不引入任何新的遍历 / 落点判断，只在 `if (layout.id !== undefined) …` 这类既有 stamp 分支旁边加 `if (node.meta !== undefined) prim.meta = node.meta`（按载体取 `layout` / `child` 上携带的 meta）。
- **多平铺图元复制 `meta`**：与 `id` 一致（一个纯几何 Node emit 多个 shape 图元时各带一份 `meta`）——provenance 冗余无害，且让任一被命中的子图元都能反查来源。
- **`meta` 不完全 mirror `id`——它随图元、绝不创造 / 保留图元**：`id` 之于 scope 是**可被引用的外部句柄**（`scope.id` 注册 synthetic bbox + 是外部可达 handle，故现 `isPrunable` 含 `child.id === undefined`——**`id` 会阻止空 scope 被 prune**）。`meta` 不可引用、空 group 也无可命中几何，故**不加进 prune 保留条件**：仅带 `meta` 的空 scope（无子图元 / 无 transform / 无 id / 无 clip）照常被 prune，其 `meta` 随之丢弃。这与 `Coordinate`（无宿主图元 → 无 Scene meta）是**同一原则**：`meta` 需要宿主图元、永不自己造一个。该取舍写进 compile JSDoc。

### 渲染语义

renderer 后端（svg / canvas / vanilla）**忽略 `meta`**——它是随行元数据，不影响任何绘制；svg 不 emit 成属性（与 `data-retikz-id` 不同，`meta` 不进 DOM），canvas 不读。`meta` 的唯一消费者是 runtime / 工具链 / 交互层（拿到 Scene 后按图元读取）。

理由：

1. **复用 alpha.3 已验证机制，零新增遍历**——`meta` 与 `id` 同载体、同 stamp 点、同 hit-test 可达性，实现面 = 在既有 stamp 旁加一行。
2. **守 IR 100% JSON 可序列化**——`JsonObjectSchema` 在 parse 阶段拒函数 / undefined / Symbol / Date / Map / Set（parsedType 不符），core-design §4.4 不破。
3. **layout / 渲染中立**——不参与 layout / 连接 / 样式 / bbox，纯透传，不耦合任何编译决策。
4. **不撑爆 LLM schema**——`meta` 是单个可选 opaque object 字段，describe 一句话；不引入领域语义（plot 的 datum / series 结构留在 plot 包，core 只见 `JsonObject`）。

## DSL 表面（react + vanilla 双示例）

> `meta` 主要由 **Tier 2 lowering 程序化注入**（plot 的 `expand` 产物），但 Kernel / builder 也直接暴露，供手写 IR / 工具链标注。

```tsx
// react —— Kernel 三载体直接接受 meta（透传，不影响渲染）
<Node id="bar-3" meta={{ source: 'plot', series: 'sales', datum: 3 }} position={[30, 0]} />
<Path meta={{ source: 'plot', series: 'trend' }} from="a" to="b" />
<Scope meta={{ source: 'plot', layer: 'marks' }}>{/* … */}</Scope>
```

```ts
// vanilla builder —— 同一份 IR
node('bar-3', { meta: { source: 'plot', series: 'sales', datum: 3 }, position: [30, 0] });
draw(['a', 'b'], { meta: { source: 'plot', series: 'trend' } });
scope({ meta: { source: 'plot', layer: 'marks' } }, () => { /* … */ });
```

```ts
// 消费侧（runtime / 交互层）—— 命中图元后读 prim.meta 反查来源
const prim = hitTest(scene, pointer);          // → 某 RectPrim / GroupPrim …
const provenance = prim?.meta;                 // → { source:'plot', series:'sales', datum:3 }
```

## 测试设计

`packages/core/core/tests/compile/meta-provenance.test.ts`（新建）+ `tests/ir/*.test.ts`（扩 round-trip）覆盖：

- 三载体 `meta` round-trip 自描述（含 meta 的 IR → JSON → parse → 等价）
- `JsonObjectSchema` 守门：`meta` 为函数 / undefined / Symbol / Date / Map / Set → parse reject（带可枚举字段的 class 实例则解析成普通对象，不拒）
- 纯几何 Node → 每个平铺 shape 图元带 `meta`（多 shape 各一份）；label / pin 图元不带
- 文本 / rotate Node → 单层 `GroupPrim` 带 `meta`，子图元不重复
- Path → `PathPrim` 带 `meta`
- Scope → `GroupPrim` 带 `meta`，子元素不继承
- **省略 `meta` 逐字段等价现状**（Scene 输出无 `meta` 键，非 `meta: undefined`）
- `meta` 不进 every-X 默认：`nodeDefault` / `pathDefault` 里写 `meta` 被 `.strict()` 拒
- layout-neutral：加 / 删 `meta` 不改 viewBox / scope bbox / 任何图元几何
- `id` + `meta` 共存：同图元同时带 `id` 与 `meta`，互不影响
- prune：仅带 `meta` 的空 scope 仍被 prune（meta 不构成保留理由）
- renderer 忽略：含 `meta` 的 Scene 经 svg / canvas 渲染输出与无 `meta` 版逐字节一致（meta 不进 DOM / 不影响绘制）

## 影响

- **`src/ir/json.ts`**（无改动，复用）：`JsonObjectSchema` / `IRJsonObject` 已存在并自 `ir/index` 导出。
- **`src/ir/node.ts`**（修改）：`NodeSchema` 加 `meta`（可选）。
- **`src/ir/path/path.ts`**（修改）：`PathSchema` 加 `meta`（可选）。
- **`src/ir/scope.ts`**（修改）：`ScopeSchema` 加 `meta`（可选）；`NodeDefaultSchema.omit` / `PathDefaultSchema.omit` 各加 `meta: true`（排除出 every-X 默认通道）；手写 `IRScope` 类型加 `meta?`。
- **`src/primitive/{rect,ellipse,text,path,group}.ts`**（修改）：各加 `meta?: IRJsonObject`（type-only import）+ 中文 JSDoc。
- **`src/compile/node.ts`**（修改）：纯几何 Node 平铺图元 / 文本·rotate Node 的 `GroupPrim` 在既有 `id` stamp 旁加 `meta` stamp（`NodeLayout` 透传 `node.meta`）。
- **`src/compile/compile.ts`**（修改）：Scope 的 `GroupPrim` 在 `if (child.id !== undefined) group.id = …` 旁加 `if (child.meta !== undefined) group.meta = child.meta`；prune 条件**不**纳入 `meta`。
- **`src/compile/path/index.ts`**（修改）：`PathPrim` 在既有 `id` stamp 旁加 `meta`（取自 `IRPath.meta`）。
- **对外 API**：三 schema additive（`meta` 可选）；省略时 Scene 逐字段等价现状。**非 BREAKING**。
- **render / vanilla**：忽略 `meta`，渲染零改动；补一条「含 meta 的 Scene → svg/canvas 输出与无 meta 版一致」对照测试。
- **react / vanilla DSL**：Kernel `<Node>` / `<Path>` / `<Scope>` + builder `node` / `draw` / `scope` 加 `meta` prop（透传进 IR，pickDefined 自动转发；不上 React render 栈、无 hooks）。
- **文档**：reference 三页——Node = `node/overview`、Path = `draw/path`、Scope = `layout/scope`——各补 `meta` API 行 + 一句「provenance 透传、renderer 忽略」说明；不单独开页（单字段）。**用户可见 prop → 必须同步文档站**（双语 + demo）。
- **next-plot 回灌**：core 定稿（next-core → next）后，plot 在 lowering 接 `meta` 透传（datum/series/layer → `meta`）——属 plot 包工作，不在本 ADR。

## 不在本 ADR 范围

- **`Coordinate.meta`**：coordinate 产 0 图元、provenance 无可命中渲染物，不加（见决策）。
- **`meta` 进命名空间 / 可被引用**：`meta` 是随行数据，不是句柄；引用走 `id`。
- **renderer emit `meta` 成 DOM 属性 / canvas 元数据**：`meta` 不进 DOM（与 `data-retikz-id` 不同）；交互层从 Scene 对象读，不从 DOM 读。
- **plot 的 datum/series/layer provenance 结构**：领域语义留 plot 包，core 只见 `JsonObject`。
- **progressive / 增量渲染按 `meta` 分块更新**：roadmap 后续方向，v0.4+。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `packages/core/core/src/ir/**`（node / path / scope schema 加字段）+ `src/primitive/**`（Scene 类型加 `meta`）+ `src/compile/**`（stamp）→ red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/node.ts` | 加字段 | `meta` | `JsonObjectSchema.optional()` | 省略（无 meta） | provenance 透传：原样进 Scene、renderer 忽略、compile 不解释 |
| `src/ir/path/path.ts` | 加字段 | `meta` | `JsonObjectSchema.optional()` | 省略 | 同上 |
| `src/ir/scope.ts` | 加字段 | `meta` | `JsonObjectSchema.optional()` | 省略 | 同上（落 scope 自己的 GroupPrim，不下传子元素） |
| `src/ir/scope.ts` | 改 omit | `NodeDefaultSchema` / `PathDefaultSchema` | `.omit({ …, meta: true })` | — | 把 meta 排除出 every-X 默认通道（实例 provenance 非样式） |
| `src/primitive/{rect,ellipse,text,path,group}.ts` | 加字段（TS type） | `meta` | `IRJsonObject \| undefined`（可选） | 省略 | Scene 图元承载 provenance；compile 从 IR 元素 stamp，renderer 忽略 |

### 文件 scope

- `src/ir/node.ts`（修改：meta）
- `src/ir/path/path.ts`（修改：meta）
- `src/ir/scope.ts`（修改：meta + 两 default schema omit + 手写 IRScope 类型）
- `src/primitive/rect.ts` / `ellipse.ts` / `text.ts` / `path.ts` / `group.ts`（修改：meta? + 中文 JSDoc）
- `src/compile/node.ts`（修改：平铺图元 / GroupPrim stamp meta）
- `src/compile/compile.ts`（修改：scope GroupPrim stamp meta；prune 不纳入 meta）
- `src/compile/path/index.ts`（修改：PathPrim stamp meta）
- `packages/core/core/tests/compile/meta-provenance.test.ts`（新建）
- `packages/core/core/tests/ir/node.test.ts` / `path.test.ts` / `scope.test.ts`（扩：round-trip + default 排除）
- `packages/core/react/src/kernel/{Node,Path,Scope}.tsx` + `_fields.ts`（修改：meta prop 转发）
- `packages/core/vanilla/`（修改：`node` / `scope` / `draw` 透传 meta——随 `& NodeSchema` 等已自动）
- `apps/docs/src/contents/core/components/node/overview/**`（Node）+ `apps/docs/src/contents/core/components/draw/path/**`（Path）+ `apps/docs/src/contents/core/components/layout/scope/**`（Scope）（修改：meta API 行 + 双语 + demo）

### 测试象限

**Happy path（≥ 3）**：

- `node_meta_stamped_on_shape_prims`：纯几何 Node 带 `meta` → 每个平铺 shape 图元带同款 `meta`
- `text_node_meta_on_group`：文本 Node 带 `meta` → 单层 `GroupPrim` 带 `meta`，子图元不带
- `path_meta_on_pathprim`：Path 带 `meta` → `PathPrim` 带 `meta`
- `scope_meta_on_groupprim`：Scope 带 `meta` → `GroupPrim` 带 `meta`，子元素不继承

**边界（≥ 2）**：

- `meta_omitted_equivalent`：省略 `meta` → Scene 输出无 `meta` 键（非 `undefined`），逐字段等现状
- `multi_shape_meta_replicated`：多平铺图元 Node → 每个图元各带一份 `meta`（与 id 一致）
- `meta_pruned_scope`：仅带 `meta` 的空 scope 仍被 prune（meta 不构成保留理由）

**错误路径（≥ 2）**：

- `meta_non_json_rejected`：`meta` 为函数 / undefined / Symbol / Date / Map / Set → `JsonObjectSchema` parse reject
- `meta_in_node_default_rejected`：`nodeDefault: { meta: {...} }` → `.strict()` 拒（meta 不进 every-X 默认）

**交互（≥ 2）**：

- `id_and_meta_coexist`：同图元同时带 `id` + `meta`，两者都正确 stamp、互不影响
- `meta_layout_neutral`：加 / 删 `meta` 前后 viewBox / scope bbox / 图元几何不变
- `meta_renderer_ignored`：含 `meta` 的 Scene 经 svg / canvas 渲染输出与无 `meta` 版一致（meta 不进 DOM / 不影响绘制）
- `meta_roundtrip_self_describing`：含三载体 meta 的 IR → JSON → parse → 等价

### 依赖的现有元素

- `JsonObjectSchema` / `IRJsonObject`（`src/ir/json.ts`）—— **复用**：`meta` 字段类型 + Scene 图元 `meta?` 类型，守 JSON 可序列化。
- `ScenePrimitive` 成员的 `id?` + compile 的 user-id stamp 通路（`src/primitive/**` + `src/compile/{node,compile,path/index}.ts`，[alpha.3 ADR-01](../v0.3-alpha.3/01-hydration.md)）—— **平移**：`meta` 与 `id` 同载体、同 stamp 落点，紧贴既有 stamp 加一行。
- `NodeDefaultSchema` / `PathDefaultSchema`（`src/ir/scope.ts`，从 `NodeSchema` / `PathSchema` `.omit().strict()` 派生）—— **修改**：omit 集加 `meta`，排除出 every-X 默认。
- 手写 `IRScope` 类型（`src/ir/scope.ts`，非 z.infer）—— **修改**：加 `meta?: IRJsonObject`（与 schema 同步，避免漂移）。
- scope GroupPrim prune 条件（`src/compile/compile.ts` `isPrunable`，含 `child.id === undefined` → **`id` 阻止 prune**，scope.id 是外部句柄）—— **依赖（不改逻辑）**：`meta` 不可引用、不加进保留条件，仅带 `meta` 的空 scope 照常被 prune（与 Coordinate 同：无宿主图元则 meta 不进 Scene）。
- react Kernel `pickDefined` + `NODE_FIELDS` 完备性互锁（`packages/core/react/src/kernel/_fields.ts`，[alpha.3 ADR-01](../v0.3-alpha.3/01-hydration.md) 同款）—— **修改**：`meta` 进字段表自动转发。

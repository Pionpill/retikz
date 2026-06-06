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

## 不在本 ADR 范围

- **`Coordinate.meta`**：coordinate 产 0 图元、provenance 无可命中渲染物，不加（见决策）。
- **`meta` 进命名空间 / 可被引用**：`meta` 是随行数据，不是句柄；引用走 `id`。
- **renderer emit `meta` 成 DOM 属性 / canvas 元数据**：`meta` 不进 DOM（与 `data-retikz-id` 不同）；交互层从 Scene 对象读，不从 DOM 读。
- **plot 的 datum/series/layer provenance 结构**：领域语义留 plot 包，core 只见 `JsonObject`。
- **progressive / 增量渲染按 `meta` 分块更新**：roadmap 后续方向，v0.4+。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/v0.3-alpha.4/08-meta-provenance.md`（封板全文）。

# 空间贴附与复用长期计划

> **状态：长期计划，当前不实现。** 本文记录复杂复合可视化所需的底层能力，用于后续 core / plot 架构演进时对齐方向。
> 关联：[`core-design.md`](./core-design.md) · `packages/viz/_notes/architecture/plot-design.md` · `packages/viz/_notes/decisions/v0/v0.1/alpha.14/09-composition-api-structure.md`。

---

## 1. 背景

当前 `@retikz/plot` 已经具备一定坐标组合能力：同一画布内可以表达多轴、分面、共享轨道、scale / axis / grid resolve 等结构。这解决的是“一个 plot 内有多个 coordinate view，它们如何排列与共享 guide”的问题。

更复杂的可视化海报会进一步要求“从已有图形派生新的图形”：

1. 中间是主体分面折线图。
2. 右侧按每个分面行对齐，衍生出同高度的小柱状图。
3. 再右侧基于整体高度，衍生出桑基图或关系流图。
4. 下方基于“分面折线图 + 右侧柱状图”的整体宽度，衍生出另一张趋势图。

这些能力不是单纯增加一个 `arrangement.kind` 能解决的。它要求系统知道“已有图形占用了哪些空间”“这些空间对应什么语义分组”“派生图的数据来自哪里”，并能把这些信息暴露给人、程序和 LLM。

“派生”只描述产品生成动作：用户选中一个已有图形，系统基于它建议新图形。落到 IR / Scene 后，这更应该是低耦合的“空间组合”：新图形复用了来源图暴露的空间句柄，但自身仍是普通图形；只要给它等价的显式空间，它应能脱离来源图单独存在。

---

## 2. 核心问题

### 2.1 空间复用

派生图需要复用已有图的宽度、高度、分面 band、轨道 band，甚至未来极坐标系的角度范围或半径范围。

典型需求：

- 右侧柱状图继承每个分面行的高度。
- 下方趋势图继承主体分面图与右侧柱状图的联合宽度。
- 桑基图继承主体分面组的整体高度。
- 极坐标派生图继承某个扇区的角度范围。

这要求底层布局结果不只是最终坐标，而要暴露可引用的空间句柄。

### 2.2 内容感知

派生图不只贴在某块空间旁边，还要知道这块空间代表什么：

- 当前分面对应哪个 row / column key。
- 当前轨道对应哪个 track id。
- 当前 view 使用哪些 scale role。
- 当前 mark 使用哪些数据行、分组、聚合结果。
- 当前派生数据来自哪些源数据与 transform。

没有这些语义信息，产品无法在用户选中主体分面图时提示“按每个分面生成柱状图”“基于整体生成桑基图”“是否继承分组”。

### 2.3 LLM 可理解性

retikz 的长期目标不是只让人手写 API，而是让 LLM 能理解、生成和扩展图形。复杂复合图如果依赖手算坐标、内部 id 或隐式约定，LLM 很难稳定生成。

更合适的表达是：

- 从 `mainFacet` 派生一个图。
- 放在它右侧。
- 按 `facet.row` 分组。
- 继承每个 panel 的高度。
- 使用聚合后的数据画柱状图。

这种表达接近自然语言，也能被编译器校验。

---

## 3. 设计方向

长期上，`composition` 应从“坐标组合配置”扩展为“可引用视图图谱”。图谱中的节点不只是 coordinate view，还包括通过 attachment 放置的普通 view。

```text
mainFacet
  ├─ rightBars：按 facet row 派生，继承每个 row 的高度
  ├─ rightSankey：按整体派生，继承 mainFacet 的总高度
  └─ mainFacet + rightBars
       └─ bottomTrend：继承联合宽度，放到底部
```

这个模型中有四类概念：

| 概念 | 职责 | 所属层 |
|---|---|---|
| View | 一个可被引用的局部坐标视图；attached view 仍是普通 view | plot |
| ViewGroup | 多个 view 的集合，例如分面行、分面列、轨道组、union 结果 | plot |
| RegionHandle | 可复用的空间句柄数据模型，例如 bbox、band、angle span | core 提供模型与索引，plot 生成 domain handle |
| SemanticHandle | 可追踪的语义句柄，例如 facet key、track id、数据 lineage | core 提供容器，plot 写入语义 |

`composition.arrangements` 仍然负责基础拓扑生成器，例如 facet / tracks。overlay 属于 `views[].placement`，不是 arrangement。空间贴附能力不应继续塞进 arrangement，而应作为新的 attachment 层，表达“普通 view / element 如何贴到已有空间句柄”。

更准确的职责划分：

- `arrangements`：声明基础结构如何生成空间，例如 facet / tracks。
- `views[].placement`：声明单个 view 的放置方式，例如 overlay。
- `attachments`：声明一个普通元素或普通 view 如何贴到某个空间句柄上。
- `derivations`：可选的产品 / LLM 生成计划，用于说明某个 attachment 为什么从某个源对象生成；编译后的图形不依赖这个解释才能渲染。

因此长期公开心智应偏向 `attach` / `place` / `inherit space`，而不是把所有能力都称为“派生”。“派生”可以保留在产品建议、数据 lineage 和编辑历史中。

这也意味着 attachment 是高于当前 `arrangements` 的新组合层。当前 plot schema 仍限制 facet 与 tracks arrangements 在同一个 plot 内混用；海报级组合不能被理解为现有 `composition.arrangements` 直接支持，而是后续要在 handle / attachment 层重新组织跨 arrangement 的空间关系。

---

## 4. core 需要提供的能力

### 4.0 现有 core 能力可复用部分

core 目前已经有一组可复用基础：

- `IRScope` 已经表示分组、局部 transform、样式默认值、局部命名空间、裁剪与动画。
- `scope.id` 会注册到父命名空间，作为外部可引用句柄。
- 有 id 的 scope 会在编译时根据子树里的 node / coordinate / nested scope synthetic layout 生成 synthetic `NodeLayout`。它能像普通节点一样参与 anchor / path target / 相对定位；`scope.id.top` / `scope.id.right` 只是 DSL shorthand，IR 层应对应结构化 target / anchor 对象。
- `Scope.boundingShape` 已支持 rectangle / circle 两类 synthetic envelope：rectangle 走 AABB，circle 走最小外接圆并注册为 ellipse/circle 语义的 synthetic layout。
- 位置系统已经支持笛卡尔、极坐标、`at`、`offset`、`between` 等相对定位，并能在 scope transform 链下做局部 / 全局投影。
- `node.meta`、`path.meta`、`scope.meta` 已能原样写到对应 Scene primitive / group 上，renderer 忽略但工具链可读取。

这说明新能力不应另造一套“布局容器”。第一优先级应复用 scope 的分组、transform、bbox、anchor、meta 语义，把它升级成可查询的空间句柄来源。

现有能力的限制也很明确：

- scope bbox 目前主要服务 anchor / path / relative position，不是 Scene 上一等可枚举的 layout handle。
- scope synthetic envelope 不是完整视觉子树 bbox：scope 内 path 几何、path label、mark、shadow 等目前不进入 `innerLayouts`。如果把 scope 升级为空间句柄来源，必须重新定义“视觉 bbox / content box / anchor envelope”分别包含什么。
- Scene 只有根 `layout`，没有每个 scope / node / group 的公开 bbox 索引。
- meta 只是 stamp 到 primitive，缺少统一 provenance 结构、空间句柄索引和面向 LLM 的摘要；并且 scope meta 只有在对应 `GroupPrim` 被 emit 时才存在，当前空 scope 可能被 prune，不能把 scope meta 当作稳定的纯元信息容器。
- `scope.id` 的 synthetic layout 是中心 + bbox 的 NodeLayout，能定位，但表达不了 content box、axis lane、facet band、polar span 这类更细空间。
- `NameStack` 的 id 语义服务绘图引用：同 frame duplicate id warning 后 last-wins，跨 frame 可 shadowing，部分 forward reference 会失败。面向工具链 / LLM 的 handle index 不能直接继承这套语义，必须另有稳定 handle id、qualified id 或 selector 规则。
- transformed scope 内 path 仍有 hoist 限制，说明未来 handle 必须描述“最终全局空间”，不能依赖 renderer group 结构反推。

### 4.1 布局空间句柄

core 需要在编译或布局结果中提供 renderer-agnostic 的空间句柄模型。它不理解“分面”“柱状图”“桑基图”，但要能表达通用空间类型：

- bbox：某个图元、scope、view 或 view group 的包围盒。
- content box：排除 guide / label 后的实际绘图区。
- side anchor：某块区域的 top / right / bottom / left 边。
- band：一组有顺序的局部空间，例如分面行、分面列、track。
- union：多个空间句柄合成的外包区域。
- polar span：极坐标中的 angle span / radius span。

这些句柄必须是 JSON-safe 的结构化数据，不能暴露 DOM、Canvas context 或 renderer 特有对象。

core 的边界应机械：core 负责 handle 数据模型、索引、通用几何操作和 JSON envelope；plot 负责生成 view / viewGroup / panel / track / plotArea / contentBox 等 domain handle，并把其 role、facet key、track id 等语义写入 opaque domain payload。这样 core 不需要知道 facet、axis lane 或 sankey。

### 4.2 空间查询与组合

空间贴附需要用声明式方式引用已有空间：

```ts
{
  target: { kind: 'selector', role: 'facet.row', within: { type: 'arrangement', id: 'mainFacet' } },
  use: 'contentBox.height',
  attach: { side: 'right', gap: 12 }
}
```

core 可以不提供最终用户 API，但需要提供稳定的底层能力：

- 按稳定 handle id、qualified id、role、tag 或 selector 查询空间句柄。
- 对空间做 union / intersect / side / inset / offset；每个操作必须声明支持哪些 handle kind，不支持时 fail-loud。
- 保留 transform 后的真实位置。
- 在布局失败时 fail-loud，而不是默默生成错位图。

这些查询能力应建立在 scope / node / group 已计算出的最终几何上，而不是要求使用者读取 Scene primitives 后自行遍历反推。Scene primitive 仍是 renderer 契约；空间句柄索引是工具链和上层 domain 的布局契约。

### 4.3 语义元信息容器

core 不应该理解 plot 语义，但应该允许 domain 包把语义信息挂到 Scene / layout metadata 上，并保证：

- JSON 可序列化。
- renderer 不解释也不丢失。
- locator / selection / inspector 能按 metadata 找回源对象。
- 同一图元可以同时携带空间 provenance 和数据 provenance。

这与 `core-design.md` 中“core 不理解 meta 内容，只保证存进 / 读出不丢失”的方向一致，但需要进一步面向布局空间和选区查询收敛成稳定契约。

长期上，meta 不应只是任意对象散落在 primitive 上。core 可以提供一个保守的 envelope：

```ts
{
  source?: { namespace: string; type: string; id?: string };
  locator?: { path?: string; address?: string };
  roles?: Array<string>;
  tags?: Array<string>;
  handleRefs?: Array<string>;
  dataRefs?: Array<{
    source?: string;
    rows?: Array<number>;
    transforms?: Array<string>;
  }>;
  domain?: JsonObject;
}
```

core 不解释 `domain`，只保证 envelope 可索引、可查询、可被 locator 返回。plot 可以把 facet key、coordinate view、mark id、data lineage summary 写在 `domain` 或 bounded refs 里；未来 flow / diagram 也能写自己的语义，不需要 core 新增字段。

`dataRefs` 只能引用外部数据、源行、源索引或 transform id，不允许把大数据内联进 Scene / IR。这一点与 plot “数据不进 IR”的方向一致。

### 4.4 attachment 而非强派生

空间组合应当低耦合。一个 attachment 最终只依赖“某个空间句柄解析出的区域”，而不是依赖来源图的具体实现。

例如右侧柱状图的生成过程可以来自 `mainFacet`，但它的落地语义应接近：

```ts
{
  place: {
    beside: { type: 'partition', role: 'facet.row', value: 'Physics', within: 'mainFacet' },
    side: 'right',
    gap: 12
  },
  size: { height: 'same', width: 80 }
}
```

如果后续用户删除来源图，只要把 `place` / `size` 固化为显式区域，这个柱状图仍然是合法图形。这样可以避免“派生图永远依附源图”的高耦合，也便于复制、拆分、保存局部图形。

但空间独立不等于数据独立。如果柱状图、趋势图或桑基图的数据来自源 view 的 facet 子集、聚合或 transform，删除来源图时必须二选一：保留可追溯的数据 lineage / transform spec，或把派生结果固化为数据快照。否则图形虽然有空间，语义却会丢失。

---

## 5. plot 需要提供的能力

### 5.1 view provenance

plot 在生成 facet / track / overlay / attached view 时，应记录每个 view 的来源：

- `coordinateView`：坐标视图 id。
- `arrangement`：来自哪个 arrangement。
- `facet`：row / column / level key。
- `track`：track id。
- `sourceView`：派生自哪个 view 或 view group。
- `dataLineage`：数据来自哪个 source、经过哪些 transform。

这些 provenance 是产品选择、LLM 解释和后续派生的基础。

需要明确三类 provenance 的边界：

- 稳定 Scene / layout metadata：用于 locator、selection、inspector 和跨 renderer 工具链，形状必须长期稳定。
- 编辑器 / LLM context：可以包含候选动作、用户意图、临时排名等运行时信息，不进入 renderer contract。
- 生成历史 / derivation plan：解释某个 attachment 为什么被创建，用于撤销、重新生成和人机协作，不是渲染合法性的前提。

### 5.2 空间组合与派生计划

plot 层负责把“从 A 生成 B”的产品意图拆成两部分：空间组合与可选派生计划。

空间组合是渲染必需信息：

```ts
{
  id: 'right-bars',
  attachTo: {
    selector: { type: 'arrangement', id: 'main-facet', partition: { role: 'facet.row' } }
  },
  placement: { side: 'right', gap: 12 },
  inherit: { height: 'partition', width: 80 },
  view: { coordinate: { type: 'cartesian' } }
}
```

派生计划是解释和再编辑信息：

```ts
{
  from: 'main-facet',
  reason: 'summarize each facet row',
  data: { transform: 'aggregate', groupBy: ['category'], value: 'count' }
}
```

这不是当前要实现的 schema，而是长期 API 心智模型：渲染只需要空间组合；产品建议、LLM 解释、撤销重做、重新生成才需要派生计划。

长期 API 必须先定义 selector 命名空间。`to="main"` 这类简写只能作为 React authoring sugar；标准 IR / action 层应区分 `view`、`arrangement`、`region`、`partition`、`track`、`facetPanel` 等引用目标，避免把内部生成 id 暴露给用户或 LLM。

### 5.3 React DSL 心智模型

React 层可以提供更接近人类 authoring 的结构组件；LLM 可以理解这套心智模型，但正式输出目标应是 JSON action、PlotSpec 或结构化 patch，而不是 React 代码：

```tsx
<Facet id="main" row="category">
  <Line x="year" y="age" />
</Facet>

<Attach to="main" side="right" by="facet.row">
  <Bar x="count" y="category" />
</Attach>

<Attach to="main" side="right" mode="global">
  <Sankey source="category" target="school" value="count" />
</Attach>

<Attach to={['main', 'right-bars']} side="bottom" inherit="width">
  <Line x="year" y="count" />
</Attach>
```

关键不是具体组件名，而是 DSL 应围绕“贴到哪个空间、放到哪里、继承什么、是否按分组拆分”组织，而不是让用户手写内部坐标 id 或手算布局。产品层仍可把它描述成“从 main 派生”，但 DSL / IR 不应让新图形强绑定到来源图。

---

## 6. 产品与 LLM 场景

当用户在编辑器中选中一个分面折线图，系统不应直接从 primitive 推导建议，而应先形成 selection context。

选区至少需要覆盖这些粒度：

- `view`：一个坐标视图。
- `viewGroup`：一个 arrangement 或 union 形成的视图组。
- `panel`：某个 facet panel。
- `track`：某个共享轨道。
- `mark`：某个图元系列。
- `datum`：单个数据项或数据点。
- `union`：用户框选或多选出的复合区域。

locator / hit testing 的结果应先归一成 selection context，再交给 planner。这样系统才能区分用户选中的是整个 facet、某个 row panel，还是某条 mark。

对一个 facet viewGroup，系统应该能从 selection context、provenance 和 handle 中推导：

1. 这是一个 facet arrangement。
2. 它有 row / column 分组。
3. 每个 panel 有独立 content box。
4. 整个 arrangement 有联合 bbox。
5. 数据中存在可聚合字段与分类字段。

基于这些事实，产品可以提示：

- 在右侧为每个分面生成汇总柱状图。
- 在右侧生成整体桑基图。
- 在下方生成共享 x 宽度的趋势图。
- 派生图是否继承分面分组。
- 派生图是否使用全局汇总。

LLM 也可以基于同样信息生成结构化 patch，而不是重新猜测图形布局。

### 6.1 面向 LLM 的空间上下文

给 LLM 的提示不应直接倾倒完整 Scene primitives。更合适的是由工具链从 Scene / handles / meta 中生成一个紧凑的空间上下文：

```ts
{
  selection: { kind: 'viewGroup', selector: { type: 'arrangement', id: 'mainFacet' } },
  handles: [
    {
      id: 'mainFacet',
      kind: 'viewGroup',
      bbox: { x: 120, y: 80, width: 640, height: 420 },
      partitions: [
        {
          selector: { type: 'partition', role: 'facet.row', value: 'Physics', within: 'mainFacet' },
          label: 'Physics',
          bbox: { x: 120, y: 80, width: 640, height: 70 }
        }
      ],
      meta: {
        namespace: 'plot',
        arrangement: 'facet',
        fields: ['year', 'age', 'category', 'school']
      }
    }
  ],
  candidateActions: [
    {
      type: 'attach-view',
      label: '右侧分面汇总柱状图',
      target: { type: 'arrangement', id: 'mainFacet', partition: { role: 'facet.row' } },
      placement: { side: 'right' },
      requires: ['partition', 'aggregate']
    }
  ]
}
```

这类上下文要让 AI 感知三件事：

- **空间**：有哪些可贴附区域、尺寸是多少、能否按分组拆分。
- **语义**：这些区域代表什么分组、坐标视图、mark 或数据子集。
- **动作**：基于当前选择，哪些组合操作是合理的，例如右侧 summary、底部 trend、整体 flow。

meta 只描述事实，不能直接塞 `availableDerivations` 这类产品决策。候选动作应由 capability registry / action registry 根据 selection context、handle 能力、数据字段类型、当前编辑模式和目标 renderer 能力生成。

候选动作也必须是 schema 化对象，而不是字符串列表。一个动作至少需要定义：

- `type`：动作类型，例如 `attach-view`、`attach-summary`、`attach-flow`。
- `target`：稳定 selector，不是内部生成 id 字符串。
- `placement` / `inherit`：空间贴附和尺寸继承参数。
- `data`：可选数据引用、聚合或 transform spec。
- `patchTarget`：该动作会修改 PlotSpec、编辑器 patch 还是生成独立片段。
- `diagnostics`：缺字段、缺 handle、能力不支持时的可读错误。

LLM 生成的结果应是结构化操作，例如“给 selector 命中的每个 `facet.row` 分区右侧 attach 一个 bar view”，而不是绝对坐标 patch。bbox 数值只用于解释、冲突预览和用户确认，默认是只读观察值；绝对坐标只作为用户确认后的固化结果或低级 fallback。

---

## 7. 明确反对

- **反对手算坐标作为主要方案。** 手算坐标可以作为底层 fallback，但不能成为公开 API，否则 LLM 和产品都无法稳定扩展。
- **反对把派生关系塞进 mark 私有字段。** 派生是 view / layout / data 的组合关系，不属于某个 mark。
- **反对让 core 理解 plot 语义。** core 只提供空间、metadata、选择和查询的底座；facet / track / sankey / aggregate 仍属于 plot。
- **反对继续把所有能力塞进 `arrangements`。** `arrangements` 表达基础拓扑，派生关系表达 view graph，两者职责不同。
- **反对 renderer 专属布局句柄。** 句柄必须在 Scene / layout 层稳定存在，SVG / Canvas / SSR 行为一致。
- **反对让新图形与来源图强生命周期绑定。** 来源图可以生成建议和默认空间，但新图形应能通过显式空间独立保存、复制和复用。
- **反对把完整 Scene 当作 LLM 上下文。** LLM 需要的是压缩后的空间句柄、语义 meta 和可执行动作，不是 renderer primitive 明细。
- **反对把候选动作写死在 meta 里。** meta 描述事实，planner 结合 capability / action registry 生成候选动作。
- **反对让 LLM 拼接内部 id。** LLM 应使用 selector 和 action 参数；内部 opaque id 只能用于系统内部定位。

---

## 8. 分阶段路线

### 阶段 0：沉淀方向

本文即阶段 0。当前不改代码，只把长期方向写清楚，避免后续在 `composition` 上继续无边界叠字段。

### 阶段 1：core 空间与 metadata 基础设施

目标是让 core 能稳定记录和查询空间句柄、语义 metadata、locator provenance。此阶段不实现派生图，只解决“图中每块空间是什么、来自哪里、能不能被选中和引用”。实现上应复用现有 scope synthetic layout、relative position、meta stamp 机制，不另造平行布局容器。

### 阶段 2：handle / selector / provenance 契约

在真正做 attachment 之前，先固定长期契约：handle registry schema、handle id 稳定性、qualified id / selector 语法、bbox / contentBox / band / union / polar span 的类型边界、错误诊断归属，以及哪些 provenance 进入稳定 Scene / layout metadata。

### 阶段 3：plot 输出 view / arrangement handle

让 facet / tracks / overlay 输出稳定的 view handle、panel handle、track handle、union handle，并把 facet key / track id / 最小 data lineage envelope 写入 provenance。facet panel 这类依赖数据枚举的 handle 可能只能在 lowering 数据阶段生成，这需要在错误诊断和 locator 契约中明确。

### 阶段 4：selection model 与 action registry

定义 selection context、capability registry 和 action schema。先让系统能把 locator / hit testing 结果归一为 view / panel / track / mark / datum / union selection，再根据 handle 能力和数据字段类型生成 candidate actions。

### 阶段 5：attachment layout

先支持“把一个新 view 贴到已有 view / view group 的某侧，并继承宽度或高度”。优先覆盖：

- facet row 右侧小图。
- arrangement 底部汇总图。
- tracks 旁侧 summary view。

此阶段不急于覆盖极坐标。

### 阶段 6：AI 空间上下文与建议系统

基于 selection context、handles、meta 和 candidate actions 生成面向 LLM 的紧凑空间上下文。此阶段重点是建议和结构化 patch，不要求自动选择最佳视觉设计。

### 阶段 7：derived data 与建议系统

在 plot 层把 selected view 的数据 lineage 暴露给派生 planner。产品可以根据字段类型和当前 selection 提供候选派生图，例如 bar / line / area / sankey。

### 阶段 8：极坐标与非矩形空间

在矩形空间模型跑通后，再扩展 angle span / radius span / arc anchor 等能力，支持从极坐标扇区派生环形图、弦图或局部 radial view。

---

## 9. 待决策

- 空间句柄最终挂在 Scene 上，还是作为 compile metadata 与 Scene 并列返回。
- 句柄 id 由用户显式命名、编译器稳定生成，还是两者结合。
- attachment 属于 PlotSpec schema、core layout schema，还是编辑器 action / patch 层。
- view group 的表达是否需要成为一等 IR，还是仅作为 composition normalization 的产物。
- 派生数据 transform 是否复用现有 transform 管线，还是需要新增 derivation planner。
- 产品选择态、locator、hit testing 与 provenance 的边界如何划分。
- action schema、capability registry、candidate action ranking 是否属于 plot 包，还是编辑器 / AI 工具链。
- 极坐标空间复用是否抽象成通用 span，还是由 coordinate definition 提供自定义 handle provider。

---

## 10. 判断标准

当后续真正实现本计划时，至少满足以下标准：

1. 用户和 LLM 不需要手写内部生成 id。
2. 选中任意 view / panel / track 后，系统能解释它的空间、语义和数据来源。
3. 派生图可以声明式复用已有空间，而不是手算绝对坐标。
4. core 不依赖 plot，不理解 chart 语义。
5. SVG / Canvas / SSR 共享同一套空间与 provenance 结果。
6. 编译错误能指出缺失的来源 view、冲突的空间继承或不可解析的数据 lineage。
7. bbox 数值默认只用于解释和预览；可执行 patch 使用 selector / action 参数。
8. 删除来源图时，attached view 要么拥有固化空间与数据快照，要么保留可解析 lineage；不得留下半失效图形。

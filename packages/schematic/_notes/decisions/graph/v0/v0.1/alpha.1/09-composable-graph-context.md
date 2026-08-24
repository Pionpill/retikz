# ADR-09：Graph 可选上下文与可组合 Relation 引用

- 状态：Accepted
- 决策日期：2026-08-22
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md) · [Entity 语义封装与 Core Node 复用](./07-entity-data-geometry.md) · [Relation 语义封装与 Core Path 复用](./08-relation-data-geometry.md)

## 背景与目标

Entity 与 Relation 是可独立下沉为 Core Node 与 Path 的正式语义元素，但当前 Graph Source 把它们限制为 Graph root 的直接成员：Graph schema 排斥普通内容树中的 Graph semantic composite，Graph resolve 收集成员并建立 Entity identity 索引，Relation 也只能通过该索引引用同一 Graph root 内的 Entity。这使 Graph 从展示上下文变成了成员数据库，并阻止 Relation 连接普通 Core Node、Plot、Table 或其它已经通过 Core namespace 发布引用几何的内容

Graph 的长期职责只是提供 `graphTheme` 与可复用 Core Scope 公共面。它不应成为 Entity / Relation 的必需父节点，也不应复制 Core 已有的 id、namespace、target 解析、样式级联和重复 identity 诊断。没有 Graph 时，Entity 与 Relation 应使用当前位置的 Core Theme 和 Graph 默认 baseline 继续确定语义并绘制

本决策把 Graph 收敛为可选上下文薄壳，让 Entity、Relation 与任意 Core / Tier 2 child 使用同一内容树组合，并把 Relation endpoint 统一到 Core 的公开引用契约

## 决策

### Graph 是可选上下文薄壳

`IRGraph.children` 直接接受完整 Core `IRChild`。Entity、Relation、普通 Node / Path / Scope、Layout、Plot、Table 与其它已注册 composite 可以按作者顺序出现；Graph 不再维护 semantic member 白名单、成员集合、Entity / Relation identity 索引或 Graph-root 级重复检查

Graph Source 直接组合完整 Core `IRScopeProps`，包括级联 graphic style、Core `theme`、`id`、`localNamespace`、transform、placement、`nodeDefault`、`pathDefault`、`labelDefault`、`arrowDefault`、`resetStyle`、`zIndex`、clip、bounding shape、`meta` 与 group animation。Graph 不复制或收窄这些字段；它们保持 Core 的字段名、默认值、校验、继承、namespace 与失败语义

Graph lowering 只生成一个普通 Core Scope，用于承载有序 children，并把上述 Scope properties 原样交给 Core。该 Scope 不自动建立 `localNamespace`，但作者显式设置时完全沿用 Core namespace frame 语义。Graph 不生成 id，也不把 adapter embed identity 写入 Source IR 或 Core target identity

Core Scope 已使用 `theme` 表示后代继承的 Core Theme override，因此 Graph-local appearance rule layer 改名为 `graphTheme`。`theme` 始终保持 Core Theme 语义；`graphTheme` 只影响可见的 Entity / Relation。Graph 可以同时设置两者：先建立新的 Core Theme baseline，再应用当前 Graph-local rules。旧 Graph-local `theme` 不保留 alias 或 fallback

Graph 本身不拥有 children 排布算法。React Graph 在 standalone 使用时与 Layout、Plot、Table 一样建立 Scene，并把 Graph 作为该 Scene 的唯一 authored child；嵌入已有 Layout / Scene 时不建立嵌套 Scene，只贡献该局部 Scope。Graph 可以像 Node 或其它 Core child 一样作为 Layout item，具体 Flex / Grid / Overlay 排布仍由外层或显式子级 Layout 拥有

Graph Source 与 standalone host 的字段边界保持稳定：与 `IRScopeProps` 同名的字段在两种模式下都属于 Graph Scope；`width`、`height`、`viewBox`、renderer、runtime、资源 definitions 与宿主 DOM 属性等只属于 standalone Layout host，不进入 `IRGraph`。embedded Graph 如果收到仅适用于 standalone 的 host 属性必须 fail-loud，不能忽略或生成第二层 panel Scope

### Entity 与 Relation 是独立 semantic composite

Entity 与 Relation 在任何接受 Core child 的位置都合法，不要求祖先 Graph。两者分别通过自身 Composite Definition、provider、registry、resolve 与 lowering 路径进入 Core；Graph root 不代理注册，也不建立只在 Graph 内成立的消费分支

独立 Entity 与 Relation 使用当前位置有效 Core Theme 对应的完整 Graph Theme resolution，以及内置或注入的语义与 Theme definitions。Graph Theme style definition 只返回相对默认 preset 的稀疏 Entity / Relation tokens 与 rules；Graph resolver 先建立 mode-aware 默认 preset，再叠加自定义 tokens，并把默认 rules 放在自定义 rules 之前。Graph 存在时只增加局部 Theme layer，不改变两类元素的 schema、Definition 或 lowering 真源

Entity 与 Relation 的 `id` 都保持可选，并直接映射到各自 Core lower target 的 `id`。省略 id 的元素正常绘制，但不向 Core namespace 注册引用目标；任何 adapter 都不得为其生成持久化或内部模型 id

### Graph 上下文只影响可见的 Graph 语义后代

Graph `graphTheme` 按 Source 内容树向后代 Entity / Relation 生效；普通 Core Scope 不改变这条继承链。嵌套 Graph 继承外层 Graph-local layers，再按外层到内层顺序追加自身显式 layer

带自身 Core `theme` 的 Scope 或 Graph 开始新的 Graph Theme style baseline，并切断外层 `graphTheme` layers；当前 Graph 自己的 `graphTheme` 从新 baseline 开始生效。第三方 composite 是 Graph 上下文的不透明边界：Graph 不猜测或改写其 provider 内部生成的 Entity / Relation；需要局部 Graph Theme 时，由该 composite 自己公开契约或在其可见内容中显式放置 Graph

普通 Core / Tier 2 child 只消费 Graph 复用的 Core Scope / Theme 公共面，不消费 `graphTheme`。Graph 按原顺序原样保留它们，也不把领域 token 注入 Core Theme、renderer 或任意第三方 composite context

Graph Definition 只在自身 schema 可见的 Source child tree 中投影这份上下文：它穿透普通 Core Scope，把已匹配的 Graph-local appearance overrides 合并到生成态的同类 Entity / Relation composite，作者显式字段保持最高优先级；遇到显式 Core Theme Scope 或带 `theme` 的 Graph 时丢弃外层 `graphTheme`；遇到嵌套 Graph 时按外层到内层顺序合并 layers。投影后的节点仍保留原 Entity / Relation discriminator，并继续由各自 Composite Definition、provider、resolver 与 lowering 消费

这份投影只存在于 composite lowering 产生的中间 IR，不进入 authored Source schema，不增加隐藏 context 字段，也不要求 Core 建立领域 context bag。Graph 不在投影阶段收集成员、解析 endpoint、生成 id 或读取第三方 composite 内部；因此独立元素与 Graph 后代共享同一消费真源，Graph 只拥有局部默认的作用域传播

### Relation endpoint 复用 Core NodeTarget

Relation `source` 与 `target` 直接使用 Core `IRNodeTarget`：

```ts
type IRGraphRelation = Readonly<{
  namespace: 'graph';
  type: 'relation';
  id?: string;
  source: IRNodeTarget;
  target: IRNodeTarget;
  role: string;
  route?: ReadonlyArray<IRGraphRelationRouteStep>;
}>;
```

endpoint 因此可以表达 `{ id, anchor?, offset?, boundary? }`，并由 Core 按当前 namespace frame 解析。可引用目标包括带 id 的 Node、Coordinate、已解析 Scope，以及把公开 id 下沉到这些 Core target 的上层 composite。Plot、Table 等上层内容只要按自身契约把 id 发布为外层 Scope，就可以直接成为 Relation endpoint

“带 id”必须同时意味着该 lower target 通过 Core namespace 发布了可引用几何。仅保存 provenance id、Path id、artifact key、occurrence 或 spatial handle，但没有形成 Core NodeTarget 目标的内容，不自动成为 Relation endpoint。Graph 不建立第二套 target、handle 或 geometry lookup

Relation 不再校验 endpoint 是否属于某个 Graph，也不在 Graph resolve 中提前查找目标。namespace 可见性、重复 id、未知引用、Scope boundary 与 anchor / boundary 解析全部沿用 Core 的同一编译语义和诊断

### Relation 缺省使用直接 Core 路径

Relation 的 source 与 target 既是拓扑端点，也是省略 `route` 时的默认绘制端点。缺少 route 时，lowering 生成从 source move 到 target line 的最小 Core Path；不计算自动 routing、避障或 Diagram geometry

显式 route 仍是完整 Core Path-compatible step sequence，由作者、Diagram、Editor 或其它消费者负责提供。它是当前绘制几何的权威输入，Graph 不比较 route 与 endpoint 的 JSON、位置或连通性，也不在直接路径与自动 routing 之间建立优先级模型

### Direct IR、React 与 Vanilla 保持同一契约

Direct IR 可以把 Graph、Entity 与 Relation 作为三个独立 composite 使用。React `Entity` / `Relation` 与 Vanilla 对应 builder 产出同一 Source IR，并可以作为 Layout、Scope、Graph 或其它接受 Core child 的直接内容；Graph 的 React / Vanilla authoring 使用通用 child normalization，不再收集私有 member declaration

React / Vanilla 可以提供字符串 endpoint、`way`、JSX Step 或文本 children 等 TypeScript authoring sugar，但必须在 Vanilla normalize 边界收敛到上述 Source IR。framework adapter 不维护 Graph root 索引、默认 id、endpoint lookup、Theme 默认或平行错误分支

## 基础数据结构与公开契约

Graph Source root 的最小结构为：

```ts
type IRGraph = IRScopeProps &
  Readonly<{
    namespace: 'graph';
    type: 'graph';
    graphTheme?: IRGraphThemeLayer;
    children?: ReadonlyArray<IRChild>;
  }>;
```

Graph child grammar 与 Core `IRChild` 同源，不另设 Graph content child 类型。Graph 只额外拥有 `graphTheme` 领域语义；完整 `IRScopeProps` 继续由 Core 持有，Graph 只是组合并原样下沉。Layout solver、Scene host runtime 与其它 composite 的结构字段仍由对应 owner 持有

Direct IR 中 Graph 仍是普通 Core child composite；需要完整持久化输入时由普通 `IRScene.children` 承载。React standalone Graph 只是把相同 Graph Source 交给一个 Layout host 建立 Scene，不把 `type: 'scene'`、`version` 或 host props 写进 `IRGraph`。Vanilla embed 与 React embedded 入口同样只贡献该 Graph child

Entity 与 Relation 继续保留 `namespace: 'graph'` 的 JSON-safe semantic IR，并各自复用 Node / Path lower-facing surface。Relation endpoint 直接复用 `IRNodeTarget`；不存在 `{ entity: string }` Graph wrapper、Entity-only lookup 或 Graph-root membership contract

三类 composite 使用同一 `GraphDefinitionOptions` 装配 Entity / Relation role、kind、predicate 与 Graph Theme style registries。内置和自定义 definitions 继续共用同一 registry、resolver 和 lowering 路径；Graph 是否存在不改变 definitions 的可见性或优先级

## 行为、失败语义与兼容性

- Graph children 可以是任意合法 Core child；未知 composite 仍由 Core 的注册与诊断契约处理，Graph 不提前拒绝
- Graph 的完整 Scope surface 与 Core `IRScopeProps` 同源；默认样式、reset、Theme、placement、clip、namespace 与 animation 的结果和诊断不得出现 Graph 专用分支
- standalone Graph 建立一个 Scene；embedded Graph 只生成一个 Scope，且任何嵌套层级都不得产生 Scene-in-Scene
- Entity / Relation 没有 Graph 祖先时继续使用当前 Core Theme 和 Graph 默认 definitions；不抛 parent-required 错误
- Graph、Entity、Relation 省略 id 时不生成 Source id、Core id 或 Graph model identity；只有显式 id 才参与 Core namespace
- Relation endpoint 使用 Core NodeTarget 的 schema、namespace lookup、anchor、boundary、offset 与 unresolved-reference 诊断；Graph 不把 Core warning 重写为 Graph membership error
- Relation 省略 route 时绘制直接连接；显式 route 保持现有 Core step、label、marker、Theme 与 geometry 语义
- Graph Core `theme` 与 Scope defaults 正常影响全部后代；`graphTheme` 不改变普通 Core / Plot / Table 内容，第三方 composite 内部生成的 Graph 元素也不隐式继承外层 Graph context
- 自定义 Graph Theme style 可以只声明需要改变的 Entity / Relation token 或 rule；省略值由默认 preset 补全，默认 rules 保留且先于自定义 rules 执行，完整结果只在 Graph resolver 中形成
- Entity / Relation `variant`、Graph `entityVariant`、Variant definitions / registries / options 与 Theme selector `variant` 直接删除；Source schema 将旧字段作为未知字段拒绝，不保留兼容 alias 或 fallback
- 删除 Graph content semantic exclusion、Graph-root Entity / Relation 索引、root duplicate family 校验和 React declaration-only marker；不保留兼容 alias、隐式 Graph wrapper 或双轨 endpoint
- 这是 breaking Source IR 与 authoring 迁移：Relation endpoint 从 `{ entity: string }` 改为 Core NodeTarget，Relation id 改为可选，Entity / Relation 从 Graph-only declaration 变为独立 composite，Graph-local `theme` 改为 `graphTheme`，Graph root 增加完整 Core Scope surface，并删除整条 Variant 视觉轴。`0.x` 不保留旧结构 fallback

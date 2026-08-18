# ADR-09：分离 Container 包含数据与展示复合

- 状态：Proposed
- 决策日期：2026-08-18
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Entity 数据、几何与展示语义 ADR](./07-entity-data-geometry.md) · [Relation 数据、几何与展示语义 ADR](./08-relation-data-geometry.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

当前 Container 是一个 layout-aware presentation composite：它保存 header、sections、Flex size / padding / row gap、shell appearance 与 descendant Entity variant，并从 JSX children 建立局部布局。这能绘制带外壳和分隔线的区块，却不能作为通用 containment data，因为成员关系只隐含在 presentation children 中，工具与 LLM 无法稳定回答某个 Entity、Relation 或嵌套 Container 属于哪个语义容器

PlantUML package / partition、Mermaid subgraph、Graphviz cluster、系统边界、泳道与学术分区还具有不同抽象层级。`group`、`boundary` 与 `partition` 可以决定主要包含语义和基础外壳家族，`uml.package`、`workflow.lane` 或 `architecture.trust-zone` 是稳定子类型，具体级别、所有者或约束则应由 predicate params 表达。把这些差异全部塞进 header / section role 或任意 `meta` 会让 containment 不可校验，也无法驱动统一 Theme selector

本决策把 Container 的 semantic containment、authored geometry 与 presentation composite 分离。Container 沿用 ADR-07 冻结的 `role → kind → predicate(params)`、variant 与 meta 职责，但拥有独立 Definition、registry、shell token、selector 与 resolver。现有 header / sections / Flex / shell 能力保留为 presentation 输入和 lowering recipe，不再充当成员关系真源

## 决策

### Container data 是独立 containment 记录

Container data 保存稳定 identity、共同语义字段与显式 member references。member 使用 `type + id` 判别 Entity、Relation 或 Container，避免不同成员类型的同名 identity 发生歧义。Container-to-Container member reference 建立嵌套；Source IR 不同时保存 `parent`，Graph resolve 由 members 构造唯一 parent index，避免双真源

`members` 是 containment data，不是 paint order、Flex child list、z-index 或自动布局约束。数组只提供稳定 authored order 以便序列化、diff 与 deterministic diagnostics；除非上层领域明确投影为 predicate，Graph 与 LLM 不把顺序解释为执行或视觉顺序

Relation 是否属于 Container 必须显式记录，不根据两个 endpoint 的父 Container 自动推断。跨 Container Relation 是合法拓扑；Diagram 可以用 containment 计算 route 或 compound edge，但不能反向改写 Graph membership

Container data 只进入 ADR-07 冻结的 `IRGraph.containers` collection；presentation input 与 authored geometry 分别进入 `IRGraph.presentation.containers` 和 `IRGraph.geometry.containers`，并按 identity 引用 data。Container data record 不再作为 standalone Core composite，当前 layout-aware composite 迁移为 Graph Source root 内部的受控 presentation / lowering 路径

### role、kind 与 predicate 分层表达包含语义

Container role 使用开放 key，决定主要 containment 语义与完整基础 shell recipe。Graph 内置：

- `group`：概念上的成员集合，基础 recipe 可以不显示强边界
- `boundary`：具有内外语义的边界，基础 recipe 提供明确 shell
- `partition`：在同一上层范围内区分区域，基础 recipe 提供分区视觉语言

不使用 `scope` 作为 Container role，以免与 Core Scope 的 presentation / theme 机制混淆。内置 role 不构成 schema 的闭合集合

内置 role 的规范基础 recipe 为：

| role        | shell                        | header           | divider                      |
| ----------- | ---------------------------- | ---------------- | ---------------------------- |
| `group`     | 不绘制 shell                 | 独立内容，无底板 | 不绘制                       |
| `boundary`  | rectangle，`cornerRadius: 8` | 位于 shell 内    | 不绘制                       |
| `partition` | rectangle，`cornerRadius: 0` | 位于 shell 内    | 绘制，`strokeWidth: 1`、实线 |

默认 Container appearance baseline 为 `fill: 'transparent'`、`stroke: 'currentColor'`、`strokeWidth: 1`、`opacity: 1`；role recipe 再决定 shell / divider 的存在性与结构。Group 不因 shell 隐藏而失去 semantic membership。Graph 本阶段不内置 Container kind 或 predicate；`uml.package`、`workflow.lane` 与 `architecture.trust-zone` 由对应上层通过同一 registry 注册。Container 只内置 `default` variant，省略 variant 时使用 `default`；该 variant 不提供 token delta

Container kind 在一个 role 下表达稳定子类型并提供稀疏 shell / header / divider recipe delta，例如 `uml.package`、`workflow.lane` 或 `architecture.trust-zone`。kind 不改变所属 role，不自动选择 Diagram layout provider，也不从点号前缀推断上层领域

Container predicate 对 role / kind 作可校验精确说明，例如边界的 trust level、partition 的责任方或一组领域约束。predicate params 可以通过 definition resolver 细化 shell dash、fill、opacity、header 强调或 divider 等 presentation token，但不能增删 members、改变 nesting 或注入布局算法

Container variant 是独立非语义视觉轴，只能修改 fill、stroke、width、opacity、header / divider emphasis 等 appearance token，不能改变 role、kind、predicate、member references、shell existence 的规范语义或 geometry。一次性语义差异使用 kind / predicate，一次性非语义视觉差异使用自定义 variant，一次性主题化差异使用 Theme selector rule

### semantic containment 与 presentation tree 分离

Container presentation input 通过 Container identity 引用已解析 containment record，并可提供 header、authored regions、local padding / gap、descendant Entity 默认 variant、成员专属 `graphTheme` layer 与可选 Core `coreTheme` boundary。header / regions 是可绘制内容和局部排版结构，不建立、覆盖或删除 semantic members

header 与 region child 使用 Graph 自己的受限 presentation child schema：它复用 Core `IRChild` 的绘图能力，但拒绝原始 Graph `graph`、`entity`、`relation` 与 `container` semantic composites。Graph 成员只能来自 Canonical Container members，并由 Graph presentation pipeline 受控插入；不能通过 header / region 绘制一个未进入 containment、endpoint 或 parent indexes 的隐藏成员

Graph presentation 根据 Canonical Container 的 members 与当前唯一 geometry / layout result 决定哪些已解析 member presentations 位于外壳内。当前 header / sections / Flex compiler 可以继续作为一种内置 presentation recipe，但其 section key、section role 与 children 不再是 Graph containment data；presentation-only children 不能被 Relation endpoint、Container membership、Diagram topology 或 LLM 当成 Graph member

`entityVariant` 是后代 Entity 的 presentation default，不是 Container 自身 variant，也不属于 semantic containment。它迁移到 Container presentation scope，并沿用 ADR-06 的就近继承与 Core Theme Scope 边界。Container 自身的 `variant` 只选择 Container appearance recipe

### Theme selector 感知完整 Canonical Container

Container Theme selector 可以按 `role`、`kind`、`predicate.name`、`predicate.params` 与 `variant` 匹配。多个字段按 AND 匹配；单值 / 列表表示一个或多个允许 key；params 对已校验 Canonical params 做递归子集匹配，对象只要求 selector 声明的键相等，数组与标量使用 JSON 深度相等。params selector 只有同时声明 predicate name 才合法

Container presentation 按以下顺序确定，后者覆盖前者：

```text
当前 Graph Theme style 的 Container baseline tokens
> role 的完整基础 shell recipe
> kind 的稀疏 recipe delta
> predicate definition 根据 Canonical params 解析的 delta
> variant 的非语义 appearance recipe
> 当前 Graph Theme style 中匹配完整语义的 Container rules
> 从外到内各层 Graph Container baseline tokens 与匹配 rules
```

Container token vocabulary 至少覆盖 shell visibility / shape、fill、stroke、stroke width、dash、opacity、header 与 divider appearance。role / kind recipe、predicate resolver、variant resolver 与 Theme rules 共用 Container-owned token vocabulary，但各自只能写入允许的 token 子集。无条件 Theme baseline 与 variant 只包含非语义 appearance token；shell visibility / shape 等结构 token 只能由 role、kind、predicate resolver 或匹配完整语义的 selector rule 设置。Theme selector 可以根据 Canonical params 细化空心 / 实心、虚线、透明度或强调，不得改变 members、nesting 或 authored / Diagram geometry

相同 role、kind、predicate、Canonical params、variant 与 Theme scope 必须得到相同 Container presentation recipe。header content、meta、member count、bounds 与 geometry 不得绕开级联任意替换 shell style；绝对 bounds 可以因 member geometry、content measurement 或显式约束不同而变化

Container `graphTheme` 同时作用于当前 Container shell 与 semantic descendants；无 `coreTheme` 时按 root layer → 外层 Container layers → 当前 Container layer 级联。声明 `coreTheme` 时 lowering 直接使用 Core `IRTheme` 建立 Theme Scope，清空外层 Graph-local layers，在新 Theme style 对应的三成员 baseline 上应用当前 layer；嵌套后代继续从这里向内累积。第三方 composite 继续是不透明边界，Graph 不递归猜测其中的 semantic members

### geometry 通过 Container identity 独立对齐

authored Container geometry 保存 Container identity 与显式 outer bounds，可选保存 presentation region allocations。Diagram Layout Result 可以根据 Canonical membership、member geometry 与 layout provider 生成同一 identity 的 bounds、member placements、port projections 与 compound routing hints。两者都不重新定义 role、kind、predicate、variant 或 members

一次 Graph presentation 对每个 Container identity 只能消费一个已裁决 geometry result。Graph 不静默合并 authored bounds、当前 Flex artifact 与 Diagram bounds；未来 Diagram 可以把 authored bounds 作为 pin、minimum size 或 constraint，但交给 Container presentation 前必须产出唯一 result。Layout 与 Standard 继续拥有通用 Flex / Grid / Overlay、measurement、spacing、artifact、Frame 与 shell mechanism，Graph 只组合公开能力

### nesting resolve 与 presentation lowering 分责

Graph resolve 先校验所有 member references，再构造只读 parent / children indexes，拒绝 Container nesting cycle 与当前 containment 维度内的多父冲突，产出 Canonical Container data。Container presentation resolve 随后消费 role / kind / predicate / variant registries、Graph Theme、presentation input 与唯一 geometry，产出确定 shell / header / divider recipe

lowering 只把 Canonical Container presentation 组合为 Layout / Standard / Core 公开输入；Core、Scene 与 renderer 不解释 Graph membership、role、kind、predicate 或 variant。未来 Diagram 只消费 Canonical containment 与 identity indexes，不读取 Container JSX children 或从 Scene bounds 反推 membership

直接 JSON、React 与 Vanilla 必须构造同一 `IRGraph` Source assembly、Container data、presentation input 与 authored geometry。adapter 可以把 JSX declarations 归一为显式 member references、受限 presentation children 与 root collections，但不得把 Graph Container 作为任意 Core child，也不得建立只存在于 adapter 的 membership、默认 role / kind、style 优先级或 cycle 处理

## 基础数据结构与公开契约

Container Source IR 的最小 containment 结构为：

```ts
type IRGraphMemberRef = Readonly<{
  type: 'entity' | 'relation' | 'container';
  id: string;
}>;

type IRGraphContainer = Readonly<{
  namespace: 'graph';
  type: 'container';
  id: string;
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  variant?: string;
  members: ReadonlyArray<IRGraphMemberRef>;
  meta?: IRJsonObject;
}>;

type IRAuthoredContainerGeometry = Readonly<{
  container: string;
  position: IRPosition;
  size: IRBoxSize;
}>;

type IRGraphContainerPresentation = Readonly<{
  container: string;
  header?: IRGraphPresentationChild;
  regions?: ReadonlyArray<Readonly<{ key: string; child: IRGraphPresentationChild }>>;
  entityVariant?: string;
  graphTheme?: IRGraphThemeLayer;
  coreTheme?: IRTheme;
  layout?: Readonly<{
    size?: IRLayoutSize;
    padding?: number | IRBoxSpacing;
    rowGap?: number;
  }>;
}>;
```

`regions` 只保存 presentation-only 内容；semantic members 只来自 `IRGraphContainer.members`。实现可以让一个 authoring helper 同时构造 data 与 presentation，但 schema、Canonical resolve 与 diagnostics 必须保持两者可分离

Container 扩展面使用成员专属契约：

```ts
type ContainerRoleDefinition = Readonly<{
  role: string;
  description: string;
  presentation: IRGraphContainerRoleTokenRecipe;
}>;

type ContainerKindDefinition = Readonly<{
  kind: string;
  role: string;
  description: string;
  presentation?: IRGraphContainerThemeTokenOverrides;
}>;

type ContainerPredicateDefinitionInput<TSchema extends ZodType<IRJsonObject>> = Readonly<{
  name: string;
  role: string;
  kinds?: ReadonlyArray<string>;
  description: string;
  paramsSchema: TSchema;
  resolvePresentation?: (params: z.output<TSchema>) => IRGraphContainerThemeTokenOverrides;
}>;

type ContainerVariantDefinition = Readonly<{
  variant: string;
  resolve: (context: ContainerVariantResolveContext) => IRGraphContainerAppearanceTokenOverrides;
}>;
```

`defineContainerPredicate` 在定义点保留 params schema 的具体类型，并封装为 registry 可存储的擦除 Definition；callback 只接收已通过对应 schema 的 params。role、kind、predicate 与 variant 分别进入 `GraphDefinitionOptions.containerRoles`、`containerKinds`、`containerPredicates` 与 `containerVariants`

公开 `defineContainerRole`、`defineContainerKind`、`defineContainerPredicate` 与 `defineContainerVariant` 分别保持对应 Definition 的类型，并让内置与自定义项通过同一注册入口。四类 definition 不使用跨成员 `AnyGraphMemberDefinition`，也不建立内置白名单 dispatch

Canonical Container 保存已解析 member references、parent / children indexes、Canonical predicate params 与 Definition provenance。Source params 省略时以 `{}` 作为 schema input；Canonical 结果始终保存 JSON object schema output。GraphDefinitionOptions 只是三类成员 runtime definitions 的共同装配入口，不合并其 registries

## 行为、失败语义与兼容性

- Container、member ref、role、kind、predicate name、variant、region key 与 definition description 必须为非空字符串；同一 Container 的 member refs 与 presentation region keys 必须各自唯一
- member 引用未知 Entity / Relation / Container、Container 直接或间接包含自身、同一 member 在当前 containment 维度具有多个 parent 时 fail-loud，并报告 Container identity、member path 与 cycle / conflict chain
- 未注册 role / kind / predicate / variant、kind 与 role 不匹配、predicate 与 role / kind 不匹配或 params 校验失败时 fail-loud，并报告 Container identity、失败 key、字段路径与可用 definition
- 内置与自定义 Definition 使用同一 registry；重复 key、覆盖内置 key 或一次 provider assembly 中不同对象争用同一 key 都 fail-loud，不使用 last-wins、内置白名单或全局注册副作用
- presentation input 引用未知 Container、regions 冒充 semantic member、同一 Container 出现多个有效 geometry，或 presentation 同时收到未裁决 authored / Diagram / local layout geometry 时 fail-loud
- Container header / region child 包含原始 Graph semantic composite 时在 Graph presentation schema / resolve 边界 fail-loud，不把它作为普通 Core composite 旁路下沉
- `IRGraph.containers` 之外出现原始 Container data composite、presentation / geometry 不属于同一 root 的 Container identity，或 root collections 与 member refs 不一致时 fail-loud
- Container data、predicate params、metadata、presentation content 与 authored geometry 必须 JSON-safe；函数、ReactNode、DOM、class instance、renderer resource、selection、history、transaction 与布局算法内部状态不得进入 Source IR
- 不根据 JSX nesting、header、section role、bounds、shell style、Relation endpoint 或 Scene hierarchy 猜测 role、kind、predicate、variant 或 membership；不根据 kind / predicate 名称前缀执行隐式继承
- 当前 Container 把 header、sections、Flex fields、entityVariant 与 shell appearance 混入同一 IR 的契约被本决策取代。实现时直接迁移到 Graph Source root 的 containment data / presentation / geometry collections，不保留旧 schema alias、standalone Graph composite、双轨 membership、section-as-member 或实例 appearance fallback

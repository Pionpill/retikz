# ADR-07：分离 Entity 数据、几何与展示语义

- 状态：Proposed
- 决策日期：2026-08-18
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)
- 取代：[Graph 展示作用域与 Entity 注册主题 ADR](./06-graph-entity-registry-theme.md) 中旧内置 role 词汇、Entity 实例直接覆盖 shape、size 与 appearance 的部分

## 背景与目标

ADR-06 已把 Entity role、variant 与 Graph Theme 从闭合枚举提升为 Definition / registry，但 Entity 仍然沿用 Core Node-shaped IR：语义 role、内容、position、shape、padding、minimum size 与实例样式混在同一记录中。相同 role 的 Entity 可以通过实例字段任意改变形状和外观，工具与 LLM 因而不能仅凭稳定语义判断其视觉家族；自动布局也无法只消费 Entity identity、port 与尺寸约束，而不同时读取 presentation 字段

流程、UML、知识图谱和学术图示还需要在同一视觉家族下表达更精确的节点类型。例如 `event` 决定事件家族的基础矩形 recipe，`workflow.start`、`workflow.end` 与 `workflow.message` 作为稳定 kind 分别表达生命周期位置和消息事件；更精确且带参数的触发条件再由 predicate 表达。把这些差异全部扩张为 role 会让 role 退化成领域 shape catalog；把它们放入 `meta` 又会让规范语义不可校验、不可选择且无法可靠提供给 LLM

本决策把 Entity 的规范数据、authored geometry 与确定 presentation 分离，并为 Graph 三类主要成员建立共同语义骨架：`role` 决定主要语义与基础视觉家族，`kind` 表达稳定子类型，`predicate` 以参数精确说明含义，`variant` 表达独立非语义视觉轴，`meta` 仅保存 Graph 不解释的信息。Relation 与 Container 使用同一字段职责，但分别拥有自己的 Definition、registry、token 与 resolver

## 决策

### 三类主要成员共享字段职责而不共享万能 registry

Entity、Relation 与 Container 的 Source IR 都组合以下 JSON-safe 语义字段：

- `role`：必需的开放 key，决定成员的主要语义家族和完整基础 presentation recipe
- `kind`：可选的开放 key，在一个 role 内声明稳定子类型并提供稀疏 presentation delta
- `predicate`：可选的开放 definition name 与 params，对 role / kind 作可校验的精确说明
- `variant`：可选的开放视觉 key，只改变该成员允许的非语义 appearance token
- `meta`：Graph 不解释的 provenance、外部 identity 与非规范附加信息

这些字段只共享命名、层级与 selector 语义，不建立 `GraphMemberDefinition`、万能 registry 或跨成员 token bag。Entity role 不能注册为 Relation role，Container kind 不能被 Entity resolver 消费；三类成员分别维护 Definition、registry、runtime options、diagnostics 与 token 类型

`role`、`kind` 与 `predicate` 都是规范语义。省略 `kind` 表示 role 已足以分类，省略 `predicate` 表示 role / kind 已足以说明精确含义。`variant` 不参与领域推理，`meta` 不参与 registry lookup、Theme selector、presentation 或 geometry 决策

### Graph Source root 统一装配三类成员

ADR-06 的 `IRGraph.children: IRChild[]` presentation root 被本决策取代。新的 `IRGraph` 是 Graph Source assembly：分别保存 Entity、Relation 与 Container data collections，可选保存按 identity 引用这些记录的 presentation inputs、authored geometry 与 Graph-local Theme layer。data collections 是 identity、endpoint、port 与 containment 的唯一真源；presentation 与 geometry 只能引用已有 data，不得创建成员

旧的任意 children 移入 `presentation.children`，并使用递归受限的 `IRGraphPresentationChild`。其 grammar 允许 Core primitive、已知 Core child-bearing structure 与非 Graph composite；对已知 Core child-bearing structure 的每一层递归应用同一限制，任何层级显式出现 namespace 为 `graph` 且 type 为 `graph`、`entity`、`relation` 或 `container` 的 semantic composite 都 fail-loud。第三方 composite 仍是不透明 presentation boundary，但 Entity、Relation 与 Container data record 不再是可独立经 Core composite dispatch 编译的元素，因而不能从 opaque composite 重新加入当前 Graph indexes

Graph presentation pipeline 只从三类 data collections 与已校验 refs 受控建立成员 presentation。`presentation.children` 只承载标题、说明、背景等不属于 Graph data 的装饰内容，不参与 member identity、endpoint、containment、geometry lookup 或 LLM 的 Graph member 枚举

Graph data resolve 可以在没有 presentation 或 geometry 时独立运行。请求绘制时，每个需要呈现的成员必须具有足够的 presentation input 与唯一 geometry；缺失时 fail-loud。React / Vanilla 的独立 Entity convenience 可以合成只含一个 Entity 的 `IRGraph`，但不能绕开 Source root 重新建立 standalone Graph composite

Graph-local Theme layer 的作用路径由 semantic containment 确定：先应用 `IRGraph.presentation.theme`，再按 root 到当前成员的 Container ancestry 依次应用每个 `IRGraphContainerPresentation.graphTheme`；Container local layer 同时作用于自身 shell 和 semantic descendants，Relation 使用显式 containment parent 而不是 endpoints 推断 scope。若某个 Container presentation 声明 `coreTheme`，它直接复用 Core `IRTheme` 并在 lowering 中建立 Core Theme Scope；外层 Graph-local layers 在该边界清空，先按新的有效 Core Theme 选择三类成员的 Graph Theme style baseline，再应用当前 Container 的 `graphTheme`。Entity variant inheritance 继续穿透该 Core Theme boundary，但 token / rule 不穿透

### Entity data 是独立语义记录

Entity data 保存稳定 identity、共同语义字段与可选 ports。它不保存 authored content、position、transform、allocation bounds、shape、padding、stroke、fill、opacity 或 renderer 对象

Entity presentation input 通过 Entity identity 保存可选 `children`。children 是 Entity 自身可渲染内容，不承担 role、kind 或 predicate 的语义；label、文本或图形内容可以影响测量结果，但不能反向决定 Entity 分类。删除 presentation 或 geometry 后，Entity identity、ports 与含义仍然完整；删除 role、kind、predicate 或 port 则会改变 Graph 数据语义

presentation child 使用 Graph 自己的受限 child schema：它复用 Core `IRChild` 的绘图能力，但拒绝原始 Graph `graph`、`entity`、`relation` 与 `container` semantic composites。Graph 成员只能来自已解析 data / member reference，并由 Graph presentation pipeline 受控插入；不能通过 Entity children 绘制一个未进入 identity、port、endpoint 与 containment indexes 的隐藏成员

Graph 内置 Entity role 重构为 `participant`、`activity`、`event`、`state`、`gateway`、`resource` 与 `concept`。这些 role 是跨流程、UML、状态、架构与知识图示复用的上位职能，同时为当前 presentation profile 提供确定基础视觉家族：

- `participant`：主动参与、负责或提供能力的主体，例如 actor、agent、service 或 component
- `activity`：发生的工作、动作或转换过程，例如 task、process 或 operation
- `event`：某个发生点、边界或生命周期事件，例如 start、end、timer 或 message event
- `state`：对象或系统持续存在的条件，例如 idle、running 或 approved
- `gateway`：具有语义的控制分叉、汇合或同步，例如 choice、merge、fork 或 join
- `resource`：被使用、产生或存储的对象，例如 data、document、database 或 artifact
- `concept`：抽象知识对象，例如 class、claim、topic 或 requirement

内置 role 的中立基础 recipe 为：

| role          | shape                         | padding           | minimum size                |
| ------------- | ----------------------------- | ----------------- | --------------------------- |
| `participant` | rectangle，`cornerRadius: 4`  | `8`               | `{ width: 64, height: 32 }` |
| `activity`    | rectangle，`cornerRadius: 8`  | `8`               | 未设置                      |
| `event`       | rectangle，`cornerRadius: 0`  | `{ x: 12, y: 6 }` | `{ width: 48, height: 24 }` |
| `state`       | rectangle，`cornerRadius: 16` | `{ x: 12, y: 8 }` | `{ width: 56, height: 28 }` |
| `gateway`     | diamond，`aspectRatio: 1.8`   | `{ x: 3, y: 2 }`  | 未设置                      |
| `resource`    | ellipse                       | `8`               | `{ width: 48, height: 32 }` |
| `concept`     | rectangle，`cornerRadius: 0`  | `10`              | `{ width: 56, height: 32 }` |

一个 role 在同一有效 Theme profile 中唯一确定完整基础 recipe，但 role 不等同于某个 Core shape 字符串；不同 role 可以复用同一种 primitive，并通过 params、padding、minimum size 与 appearance 形成不同 recipe。领域子类使用开放 kind，例如 `workflow.start`、`workflow.end`、`workflow.message`、`workflow.task`、`state.choice` 或 `uml.actor`；带参数的触发条件、所有者、置信度等精确说明使用 predicate。Graph 不内置 Workflow、State、UML 或学术领域执行模型

本阶段不内置 Entity kind 或 predicate；`workflow.*`、`state.*` 与 `uml.*` 由拥有该领域的上层通过同一 registry 注册。内置 variant 保持 ADR-06 的 `default`、`fill` 与 `mixed` recipe；Entity 省略 variant 时仍按最近的 Graph / Container Entity presentation default 继承，最终回退到 `default`

### port 属于 Entity data，placement 属于 geometry

每个 port 在所属 Entity 内使用稳定、非空且唯一的 `id`，并可保存 `meta`。port identity 供 Relation endpoint 引用；port 的领域分类、side、anchor、offset、坐标与自动放置结果不进入本决策的 Entity data。未来真实需求若要求可扩展 port 语义，必须建立 port 自己的 Definition / registry，不能借用 Entity registry 或把任意 role 字符串塞入 port

authored port placement 与 Entity authored geometry 一同通过 Entity / port identity 对齐。未来 Diagram 可以根据同一 Canonical Entity 与 Relation 拓扑计算 port placement，但不得复制 port identity 或在 geometry 中重新定义 port 语义。未显式放置的 port 只能由已选择的 authored / Diagram geometry provider 确定，renderer 不根据名称猜测位置

### role、kind、predicate 与 variant 分层确定 presentation

Entity role definition 必须提供 role 的稳定说明以及完整基础 recipe，其中 shape 与 padding 必需，minimum size 与基础 appearance token 可选。Entity kind definition 声明唯一 kind key、所属 role、稳定说明与稀疏 appearance delta；kind 不能改写所属 role，也不能改变 shape、padding 或 minimum size。相同 kind key 在 Entity registry 中全局唯一，不从点号前缀推断 role

Entity predicate definition 声明 definition name、所属 role、可选允许 kinds、params schema、稳定说明与可选 presentation resolver。Graph resolve 先用 definition schema 把 Source params 确定为 Canonical params，再允许 resolver 只返回 Entity appearance delta。predicate 不能改变 Entity identity、role、kind、shape family、padding、minimum size、ports、presentation content 或 authored geometry

Entity variant definition 是独立视觉 recipe。variant 可以改变 fill、stroke、color、width 与 opacity 等 appearance token，但不能改变 role、kind、predicate、shape、padding、minimum size、ports 或 geometry。一次性非语义视觉差异使用已注册自定义 variant；一次性语义差异使用 kind 或 predicate；两者都不能退回任意实例 style 字段

### Theme selector 使用完整 Canonical 语义

Entity Theme selector 可以按 `role`、`kind`、`predicate.name`、`predicate.params` 与 `variant` 匹配。多个字段按 AND 匹配，单值 / 列表表示一个或多个允许 key；params 对已校验 Canonical params 做递归子集匹配，对象只要求 selector 声明的键相等，数组与标量使用 JSON 深度相等。params selector 只有同时声明 predicate name 才合法

Theme 对 Entity 提供两个互斥的规则面：

- `roleRecipes` 只接受严格的 `{ role }` selector，并为匹配的 role 提供完整 `IRGraphEntityRoleRecipe`。它替换该 Theme profile 中 role definition 的整份基础 recipe，而不是对结构 token 作稀疏覆盖；同一 Theme layer 内一个 role 最多匹配一条 role recipe rule
- `rules` 接受完整 Entity Theme selector，但只提供 `IRGraphEntityAppearanceTokenOverrides`。即使 selector 只声明 role，它也不能改变 shape、padding 或 minimum size；需要替换基础视觉家族时必须进入 `roleRecipes`

Graph resolve 先独立确定 effective role recipe：以 role definition 的完整 recipe 为起点，再按当前 Core Theme style、root Graph Theme 与 root 到当前成员的 Container ancestry，从外到内使用最后一条匹配的 `roleRecipes` 整份替换。跨越 Container `coreTheme` reset boundary 时清空外层 Graph-local 候选，以新 Core Theme style 对应的 role recipe 作为新起点，再处理边界内的 Graph layers

确定 effective role recipe 后，Entity appearance 按以下顺序叠加，后者覆盖前者：

```text
当前 Graph Theme style 的 Entity baseline tokens
> effective role recipe 的基础 appearance
> kind 的稀疏 recipe delta
> predicate definition 根据 Canonical params 解析的 delta
> variant 的非语义 appearance recipe
> 当前 Core Theme style 中匹配完整语义的 Entity appearance rules
> 从外到内各层 Graph Entity baseline tokens 与匹配的 appearance rules
```

role recipe、kind recipe、predicate resolver、variant resolver 与 Theme appearance rules 共用 Entity-owned token vocabulary，但各 Definition 只能写入自身允许的 token 子集。role recipe 唯一拥有 shape、padding 与 minimum size 等结构 token；kind、predicate、variant、无条件 Theme baseline 与 appearance rule 只包含 dash、fill、stroke、颜色、宽度、透明度与强调等 appearance token。任何 Theme 面都不能改变 Entity data、ports 或 authored geometry

相同 role、kind、predicate、Canonical params、variant 与 Theme scope 必须得到相同 presentation recipe。Entity presentation content、meta、position、size 与 geometry 不能绕开该级联替换 shape 或 style。绝对尺寸仍可因 content 测量或显式 geometry 约束不同而变化；该差异不属于 presentation recipe 不一致

Graph-local tokens / rules 不跨越带自身 Core Theme 的 Scope，该 Scope 内使用新 Theme style 对应的 Entity baseline 与 rules。默认 variant 仍可沿 Graph / Container presentation scope 继承，但必须在 Entity resolve 时物化；第三方 composite 继续是不透明边界

### geometry 通过 Entity identity 独立对齐

authored Entity geometry 保存 Entity identity、显式 position、可选 size constraint 与 port placements。Diagram Layout Result 可以保存同一 Entity identity 对应的自动 position、allocation 与 port placements。两者都消费 Canonical Entity，不重新定义 role、kind、predicate、variant、content 或 ports

一次 Graph presentation 对每个 Entity identity 只能消费一个已裁决 geometry result。Graph 不静默合并 authored geometry 与 Diagram geometry；未来 Diagram 可以把 authored position / size 解释为 pin 或 constraint，但在交给 Entity presentation 前必须产出唯一结果。Entity role 的 minimum size 是 presentation 测量约束，不是 authored position 或 Diagram layout result

### Graph resolve 与 authoring 入口共享同一路径

Graph resolve 消费 Entity Source IR、role / kind / predicate / variant registries、Graph Theme 与窄 identity index，统一完成 lookup、params validation、默认值、selector 和补全后不变量，产出 Canonical Entity data 与 presentation recipe。lowering 只消费 Canonical Entity、Entity presentation input 与唯一 geometry，生成普通 Core Node；Core、Scene 与 renderer 不解释 Graph role、kind、predicate 或 variant

直接 JSON、React 与 Vanilla 必须构造同一 `IRGraph` Source assembly、Entity data、presentation ref 与 authored geometry。React JSX children 与 Vanilla builder 只负责把 declarations 归一为 root collections，不直接成为 `IRGraph.children` 或 Core child。adapter 可以提供 sugar，但不得维护私有 role / kind / predicate、默认值、instance style 优先级或 geometry 冲突规则

## 基础数据结构与公开契约

Entity Source IR 的最小结构为：

```ts
type IRGraphPredicateRef = Readonly<{
  name: string;
  params?: IRJsonObject;
}>;

type IRGraphPresentationChild = z.infer<typeof GraphPresentationChildSchema>;

type IRGraphEntityPort = Readonly<{
  id: string;
  meta?: IRJsonObject;
}>;

type IRGraphEntity = Readonly<{
  namespace: 'graph';
  type: 'entity';
  id: string;
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  variant?: string;
  ports?: ReadonlyArray<IRGraphEntityPort>;
  meta?: IRJsonObject;
}>;

type IRGraphEntityPresentation = Readonly<{
  entity: string;
  children?: ReadonlyArray<IRGraphPresentationChild>;
}>;

type IRAuthoredEntityGeometry = Readonly<{
  entity: string;
  position: IRPosition;
  size?: IRBoxSize;
  ports?: ReadonlyArray<Readonly<{ port: string; position: IRPosition }>>;
}>;

type IRGraphEntityRoleRecipe = Readonly<{
  shape: NonNullable<IRNode['shape']>;
  padding: NonNullable<IRNode['padding']>;
  minimumSize?: NonNullable<IRNode['minimumSize']>;
  appearance?: IRGraphEntityAppearanceTokenOverrides;
}>;

type IRGraphEntityRoleRecipeRule = Readonly<{
  select: Readonly<{
    role: string | ReadonlyArray<string>;
  }>;
  recipe: IRGraphEntityRoleRecipe;
}>;

type IRGraphEntityAppearanceThemeRule = Readonly<{
  select: IRGraphEntityThemeSelector;
  tokens: IRGraphEntityAppearanceTokenOverrides;
}>;

type IRGraphThemeLayer = Readonly<{
  entity?: Readonly<{
    tokens?: IRGraphEntityAppearanceTokenOverrides;
    roleRecipes?: ReadonlyArray<IRGraphEntityRoleRecipeRule>;
    rules?: ReadonlyArray<IRGraphEntityAppearanceThemeRule>;
  }>;
  relation?: Readonly<{
    tokens?: IRGraphRelationAppearanceTokenOverrides;
    rules?: ReadonlyArray<IRGraphRelationThemeTokenRule>;
  }>;
  container?: Readonly<{
    tokens?: IRGraphContainerAppearanceTokenOverrides;
    rules?: ReadonlyArray<IRGraphContainerThemeTokenRule>;
  }>;
}>;

type IRGraphPresentation = Readonly<{
  entityVariant?: string;
  theme?: IRGraphThemeLayer;
  entities?: ReadonlyArray<IRGraphEntityPresentation>;
  containers?: ReadonlyArray<IRGraphContainerPresentation>;
  children?: ReadonlyArray<IRGraphPresentationChild>;
}>;

type IRAuthoredGraphGeometry = Readonly<{
  entities?: ReadonlyArray<IRAuthoredEntityGeometry>;
  relations?: ReadonlyArray<IRAuthoredRelationGeometry>;
  containers?: ReadonlyArray<IRAuthoredContainerGeometry>;
}>;

type IRGraph = Readonly<{
  namespace: 'graph';
  type: 'graph';
  id?: string;
  entities: ReadonlyArray<IRGraphEntity>;
  relations: ReadonlyArray<IRGraphRelation>;
  containers: ReadonlyArray<IRGraphContainer>;
  presentation?: IRGraphPresentation;
  geometry?: IRAuthoredGraphGeometry;
  meta?: IRJsonObject;
}>;
```

`IRGraphThemeLayer` 是三个成员专属 token / rule 集合的共同 JSON-safe envelope，不是跨成员 token bag；Entity rule 不能写 Relation token。Entity 的 `roleRecipes` 与 `rules` 是两个独立 schema 分支，不使用根据 selector 内容解释输出权限的联合 rule；Graph Theme style resolution 使用相同三分结构提供各成员的 baseline、role recipe rules 与 appearance rules。`GraphPresentationChildSchema` 从 Core child grammar 递归排除 Graph semantic composites；`IRGraphPresentationChild` 由该 schema 推导，不是未经校验的 `IRChild` alias

Entity 扩展面使用成员专属契约：

```ts
type EntityRoleDefinition = Readonly<{
  role: string;
  description: string;
  presentation: IRGraphEntityRoleRecipe;
}>;

type EntityKindDefinition = Readonly<{
  kind: string;
  role: string;
  description: string;
  presentation?: IRGraphEntityAppearanceTokenOverrides;
}>;

type EntityPredicateDefinitionInput<TSchema extends ZodType<IRJsonObject>> = Readonly<{
  name: string;
  role: string;
  kinds?: ReadonlyArray<string>;
  description: string;
  paramsSchema: TSchema;
  resolvePresentation?: (params: z.output<TSchema>) => IRGraphEntityAppearanceTokenOverrides;
}>;

type EntityVariantDefinition = Readonly<{
  variant: string;
  resolve: (context: EntityVariantResolveContext) => IRGraphEntityAppearanceTokenOverrides;
}>;
```

`defineEntityPredicate` 在定义点保留 params schema 的具体类型，并封装为 registry 可存储的擦除 Definition；擦除 callback 只接收已通过对应 schema 的 params。role、kind、predicate 与 variant 分别进入 `GraphDefinitionOptions.entityRoles`、`entityKinds`、`entityPredicates` 与 `entityVariants`，内置与自定义项共用同一装配、registry 与 resolver

公开 `defineEntityRole`、`defineEntityKind`、`defineEntityPredicate` 与 `defineEntityVariant` 分别保持对应 Definition 的类型，并让内置与自定义项通过同一注册入口。四类 definition 不使用跨成员 `AnyGraphMemberDefinition`，也不建立内置白名单 dispatch

Entity selector 至少声明 role、kind、predicate 或 variant 之一。selector 引用的 key 必须在对应 registry 中存在；predicate kinds 为空或省略表示允许所属 role 的全部 kinds，非空列表必须无重复且每个 kind 属于该 role。Canonical Entity 始终保存 schema output params 与 definition provenance；Source params 省略时以 `{}` 作为 schema input

`roleRecipes.select` 必须严格只含 `role`，出现 kind、predicate、params、variant 或未知字段时在 schema 边界 fail-loud；每条 rule 必须提供 shape 与 padding 组成的完整 recipe，不能以稀疏结构 override 合并。appearance `rules` 的 `tokens` 出现 shape、padding、minimum size 或未知 token 时同样 fail-loud，而不是静默忽略或把它升级为 role recipe rule

## 行为、失败语义与兼容性

- Entity、port、role、kind、predicate name、variant 与 definition description 必须为非空字符串；Graph Data assembly 在 resolve 前拒绝重复 Entity identity 与同一 Entity 内重复 port identity
- 未注册 role / kind / predicate / variant、kind 与 role 不匹配、predicate 与 role / kind 不匹配或 params 校验失败时 fail-loud，并报告 Entity identity、失败 key、字段路径与可用 definition
- 内置与自定义 Definition 使用同一 registry；重复 key、覆盖内置 key或一次 provider assembly 中不同对象争用同一 key 都 fail-loud，不使用 last-wins、内置白名单或全局注册副作用
- authored geometry 引用未知 Entity / port、同一 Entity 或 port 出现多个有效 geometry，或 presentation 同时收到未裁决 authored / Diagram geometry 时 fail-loud
- Entity presentation child 包含原始 Graph semantic composite 时在 Graph presentation schema / resolve 边界 fail-loud，不把它作为普通 Core composite 旁路下沉
- Entity `roleRecipes` 使用非 role selector、缺少完整 recipe、同一 layer 对同一 role 多重匹配，或 appearance rule 写入结构 token 时 fail-loud，并报告 Theme layer、selector 与非法字段路径
- Graph root 的 data collections 拒绝重复 member identity；presentation / geometry 引用未知或重复 member、root presentation child 在任意可见递归层包含 Graph semantic composite，或请求绘制的成员缺少必要 presentation / geometry 时 fail-loud
- Entity data、predicate params、metadata、presentation content 与 authored geometry 必须 JSON-safe；函数、ReactNode、DOM、class instance、renderer resource、selection、history、transaction 与布局算法内部状态不得进入 Source IR
- 不根据 shape、children、label、meta、position、相邻 Relation 或图拓扑猜测 role、kind、predicate 或 variant；不根据 role / kind 名称的点号前缀执行隐式继承
- `terminal`、`stage`、`decision` 与 `junction` 从内置 role registry 直接删除且不保留 alias：起止点迁移为 `event` 配合领域 kind，处理节点迁移为 `activity` 或 `state`，条件节点迁移为 `gateway` 或 `state` 配合领域 kind；纯 routing junction 进入 geometry，具有 fork / join / merge 语义的 junction 使用 `gateway` 配合领域 kind
- 当前 Entity 直接继承 Core Node shape、padding、minimum size 与 appearance 字段的契约被本决策取代。实现时直接迁移到 Graph Source root 的 data / presentation / geometry collections，不保留旧字段 alias、兼容双轨、standalone Graph composite 或实例 style fallback
- ADR-06 的开放 registry、Graph Theme style、作用域穿透与 provider assembly 结论继续有效；其旧内置 role 词汇、旧 `IRGraph.children` presentation root、Entity 显式 shape / size / appearance 高优先级以及只按 role / variant 选择的部分由本决策取代

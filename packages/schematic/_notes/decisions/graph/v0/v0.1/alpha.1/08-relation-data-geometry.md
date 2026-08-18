# ADR-08：分离 Relation 数据、几何与展示语义

- 状态：Proposed
- 决策日期：2026-08-18
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Entity 数据、几何与展示语义 ADR](./07-entity-data-geometry.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

当前 Relation 是一个可独立绘制的 Graph presentation element：同一份 IR 保存 role、Core Path Step、mark 与实例 style，并直接下沉为 Core stroke Path。它缺少稳定端点、port 引用与独立于 route 的精确语义，因而不能成为 authored geometry、未来 Diagram routing、工具与 LLM 共用的关系真源

关系语义同时存在不同抽象层级。`flow`、`association` 或 `dependency` 可以决定主要语义与基础视觉家族，`workflow.feedback`、`uml.composition` 或 `provenance.derivation` 是稳定子类型，`when`、`otherwise`、置信度、支持或反驳对象等精确含义则需要可校验参数。全部使用 role 会造成枚举膨胀，全部放入 `meta` 又会失去规范语义、Theme selector 和 LLM 可发现性

箭头、菱形端点与实线 / 虚线也是稳定视觉语言，但它们不只由 role 单独决定。role 应提供完整基础 recipe，kind 提供稳定子类型 delta，predicate params 可以控制空心 / 实心 provider、透明度、虚线或强调等精确细节，Theme selector 可以根据同一 Canonical 语义进一步主题化。相同完整语义与 Theme scope 必须得到一致外观，同时不能让实例 Path style 绕开这条解析链

本决策建立独立 Relation data，将 identity、端点、`role → kind → predicate(params)`、variant 与语义 direction 作为持久化真源；authored route、Diagram route 与 Path presentation 通过 relation identity 对齐。它沿用 ADR-07 冻结的共同字段职责，但 Relation 拥有独立 Definition、registry、direction、endpoint marker 与 Theme token 契约

## 决策

### Relation data 是独立语义记录

Relation data 保存稳定 identity、两个有序 endpoint、共同语义字段与可选 direction。endpoint 引用 Entity identity，并可进一步引用该 Entity 的 port。`source` 与 `target` 只确定记录、route 与端点限定使用的稳定顺序；有效语义方向由显式 `direction`、kind direction refinement 或 role default 依次确定，不从 Path 顺序、页面位置、marker 或布局方向反推

Relation data 不保存 Core Step、stroke、marker geometry、label placement、routing provider、布局坐标或 renderer 对象。删除 geometry 后，关系对象与含义仍然完整；删除 endpoint、role、kind、predicate 或 direction 则可能改变关系语义

Relation data 只进入 ADR-07 冻结的 `IRGraph.relations` collection，authored route 只进入 `IRGraph.geometry.relations` 并按 identity 引用 data。Relation data record 不再作为 standalone Core composite；只需要绘制一条没有 Graph endpoint / predicate 语义的线时直接使用 Core Path，不建立绕过 Graph Source root 的 Relation presentation element

### role、kind 与 predicate 形成由粗到细的关系语义

Relation role 使用开放 key，决定主要关系家族、source / target 的基础解释、默认及允许 direction 与完整基础 presentation recipe。Graph 内置 `association`、`dependency`、`generalization`、`flow` 与 `influence` 等上位 role；内置名称不构成 schema 的闭合集合

Relation kind 在一个 role 下表达稳定子类型并提供稀疏 recipe delta。Graph 或官方上层可以用 kind 表达 `uml.aggregation`、`uml.composition`、`uml.realization`、`workflow.branch`、`workflow.feedback` 与 `provenance.derivation` 等稳定分类，而不继续扩大上位 role。kind definition 可以把 role 的允许 direction 收窄为非空子集，并在该子集中选择默认值，但不能增加 role 不允许的 direction、交换 endpoint 或改变所属 role

Relation predicate 是对 role / kind 的可选精确限定，保存开放 definition name 与 JSON-safe params。predicate definition 声明所属 role、可选允许 kinds、参数 schema、面向作者与 LLM 的说明以及可选 presentation resolver。条件路径可以使用 `role: 'flow'`、`kind: 'workflow.branch'` 与 `workflow.when` / `workflow.otherwise` predicate；条件表达式属于 params，不进入 `meta`

Workflow、State、UML、provenance 或学术模型可以拥有更强 Source IR，并投影为同一 Relation contract。Graph 不执行 condition、不运行状态机、不判断学术论证真假，只负责保存、注册、校验和确定通用关系语义

Graph 内置 role 的规范 direction 与基础 recipe 为：

`association` 的 source / target 只是两个相关对象的稳定记录顺序；`dependency` 固定为依赖方 source 与被依赖方 target；`generalization` 固定为 subtype source 与 supertype target；`flow` 与 `influence` 的 source / target 是稳定 route endpoints，实际语义方向由 effective direction 决定

| role             | default   | allowed                              | `none`              | `forward`                                   | `reverse`                  | `both`                   |
| ---------------- | --------- | ------------------------------------ | ------------------- | ------------------------------------------- | -------------------------- | ------------------------ |
| `association`    | `none`    | `none`、`forward`、`reverse`、`both` | 实线、两端无 marker | 实线、target `openStealth`                  | 实线、source `openStealth` | 实线、两端 `openStealth` |
| `dependency`     | `forward` | `forward`                            | —                   | target `openStealth`、`dashPattern: [4, 2]` | —                          | —                        |
| `generalization` | `forward` | `forward`                            | —                   | 实线、target `open`                         | —                          | —                        |
| `flow`           | `forward` | `forward`、`reverse`、`both`         | —                   | 实线、target `stealth`                      | 实线、source `stealth`     | 实线、两端 `stealth`     |
| `influence`      | `forward` | `forward`、`reverse`、`both`         | —                   | 实线、target `normal`                       | 实线、source `normal`      | 实线、两端 `normal`      |

Graph 同时内置以下稳定 kind；未列出的 direction 与 token 全部继承所属 role：

`uml.aggregation` 与 `uml.composition` 把 source 细化为 whole、target 细化为 part；`uml.realization` 把 source 细化为 implementation、target 细化为 specification；`provenance.derivation` 把 source 细化为 derived result、target 细化为 source record

| kind                    | role             | default / allowed | 规范 delta                                   |
| ----------------------- | ---------------- | ----------------- | -------------------------------------------- |
| `uml.aggregation`       | `association`    | `none` / `none`   | source `openDiamond`，target 无 marker，实线 |
| `uml.composition`       | `association`    | `none` / `none`   | source `diamond`，target 无 marker，实线     |
| `uml.realization`       | `generalization` | 继承 `forward`    | target `open`，`dashPattern: [4, 2]`         |
| `provenance.derivation` | `dependency`     | 继承 `forward`    | target `openStealth`，`dashPattern: [4, 2]`  |

`workflow.branch`、`workflow.feedback` 与领域 predicate 不由 Graph 内置，由对应上层通过同一 registry 注册。Relation 只内置 `default` variant，省略 variant 时使用 `default`；该 variant 不提供 token delta

### direction 只表达有向性，不等同于 endpoint marker

Relation direction 为 `none`、`forward`、`reverse` 或 `both`：

- `none`：关系没有语义箭头方向
- `forward`：语义从 source 指向 target
- `reverse`：语义从 target 指向 source
- `both`：两个方向同时成立

role / kind definition 必须为每个有效 direction 产出确定的 source / target marker recipe，但 direction 本身不直接等同于“哪端画箭头”。aggregation / composition 的 diamond、ER cardinality 的 crow-foot、association 的 circle / bar 等都是 endpoint marker，不一定表示语义方向。Graph 领域因此统一使用 `sourceMarker` / `targetMarker`，只在下沉 Core Path 时映射到 start / end arrow host

例如 association 可以允许四种 direction；flow 可以允许 forward、reverse 与 both；dependency、generalization 等 source / target 含义固定的 role 可以只允许 forward。`uml.aggregation` / `uml.composition` kind 可以在 association role 下把 direction 收窄为 none，并分别在 whole endpoint 使用空心 / 实心 diamond。显式 direction 只能从最终允许集合中选择，不能通过 marker 或 route 反向改写

### role 决定基础视觉家族，kind 与 predicate 细化

每个 Relation role definition 必须为全部允许 direction 提供不可缺省的基础 presentation recipe。role 决定稳定视觉家族，例如 flow 使用 stealth family、generalization 使用 hollow triangle family、association 基础为无 marker 实线；recipe 使用 Graph Relation token，不复制 marker geometry

kind definition 对所属 role recipe 提供稀疏 delta，例如 realization 使用 hollow triangle 并切换虚线，composition 在 source 使用 solid diamond。predicate resolver 只消费已校验 Canonical params，并可以进一步替换 source / target marker detail、切换 open / solid provider、调整 marker / path opacity、dash pattern、颜色、线宽或强调。不存在按 params 字段名硬编码的全局视觉魔法；每个 predicate definition 显式声明 params 到 token delta 的映射

role 只需决定“大体使用 stealth family”，predicate 或 Theme rule 可以根据参数把具体 provider 从 `stealth` 切换为 `openStealth`，或修改 marker fill、opacity 与 path dash。若一个 family 的 solid / hollow 形态由不同 Core / Standard provider name 实现，Relation resolver 物化最终 provider name；Graph 不建立第二套 marker geometry registry

Relation variant 是独立非语义视觉轴，只能修改颜色、线宽、marker / path opacity 与其它 Relation appearance token，不能改变 endpoint、role、kind、predicate、direction、marker family、marker existence、dash 的规范语义或 route。需要改变这些语义特征时使用 kind、predicate 或匹配完整语义的 Theme rule

### Core 承载 marker host，Standard 可扩展通用形态

Relation presentation 直接引用 Core 开放 Arrow Definition / registry 与 Path dash contract。Core 拥有 marker host、公开 contract、provider registry、path shrink、Scene marker、编译与诊断，并提供 `normal`、`open`、`stealth`、`openStealth`、`circle` 与 `openCircle`。Standard 拥有移除 Graph / UML / Workflow 词汇后仍成立的通用 endpoint marker definitions，当前提供 `diamond` 与 `openDiamond`，后续可以按真实跨领域需求增加 bar、crow-foot 或其它通用形态

Graph 默认 provider assembly 直接使用 Core builtin registry，并显式贡献内置 relation recipes 实际需要的 Standard providers。自定义 role / kind / predicate 可以引用 Core、Standard 或第三方 provider name，但调用方必须通过既有 Core provider surface 注入对应 Definition；未注册 provider fail-loud。若所需通用形态超出 Core Arrow Definition 表达力，应先扩展 Core host，再由 Standard 提供通用 definition，不在 Graph 或 renderer 中建立旁路

### Theme selector 感知完整 Canonical Relation

Relation Theme selector 可以按 `role`、`kind`、`predicate.name`、`predicate.params`、`variant` 与 `direction` 匹配。字段按 AND 匹配；单值 / 列表表示一个或多个允许值；params 对 Canonical params 做递归子集匹配，对象只要求 selector 声明的键相等，数组与标量使用 JSON 深度相等。params selector 只有同时声明 predicate name 才合法

Relation presentation 按以下顺序确定，后者覆盖前者：

```text
当前 Graph Theme style 的 Relation baseline tokens
> role / effective direction 的完整基础 recipe
> kind / effective direction 的稀疏 recipe delta
> predicate definition 根据 Canonical params 解析的 delta
> variant 的非语义 appearance recipe
> 当前 Graph Theme style 中匹配完整语义的 Relation rules
> 从外到内各层 Graph Relation baseline tokens 与匹配 rules
```

无条件 Theme baseline 与 variant 只包含非语义 appearance token，不能替换 marker family、marker existence 或规范 dash；这些结构 token 只能由 role、kind、predicate resolver 或匹配完整语义的 selector rule 设置。相同 role、kind、predicate、Canonical params、variant、direction 与 Theme scope 必须得到相同 source / target marker、dash pattern、颜色、线宽和透明度。Relation 实例、meta、label 与 geometry 不能绕开该解析链任意替换语义外观；一次性语义差异进入 kind / predicate，一次性非语义视觉差异进入 variant，一次性主题化差异进入 selector rule

Relation 的 Graph-local Theme path 使用其显式 Container parent chain：root layer 后按外到内应用 ancestor 与 current Container `graphTheme`，不根据 source / target Entity 所在 Container 猜测。Container `coreTheme` 建立的新 Core Theme Scope 会清空此前 Relation layers，在新 Theme style baseline 上从该 Container layer 重新开始；第三方 composite 是不透明边界，Graph 不递归猜测其中的 Relation children

### geometry 通过 relation identity 独立对齐

authored Relation geometry 保存 relation identity 与作者给出的 Core Path-compatible route。Diagram Layout Result 保存同一 identity 对应的自动 route、port position 与 label position。两者都消费 Canonical Relation，不重新定义 endpoint、role、kind、predicate、variant、direction 或 meta。stroke、marker、dash、opacity 与 label appearance 由 presentation resolve 物化，不作为 routing 决策来源

一次 Graph presentation 对每个 relation identity 只能消费一个有效 geometry。Graph 不静默合并 authored route 与 Diagram route；未来 Diagram 可以把 authored geometry 解释为 pin、constraint 或 routing input，但交给 Relation presentation 前必须确定为唯一 geometry result

### Graph resolve 与 authoring 入口共享同一路径

Graph resolve 消费 Relation Source IR、Entity / port lookup、role / kind / predicate / variant registries 与 Graph Theme，统一完成 endpoint resolution、direction、definition lookup、params validation、selector 与补全后不变量，产出 Canonical Relation data 与 presentation recipe。lowering 只消费 Canonical Relation 与唯一 geometry，并生成普通 Core Path；Core、Scene 与 renderer 不解释 Graph role、kind、predicate 或 variant

直接 JSON、React 与 Vanilla 必须构造同一 `IRGraph` Source assembly、Relation data 与 authored geometry。React / Vanilla 可以用 way 或 builder sugar 生成 `geometry.relations[].route`，但不得把 Graph Relation 作为任意 Core child，也不得维护私有 predicate、默认 direction、instance style、marker 选择、geometry 优先级或错误分支

## 基础数据结构与公开契约

Relation Source IR 的最小结构为：

```ts
type RelationDirection = 'none' | 'forward' | 'reverse' | 'both';

type IRRelationEndpoint = Readonly<{
  entity: string;
  port?: string;
}>;

type IRGraphRelation = Readonly<{
  namespace: 'graph';
  type: 'relation';
  id: string;
  source: IRRelationEndpoint;
  target: IRRelationEndpoint;
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  variant?: string;
  direction?: RelationDirection;
  meta?: IRJsonObject;
}>;

type IRAuthoredRelationGeometry = Readonly<{
  relation: string;
  route: ReadonlyArray<IRStep>;
}>;
```

Relation 扩展面使用成员专属契约：

```ts
type RelationRoleDefinition = Readonly<{
  role: string;
  description: string;
  defaultDirection: RelationDirection;
  allowedDirections: ReadonlyArray<RelationDirection>;
  presentationByDirection: Readonly<Partial<Record<RelationDirection, IRGraphRelationRoleTokenRecipe>>>;
}>;

type RelationKindDefinition = Readonly<{
  kind: string;
  role: string;
  description: string;
  defaultDirection?: RelationDirection;
  allowedDirections?: ReadonlyArray<RelationDirection>;
  presentationByDirection?: Readonly<Partial<Record<RelationDirection, IRGraphRelationThemeTokenOverrides>>>;
}>;

type RelationPredicateDefinitionInput<TSchema extends ZodType<IRJsonObject>> = Readonly<{
  name: string;
  role: string;
  kinds?: ReadonlyArray<string>;
  description: string;
  paramsSchema: TSchema;
  resolvePresentation?: (params: z.output<TSchema>) => IRGraphRelationThemeTokenOverrides;
}>;

type RelationVariantDefinition = Readonly<{
  variant: string;
  resolve: (context: RelationVariantResolveContext) => IRGraphRelationAppearanceTokenOverrides;
}>;
```

role 的 `presentationByDirection` 必须且只能包含其全部 allowed directions；kind 的 allowed directions 必须是 role allowed directions 的非空子集，default 必须属于最终集合；kind 对每个声明 delta 的 direction 只能覆盖最终有效方向

`defineRelationPredicate` 在定义点保留 params schema 的具体类型，并封装为 registry 可存储的擦除 Definition；callback 只接收已通过对应 schema 的 params。role、kind、predicate 与 variant 分别进入 `GraphDefinitionOptions.relationRoles`、`relationKinds`、`relationPredicates` 与 `relationVariants`

公开 `defineRelationRole`、`defineRelationKind`、`defineRelationPredicate` 与 `defineRelationVariant` 分别保持对应 Definition 的类型，并让内置与自定义项通过同一注册入口。四类 definition 不使用跨成员 `AnyGraphMemberDefinition`，也不建立内置白名单 dispatch

Relation Theme token 至少覆盖 source / target marker detail、dash pattern、stroke、stroke width、path opacity 与 marker opacity；role recipe、kind delta、predicate resolver、variant resolver 与 Theme rules 共用同一个 Relation token vocabulary，但各自只能写入允许的 token 子集。Graph presentation root 与 Graph Theme style 分别提供 Relation baseline tokens 和有序 selector rules，不把 token 写入 Relation data 或 geometry

Canonical Relation 必须显式保存已解析 endpoint、effective direction、已校验 predicate params 与 Definition provenance。Source params 省略时以 `{}` 作为 schema input；Canonical 结果始终保存 JSON object schema output

## 行为、失败语义与兼容性

- relation id、endpoint entity / port、role、kind、predicate name、variant 与 definition description 必须为非空字符串；Graph Data assembly 在构造 resolver context 前拒绝重复 Entity、Relation 与同一 Entity 内重复 port identity
- endpoint 引用未知 Entity / port、未注册 role / kind / predicate / variant、kind 与 role 不匹配、predicate 与 role / kind 不匹配或 params 校验失败时 fail-loud，并报告 relation identity、失败 key、字段路径与可用 definition
- role allowed directions 必须非空、无重复并包含 default；kind 只能收窄为非空子集。显式 direction 只有在最终允许集合内才有效，Path marker、页面方向与 Diagram direction 均不能反推或改变它
- role 必须覆盖全部 role 有效 directions 的完整 recipe；kind delta 只能覆盖最终有效 direction。resolver 返回非法 token、selector 引用未注册 key 或最终 marker provider 未注册时 fail-loud，不回退默认箭头
- 内置与自定义 Definition 使用同一 registry；重复 key、覆盖内置 key 或一次 provider assembly 中不同对象争用同一 key 都 fail-loud，不使用 last-wins、内置白名单或全局注册副作用
- predicate params selector 只匹配已校验 Canonical params；规则按声明顺序执行，后匹配规则覆盖先匹配规则，不执行字符串表达式、函数或未知字段查询
- authored geometry 引用未知 relation、同一 relation 出现多个有效 geometry，或 presentation 同时收到未裁决 authored / Diagram geometry 时 fail-loud
- `IRGraph.relations` 之外出现原始 Relation data composite、Relation geometry 不属于同一 root 的 relation identity，或请求绘制的 Relation 缺少唯一 route 时 fail-loud
- Relation data、predicate params、metadata 与 authored geometry 必须 JSON-safe；函数、ReactNode、DOM、class instance、renderer resource、selection、history、transaction 与 routing 算法内部状态不得进入 Source IR
- 不根据 label、meta、stroke、marker、相邻 Entity 或图拓扑猜测 role、kind、predicate、variant 或 direction；不根据 kind / predicate 名称前缀执行隐式继承
- 当前 Path-shaped Relation 的 Core Step、marks 与实例 style 字段被本决策取代。实现时直接迁移到 Graph Source root 的 data / geometry / presentation 边界，不保留旧 schema alias、standalone Graph composite、双轨 Source IR、默认 terminal arrow 或实例 style fallback

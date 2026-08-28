# ADR-08：Relation 语义封装与 Core Path 复用

- 状态：Accepted
- 决策日期：2026-08-22
- 修订日期：2026-08-23
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Entity 语义封装与 Core Node 复用 ADR](./07-entity-data-geometry.md) · [Standard 参数化图式 Shape 与端点 Marker ADR](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-diagram-shapes-and-endpoint-markers.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)
- 修订关系：Variant 轴由 ADR-06 的 2026-08-23 breaking revision 删除；Graph-root Entity lookup 由 ADR-09 取代为 Core NodeTarget 与 namespace

## 背景与目标

Relation 是带稳定端点和 Graph 语义、最终下沉为一个 Core Path 的正式元素。它需要 role、kind、predicate、direction 与 endpoint marker 等领域契约，但 route 和 label 已由 Core Path 表达，不需要按 relation identity 再建立 geometry 与 presentation collections

关系语义同时存在不同抽象层级。`flow`、`association` 或 `dependency` 可以决定主要语义与基础视觉家族，`workflow.feedback`、`uml.composition` 或 `provenance.derivation` 是稳定子类型，`when`、`otherwise`、置信度、支持或反驳对象等精确含义则需要可校验参数。全部使用 role 会造成枚举膨胀，全部放入 `meta` 又会失去规范语义、Theme selector 和 LLM 可发现性

箭头、菱形端点与实线 / 虚线也是稳定视觉语言，但它们不只由 role 单独决定。role 应提供完整基础 marker / dash 结构，kind 提供稳定子类型 delta，predicate params 可以控制空心 / 实心 provider 或规范 dash 等结构细节；Theme rules 根据同一 Canonical 语义提供颜色、线宽、透明度和强调等默认外观，Relation 与单个 label 的显式 Core-compatible 字段可以在需要时精确覆盖默认值

本决策把 identity、端点、`role → kind → predicate(params)`、语义 direction、Core-compatible route 与 labels 收敛到同一个 Relation record。Graph 不区分 authored route 与 Diagram route，也不拥有 routing 调度；Relation 继续拥有独立 Definition、registry、direction、endpoint marker 与 Theme token 契约

## 决策

### Relation 是语义化 Path record

Relation data 保存稳定 identity、两个有序 Core NodeTarget endpoint、共同语义字段与可选 direction。endpoint 可以引用 Core namespace 已公开寻址的 Node、Coordinate、resolved Scope，以及下沉为这些 target 的上层 composite。`source` 与 `target` 只确定记录、route 与端点限定使用的稳定顺序；有效语义方向由显式 `direction`、kind direction refinement 或 role default 依次确定，不从 Path 顺序、页面位置、marker 或布局方向反推

Relation 直接保存 Core-compatible route、labels 与 Path 实例字段。route、labels 与实例字段不参与语义分类，但也不因此离开 Relation record。Relation 不保存 routing provider、布局算法状态、marker geometry 或 renderer 对象

Relation 是可独立放入任意 Core 内容树的 semantic composite，也可以作为有序 `IRGraph.children` 的后代；不再使用 `IRGraph.relations` collection，也不存在 `IRGraph.geometry.relations` 或 `IRGraph.presentation.relations`。省略 route 时 Relation 使用 source→target 直连；作者、Diagram 或其它消费者可以提供显式 route。只需要绘制一条没有 Graph endpoint / predicate 语义的线时直接使用 Core Path

### role、kind 与 predicate 形成由粗到细的关系语义

Relation role 使用开放 key，决定主要关系家族、source / target 的基础解释、默认及允许 direction，并为每个允许 direction 直接持有 source marker、target marker 与 dash 等规范结构。Graph 内置 `association`、`dependency`、`generalization`、`flow` 与 `influence` 等上位 role；内置名称不构成 schema 的闭合集合

role 与 kind 的 Source schema 通过 Foundation `createOpenStringSchema(values)` 同时表达内置词汇提示与任意非空白自定义 key。生成的 JSON Schema 暴露 `RelationRole` 与 `RelationKind` enum branch，但 runtime parse 不据此查询 registry 或拒绝扩展；未注册 key 仍只在 Relation resolver fail-loud。direction 继续是由 `RelationDirection` 定义的闭合集合，predicate name 当前没有内置集合，继续使用普通非空白字符串 schema

Relation kind 在一个 role 下表达稳定子类型并提供稀疏 marker / dash 结构 delta。Graph 或官方上层可以用 kind 表达 `uml.aggregation`、`uml.composition`、`uml.realization`、`workflow.branch`、`workflow.feedback` 与 `provenance.derivation` 等稳定分类，而不继续扩大上位 role。kind definition 可以把 role 的允许 direction 收窄为非空子集，并在该子集中选择默认值，但不能增加 role 不允许的 direction、交换 endpoint 或改变所属 role

Relation predicate 是对 role / kind 的可选精确限定，保存开放 definition name 与 JSON-safe params。predicate definition 声明所属 role、可选允许 kinds、参数 schema、面向作者与 LLM 的说明以及可选 token resolver。条件路径可以使用 `role: 'flow'`、`kind: 'workflow.branch'` 与 `workflow.when` / `workflow.otherwise` predicate；条件表达式属于 params，不进入 `meta`

Workflow、State、UML、provenance 或学术模型可以拥有更强 Source IR，并投影为同一 Relation contract。Graph 不执行 condition、不运行状态机、不判断学术论证真假，只负责保存、注册、校验和确定通用关系语义

Graph 内置 role 的规范 direction 与基础 recipe 为：

`association` 的 source / target 只是两个相关对象的稳定记录顺序；`dependency` 固定为依赖方 source 与被依赖方 target；`generalization` 固定为 subtype source 与 supertype target；`flow` 与 `influence` 的 source / target 是稳定 route endpoints，实际语义方向由 effective direction 决定

| role             | default   | allowed                              | `none`              | `forward`              | `reverse`             | `both`              |
| ---------------- | --------- | ------------------------------------ | ------------------- | ---------------------- | --------------------- | ------------------- |
| `association`    | `none`    | `none`、`forward`、`reverse`、`both` | 实线、两端无 marker | 实线、target `kite`    | 实线、source `kite`   | 实线、两端 `kite`   |
| `dependency`     | `forward` | `forward`                            | —                   | 实线、target `stealth` | —                     | —                   |
| `generalization` | `forward` | `forward`                            | —                   | 实线、target `normal`  | —                     | —                   |
| `flow`           | `forward` | `forward`、`reverse`、`both`         | —                   | 实线、target `circle`  | 实线、source `circle` | 实线、两端 `circle` |
| `influence`      | `forward` | `forward`、`reverse`、`both`         | —                   | 实线、target `square`  | 实线、source `square` | 实线、两端 `square` |

除 `none` 外，每个 Graph 内置 role 的基础 recipe 使用唯一的实心 marker provider；同一 role 在 `forward`、`reverse` 与 `both` 下只改变 marker 所在 endpoint，不改变 marker family。全部内置 role 的基础 path 均为实线，不通过 dash 区分 role

Graph 同时内置以下稳定 kind；未列出的 direction 与 token 全部继承所属 role：

`uml.aggregation` 与 `uml.composition` 把 source 细化为 whole、target 细化为 part；`uml.realization` 把 source 细化为 implementation、target 细化为 specification；`provenance.derivation` 把 source 细化为 derived result、target 细化为 source record

| kind                    | role             | default / allowed | 规范 delta                                   |
| ----------------------- | ---------------- | ----------------- | -------------------------------------------- |
| `uml.aggregation`       | `association`    | `none` / `none`   | source `openDiamond`，target 无 marker，实线 |
| `uml.composition`       | `association`    | `none` / `none`   | source `diamond`，target 无 marker，实线     |
| `uml.realization`       | `generalization` | 继承 `forward`    | target `open`，实线                          |
| `provenance.derivation` | `dependency`     | 继承 `forward`    | target `openStealth`，实线                   |

`workflow.branch`、`workflow.feedback` 与领域 predicate 不由 Graph 内置，由对应上层通过同一 registry 注册

### direction 只表达有向性，不等同于 endpoint marker

Relation direction 为 `none`、`forward`、`reverse` 或 `both`：

- `none`：关系没有语义箭头方向
- `forward`：语义从 source 指向 target
- `reverse`：语义从 target 指向 source
- `both`：两个方向同时成立

role / kind definition 必须为每个有效 direction 产出确定的 source / target marker recipe，但 direction 本身不直接等同于“哪端画箭头”。aggregation / composition 的 diamond、ER cardinality 的 crow-foot、association 的 circle / bar 等都是 endpoint marker，不一定表示语义方向。Graph 领域因此统一使用 `sourceMarker` / `targetMarker`，只在下沉 Core Path 时映射到 start / end arrow host

例如 association 可以允许四种 direction；flow 可以允许 forward、reverse 与 both；dependency、generalization 等 source / target 含义固定的 role 可以只允许 forward。`uml.aggregation` / `uml.composition` kind 可以在 association role 下把 direction 收窄为 none，并分别在 whole endpoint 使用空心 / 实心 diamond。显式 direction 只能从最终允许集合中选择，不能通过 marker 或 route 反向改写

### role 决定基础视觉家族，kind 与 predicate 细化

每个 Relation role definition 必须为全部允许 direction 直接提供不可缺省的基础结构。role 决定稳定视觉家族：association、dependency、generalization、flow 与 influence 的有向定义分别使用 kite、stealth、normal、circle 与 square family；association 的 `none` 定义为无 marker 实线。全部内置 role 使用实心 marker 与实线，只引用 Core / Standard Arrow provider，不复制 marker geometry

kind definition 对所属 role structure 提供稀疏 delta，例如 realization 使用 hollow triangle，composition 在 source 使用 solid diamond。predicate resolver 只消费已校验 Canonical params，并可以进一步替换 source / target marker detail、切换 open / solid provider 或调整规范 dash。颜色、线宽、opacity 与强调不进入这些 definitions；Graph Theme rules 按 Canonical selector 统一提供 appearance。不存在按 params 字段名硬编码的全局视觉魔法

role 决定基础 marker family 与实心 provider；kind / predicate 可以根据规范语义把具体 provider 切换为同 family 的 open 形态或修改规范 dash。Theme rule 只能修改 marker fill / opacity、path paint / width / opacity 等 appearance，不能切换 provider、增删 marker 或改变 dash 语义。若一个 family 的 solid / hollow 形态由不同 Core / Standard provider name 实现，Relation resolver 物化最终 provider name；Graph 不建立第二套 marker geometry registry

### Core 承载 marker host，Standard 可扩展通用形态

Relation appearance resolution 直接引用 Core 开放 Arrow Definition / registry 与 Path dash contract。Core 拥有 marker host、公开 contract、provider registry、path shrink、Scene marker、编译与诊断，并提供 `normal`、`open`、`stealth`、`openStealth`、`circle` 与 `openCircle`。Standard 拥有移除 Graph / UML / Workflow 词汇后仍成立的通用 endpoint marker definitions，当前提供 `bar`、`crowFoot`、`diamond`、`openDiamond`、`kite`、`openKite`、`square` 与 `openSquare`

Graph 默认 provider assembly 直接使用 Core builtin registry，并显式贡献内置 relation recipes 实际使用的 Standard `kite`、`square`、`diamond` 与 `openDiamond` providers；未被内置 recipe 使用的 Standard marker 不自动安装。自定义 role / kind / predicate 可以引用 Core、Standard 或第三方 provider name，但调用方必须通过既有 Core provider surface 注入对应 Definition；未注册 provider fail-loud。若所需通用形态超出 Core Arrow Definition 表达力，应先扩展 Core host，再由 Standard 提供通用 definition，不在 Graph 或 renderer 中建立旁路

### Theme selector 感知完整 Canonical Relation

Relation Theme selector 可以按 `role`、`kind`、`predicate.name`、`predicate.params` 与 `direction` 匹配。字段按 AND 匹配；单值 / 列表表示一个或多个允许值；params 对 Canonical params 做递归子集匹配，对象只要求 selector 声明的键相等，数组与标量使用 JSON 深度相等。params selector 只有同时声明 predicate name 才合法

Relation structure 与 appearance 分两条确定路径：

```text
structure = role / effective direction
          > kind / effective direction delta
          > predicate definition 根据 Canonical params 解析的 delta

appearance = 当前 Graph Theme style 的 Relation baseline
           > 当前 style 中按声明顺序匹配的 Relation rules
           > 从外到内各层 Graph Relation baseline 与匹配 rules
```

Theme baseline / rules 只包含非语义 appearance token，不能替换 marker family 或 marker existence；这些结构字段只能由 role、kind 或 predicate resolver 设置。相同 role、kind、predicate、Canonical params、direction 与 Theme scope 在没有实例覆盖时得到相同 source / target marker、dash pattern、颜色、线宽和透明度。Relation 显式 Core Path 字段与单个 label 的显式外观最终覆盖语义和 Theme 默认；一次性可复用语义差异使用 kind / predicate，可复用视觉差异使用 Theme rule，单个实例的精确呈现直接写在 Relation record

Relation 的 Graph-local Theme path 使用当前 Graph root layer，并按嵌套 Graph scope 处理外层与内层 Theme；不根据 source / target Entity 的宿主位置猜测 Theme。带自身 Core Theme 的 Scope 是不透明边界，第三方 composite 也不递归猜测其中的 Relation children

### route 与 labels 直接复用 Core Path

Relation route 直接使用 Core Path-compatible step sequence。作者、Diagram、Editor 或其它消费者可以计算并填写同一个 `route` 字段；Graph 不保存来源标记、候选 route 或优先级。role / kind / predicate 与 Theme 先提供结构和外观默认，Relation 的显式 Core Path 字段与单个 label 外观再精确覆盖；这些呈现字段不作为 routing 决策来源

route 是位于当前 Core 内容树坐标空间的完整 Core Path step sequence，中间 step 复用 Core 支持的 line、fold、curve 与 arc 等表达。`source` / `target` 是 Graph 拓扑真源，route 是消费者提供的 Core 几何表达；Graph 不提前校验 endpoint membership，也不解析 Core Position、比较 route 坐标与 endpoint placement，或复制 Core compile context。提供 route 的作者、Diagram、Editor 或其它消费者负责让它连接语义 endpoints，Core compile 负责解析完整 Position、namespace 与 NodeTarget 语言；嵌套 Graph 不建立另一套坐标

Relation `labels` 直接保存一个或多个完整 Core Geometry Label。省略 text color、font 或 opacity 时使用当前 Relation / Theme 默认；单个 label 的显式字段最终覆盖默认值，其中 font 按字段合并。lowering 将确定后的 labels 作为 Core Path host label 下沉

Graph lowering 只消费 Relation record 当前唯一的 `route` 并原样交给 Core Path，不把 endpoint placement 作为额外 lower 输入。如果消费者需要在手写 route、约束与自动 routing 之间裁决或验证几何连通性，应在调用 Graph lowering 前完成；该调度与几何校验不进入 Graph Source IR

Relation 对 Core Path surface 的复用与收窄如下：

- `route` 对应 Core `children`，`labels` 对应 Core `label`；除显式收窄项外，其余 Core Path 字段保持原名称、JSON 形态、默认、refinement 和可观察语义
- Graph `id` 直接成为 Path id，`meta`、`animations`、`zIndex`、path geometry 与 style 字段原样透传
- Core Path `kind` 与 `kindOptions` 不开放，因为 Relation 固定下沉为 stroke path，且 `kind` 已由 Graph 语义占用
- `type`、`children` 与 `label` 分别由 Relation discriminator、`route` 与 `labels` 替代；`marks` 被收窄，因为 endpoint markers 已由 Relation 语义结构拥有
- fill、fillOpacity 与 fillRule 被收窄，因为 Graph Relation 固定为开放 stroke path；需要 area path、任意 mark 或其它 Path kind 时直接使用 Core Path
- role / kind / predicate 提供 marker 与 dash 默认，Theme 提供 appearance 默认；Relation 显式 Path 字段、endpoint marker appearance 与单个 label appearance 依次精确覆盖适用默认
- Graph schema 通过 Core Path schema 的显式 `omit` 复用其余字段；Core 新增 lower-facing Path 字段时自动继承，只有语义冲突字段需要继续收窄

### Graph resolve 与 authoring 入口共享同一路径

Relation resolve 消费 Relation Source IR、role / kind / predicate registries 与 Graph Theme，统一完成 direction、definition lookup、params validation、selector 与补全后不变量，产出 Canonical Relation 与 appearance recipe。lowering 把同一 record 的 NodeTarget endpoints、route、labels 和确定 recipe 组合为普通 Core Path，但不预解析 endpoint 或比较 route positions；namespace 与 endpoint identity resolution 继续由 Core compile 负责。Core、Scene 与 renderer 不解释 Graph role、kind 或 predicate

直接 JSON、React 与 Vanilla 必须构造同一个 Relation record。React / Vanilla 可以用 way 或 builder sugar 生成 `route`，但不得维护私有 predicate、默认 direction、实例字段优先级、marker 选择、routing 优先级或错误分支

## 基础数据结构与公开契约

Relation Source IR 的最小结构为：

```ts
type RelationDirection = 'none' | 'forward' | 'reverse' | 'both';

type IRGraphRelation = Readonly<{
  namespace: 'graph';
  type: 'relation';
  id?: string;
  source: IRNodeTarget;
  target: IRNodeTarget;
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  direction?: RelationDirection;
  labels?: ReadonlyArray<IRGeometryLabel>;
  route?: ReadonlyArray<IRGraphRelationRouteStep>;
  roundedCorners?: IRPath['roundedCorners'];
  rotate?: IRPath['rotate'];
  scale?: IRPath['scale'];
  zIndex?: IRPath['zIndex'];
  animations?: IRPath['animations'];
  meta?: IRJsonObject;
}> &
  Omit<IRPath, 'type' | 'kind' | 'kindOptions' | 'children' | 'label' | 'marks' | 'fill' | 'fillOpacity' | 'fillRule'>;

type IRGraphRelationRouteStep = z.infer<typeof GraphRelationRouteStepSchema>;
```

Relation 扩展面使用成员专属契约：

```ts
type IRGraphRelationMarkerRecipe = Readonly<{
  shape: NonNullable<IRArrowEndDetail['shape']>;
  scale?: IRArrowEndDetail['scale'];
  length?: IRArrowEndDetail['length'];
  width?: IRArrowEndDetail['width'];
}>;

type IRGraphRelationMarkerAppearanceTokenOverrides = Readonly<{
  color?: IRArrowEndDetail['color'];
  fill?: IRArrowEndDetail['fill'];
  opacity?: IRArrowEndDetail['opacity'];
  lineWidth?: IRArrowEndDetail['lineWidth'];
}>;

type IRGraphRelationAppearanceTokenOverrides = Readonly<{
  color?: IRPath['color'];
  stroke?: IRPath['stroke'];
  strokeWidth?: IRPath['strokeWidth'];
  strokeOpacity?: IRPath['strokeOpacity'];
  opacity?: IRPath['opacity'];
  shadow?: IRPath['shadow'];
  blendMode?: IRPath['blendMode'];
  lineCap?: IRPath['lineCap'];
  lineJoin?: IRPath['lineJoin'];
  dashOffset?: IRPath['dashOffset'];
  sourceMarker?: IRGraphRelationMarkerAppearanceTokenOverrides;
  targetMarker?: IRGraphRelationMarkerAppearanceTokenOverrides;
  labelTextForeground?: IRGeometryLabel['textColor'];
  labelFont?: IRGeometryLabel['font'];
  labelOpacity?: IRGeometryLabel['opacity'];
}>;

type IRGraphRelationThemeRule = Readonly<{
  type: 'relation';
  selector?: IRGraphRelationSelector;
  appearance: IRGraphRelationAppearanceTokenOverrides;
}>;

type IRGraphRelationRoleTokenRecipe = Readonly<{
  sourceMarker: false | IRGraphRelationMarkerRecipe;
  targetMarker: false | IRGraphRelationMarkerRecipe;
  dashPattern: false | NonNullable<IRPath['dashPattern']>;
}>;

type IRGraphRelationStructureTokenOverrides = Readonly<{
  sourceMarker?: false | IRGraphRelationMarkerRecipe;
  targetMarker?: false | IRGraphRelationMarkerRecipe;
  dashPattern?: false | NonNullable<IRPath['dashPattern']>;
}>;

type RelationRoleDefinition = Readonly<{
  role: string;
  description: string;
  defaultDirection: RelationDirection;
  allowedDirections: ReadonlyArray<RelationDirection>;
  directions: Readonly<Partial<Record<RelationDirection, IRGraphRelationRoleTokenRecipe>>>;
}>;

type RelationKindDefinition = Readonly<{
  kind: string;
  role: string;
  description: string;
  defaultDirection?: RelationDirection;
  allowedDirections?: ReadonlyArray<RelationDirection>;
  directions?: Readonly<Partial<Record<RelationDirection, IRGraphRelationStructureTokenOverrides>>>;
}>;

type RelationPredicateDefinitionInput<TSchema extends ZodType<IRJsonObject>> = Readonly<{
  name: string;
  role: string;
  kinds?: ReadonlyArray<string>;
  description: string;
  paramsSchema: TSchema;
  resolveStructure?: (params: z.output<TSchema>) => IRGraphRelationStructureTokenOverrides;
}>;
```

`GraphRelationRouteStepSchema` 逐个复用 Core Step variant 并移除其 label 字段，避免 route step 与 Relation host labels 形成两个标签入口。Relation 不定义 `GraphRelationLabelSchema` 或 `IRGraphRelationLabel` 平行契约，直接复用 Core `GeometryLabelSchema` / `IRGeometryLabel`。`false` 是 marker absence 与 solid path 的显式规范值。marker recipe 只拥有 provider name 与尺寸结构；颜色、fill、line width 和 opacity 进入 endpoint appearance

role 的 `directions` 必须且只能包含其全部 allowed directions；kind 的 allowed directions 必须是 role allowed directions 的非空子集，default 必须属于最终集合；kind 对每个声明 delta 的 direction 只能覆盖最终有效方向

`defineRelationPredicate` 在定义点保留 params schema 的具体类型，并封装为 registry 可存储的擦除 Definition；callback 只接收已通过对应 schema 的 params。role、kind 与 predicate 分别进入 `GraphDefinitionOptions.relationRoles`、`relationKinds` 与 `relationPredicates`

公开 `defineRelationRole`、`defineRelationKind` 与 `defineRelationPredicate` 分别保持对应 Definition 的类型，并让内置与自定义项通过同一注册入口。三类 definition 不使用跨成员 `AnyGraphMemberDefinition`，也不建立内置白名单 dispatch

Relation structure vocabulary 覆盖 source / target marker detail 与规范 dash pattern，由 role / kind / predicate definitions 提供默认。Relation appearance vocabulary 覆盖 stroke、stroke width、path opacity、marker paint / opacity 与 label appearance，由 Graph Theme runtime baseline / ordered Source rules 提供默认。Relation record 不复制 token bag，而是直接复用 Core Path 与 Geometry Label 字段表达显式实例覆盖；省略 rule selector 表示匹配全部 Relation，appearance 必须非空

Canonical Relation 必须显式保存已解析 endpoint、effective direction、已校验 predicate params 与 Definition provenance。Source params 省略时以 `{}` 作为 schema input；Canonical 结果始终保存 JSON object schema output

## 行为、失败语义与兼容性

- relation id、NodeTarget id、role、kind、predicate name 与 definition description 必须为非空字符串；Relation id 保持可选，只有显式 id 才进入 Core namespace 与重复 identity 检查
- 未注册 role / kind / predicate、kind 与 role 不匹配、predicate 与 role / kind 不匹配或 params 校验失败时由 Relation resolver fail-loud；未知 endpoint、重复 id 与 namespace 不可见由 Core compile 使用同一 NodeTarget 诊断
- role allowed directions 必须非空、无重复并包含 default；kind 只能收窄为非空子集。显式 direction 只有在最终允许集合内才有效，Path marker、页面方向与 Diagram direction 均不能反推或改变它
- role 必须覆盖全部 role 有效 directions 的完整 recipe；Graph 内置 role 的非 `none` 基础 recipe 必须使用互不相同的实心 marker provider，并且基础 path 必须为实线。kind delta 只能覆盖最终有效 direction。resolver 返回非法 token、selector 引用未注册 key 或最终 marker provider 未注册时 fail-loud，不回退默认箭头
- 内置与自定义 Definition 使用同一 registry；重复 key、覆盖内置 key 或一次 provider assembly 中不同对象争用同一 key 都 fail-loud，不使用 last-wins、内置白名单或全局注册副作用
- predicate params selector 只匹配已校验 Canonical params；规则按声明顺序执行，后匹配规则覆盖先匹配规则，不执行字符串表达式、函数或未知字段查询
- route step 携带 label 字段时 fail-loud；省略 route 时 lowering 使用 source→target 的直接 Core Path。Graph 不以 JSON 相等、局部 Position resolver 或 endpoint placement map 预判 route 几何连通性
- Relation、predicate params、metadata、labels 与 route 必须 JSON-safe；函数、ReactNode、DOM、class instance、renderer resource、selection、history、transaction 与 routing 算法内部状态不得进入 Source IR
- 不根据 label、meta、stroke、marker、相邻 Entity 或图拓扑猜测 role、kind、predicate 或 direction；不根据 kind / predicate 名称前缀执行隐式继承
- 按 identity 分离的 member appearance / geometry collections、旧 root relation collection、旧类型和 Graph-only 引用校验直接删除，不保留 schema alias、隐式 Graph wrapper、双轨 Source IR、默认 terminal arrow 或实例 style fallback

## 最终实现摘要与遗留风险

Relation 已实现为同时承载 endpoint、direction、完整 Core labels、route 与除明确语义冲突项外其余 Core Path 实例字段的单一 Source record，并通过独立 Definition、registry、resolve、Theme 默认与实例覆盖链路下沉为普通 Core Path

自动 routing、显式 route 的几何连通性与领域 predicate definitions 仍由后续 Diagram、作者或其它消费者负责；Graph 省略 route 时只生成 source→target 直连，不复制 Core Position 解析或 routing 校验能力。端口或其它局部连接点留给后续通用 endpoint 引用设计，不在当前 Relation contract 中预建专用字段；本结论同时取代 alpha.1 ADR-01 对成员端口输入的早期要求，以及 ADR-09 对 Entity port root-space placement 的早期假设

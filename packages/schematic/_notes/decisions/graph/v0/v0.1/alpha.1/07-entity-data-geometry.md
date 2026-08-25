# ADR-07：Entity 语义封装与 Core Node 复用

- 状态：Accepted
- 决策日期：2026-08-22
- 修订日期：2026-08-23
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md) · [Standard 参数化图式 Shape 与端点 Marker ADR](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-diagram-shapes-and-endpoint-markers.md)
- 取代：[Graph 语义注册与主题样式 ADR](./06-graph-entity-registry-theme.md) 中独立 presentation root、旧内置 role 词汇、按 identity 分离的实例 override、root token bag 与 Theme role recipe；保留 registry、Theme style lookup、selector 和 scope 级联能力。Variant 轴由 ADR-06 的 2026-08-23 breaking revision 删除

## 背景与目标

Entity 是带 Graph 语义并最终下沉为一个 Core Node 的正式元素。此前设计把同一个 Entity 拆成 semantic data、按 identity 引用的 presentation 和 authored geometry；Vanilla 与 React authoring 先并置输入，normalize 再拆成三组集合，Graph resolve 建立平行索引，lowering 最后重新合并为一个 Node。该结构重复 identity、扩大 Source IR，并让 Graph 拥有了 Core 已经表达的位置、尺寸与内容投影

本决策把 Entity 收敛为单一 Source record。Graph 只增加 role、kind、predicate 等领域语义，并直接复用 Core Node 的实例字段与编译语义；位置或尺寸由作者、Diagram、Editor 或其它消费者计算，Graph 不区分来源，也不建立 geometry result 或裁决协议

## 决策

### Entity 是语义化 Node record

一个 Entity record 同时保存稳定 identity、Graph 语义和绘制该实例所需的 Core-compatible 字段。text、position、minimumSize 等字段不参与 role、kind 或 predicate 分类，但也不因此离开 Entity record

Entity 可以在缺少绘制必需字段时完成语义 resolve，供关系分析或上层消费者计算布局；请求 Graph lowering 时，仍缺少对应 Core lower target 必需字段则 fail-loud。Graph 不保存 authored / automatic 来源标记，不合并两个候选位置，也不规定消费者的调度顺序

Graph root 只装配按作者顺序排列的 `children` 与自身作用域字段。`children` 与 Core `IRChild` 同源，可以包含 Entity、Relation 与任意合法 Core / Tier 2 child；不存在只为包装成员投影而存在的 presentation 对象，也不存在 geometry root

Graph root 同样遵循最小 Source IR：`children`、Core Theme、`graphTheme`、id 与 meta 均按实际输入可选，省略的 children 和默认值只在 resolve / compile 中补全。一个只包含 Entity 的输入只携带一个 Entity child，不需要携带空集合或空包装对象

### Core Node surface 是 lower 真源

Entity lower target 是 Core Node。Graph 只排除由 role definition 唯一确定的 shape、boundary、padding、cornerRadius 与 shape 结构参数；其余 Node surface 均以相同名称、JSON 形态、默认、refinement 和可观察语义作为 Entity 实例字段开放。position 在 Core Node 中必填，但在 Entity Source 中保持可选，以支持先做语义 resolve、后补布局

Graph schema 必须从 Core Node 权威 schema 通过排除结构字段的组合方式复用完整实例 surface，不手写旧字段白名单。Core 后续增加 Node lower-facing 字段时，Entity 默认继承；只有新的字段确属 role structure 时才加入显式排除并同步说明

`IRGraphEntityAppearanceTokenOverrides` 继续精确复用 Core appearance fields，且要求至少一个字段。Graph Theme baseline / rules 按 role、kind 与 predicate 提供语义外观默认；Entity 显式填写的 color、fill、stroke、dashed、dashPattern、textColor 等 Core Node 字段在 lowering 时覆盖对应 Theme 值。Theme 不改变 role structure，实例也不能覆盖 role structure

role definition 的 minimumSize 是语义视觉家族的基础下限；Entity 显式 minimumSize 是实例测量约束。两者按各轴取更大值后写入 Node，显式 0 保持 Core 语义。其余允许字段原样进入 Core Node，不由 Graph 重写默认、几何或测量算法

### role、kind 与 predicate 分层解析

- role definition 提供稳定说明并直接持有完整结构；shape 和 padding 必需，boundary 与基础 minimum size 可选
- kind definition 只声明所属 role、稳定子类型与说明，不保存 appearance
- predicate definition 声明所属 role、可选 kinds、params schema 与说明；只负责校验并产出 Canonical params，不保存 appearance resolver

role 是 shape、boundary、padding、cornerRadius 与基础 minimum size 等结构字段的唯一 owner。`cornerRadius` 保留 Core top-level 语义，用于 rectangle role；它不被静默塞入 provider params。kind、predicate 和 Theme appearance rule 都不能改变这些结构，也不能改变 identity、content、position 或其它 Core-compatible 实例字段。内置与自定义 definition 共用同一 registry、provider assembly 与 resolver

Graph 内置 participant、activity、event、state、gateway、resource 与 concept 七个上位 role；各 role 的 shape、boundary、padding、可选 cornerRadius 与 minimum size 由 role definition 持有。领域子类使用 kind，带参数的精确说明使用 predicate；内置主题通过 rules 为这些语义提供 appearance

role 是开放 registry key：Source schema 运行时仍接受任意非空白自定义字符串，同时通过 Foundation `createOpenStringSchema(values)` 把内置 `EntityRole` 作为 JSON Schema enum 提示暴露给编辑器和 LLM。该提示不构成白名单；是否已注册仍只由 Entity resolver fail-loud。当前没有内置 Entity kind 或 predicate name 集合，因此这两个字段继续使用普通非空白字符串 schema，不制造空的提示词汇

Entity Theme selector 可以按 role、kind、predicate.name 与 predicate.params 匹配。Theme 只提供 appearance baseline / rules，不保存 role recipe；Entity 的 shape、boundary、padding 与基础 minimum size 不通过 Theme 改写。相同 Canonical 语义与 Theme scope 必须得到相同 Theme appearance；随后只由 Entity 显式 Core Node appearance 字段覆盖同名值，实例内容、位置、metadata 或尺寸不参与 selector 匹配

### 消费者拥有 geometry 计算与调度

作者可以直接填写 Entity 的 Core-compatible 字段；Editor 可以把持久化拖拽结果写回相同字段；未来 Diagram 可以消费 Graph 语义或自己的更高层输入，计算位置与尺寸，再产出可供 Graph lowering 的完整记录或其它明确下游

这些路径都不要求 Graph 定义 AuthoredEntityGeometry、DiagramEntityGeometry 或优先级。Diagram 的输入输出与调度由 Diagram ADR 冻结，不反向扩大 Graph Source IR

### 成熟项目中的同类边界

- Graphviz 把 `pos` 定义为节点属性，布局器可以读取或输出同一属性，而不是要求图模型持有第二组 geometry records：https://graphviz.org/docs/attrs/pos/
- Cytoscape element model 直接保存 position，layout 负责自动或手动更新这些 model fields：https://js.cytoscape.org/#notation/elements-json
- ELK 的 `ElkShape` 直接持有 `x / y / width / height`，算法消费并更新图元素自身的 placement：https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure.html

三者都把“元素是什么”和“元素当前放在哪里”保存在同一对象边界，并把布局策略与调度交给消费者或算法层。Graph 采用相同原则，但继续让 Source placement 可选，以支持先做语义 resolve、后由 Diagram / Editor 补齐的链路

## 基础数据结构与公开契约

Entity Source IR 的最小形态为：

```ts
type IRGraphEntity = Readonly<{
  namespace: 'graph';
  type: 'entity';
  role: string;
  kind?: string;
  predicate?: Readonly<{ name: string; params?: IRJsonObject }>;
  position?: IRNode['position'];
}> &
  Omit<IRNode, 'type' | 'shape' | 'boundary' | 'padding' | 'cornerRadius' | 'position'>;

type IRGraph = Readonly<{
  namespace: 'graph';
  type: 'graph';
  id?: string;
  graphTheme?: IRGraphThemeLayer;
  children?: ReadonlyArray<IRChild>;
  meta?: IRJsonObject;
}>;

type IRGraphThemeLayer = Readonly<{
  rules: readonly [IRGraphThemeRule, ...ReadonlyArray<IRGraphThemeRule>];
}>;

type IRGraphEntityThemeRule = Readonly<{
  type: 'entity';
  selector?: IRGraphEntitySelector;
  appearance: IRGraphEntityAppearanceTokenOverrides;
}>;

type EntityRoleDefinition = Readonly<{
  role: string;
  description: string;
  shape: NonNullable<IRNode['shape']>;
  boundary?: IRNode['boundary'];
  padding: NonNullable<IRNode['padding']>;
  cornerRadius?: IRNode['cornerRadius'];
  minimumSize?: IRNode['minimumSize'];
}>;

type EntityKindDefinition = Readonly<{
  kind: string;
  role: string;
  description: string;
}>;
```

Graph root 的 `children` 与 Core `IRChild` 同源。普通 Core / Tier 2 child 不参与 Graph 语义 resolve，但继续使用 Graph 复用的 Core Scope、Theme、namespace 与默认样式能力

`IRGraphThemeLayer` 只保存至少一条 appearance rule；省略 selector 表示匹配该 member family 的全部记录。rule 的 appearance 必须至少提供一个字段，空 layer、空 rule 和 role recipe 均在 schema 边界拒绝。当前 Core Theme style 的 Graph appearance baseline 由 runtime Theme style definition 在 resolve 时提供，不提前物化到 Source IR

IRGraphEntityPresentation、IRAuthoredEntityGeometry 与按 identity 分离的 root member collections 被删除。直接 JSON、React 与 Vanilla 都构造同一个 Entity child record；JSX text 只是 text 的 authoring sugar，不产生第二种持久化形态

扩展面继续由 defineEntityRole、defineEntityKind 与 defineEntityPredicate 分别注册。role definition 直接保存完整结构，kind / predicate 提供可选择的 Canonical 语义轴；Graph Theme baseline / rules 提供语义 appearance 默认，Entity 实例使用同名 Core Node 字段做最终显式覆盖

## 行为、失败语义与兼容性

- Entity 与 definition key 必须为非空字符串；Entity id 保持可选，只有显式 id 才进入 Core namespace 与重复 identity 检查
- 未注册或互不匹配的 role、kind、predicate，以及 predicate params 校验失败，均 fail-loud 并报告 Entity identity、失败 key、字段路径与可用 definition
- 请求 lowering 的 Entity 缺少 Core Node 所需的 position 时 fail-loud；语义 resolve 本身不为其生成默认坐标
- Entity 显式写入 shape、boundary、padding 或 cornerRadius 时在 schema 边界拒绝，不静默覆盖 role structure；其它 Core Node 字段保持可写
- Theme appearance 先按 Canonical 语义解析，Entity 显式 appearance 字段随后逐字段覆盖；省略字段继续使用 Theme 值
- 允许的 Core-compatible 字段保持 Core unknown-field、默认、refinement、identity、measurement、geometry 与 Scene 行为；Graph 不复制对应算法或诊断
- Entity、predicate params、metadata、text、label、animation 与 placement 必须 JSON-safe；ReactNode、DOM、renderer resource、selection、history、transaction 与布局算法内部状态不得进入 Source IR
- 不根据 shape、text、meta、position、Relation 或拓扑猜测语义，也不根据 key 的点号前缀执行隐式继承
- 本次迁移直接删除 member presentation / geometry collections 与旧 root collection 输入，不保留 alias、fallback 或双轨输入；Graph semantic child 的 source order 保留，lowering 使用 Relation → Entity → decoration 的固定 paint order，并在各分支内保持 source order

## 最终实现摘要与遗留风险

Entity 已实现为同时承载 Graph 语义与完整非结构 Core Node surface 的单一 Source record。Graph root 以有序混合 children 保持最小输入，role definition 直接拥有结构，Theme rules 提供语义 appearance 默认，Entity 显式 Node 字段具有最终优先级；direct IR、React 与 Vanilla 共享同一 Source / resolve / lowering 路径

Diagram 自动布局与布局结果交付不在本 ADR 中冻结。唯一长期约束是 Graph 不为这些消费者建立平行 geometry Source model。端口或其它局部连接点没有当前绘制闭环，不进入本版 Entity 契约；若后续需要，将与通用 endpoint 引用能力一起重新设计。本结论取代 alpha.1 ADR-01 中要求消费者提供 Graph 成员端口的早期边界描述；端口不属于当前 Entity 契约

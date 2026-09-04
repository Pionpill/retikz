# ADR-03：Flow Source 模型与 LLM-first Authoring

- 状态：Accepted
- 决策日期：2026-08-30
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [ADR-01：Diagram Assembly 与 Presentation](./01-diagram-assembly-presentation.md) · [ADR-02：Diagram Frame、Spacing 与 Appearance](./02-diagram-frame-spacing-appearance.md) · [ADR-07：Flow 平级 Source、Group 与 Layout](./07-flow-catalog-source-layout-groups.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

Diagram Foundation 已经确定完整图示由 Presentation、Frame / Appearance 与具体 drawing core 组成，但尚未建立可实例化的 `FlowDiagram` Source。Graph 可以独立表达 Group、Block、Entity 与 Relation，并允许作者填写 Core-compatible 几何；它面向自由组合和显式绘制，不负责从关系结构推导布局

FlowDiagram 面向站点中的架构、数据、控制、依赖、传播与反馈图。此类图的作者事实通常只有对象、关系、包含层级、主要方向、少量 rank 约束与共享外观，位置、Group bounds 和连线路径应由 Diagram 推导。直接要求作者或 LLM 生成完整 Graph / Core IR，会同时暴露 namespace、通用 NodeTarget、position、route、Scope 与大量 lower-facing 可选字段，产生多种等价写法并把派生几何误存为 Source

LLM 是 Retikz 的一等 author。Flow Source 因此必须先服务稳定的结构化生成、校验、修复与增量编辑，再由同一契约服务 Direct IR、Vanilla 和 React。本文冻结 FlowDiagram 的唯一持久化 Source、显式关系、provider-neutral 布局意图、扁平 Theme token、结构化全局配置、单项 style / layout、Graph lowering 边界和可诊断失败语义。ADR-07 将声明与包含调整为平级 Entity / Group / Layout catalog 和引用式 `children`，并把可见语义边界与无外壳固定排列拆为独立概念；布局 Definition / registry 的开放契约由 ADR-04 冻结，布局、routing、result、artifact 与完整 Scene 编排由 ADR-05 冻结

## 决策

### FlowDiagram 拥有唯一高层 Source

`@retikz/diagram` 拥有 `IRFlowDiagram` 及其 Flow-specific schema。它直接组合 ADR-01/02 的 Presentation、Frame 与 Diagram Theme，并以 `entities`、`groups`、`layouts`、根 `children`、`relations`、`flowThemeTokens` 和 `flowTheme` 表达 drawing core，不接受通用 `body`、必需 `IRGraph` 根或任意 Graph / Core child 数组

Flow Source 是高层领域 Source，不是第二套 Graph。它只保存 Flow 特有的结构组织、最小语义投影和布局意图；resolve 后仍使用 Graph 的 Entity role、Relation role / direction、Group、Entity、Relation、Graph Theme、identity 与 canonical lowering。Flow 不重新实现 Graph role / Theme registry、Core NodeTarget、Surface、Node、Path、Scope 或 renderer 语义

`IRFlowDiagram` 组合除 `children` 外的完整 Core Scope properties。完整 Diagram 的 id、theme、transform、placement、clip、zIndex、meta、animation 与 bounds 行为继续沿用 ADR-02 和 Core Scope；Flow drawing core 不用这些字段表达内部节点几何

### 平级 catalog 声明元素，children 是唯一包含事实源

Flow 的 `entities`、`groups` 与 `layouts` 分别平级声明 Entity、可见 Group 和无外壳 Layout；数组位置已经表达类别，因此三者不保存 element `type`。根、Group 与 Layout 的非空 `children` id 列表是唯一包含事实源和 authored sibling order。Source 不保存 parent id、membership path、祖先索引或递归 element 对象；resolve 校验引用后再构造递归 Canonical tree

Flow 的 `relations` 只出现在根并显式引用 element id。Relation 可以连接任意层级的 Entity 或 Group，也可以跨 Group / Layout scope；Layout 只有布局身份，不能作为 endpoint。Relation 不复制到最近 scope、endpoint owner 或成员索引。所有 Entity / Group / Layout id 在一个 FlowDiagram 内全局唯一；Relation 由所在 `relations` 集合及数组顺序定位，不拥有 `type` discriminator 或 authored id

Group 不携带变体 `kind`，始终建立可见 Graph 语义边界并可提供局部自动布局意图。Layout 以必需 `direction` 及可选 `gap` / `align` 固定排列 direct children，不接受 label / style，不绘制 Graph shell，也不进入 endpoint namespace。Group 与 Layout 可以相互嵌套；嵌套不自动产生 Relation，rank 只表达直接 owner 内的布局层级，不能替代包含关系

### Flow element 是 Graph 语义的窄 authoring 投影

Flow Entity 接受必需 id 与 text，以及可选 Graph Entity role、kind、status、rank、style 和 layout。省略 role 时使用 Graph `concept` role；省略 status 表示未特别标记。status 直接复用 Graph 闭合语义状态，并与 id、text、role、kind 一同原样投影给 Graph Entity。style 只组合 Graph Entity 已公开的非结构性 appearance 与文字字段，layout 只组合 `minimumSize` 与 `margin`；它不接受 position、shape、padding、boundary、cornerRadius、任意 Core child 或 Graph namespace。Graph role Definition 继续拥有被 Graph 特意屏蔽的结构

Graph Block 暂不进入 Flow Source。它的结构、内部 endpoint 与连接契约仍在 Graph owner 内收敛；只有这些契约稳定并出现真实 Flow 消费者后，才能通过新的 Diagram 设计引入。当前 Flow 不保留摘要 Block、`type: 'block'`、Block style / layout、Theme token、adapter 组件、artifact kind、别名或 fallback，也不把 Block 映射为 Entity

Flow Group 接受必需 id 与非空 children，以及可选 rank、局部 layout、label 与 style。style 组合 Graph Group 已公开的 Surface 与 caption title 文字字段，label 确定性下沉为 Graph Group caption；Group shell、caption 与 children 继续使用 Graph / Standard / Layout 的 canonical 能力。Flow Layout 接受必需 id、direction 与非空 children，以及可选 rank、gap 与 align；它只在 Diagram 内保留为无绘制、不可寻址的固定排列 Scope

Flow Relation 接受必需 source 与 target，以及可选 label、Graph Relation role、kind、status、direction、style 和 layout。它已经由 `relations` 集合确定语义类别，因此不重复保存 `type: 'relation'`；路径没有 Flow authored identity，因此也不接受 id。省略 role 时使用 Graph `flow` role，省略 direction 时使用该 role 的方向；省略 status 表示未特别标记；内置 flow role 为 forward。status 直接复用 Graph 闭合语义状态，并原样投影给 Graph Relation。style 组合 Graph Relation 已公开的 Path appearance、显式 dash、marker appearance 与 label appearance，不能改变 marker family 或增删 marker；layout 只覆盖 provider-neutral routing intent。label 下沉为一条由 Diagram 放置的 Graph geometry label。Relation 不接受 NodeTarget union、anchor、offset、route step、marker recipe 或手写 marker path；source / target 只使用 element id，实际 boundary endpoint 与 route 由 Diagram 计算

### rank 与局部 layout 只表达 provider-neutral 意图

每个 Entity、Group 或 Layout 可以提供非负整数 rank。rank 相对于最近的 Flow scope 生效：顶层元素相对于 Flow 根，Group / Layout children 相对于其直接 owner。相同 rank 的自动布局同级元素沿主方向对齐，数值较小的 rank 位于数值较大的 rank 之前；Layout 自身的 rank 只约束它作为外层 child 的位置，不改变内部固定排列。rank 是约束，不是计算后的坐标或缓存

Flow 根的结构化 `flowTheme.layout` 是根与全部 Group layout scope 的全局基线，Group `layout` 对自身 scope 提供同形稀疏覆盖：主方向、同 rank 内节点间距、rank 间距与 routing intent。主方向使用 `up | right | down | left`；routing 使用 `straight | orthogonal`，orthogonal 可以指定非负 corner radius。Relation `layout.routing` 可以覆盖其有效 scope 的 routing。没有显式值时先使用有效 Flow token，再由 ADR-04 的有效 Layout Definition 确定，adapter、Docs 与 renderer 不得分别补默认

Group layout 只控制其 `children` 确定的内部自动布局 scope。Layout 的 direction / gap / align 只控制 direct children 的固定 placement。Relation 的有效 routing scope 是 source 与 target 的最低共同 Flow Group 或 Layout；跨 scope relation 使用能够同时包含两个 endpoint 的最近 scope。该规则只确定公共意图归属，不冻结 provider 数据结构或算法步骤

Relation direction、反馈、双向关系和 cycle 是合法 Source，不因无法形成 DAG 而被 schema 拒绝。Layout Definition 必须按 ADR-04 声明其可处理能力并 fail-loud；Flow Source 不要求作者为了算法限制改写语义关系

### 扁平 token、结构化全局配置与单项配置使用同一字段边界

Flow 使用与 Plot 同形的两条配置路径：`flowThemeTokens` 保存扁平、稀疏、可追踪的 token 覆盖，`flowTheme` 保存结构化全局配置。`flowTheme` 包含 layout、Entity、Group 与 Relation slices；每个 slice 只组合对应 Graph element 已公开且适合自动布局 Source 的 style / layout 字段。每个 element 或 relation 可以提供同形单项 style / layout，单项值优先

Flow token key 使用 `flow.<owner>.<field>` 稳定命名。layout 拥有 direction、node gap、rank gap 与 routing tokens；Entity 拥有 Graph 已开放 appearance、文字、minimum size 与 margin tokens；Group 拥有已开放 Surface 与 caption 文字 tokens；Relation 拥有已开放 Path appearance、显式 dash、marker appearance、label appearance 与 routing tokens。token schema 不接受 position、route steps、anchor、offset、Port、Graph namespace、任意 Core child，或 Graph 已屏蔽的 Entity shape / padding / boundary / corner radius 与 Relation marker family / existence

`FlowThemeStyleDefinition` 与 Core `theme.style` 同名协作，按完整 Core effective Theme 返回稀疏 Flow tokens。Flow Neutral token layer 不重复 Graph / Standard 的 style 默认，只在 Flow 自己需要不同 baseline 时声明稀疏值；未声明的布局值继续由 ADR-04 的有效 Layout Definition 确定。显式 Core style 必须存在同名 Flow Theme Definition，否则 fail-loud。发布包只维护 Neutral，Academic、Vibrant、Clean 等 reference style 由宿主通过同一公开 Definition 注入；Flow 不增加独立 `flowTheme: 'academic'` 选择轴

解析顺序固定为 Graph role / Graph Theme 与 Surface 默认、Flow Neutral tokens、同名 Flow Theme Definition tokens、Source `flowThemeTokens`、结构化 `flowTheme`、Group 局部 layout、单项 style / layout。后面的来源只覆盖自己声明的字段；合法的 false、0 与透明颜色按对应 Graph / Core schema 保留。Flow 不引入 class、variant、CSS selector、颜色白名单或 element 级命名 token

`style` 表示 Graph element 已允许操作的绘制配置，`layout` 表示 provider-neutral 约束；不再使用含义过窄的 `appearance` 字段。Graph role 继续拥有 Entity shape、padding、boundary 与 Relation marker family / existence 等被 Graph 屏蔽的结构。Flow Relation 可以使用 Graph 已开放的显式 dash 与 marker appearance，但不能把 marker recipe 或 route geometry 伪装成 style

### LLM-first 是公开契约门槛

Flow schema 使用闭合对象、按 catalog 区分类别，并保持语义化字段名和唯一规范形态。Group 与 Layout 分开声明，不用额外 discriminator 重复数组已经表达的类别。Direct JSON 不提供 string shorthand、tuple shorthand、隐式顺序连边、平行 membership、字段别名或多套等价 endpoint。React / Vanilla 可以提供宿主便利写法，但 normalization 后必须产生同一个 `IRFlowDiagram`

schema describe 必须说明字段语义、默认来源、开放 role / kind 的 registry 边界和派生几何排除项。可用的自定义 role、Theme 与 Layout Definition 必须由处理调用使用的同一 definition catalog 暴露给 LLM；静态 schema 不伪装能枚举运行时开放字符串

Source parse 与 resolve 必须返回可修复诊断：稳定错误 code、精确 JSON path、相关 id，以及未注册名称时的可用候选。诊断不得静默生成 id、猜测 endpoint、创建缺失元素、删除未知字段、改变关系方向或回退布局 provider

Flow resolve 至少区分 `DIAGRAM_FLOW_DUPLICATE_ID`、`DIAGRAM_FLOW_REFERENCE_NOT_FOUND`、`DIAGRAM_FLOW_CONTAINMENT_INVALID`、`DIAGRAM_FLOW_ENDPOINT_INVALID` 与 `DIAGRAM_FLOW_CONSTRAINT_UNSATISFIABLE`。错误 details 必须保留用户应修改的 path、相关 id，并在适用时提供稳定 reason；definition / provider lookup 继续使用 Diagram 的统一 Definition 错误族并附带可用名称。ADR-04/05 可以增加 layout capability 与 provider output code，但不能把这些 Source 错误收拢为无法自动修复的通用失败

同一 Source、同一 definitions 与同一有效 Theme 必须产生相同 Canonical Flow、provider 输入顺序和 renderer-neutral 结果。element 只使用显式 authored id；Relation 始终按 Source 数组位置对齐，不生成数组 id、JSON hash、JSX occurrence id 或布局 identity

### 三入口只改变 authoring 语法

Direct IR 是唯一持久化真源。Diagram Vanilla 定义 TypeScript-only `InputFlowDiagram` 并通过 `normalizeFlowDiagram` 组装同一 Source；Diagram React 把 props / children 调度为同一 Vanilla Input，不直接创建平行 Source、membership、默认、registry 或布局语义

文本 DSL 不属于 v0.1。未来 Mermaid、PlantUML 或其它 parser 只能解析为同一个 `IRFlowDiagram`，不能建立另一条 compile、layout 或 renderer 路径

## 基础数据结构与公开契约

长期 Source 的最小关系为：

```ts
type IRFlowDiagram = Omit<IRScopeProps, 'children'> &
  Readonly<{
    type: 'flow';
    namespace: 'diagram';
    presentation?: IRDiagramPresentation;
    frame?: IRDiagramFrame;
    diagramTheme?: IRDiagramTheme;
    entities: ReadonlyArray<IRFlowEntity>;
    groups: ReadonlyArray<IRFlowGroup>;
    layouts: ReadonlyArray<IRFlowLayout>;
    children: ReadonlyArray<string>;
    relations?: ReadonlyArray<IRFlowRelation>;
    flowThemeTokens?: IRFlowThemeTokenOverrides;
    flowTheme?: IRFlowTheme;
  }>;

type IRFlowEntity = Readonly<{
  id: string;
  text: string;
  role?: EntityRoleValue;
  kind?: string;
  status?: GraphStatusValue;
  rank?: number;
  style?: IRFlowEntityStyle;
  layout?: IRFlowEntityLayout;
}>;

type IRFlowGroup = Readonly<{
  id: string;
  label?: string;
  rank?: number;
  layout?: IRFlowLayoutIntent;
  style?: IRFlowGroupStyle;
  children: ReadonlyArray<string>;
}>;

type IRFlowLayout = Readonly<{
  id: string;
  rank?: number;
  direction: 'right' | 'left' | 'down' | 'up';
  gap?: number;
  align?: 'start' | 'center' | 'end';
  children: ReadonlyArray<string>;
}>;

type IRFlowRelation = Readonly<{
  source: string;
  target: string;
  label?: string;
  role?: RelationRoleValue;
  kind?: string;
  status?: GraphStatusValue;
  direction?: RelationDirectionValue;
  style?: IRFlowRelationStyle;
  layout?: IRFlowRelationLayout;
}>;

type IRFlowLayoutIntent = Readonly<{
  direction?: 'up' | 'right' | 'down' | 'left';
  nodeGap?: number;
  rankGap?: number;
  routing?: Readonly<{
    kind: 'straight' | 'orthogonal';
    cornerRadius?: number;
  }>;
}>;

type IRFlowTheme = Readonly<{
  layout?: IRFlowLayoutIntent;
  entity?: Readonly<{ style?: IRFlowEntityStyle; layout?: IRFlowEntityLayout }>;
  group?: Readonly<{ style?: IRFlowGroupStyle }>;
  relation?: Readonly<{ style?: IRFlowRelationStyle; layout?: IRFlowRelationLayout }>;
}>;

type IRFlowEntityStyle = IRGraphEntityAppearanceTokenOverrides &
  Pick<IRGraphEntity, 'align' | 'lineHeight' | 'maxTextWidth' | 'font'>;
type IRFlowEntityLayout = Pick<IRGraphEntity, 'minimumSize' | 'margin'>;

type IRFlowGroupStyle = Pick<IRGroup, 'padding' | 'background' | 'border' | 'cornerRadius' | 'overflow'> &
  Readonly<{ label?: IRFlowTextStyle }>;

type IRFlowRelationStyle = IRGraphRelationAppearanceTokenOverrides & Pick<IRGraphRelation, 'dashPattern'>;
type IRFlowRelationLayout = Readonly<{ routing?: IRFlowLayoutIntent['routing'] }>;

type IRFlowTextStyle = Pick<
  IRGroupCaptionText,
  'align' | 'lineHeight' | 'maxTextWidth' | 'textColor' | 'font' | 'opacity'
>;

type FlowThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => Readonly<{ tokens?: IRFlowThemeTokenOverrides }>;
}>;

declare const defineFlowThemeStyle: (definition: FlowThemeStyleDefinition) => FlowThemeStyleDefinition;
```

代码片段冻结字段关系与所有权，不指定 Zod 拼装方式。`IRFlowThemeTokenOverrides` 由 Flow token schema 派生，每个 token key 使用对应 owner 字段的精确 value schema，不是所有 key 共享的宽联合。所有 string content、Entity / Group / Layout id、child id 与 relation endpoint 必须非空；`entities` 与根 / Group / Layout `children` 必须非空，`groups` / `layouts` 必填且可以为空，出现的 relations 必须非空；rank 必须是非负整数；gap、尺寸与 corner radius 必须符合对应 owner 的非负约束。style、layout、flowTheme 与 token override 对象出现时必须至少包含一个有效覆盖

`IRFlowDiagram`、各 element、relation、layout、style、flowTheme 与 token 类型都由 Flow schema 派生或由 schema-derived 类型组合，不手写平行 public interface。Graph role、status、direction、可操作实例字段与 Standard Surface 字段直接组合对应 owner 的公开 schema，不复制 primitive refinement 或默认值。若 Graph owner 后续收窄某字段，Flow 同源投影同步收窄，不能保留绕过入口

`DiagramDefinitionOptions.flowThemeStyles` 注入 Flow Theme Definitions；Direct IR、Vanilla 与 React 把同一 options 交给统一 provider assembly。内置与自定义 Definition 经过同一 `defineFlowThemeStyle`、registry、lookup、callback output 校验和消费路径，不建立全局 registry 或 adapter 私有 definitions

Flow token key 冻结为以下一对一映射族；复合值继续使用 owner 的原 JSON 形态：

| Token family    | Keys                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout          | `flow.layout.direction`、`flow.layout.nodeGap`、`flow.layout.rankGap`、`flow.routing.kind`、`flow.routing.cornerRadius`                                                                                                                                                                                                                                                                                                                                     |
| Entity style    | `flow.entity.color`、`flow.entity.textColor`、`flow.entity.fill`、`flow.entity.stroke`、`flow.entity.fillOpacity`、`flow.entity.strokeWidth`、`flow.entity.strokeOpacity`、`flow.entity.opacity`、`flow.entity.shadow`、`flow.entity.blendMode`、`flow.entity.dashed`、`flow.entity.dotted`、`flow.entity.dashPattern`、`flow.entity.dashOffset`、`flow.entity.align`、`flow.entity.lineHeight`、`flow.entity.maxTextWidth`、`flow.entity.font`             |
| Entity layout   | `flow.entity.minimumSize`、`flow.entity.margin`                                                                                                                                                                                                                                                                                                                                                                                                             |
| Group           | `flow.group.padding`、`flow.group.background`、`flow.group.border`、`flow.group.cornerRadius`、`flow.group.overflow`；`flow.group.label` 拥有 `textColor`、`font`、`align`、`lineHeight`、`maxTextWidth`、`opacity` 后缀                                                                                                                                                                                                                                    |
| Relation style  | `flow.relation.color`、`flow.relation.stroke`、`flow.relation.strokeWidth`、`flow.relation.strokeOpacity`、`flow.relation.opacity`、`flow.relation.shadow`、`flow.relation.blendMode`、`flow.relation.lineCap`、`flow.relation.lineJoin`、`flow.relation.dashPattern`、`flow.relation.dashOffset`、`flow.relation.sourceMarker`、`flow.relation.targetMarker`、`flow.relation.labelTextForeground`、`flow.relation.labelFont`、`flow.relation.labelOpacity` |
| Relation layout | `flow.relation.routing.kind`、`flow.relation.routing.cornerRadius`                                                                                                                                                                                                                                                                                                                                                                                          |

选中的 IR-centric 图使用 `flowTheme.layout.direction: 'right'`，四个输入 Entity、IR / Scene、四个输出 Entity、Canvas 后继 Entity、持久化 Entity、显式 Relation 与少量 rank 即可表达。双向持久化关系使用 `direction: 'both'`；需要表达异常、成功、警告或禁用时直接使用 Graph `status`；“灰色 = 计划中未支持”继续由 ADR-01 的显式 Legend 表达，不成为 Flow element

## 行为、失败语义与兼容性

- Flow、Entity、Group、Layout、Relation、layout、style、flowTheme 与 token schema 都是闭合对象；未知字段、未知 token、空 entities / children / relations、空覆盖对象、显式 undefined、旧 Group kind、空 id / text / endpoint、负 rank / gap / corner radius 均 fail-loud
- Entity / Group / Layout id 全局唯一。重复 id 使用 `DIAGRAM_FLOW_DUPLICATE_ID` 并指向后出现 catalog 声明的 id；children 必须解析到当前 Flow element，relation source / target 必须解析到 Entity 或 Group，未解析引用使用 `DIAGRAM_FLOW_REFERENCE_NOT_FOUND` 并指向对应引用 path
- 每个声明必须恰好由根、一个 Group 或一个 Layout 直接包含一次。duplicate child、multiple parents、orphan、self-containment 与 containment cycle 使用 `DIAGRAM_FLOW_CONTAINMENT_INVALID` 并提供具体 path、相关 id 与 reason；resolve 不猜 parent 或返回部分 Canonical tree
- Relation endpoint 只能是 Entity 或 Group。引用 Layout 使用 `DIAGRAM_FLOW_ENDPOINT_INVALID`，reason 为 `layout-endpoint`，且在 layout capability preflight 前失败
- self-loop、平行 Relation、cycle、双向或无向 Relation、跨 Group Relation 都是合法 Source；能否由所选 provider 处理在 ADR-04/05 的 resolve 与 orchestration 边界诊断
- rank 只在兄弟 elements 中比较；同一 scope 内相同 rank 表示同层，不同 rank 表示确定先后。显式 rank 与 Relation 形成不可满足约束时使用 `DIAGRAM_FLOW_CONSTRAINT_UNSATISFIABLE` fail-loud，不移动 rank、删除 Relation 或反转 direction
- Group 局部 layout 按最低共同 Group 规则作用；没有共同局部 Group 时使用 `flowTheme.layout`。Relation 显式 routing 最终覆盖其有效 scope routing；Source 不保存该查找索引、LCA、rank graph 或 geometry cache
- routing kind 为 straight 时不得提供 cornerRadius；orthogonal 省略 cornerRadius 时由有效 Layout Definition 决定。Source 不保存 bend points、route steps、ports、anchors 或 offsets
- Entity 与 Relation 的 status 只表示 Graph 语义状态，不改变 role、kind、direction、relation endpoint、rank、自动 layout 或 routing。Flow 不创建 status token、Flow Theme selector、颜色枚举、图标、marker、标签或动画；有效 Graph Theme 根据同一 status 提供 appearance 默认，单项 style 仍按既有优先级覆盖外观
- status 使用 Graph 的闭合集合；空字符串、未知值、数组及其他非合法形态都在 Flow Source schema 边界 fail-loud，不解释为 normal、不回退到 predicate params，也不在 adapter 或 renderer 修复
- 省略 Flow token、flowTheme 或单项 style 时继续使用有效 Graph / Core / Diagram Theme 与下层默认。结构化全局配置高于 token resolution，单项 style / layout 最高；合法的 false、0 与透明颜色必须保留
- 显式 Core `theme.style` 必须存在同名 Flow Theme Definition；Definition 缺失、重名、callback 抛错、返回非 plain data、未知 token 或非法 token value 均由 `RetikzDiagramError` fail-loud，并附带 style name、path 与可用名称
- Flow style 只能映射到 Graph element 已开放的实例字段。Entity shape / padding / boundary / corner radius 与 Relation marker family / existence 等 Graph 屏蔽项即使出现在 token、flowTheme 或单项 style 中也必须在 schema 边界拒绝，不通过 Diagram 补丁绕过
- 未注册 Entity / Relation role、无可用 Layout Definition、provider capability 不满足及输出引用错误统一由 `RetikzDiagramError` 诊断，并保留 definition 或 provider cause
- Flow lowering 必须调用 Graph / Standard / Core 的 canonical contract、registry、resolve 与 lowering，不在 Diagram、adapter 或 renderer 重建 shape、Surface、NodeTarget、Path、namespace、Theme 或 Scene 逻辑
- Direct IR、Vanilla 与 React normalization 后的 Source 必须逐字段等价；React children 顺序形成根 / Group / Layout `children` 的 authored order 和根 relations 的 positional order，同时把 Entity / Group / Layout 声明收集到平级 catalog，不隐式创建 Relation 或 id
- 本能力是新的 v0.1 公共 Source，不保留旧名、Graph-root 输入、任意 body、手写 geometry fallback 或 adapter 私有兼容入口。ADR-01/02 的 Presentation、Frame、Diagram Theme 与 assembly 行为保持不变

## 实现摘要与遗留风险

`IRFlowDiagram` 的平级 Entity / Group / Layout catalog、引用式 `children`、根级 relations、扁平 token、结构化全局配置与单项 style / layout 已形成唯一 JSON Source，并由 Direct IR、Vanilla 与 React 三入口共享。resolve 从 owner-side `children` 唯一重建递归 Canonical tree；首个真实 Docs 消费者只声明关系、分组、固定排列、rank 与稀疏配置，不保存可推导 geometry

当前 Source 保持关系型流程图的最小边界，不包含 Graph Block、Port、手写 route、任意 Graph body、文本 DSL 或执行语义。LLM 生成质量仍依赖上层提供清晰 schema、catalog、示例与诊断反馈；这些工具上下文不得反向扩张持久化 Source

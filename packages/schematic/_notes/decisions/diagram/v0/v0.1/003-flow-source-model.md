---
description: Flow 唯一持久化 Source、平级声明、包含关系与可诊断 authoring 契约
keywords: 'Flow、Source、LLM-first、Authoring、IRFlowDiagram、relations、flowDefaults、entities'
---

# ADR-003：Flow Source 模型与 LLM-first Authoring

- 状态：Accepted
- 决策日期：2026-08-30
- 修订日期：2026-09-14
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Presentation](./001-diagram-assembly-presentation.md) · [Frame](./002-diagram-frame-spacing-appearance.md) · [平级 catalog](./007-flow-catalog-source-layout-groups.md)

本文保留唯一 Source、语义投影和诊断决策；文本由 [006](./006-flow-entity-rich-text.md) 扩展，Defaults 与字段切层由 [008](./008-theme-source-fragments.md) 替代旧 token / Theme 方案，Graph rules、Grid、折线路由、边界排除与统一宽度分别由 [009](./009-flow-graph-rules.md)、[010](./010-flow-grid-layout.md)、[011](./011-flow-elbow-routing.md)、[012](./012-flow-layout-bounds.md)、[013](./013-flow-item-width.md) 扩展。

## 背景与目标

流程、依赖和架构图的作者通常只需要声明对象、关系、包含层级、方向和少量 rank 约束。Graph 的显式 position、NodeTarget 与 route 属于绘制输入，不应迫使 Flow 作者或 LLM 生成可推导的几何。

Flow 因此拥有一个 JSON-safe 高层 Source，服务结构化生成、校验、局部修改和三入口 authoring。Graph 继续拥有 Entity / Relation 语义与绘图能力，Diagram 计算布局并投影到 Graph，不建立第二套 Graph IR 或 renderer。

## 唯一 Source 与包含关系

`@retikz/diagram/flow` 的 `IRFlowDiagram` 使用 `namespace: 'diagram'`、`type: 'flow'`，组合 Core Scope properties、Presentation、Frame 和以下正式字段：

| 字段                          | 契约                                 |
| ----------------------------- | ------------------------------------ |
| entities                      | 非空 Entity catalog                  |
| groups、layouts               | 必填且允许为空的平级 catalog         |
| children                      | 根的非空、有序直接成员 id            |
| relations                     | 可选、出现时非空的有序关系数组       |
| layout、routing               | 根自动布局意图与独立路由默认         |
| diagramDefaults、flowDefaults | 与正式 Source 路径同形的稀疏表现默认 |
| graphRules                    | 当前 Flow 的有序 Graph author rules  |

Entity、Group、Layout id 在一个 Flow 内全局唯一。根、Group 和 Layout 的 `children` 是唯一 containment 与 authored sibling order 真源；每个声明恰好由一个 owner 包含。Source 不保存 parent、祖先索引、递归 element、坐标、路径或 geometry cache。

Relation 只在根声明，以 source / target 引用任意层级的 Entity 或 Group，可以跨 scope。Layout 不可作为 endpoint。Relation 没有 authored id 或重复 type，始终以源数组顺序与结果对齐；catalog 顺序不代替 owner children 的排列顺序。

## Element 与 Relation 的语义投影

| 记录     | 正式内容与配置                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| Entity   | id、非空白 Core TextBlock text；可选 role、kind、status、颜色 group、rank、style、layout                              |
| Group    | id、children、rank、自动 layout、routing；caption.title 与 Graph 同名 Surface 字段                                    |
| Layout   | id、children、rank、必填 linear / grid kind；固定排列字段、excludeFromBounds、itemWidth                               |
| Relation | source、target；可选 TextBlock label、role、kind、status、group、direction、Path style、marker / label 外观和 routing |

Entity 缺省 role 为 Graph concept；Relation 缺省 role 为 Graph flow，direction 由选中的 Graph role / kind 决定。status 与颜色 group 直接复用 Graph 契约，既不改变 containment，也不决定 rank 或 routing。颜色 group 不等于可见 Group 包含关系。

Entity.style 复用 Graph 允许的视觉字段与 font；Entity.layout 包含 align、lineHeight、maxTextWidth、width、minimumSize、margin。Group 使用 caption.title 和 padding/background/border/cornerRadius/overflow，不使用旧 label/style 总包。Relation.style 只保存 Path style，sourceMarker、targetMarker、labelTextForeground、labelFont、labelOpacity 位于 Relation 根；路由单独使用 routing。

Flow 不允许 Entity position、shape、padding、boundary、任意 Core children，或 Relation NodeTarget、anchor、offset、手写 route、marker recipe。角色结构、文字测量和绘制仍由 Graph / Core 决定。Graph Block 尚不进入 Flow catalog。

## Layout 与 routing

rank 为最近 owner 内的非负整数约束；自动布局的相同 rank 元素同层，不同 rank 表达先后。固定 Layout 的 rank 只影响其整体在外层的位置，不重排内部 children。

Root / Group 的 layout 只含 direction、nodeGap、rankGap。方向为 up/right/down/left。显式 Layout 使用 linear 或 grid，由共享 Layout capability 完成固定排列；Group 保持可见 shell 与自动布局。

routing 在 Root、Group、Relation 独立声明，支持 straight、orthogonal、`-|`、`|-`。straight 不接受 cornerRadius；其余轴向路由可提供非负圆角。Relation 显式 routing 覆盖最近公共 scope 的有效 routing；固定 Layout 不开启新的 routing 配置层。继承与圆角裁决以 ADR-008/011 为准。

self-loop、平行关系、cycle、双向和跨 scope 关系是合法 Source。所选 Layout Definition 必须按 [004](./004-flow-layout-definition-registry.md) 声明能力，不支持时 fail-loud；不能通过删关系、改方向或回退 provider 修复。

## Defaults 与三入口

命名 Theme 通过当前 Core theme.style 选择同名 Definition；Flow Theme Definition 直接返回与 flowDefaults 同形的稀疏对象。没有 flat token、flowTheme 或 diagramTheme 输入。Defaults 只表达获准表现字段，不保存 direction、routing、内容、端点或 rank。

有效 Flow 默认与逐项 Source 投影为 Graph 显式字段，覆盖 Graph baseline/rules；未声明字段仍沿 Graph / Core 默认。Node font 整体替换，Relation labelFont 按 Graph 字段补全，复合 paint、Surface、spacing 与判别联合不做任意深合并。空默认片段不产生覆盖，合法 0、false 与透明颜色保留。

Direct IR 是持久化真源，Vanilla 组装 typed Input，React 调度同一 Vanilla 输入；JSX 嵌套产生 catalog 与 owner children，批量 marker 按 ADR-007 展开。三入口不增加私有默认、布局算法、关系 identity 或错误恢复。

## 校验与诊断

Source 使用闭合 schema，未知字段和错层配置在真实路径拒绝。id、引用与 Entity / Relation 文本必须满足非空语义；rank、间距和尺寸按各字段约束校验。可选字段的 undefined 沿 schema 省略语义；JSON 持久化不保存 undefined。实例 style/layout 的非空约束与允许空片段的 defaults 契约分开。

| 错误                                  | 可观察语义                                                            |
| ------------------------------------- | --------------------------------------------------------------------- |
| DIAGRAM_FLOW_DUPLICATE_ID             | 指向后出现的 catalog id                                               |
| DIAGRAM_FLOW_REFERENCE_NOT_FOUND      | child 或 endpoint 引用不存在                                          |
| DIAGRAM_FLOW_CONTAINMENT_INVALID      | 重复 child、多 owner、orphan、自包含或 cycle，保留 path、id 与 reason |
| DIAGRAM_FLOW_ENDPOINT_INVALID         | Layout endpoint 被拒绝，reason 为 layout-endpoint                     |
| DIAGRAM_FLOW_CONSTRAINT_UNSATISFIABLE | rank 与关系等约束不能同时满足                                         |

Definition lookup、能力与输出错误保留对应 Diagram 诊断；callback 失败保留 cause，不静默修复 Source。相同 Source、definitions、Theme 与测量环境必须得到相同 Canonical tree、provider 输入顺序和 renderer-neutral 结果。

## 最终契约

Flow 的公开 Source 是三个平级 catalog、唯一 containment 与根级关系，所有派生几何只存在于解析和编译结果。Presentation、Frame、Graph 投影及 artifact 经同一编译链组成完整 Scene。旧递归 elements、token、Theme 别名、任意 body 和手写几何入口不保留兼容路径。

# Diagram v0.1 Roadmap

> 状态：规划中；当前只规划 alpha.1，后续 alpha 等待真实使用继续规划。关联：[Diagram v0 roadmap](../roadmap.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md) · [Graph v0 roadmap](../../../graph/v0/roadmap.md)

## 目标

建立可使用的 Diagram package family，以 presentation、frame / appearance 与 drawing core 三层形成完整图示，以 Graph 的通用关系数据为 Flow 绘图核心的唯一语义真源。`FlowDiagram` 是首个公开图类型，为架构、数据流、控制流、依赖、传播与反馈等关系型流程图提供完整说明内容、图示装配、自动布局和 routing。v0.1 以 docs 中的真实流程图作为首个应用场景与验收语料，从简单场景开始渐进替换，并随真实需求继续规划后续 milestone。

## Milestone

| Milestone | 主题             | 范围                                                                                                                                                                                                         |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| alpha.1   | 完整 FlowDiagram | 建立 Diagram 核心包、Vanilla 与 React 的可用闭环，以 presentation、frame / appearance 与 Flow drawing core 组合完整图示，并完成真实 Graph 的自动测量、layout、routing、artifact、Core Scene 与 docs 渐进迁移 |

alpha.1 的具体公开契约、布局类型、算法、默认值、失败语义和 docs 迁移批次在对应 ADR 设计时确认。本 roadmap 不预先规划 alpha.2 及后续 alpha 的主题。

## 总体结构

完整 Diagram 由三个正交层次组成：

1. `Presentation`：title、description、legend 等位于绘图核心之外、但仍参与完整图示输出的说明内容与区域语义
2. `Frame / Appearance`：各 presentation region 与 drawing core 的物理排列、外框、padding、section gap 和 Diagram 专属外观
3. `Drawing Core`：由具体图类型拥有；FlowDiagram 复用 Graph 关系数据，负责测量、layout、routing 与 renderer-neutral 布局结果

Diagram 只拥有完整图示的区域装配语义和 Diagram 独有行为。通用文字、Surface、排版、测量、Theme 基础能力与绘制 primitive 继续复用 Standard、Layout 与 Core；Legend item 的长期 owner 由 ADR-01 结合真实复用证据决定；Graph 的 Group / Entity / Relation、Graph Theme 与 identity 继续由 Graph 独立拥有。

## 候选 ADR

| ADR | 主题                                   | 负责                                                                                                                                           |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Diagram Assembly 与 Presentation       | 完整 Diagram 的 presentation regions 与 drawing core 关系、说明内容与 legend 的来源和归属、输出边界及 Direct IR / Vanilla / React 等价表达     |
| 02  | Diagram Frame、Spacing 与 Appearance   | 区域排列、外框、frame padding、section gap、Diagram 专属 appearance，以及对 Layout / Standard / Core Theme 的复用边界                          |
| 03  | FlowDiagram Graph Body                 | Flow 绘图核心对真实 Graph 的消费、managed Graph 内容、Group 层级、identity、endpoint、authored geometry 与 Block / Port 延期边界               |
| 04  | Flow Layout Definition 与 Registry     | 可替换布局 Definition、内置与自定义 registry、公共布局意图、provider 输入输出、确定性与失败边界                                                |
| 05  | Flow Orchestration、Result 与 Artifact | Graph Theme 下的测量、Group 递归布局、routing、provider 结果验证、render-ready Graph、renderer-neutral artifact、diagnostics 与完整 Scene 闭环 |

上述 ADR 只表示长期决策的依赖分区，不在 roadmap 冻结字段、默认值、算法库、测试 case、文件 scope 或实现步骤。

## 依赖顺序

1. Graph 先提供 Diagram 所需的通用关系模型、Graph resolve 与稳定 identity；Diagram 不把现有独立呈现元素集合伪装成全局关系模型
2. ADR-01 建立完整 Diagram 的区域装配语义，ADR-02 再确定 frame / appearance 如何组合这些区域
3. ADR-03 冻结 Flow drawing core 的 Graph 输入边界，ADR-04 冻结可替换 layout / routing capability
4. ADR-05 把 frame composition 与 Flow drawing core 汇合为完整 renderer-neutral Scene 和 artifact
5. 五个 ADR 全部完成 Architecture Gate 并由人工确认后，才细化统一的 Alpha1 implementation plan；真实 docs 使用继续暴露后续 milestone 需求

依赖域缺少必要的测量、几何、composition 或 Graph 关系能力时，先回到对应 owner 补齐，不在 Diagram 内复制模型、solver、artifact 或 renderer 路径。

## v0.1 边界

- `FlowDiagram` 是按主要关系方向自动排列的关系型流程图；关系可以表达执行、数据、控制、依赖、传播或反馈，不要求具有时间语义
- 完整 Diagram 可以包含 title、description、legend 等 presentation 内容与 Flow drawing core；这些内容是否必填、占据哪些区域、排列方式、来源和默认值由 ADR-01～02 决定
- frame padding 与 section gap 属于完整图示 composition；Flow 节点间距与层级间距属于 drawing-core layout intent，二者不合并为同一 spacing 契约
- Diagram 三包通过对称的 `/flow` 子入口暴露 FlowDiagram；包根只提供共享基础契约，不聚合具体图类型
- Graph 三包继续通过公共根入口提供基础能力，不建立 FlowDiagram 专用子入口
- docs 是首个真实消费者与验收语料；品牌配色、字体和响应式预览等站点专属选择保留为 docs recipe 或 reference appearance，不成为 Diagram Source enum 或内置白名单
- 现有 docs 关系型流程图按已实现能力从简单场景开始逐步替换，不要求一次性迁移全部图
- 不包含几何教学图、组件展示图、自由画布、交互式编辑器或完整 UML / 状态执行模型
- 不在 v0.1 预先实现 tree、force 或其它尚无当前消费者的布局类型
- Block / Port、跨 Group 层级 relation、完整 compound routing 与异步连续布局等待对应 Graph 能力或真实消费者后继续规划，不在 Alpha1 预留字段或兼容路径
- 不创建 Graph 数据、Graph presentation、Graph Theme、通用 Layout / Standard composite、Editor 状态、DOM 或 renderer 的平行契约

## 退出条件

- `@retikz/diagram`、`@retikz/diagram-vanilla` 与 `@retikz/diagram-react` 形成职责明确的可用 package family，React 通过 Vanilla 共享同一 authoring 与处理链路
- 完整 Diagram 能以 renderer-neutral 方式组合 presentation、frame / appearance 与 Flow drawing core，并把所有 presentation regions 和绘图核心纳入同一输出边界
- frame padding、section gap 与 Flow 内部节点 / 层级间距具有独立 owner、坐标层级和消费方
- Diagram 消费 Graph 的公开 Source / resolve 契约，布局意图保持 JSON-safe，几何结果保持 renderer-neutral，并通过 Graph identity 稳定对齐
- FlowDiagram 能完成 Graph 自动测量、布局、routing、Diagram presentation / frame composition 与 Core Scene 的最小端到端闭环，不要求作者手工计算全部节点位置和连线路径
- direct IR、Vanilla 与 React 对 MVP 具有等价表达，不存在 adapter 或 renderer 私有能力
- 至少一批现有 docs 关系型流程图已迁移为真实消费者；未覆盖场景有明确边界，并留待后续 alpha 按需规划
- Diagram 不复制 Graph、Layout、Standard、Core 或 renderer 已拥有的模型与机制

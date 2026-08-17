# Diagram v0.1 Roadmap

> 状态：规划中；当前只规划 alpha.1 与 alpha.2，后续 alpha 等待人工继续规划。关联：[Diagram v0 roadmap](../roadmap.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md) · [Graph v0 roadmap](../../../graph/v0/roadmap.md)

## 目标

建立可使用的 Diagram package family，以 Graph 的通用关系数据为唯一语义真源，并以 `FlowDiagram` 为首个公开图类型，为架构、数据流、控制流、依赖、传播与反馈等关系型流程图提供自动布局和 routing。v0.1 以 docs 中的真实流程图作为首个应用场景与验收语料，从简单场景开始渐进替换，并随真实需求逐步丰富公共能力。

## Milestone

| Milestone | 主题               | 范围                                                                                                                                                     |
| --------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alpha.1   | Diagram foundation | 建立 Diagram 核心包、Vanilla 与 React 的功能基座，冻结 Diagram 与 Graph、Layout、Core 之间的职责、输入输出和共享处理链，并形成 renderer-neutral 基础闭环 |
| alpha.2   | FlowDiagram MVP    | 建立首个可用的关系型流程图自动布局与 routing 闭环，使用真实 docs 流程图验证并开始渐进替换，同时明确 MVP 尚未覆盖的 FlowDiagram 范围                      |

alpha.1 与 alpha.2 的具体公开契约、布局类型、算法、默认值、失败语义、ADR 划分和 docs 迁移批次在对应 milestone 设计时确认。本 roadmap 不预先规划 alpha.3 及后续 alpha 的主题。

## 依赖顺序

1. Graph 先提供 Diagram 所需的通用关系模型、Graph resolve 与稳定 identity；Diagram 不把现有独立呈现元素集合伪装成全局关系模型
2. alpha.1 在 Graph、Layout、Standard、Core 与 Vanilla 的公开能力上建立 Diagram 自身的输入、resolve、provider 编排、布局结果和跨入口基础链路
3. alpha.2 在 alpha.1 基座上完成 FlowDiagram MVP，并以 docs 真实使用暴露下一阶段需要补充的能力

依赖域缺少必要的测量、几何、composition 或 Graph 关系能力时，先回到对应 owner 补齐，不在 Diagram 内复制模型、solver、artifact 或 renderer 路径。

## v0.1 边界

- `FlowDiagram` 是按主要关系方向自动排列的关系型流程图；关系可以表达执行、数据、控制、依赖、传播或反馈，不要求具有时间语义
- Diagram 三包通过对称的 `/flow` 子入口暴露 FlowDiagram；包根只提供共享基础契约，不聚合具体图类型
- Graph 三包继续通过公共根入口提供基础能力，不建立 FlowDiagram 专用子入口
- docs 是首个真实消费者与验收语料；docs 配色、虚线分组框、字体和响应式预览保留为 docs recipe 或 appearance，不进入 Diagram 公共模型
- 现有 docs 关系型流程图按已实现能力从简单场景开始逐步替换，不要求一次性迁移全部图
- 不包含几何教学图、组件展示图、自由画布、交互式编辑器或完整 UML / 状态执行模型
- 不在 v0.1 预先实现 tree、force 或其它尚无当前消费者的布局类型
- 不创建 Graph 数据、presentation、Theme、Editor 状态、DOM 或 renderer 的平行契约

## 退出条件

- `@retikz/diagram`、`@retikz/diagram-vanilla` 与 `@retikz/diagram-react` 形成职责明确的可用 package family，React 通过 Vanilla 共享同一 authoring 与处理链路
- Diagram 消费 Graph 的 Canonical 关系数据，布局意图保持 JSON-safe，几何结果保持 renderer-neutral，并通过 Graph identity 稳定对齐
- FlowDiagram MVP 能完成自动布局、routing、Graph presentation 与 Core Scene 的最小端到端闭环，不要求作者手工计算全部节点位置和连线路径
- direct IR、Vanilla 与 React 对 MVP 具有等价表达，不存在 adapter 或 renderer 私有能力
- 至少一批现有 docs 关系型流程图已迁移为真实消费者；未覆盖场景有明确边界，并留待后续 alpha 按需规划
- Diagram 不复制 Graph、Layout、Standard、Core 或 renderer 已拥有的模型与机制

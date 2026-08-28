# Diagram v0 Roadmap

> 状态：规划中；v0.1 当前只规划 alpha.1，后续 milestone 等待真实使用继续规划。关联：[Schematic 制图能力域设计](../../../../../../notes/architecture/schematic-design.md) · [Schematic Graph 完备设计](../../../architecture/schematic-graph-complete.md) · [Graph v0 roadmap](../../graph/v0/roadmap.md)

## 目标

Diagram v0 在 Graph 通用关系数据与图式呈现之上建立完整自动图示能力：以 presentation、frame / appearance 与 drawing core 三层组织完整图示，解析 JSON-safe 的布局意图，编排可替换的布局与 routing 能力，并产出与 Graph identity 对齐的 renderer-neutral 结果。首个公开图类型是 `FlowDiagram`，以 docs 中的关系型流程图为真实应用场景，通过渐进替换现有图验证 Diagram 的公共能力，而不是建立 docs 专用模型。

## 版本方向

| 版本                      | 主题             | 长期边界                                                                                                                          |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | 完整 FlowDiagram | 建立 Diagram package family，以 presentation、frame / appearance 与 Flow drawing core 形成首个完整自动布局、routing 和 Scene 闭环 |

后续 minor、布局类型与应用场景按真实用例继续规划；v0 roadmap 不预先冻结完整布局类型、约束或 provider 枚举。

Diagram v0 的长期结构为：

1. Presentation 拥有 title、description、legend 等完整图示的内容角色与区域语义，不把通用文字或标识项绘制重新定义为 Diagram primitive
2. Frame / Appearance 拥有完整图示的区域组合、外框、padding、section gap 与 Diagram 专属外观，排版和 Surface 复用 Layout / Standard
3. Drawing Core 由具体图类型拥有；FlowDiagram 复用 Graph 的 Group / Entity / Relation，并计算自动 layout、routing 与布局 artifact

Diagram 单向依赖 Graph，不复制 Graph 的节点、关系、分组、Graph presentation、Theme 或 identity。Graph 当前没有端口契约；后续通用 endpoint / 局部连接点能力必须先由独立设计冻结。Diagram 不拥有 Editor 状态、renderer、DOM 或框架生命周期；移除 Schematic 领域词汇后仍成立且经过真实复用验证的算法、几何与 composition 能力进入对应 Kernel 或 Library owner。

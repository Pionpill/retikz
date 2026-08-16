# Diagram v0 Roadmap

> 状态：规划中；v0.1 只规划 alpha.1 与 alpha.2。关联：[Schematic 制图能力域设计](../../../../../../notes/architecture/schematic-design.md) · [Schematic Graph 完备设计](../../../architecture/schematic-graph-complete.md) · [Graph v0 roadmap](../../graph/v0/roadmap.md)

## 目标

Diagram v0 在 Graph 通用关系数据与图式呈现之上建立自动图示能力：解析 JSON-safe 的布局意图，编排可替换的布局与 routing 能力，并产出与 Graph identity 对齐的 renderer-neutral 几何结果。首个公开图类型是 `FlowDiagram`，以 docs 中的关系型流程图为真实应用场景，通过渐进替换现有图验证 Diagram 的公共能力，而不是建立 docs 专用模型。

## 版本方向

| 版本                      | 主题                   | 长期边界                                                                                            |
| ------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | FlowDiagram 基础与 MVP | 建立 Diagram package family 的功能基座，并以 docs 真实关系型流程图验证第一条自动布局与 routing 闭环 |

后续 minor、布局类型与应用场景按真实用例继续规划；v0 roadmap 不预先冻结完整布局类型、约束或 provider 枚举。

Diagram 单向依赖 Graph，不复制 Graph 的节点、关系、分组、端口、presentation、Theme 或 identity。Diagram 不拥有 Editor 状态、renderer、DOM 或框架生命周期；移除 Schematic 领域词汇后仍成立且经过真实复用验证的算法与几何能力进入对应 Kernel 或 Library owner。

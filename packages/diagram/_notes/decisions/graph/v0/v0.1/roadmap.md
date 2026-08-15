# Graph v0.1 Roadmap

> 状态：Complete；alpha.1 至 alpha.3 已完成。关联：[Graph v0 roadmap](../roadmap.md) · [Diagram Graph 完备设计](../../../../architecture/diagram-graph-complete.md)

## 目标

建立独立 Graph package family 和 release group，以具有明确图式职责的 GraphNode、GraphConnector 与 GraphFrame 验证语义 IR、轻量 lowering、Tier 2 layout composite、Layout composition、直接 IR、React、Vanilla、docs 与 renderer-neutral 输出闭环；在 `0.x` 阶段撤回缺少真实场景支撑的候选能力，并让 GraphNode 使用 Graph 自有的 variant recipe。

## Milestone

| Milestone                       | 主题                | 范围                                                              |
| ------------------------------- | ------------------- | ----------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | Graph foundation | 三包、发布组、Standard 迁移、Layout composition、四种 Theme Style |
| [alpha.2](./alpha.2/roadmap.md) | Semantic IR         | 语义身份、轻量 Node / Path lowering、GraphConnector 双作者语法         |
| [alpha.3](./alpha.3/roadmap.md) | Surface pruning     | 撤回缺少用例验证的 Callout 公共契约                               |

## 边界

- 不创建 `@retikz/diagram` 聚合包
- 不实现 GraphModel、Flow、Graph editor adapter 或完整 UML / 状态模型
- 不保留 Standard 旧入口或 namespace 兼容层
- 不借迁移重命名组件或扩张公开字段
- alpha.1 的 Theme Style 不扩展 GraphFrame、GraphConnector 或 renderer 的主题职责

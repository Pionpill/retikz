# Notation v0.1 Roadmap

> 状态：Accepted；alpha.1、alpha.2 与 alpha.3 已完成。关联：[Notation v0 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../architecture/diagram-notation-complete.md)

## 目标

建立独立 Notation package family 和 release group，以具有明确图式职责的 LogicFrame、Terminal、Stage、Decision、Junction 与 Connector 验证语义 IR、轻量 lowering、Tier 2 layout composite、Standard layout composition、直接 IR、React、Vanilla、docs 与 renderer-neutral 输出闭环，并在 `0.x` 阶段撤回缺少真实场景支撑的候选能力。

## Milestone

| Milestone                       | 主题                | 范围                                                                 |
| ------------------------------- | ------------------- | -------------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | Notation foundation | 三包、发布组、Standard 迁移、公共 layout composition、测试与双语文档 |
| [alpha.2](./alpha.2/roadmap.md) | Semantic IR         | 语义身份、轻量 Node / Path lowering、Connector 双作者语法            |
| [alpha.3](./alpha.3/roadmap.md) | Surface pruning     | 撤回缺少用例验证的 Callout 公共契约                                  |

## 边界

- 不创建 `@retikz/diagram` 聚合包
- 不实现 GraphModel、Flow、Graph editor adapter 或完整 UML / 状态模型
- 不保留 Standard 旧入口或 namespace 兼容层
- 不借迁移重命名组件或扩张公开字段

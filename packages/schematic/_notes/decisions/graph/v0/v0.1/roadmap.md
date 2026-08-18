# Graph v0.1 Roadmap

> 状态：进行中；alpha.1 的 ADR-01 至 ADR-06 已完成，ADR-07 至 ADR-09 为 Proposed。关联：[Graph v0 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md)

## 目标

建立独立 Graph package family 和 release group，以具有明确图式职责的 Entity、Relation 与 Container 验证语义 IR、轻量 lowering、Tier 2 layout composite、Layout composition、直接 IR、React、Vanilla、docs 与 renderer-neutral 输出闭环；在 `0.x` 阶段统一三类成员的 `role → kind → predicate(params)`、variant、Definition / registry、Theme selector 与 data / geometry / presentation 边界。

## Milestone

| Milestone                       | 主题                           | 范围                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | Graph foundation and evolution | 三包、发布组、Standard 迁移、Layout composition、四种 Theme Style、语义 IR 与 lowering、Callout 公共契约撤回、Entity / Relation / Container 命名、三类成员统一语义骨架、成员专属 registry / Theme 与 data / geometry / presentation 边界 |

## 边界

- 不创建 `@retikz/diagram` 聚合包
- ADR-07 至 ADR-09 只冻结 Graph data、resolve、presentation 与 geometry 边界，不实现 Workflow、Graph editor adapter、完整 UML / 状态模型或 Diagram 自动布局
- 不保留 Standard 旧入口或 namespace 兼容层
- Graph 公共语义使用开放 Definition / registry；具体 Workflow、State、UML 与学术领域执行规则留在上层
- Graph Theme Style 可以为 Entity、Relation 与 Container 分别提供 baseline 与完整语义 selector rules，但 renderer 不感知 Graph token
- ADR-01 至 ADR-06 建立 Graph presentation foundation；ADR-07 至 ADR-09 以统一 Graph Source root 冻结 Entity、Relation、Container 的 data、port / endpoint / membership、presentation 与 geometry composition，但不实现 Editor document

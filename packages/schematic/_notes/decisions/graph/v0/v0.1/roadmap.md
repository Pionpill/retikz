# Graph v0.1 Roadmap

> 状态：进行中；alpha.1 的 ADR-06 breaking revision 与 ADR-09 已 Accepted，当前实现按无 Variant Theme 与独立 composite 契约同步收敛。关联：[Graph v0 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md)

## 目标

建立独立 Graph package family 和 release group，以 Graph、Entity 与 Relation 三类可组合 Source composite 验证领域 resolve、Core lowering、直接 IR、React、Vanilla、docs 与 renderer-neutral 输出闭环。Entity / Relation 可以独立出现；Graph 组合完整 Core Scope surface，并提供可选 `graphTheme`。standalone Graph 复用 Layout 建立 Scene，embedded Graph 只贡献局部 Scope。Entity / Relation 使用 `role → kind → predicate(params)`、各自 Definition / registry 与 appearance-only Theme rules；不建立平行 Variant 视觉轴。

## Milestone

| Milestone                       | 主题                           | 范围                                                                                                                                                                                             |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [alpha.1](./alpha.1/roadmap.md) | Graph foundation and evolution | 三包、发布组、Standard 迁移、四种 Theme Style、独立 Entity / Relation、可选 Graph context、Core NodeTarget endpoint、元素专属 registry / resolve / lowering、React / Vanilla parity 与 docs 闭环 |

## 边界

- 不创建 `@retikz/diagram` 聚合包
- ADR-07 至 ADR-09 只冻结 Graph Source、resolve、lower surface 与消费者 geometry 边界，不实现 Workflow、Graph editor adapter、完整 UML / 状态模型或 Diagram 自动布局
- 不保留 Standard 旧入口或 namespace 兼容层
- Graph 公共语义使用开放 Definition / registry；具体 Workflow、State、UML 与学术领域执行规则留在上层
- Graph Theme Style 可以为 Entity 与 Relation 提供稀疏 baseline overrides 与完整语义 selector rules，resolver 以 Neutral preset 补全；selector 只匹配 role、kind、predicate 与 direction 等真实语义，renderer 不感知 Graph token
- ADR-01 至 ADR-06 建立 package family、命名、registry 与 Theme foundation；ADR-07～08 冻结 Entity / Relation 的语义与 Core-compatible 直接字段，ADR-09 删除 Graph-root membership 与私有 Entity 索引，使 Graph 成为可选上下文，并把 Relation endpoint 对齐到 Core NodeTarget。Graph 不实现 Editor document、端口或自动 routing

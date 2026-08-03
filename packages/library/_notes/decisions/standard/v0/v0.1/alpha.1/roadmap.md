# Standard v0.1 alpha.1 Roadmap

> 状态：Accepted，implementation / adversarial test / docs / changelog 与人工确认均已完成。
>
> 主题：初始化 Standard 包家族、迁移首批宿主无关 Tier 2 composite，并建立直接 Definition 接入

| ADR                                        | 主题                                     | 状态       |
| ------------------------------------------ | ---------------------------------------- | ---------- |
| [ADR-01](./01-grid-composite.md)           | Grid composite 迁移                      | Accepted   |
| [ADR-02](./02-axes-composite.md)           | Axes 坐标轴 composite                    | Accepted   |
| [ADR-03](./03-frame-composite.md)          | Frame 可视分组 composite                 | Superseded |
| [ADR-04](./04-frame-header-composition.md) | Frame header 组合与 Node-like 部件       | Accepted   |
| [ADR-05](./05-capability-loading.md)       | 历史 capability module、bundle 与 preset | Superseded |

## 完工范围

- 三个 Standard 包已初始化为独立 lockstep release group，公开面只保留根入口 named exports
- Grid、Axes、Frame 都拥有 JSON-safe Tier 2 schema、Core `CompositeDefinition` lowering 与 React / Vanilla 等价入口
- Frame 的最终公开契约以 ADR-04 为准；ADR-03 仅保留首版历史记录
- Grid、Axes、Frame 的 Definition 可按当前图直接传入 Core `CompileOptions.composites`；Vanilla 全量 adapters 仍作为 authoring 便利入口保留
- 双语组件页、迁移指引、Definition loading 扩展页与 Standard v0.1 changelog 已同步

## Gate

- [x] ADR-01～04 已完成 Architecture Gate 或人工裁决并保持 Accepted；ADR-05 的历史组合设计已由 alpha.3 ADR-06 supersede
- [x] schema、lowering、adapter parity、错误路径与 package exports 均有自动化证据
- [x] adversarial BLOCKING 已清空
- [x] Standard 三包与 docs 已完成 alpha.1 收尾验证
- [x] ADR、roadmap、changelog 与发布元数据已对账

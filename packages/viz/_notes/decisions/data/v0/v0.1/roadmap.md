# @retikz/data v0.1 roadmap

> 状态：In Progress · 关联：[data v0 roadmap](../roadmap.md) · [plot v0.1 roadmap](../../../plot/v0/v0.1/roadmap.md)

v0.1 建立独立数据包边界：`@retikz/data` 接管 plot 内已经成型的数据模型、字段解析、transform 与相关 registry，并补齐可由多个宿主复用的 runtime lineage。JSON IR 仍只承载声明式数据与 transform 语义。

## Milestones

| Milestone | 目标                                                                                | ADR                             |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| beta.1    | 迁出 plot 数据层，建立 `@retikz/data` schema / contract / providers / pipeline 边界 | [`beta.1`](./beta.1/roadmap.md) |
| beta.2    | 收紧 data IR / statistics 边界，统一 `IRDataXxx` 命名并补齐 runtime lineage         | [`beta.2`](./beta.2/roadmap.md) |

## 下一阶段 RC

- beta.2 收尾后进入 RC；届时冻结现有 schema、definition / registry、pipeline 与 lineage 公共契约，只接收兼容性 bug、诊断、文档和发布修正。
- canonical data-view preparation、宿主共享 view lifecycle 等新能力延期到后续 Alpha milestone，不在当前 beta.2 或后续 RC 内扩展公共面。

## 验证策略

- data 包：eslint、tsc、迁移后的 transform / field / statistics 单测。
- plot 包：导入路径、public re-export、lowering 行为与旧测试兼容。
- adapter 包：React / Vanilla 仍从 `@retikz/plot` 或新 data 类型获得等价类型表面。

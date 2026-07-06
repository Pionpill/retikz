# @retikz/data v0.1 roadmap

> 状态：Proposed · 关联：[data v0 roadmap](../roadmap.md) · [plot v0.1 roadmap](../../../plot/v0/v0.1/roadmap.md)

v0.1 目标是在 beta.1 建立独立包边界：`@retikz/data` 接管 plot 内已经成型的数据模型、字段解析、transform 与相关 registry。该版本不新增数据语义，只迁移真源并建立跨宿主复用边界。

## Milestones

| Milestone | 目标 | ADR |
| --- | --- | --- |
| beta.1 | 迁出 plot 数据层，建立 `@retikz/data` schema / contract / providers / pipeline 边界 | [`beta.1`](./beta.1/roadmap.md) |

## 验证策略

- data 包：eslint、tsc、迁移后的 transform / field / statistics 单测。
- plot 包：导入路径、public re-export、lowering 行为与旧测试兼容。
- adapter 包：React / Vanilla 仍从 `@retikz/plot` 或新 data 类型获得等价类型表面。

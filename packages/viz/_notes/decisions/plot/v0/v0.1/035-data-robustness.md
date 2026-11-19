---
description: '曾由 Plot 统一处理推断与显式类型两条路径上的非法值、缺失值和归一化'
keywords: 'bigint、ingest、invalid、validateBoundData、coerceNumber'
---

# ADR-035：数据健壮性——统一归一化（消两模式割裂）+ 非法/缺失值策略 + bigint ingest

- 状态：Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md)、[ADR-028 数据模型](./028-data-model.md)、[ADR-029 可移植契约](./029-data-portability.md)、[ADR-031 resolveField](./031-field-resolver.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾由 Plot 统一处理推断与显式类型两条路径上的非法值、缺失值和归一化。通用数据处理已归 Data；投影失败后具体图元是否绘制仍属于 Plot。

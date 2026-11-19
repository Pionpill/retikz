---
description: 'Plot 从 Data 根入口消费字段、格式、统计与来源能力，不为已迁出的 Data-only 类型做兼容转发'
keywords: 'retikz、data、applyTransforms、IRDataModel、ExternalDatasets、defineTransform'
---

# ADR-101：适配 @retikz/data 数据层

- 状态：Partially Superseded
- 决策日期：2026-07-06
- 关联：[plot v0.1-beta.1 roadmap](./roadmap.md)、[data beta.1 迁移 ADR](../../../data/v0/v0.1/001-plot-data-migration.md)、[plot-design.md §3.1 Data / §8 lowering](../../../../architecture/plot-design.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)

## 保留的决策

Plot 从 Data 根入口消费字段、格式、统计与来源能力，不为已迁出的 Data-only 类型做兼容转发。Plot 仍负责把数据结果与坐标、图元和 guide 组合。

## 修订边界

最初留给 Plot 注册的 bin、stack 等通用变换已经迁回 Data；这个调整不逆转拆包，也不使 Data 依赖 Plot。

---
description: '统计图形由两类可分别复用的能力组成：transform/reducer/selector 决定数据，几何图元决定如何展示'
keywords: 'stat、geom、boxplot、density、smooth、统计几何'
---

# ADR-077：Stat / geom structural surface

- 状态：Partially Superseded
- 决策日期：2026-06-27
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[ADR-074](./074-quantile-band-boxplot.md)、[ADR-075](./075-density-transform.md)、[ADR-076](./076-smooth-regression.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

统计图形由两类可分别复用的能力组成：transform/reducer/selector 决定数据，几何图元决定如何展示。移除某个图元并不应使数据能力失效。

## 修订边界

旧例中的 ReferenceMark 和 RelationMark 不再作为抽象图元保留；Data 的统计结果可由 Point、Path、Interval 或 Chart 配方消费。

---
description: 'bin 与 aggregate 曾在 Plot 内生成分箱或聚合行并记录来源'
keywords: 'bin、aggregate、分箱、聚合'
---

# ADR-057：bin + aggregate transform

- 状态：Superseded
- 后续决策：[plot v0.1/072](072-statistical-transform-algebra.md)、[plot v0.1/102](102-plot-transform-registration.md)、[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)

## 决策沿革

bin 与 aggregate 曾在 Plot 内生成分箱或聚合行并记录来源。聚合由 Data 的 summarize 表达，bin 也属于 Data；“bin 仍是 Plot-only”是中间阶段，不是现行分工。

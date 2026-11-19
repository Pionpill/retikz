---
description: 'Data 的边界按操作的输入和输出来定：如果只读写数据行、字段模型及来源，就不因首个调用方是 Plot 而变成绘图能力'
keywords: 'data、provider、sort、summarize、select、annotate'
---

# ADR-002：收敛 data 内置 provider 边界

- 状态：Partially Superseded
- 决策日期：2026-07-06
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md)、[ADR-001：从 plot 迁出通用数据层](./001-plot-data-migration.md)、[plot ADR-102](../../../plot/v0/v0.1/102-plot-transform-registration.md)
- 后续决策：[data v0.2/001](../v0.2/001-shared-transforms.md)、[data v0.2/002](../v0.2/002-transform-execution.md)

## 保留的决策

Data 的边界按操作的输入和输出来定：如果只读写数据行、字段模型及来源，就不因首个调用方是 Plot 而变成绘图能力。坐标投影、图元选型和图例不属于 Data。

## 修订边界

旧清单曾把 bin、stack、density、smooth 等留给 Plot 注册；这些通用变换已归 Data，Plot 不再注入一份默认实现。

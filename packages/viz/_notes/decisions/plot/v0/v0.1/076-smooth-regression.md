---
description: 'smooth 从分组观测得到拟合结果，趋势线消费它生成的数据；绘制图元不参与模型选择'
keywords: 'Smooth、regression、transform、RegressionMark、smooth、groupBy、extent'
---

# ADR-076：Smooth regression transform

- 状态：Partially Superseded
- 决策日期：2026-06-27
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[ADR-077](./077-stat-geom-surface.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

smooth 从分组观测得到拟合结果，趋势线消费它生成的数据；绘制图元不参与模型选择。最早的实现只覆盖线性回归，这不是统计与几何分工的上限。

输入是同组有效的有限数值对；生成的是预测采样行而非图元，未指定采样区间时沿观测 x 范围取样。拟合和置信带是两个不同的统计契约。

## 修订边界

回归方法、模型选择和执行归 Data，Plot 只投影结果，不维护自己的拟合方法列表。

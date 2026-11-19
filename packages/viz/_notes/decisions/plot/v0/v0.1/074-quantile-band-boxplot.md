---
description: '分位带 reducer 产生组的统计量，离群值 selector 选择原始行并保留其身份'
keywords: 'Quantile-band、statistics、boxplot、composition、PointMark、BoxPlotMark、BoxPlot、minMax'
---

# ADR-074：Quantile-band statistics + boxplot composition

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[ADR-077](./077-stat-geom-surface.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

分位带 reducer 产生组的统计量，离群值 selector 选择原始行并保留其身份。箱体、中位数和离群点可由图元组合绘制，统计操作不拥有箱线图布局。

分位带以可配置的上下分位数、中心和 spread 描述箱体；须区分实际观测的 whisker 与判定离群点的 fence。按系数确定范围时，历史默认系数为 1.5。

## 修订边界

统计契约归 Data；旧示例里的 ReferenceMark 不是现行入口，线段与点可用基础 Path 和 Point 表达。

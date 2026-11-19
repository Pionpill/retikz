---
description: 'density 按组从数值样本生成密度估计的采样行'
keywords: 'Density、transform、PathMark、DensityMark、density、extent'
---

# ADR-075：Density transform

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[ADR-077](./077-stat-geom-surface.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

density 按组从数值样本生成密度估计的采样行。输出可由路径图元作为曲线或区域消费，而非把 KDE 算法嵌入 Path。

高斯 KDE 按组计算，可用 Silverman 规则或显式正带宽。采样范围与采样点数控制输出网格，生成行保留分组与生成字段，并通过组来源关联输入样本，不复制任意一行充当来源。

## 修订边界

密度操作与执行细节归 Data，Plot 不为该变换另设注册或绘制专用实现。

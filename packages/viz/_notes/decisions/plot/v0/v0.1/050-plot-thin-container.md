---
description: 'Plot 是可组合的底层图形块'
keywords: 'Plot、bare、scaleX、scaleY、buildPlotIR'
---

# ADR-050：退化 `<Plot>` 为薄容器

- 状态：Partially Superseded
- 决策日期：2026-06-13
- 关联：[alpha.10 roadmap](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot v0.2 roadmap](../v0.2/roadmap.md)、[plot-design](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.2/001](../v0.2/001-chart-layering.md)、[plot v0.2/003](../v0.2/003-plot-presentation-boundary.md)

## 保留的决策

Plot 是可组合的底层图形块。没有显式 guide 就不应悄悄补出可见轴、网格或图例；要显示装饰，作者应能从规格中看出其来源。

## 修订边界

高层默认装饰由独立 Chart 配方提供。外围标题或注释的布局不应通过恢复 Plot 自动注入轴来解决。

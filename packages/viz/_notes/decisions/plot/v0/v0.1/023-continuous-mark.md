---
description: '最初为折线和面积分别定义图元并实现极坐标投影'
keywords: 'mark、area、line、polar、closed、Path、frame.project、CoordinateFrame'
---

# ADR-023：连续 mark（area 新建 + line/area polar 投影 + closed 雷达）

- 状态：Superseded
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md)、[ADR-021](./021-coordinate-polar.md)、[plot-design.md §3.7 mark / §8.3 投影分层](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.1/060](060-mark-surface-convergence.md)、[plot v0.2/021](../v0.2/021-unified-mark-position-inputs.md)

## 决策沿革

最初为折线和面积分别定义图元并实现极坐标投影。现在由 Path 表达连续轨迹，closure 描述区域；是否闭合和如何插值无需再通过选择 line/area 两种宿主表达。

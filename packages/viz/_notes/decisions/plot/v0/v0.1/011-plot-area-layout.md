---
description: '曾按有无横纵轴估算四边 margin，再将数据投影到剩余矩形'
keywords: 'margin、convention、label、axis、plot、area、mark、measureText'
---

# ADR-011：绘图区布局（margin convention：整图 → 估算 label/axis 占位 → plot area；mark 改投影到 plot area）

- 状态：Superseded
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §8 lowering](../../../../architecture/plot-design.md)、[ADR-010 d3-scale](./010-d3-scale.md)、[ADR-006 lowerPlots](./006-plot-lowering.md)、[ADR-012 guide lowering](./012-guide-lowering.md)
- 后续决策：[plot v0.1/098](098-plot-decoration-layout.md)、[plot v0.2/003](../v0.2/003-plot-presentation-boundary.md)

## 决策沿革

曾按有无横纵轴估算四边 margin，再将数据投影到剩余矩形。固定边距估算已由内部装饰的测量与占位取代；整图标题、说明等外围内容不由 Plot 留白。

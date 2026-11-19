---
description: '第一版仅有 axis guide，以 dimension 和一个 grid 开关声明装饰'
keywords: 'guide、Axis、grid、Guide、union、coordinate、scope、dimension'
---

# ADR-009：guide IR（Axis + grid 子属性，Guide union 可扩展，绑 coordinate scope）

- 状态：Superseded
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.9 guide / §3.6 coordinate scope / §7 多坐标 / §14 anchor](../../../../architecture/plot-design.md)、[ADR-001 IRPlot](./001-plot-spec-root.md)、[ADR-004 coordinate](./004-plot-coordinate.md)、[ADR-012 guide lowering](./012-guide-lowering.md)
- 后续决策：[plot v0.1/090](090-axis-guide-style.md)、[plot v0.1/092](092-legend-palette-guide-theme.md)

## 决策沿革

第一版仅有 axis guide，以 dimension 和一个 grid 开关声明装饰。guide 独立于 mark 的原则保留；轴线、刻度、文字、标题、网格和图例以各自的部件契约表达。

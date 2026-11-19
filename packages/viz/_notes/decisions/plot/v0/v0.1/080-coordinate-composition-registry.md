---
description: '旧 composition.scopes 为局部坐标空间编号'
keywords: 'coordinate、composition、registry、guide、binding、coordinateScope、IRPlot'
---

# ADR-080：coordinate composition registry + guide binding

- 状态：Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[plot-design.md §7](../../../../architecture/plot-design.md)、[ADR-009 guide IR](./009-guide-ir.md)、[ADR-051 plot composable foundation](./051-plot-composable.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)

## 决策沿革

旧 composition.scopes 为局部坐标空间编号。坐标身份仍是必要事实，但现用 views、arrangements 与 resolve 区分视图、组织方式和共享规则。

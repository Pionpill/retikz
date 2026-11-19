---
description: '旧 facets 为分面字段的每个组合创建局部 scope 并路由数据'
keywords: 'facet、grid、data、routing、column、order、coordinate、IRPlot'
---

# ADR-081：facet grid data routing

- 状态：Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[ADR-080 coordinate composition registry](./080-coordinate-composition-registry.md)、[plot-design.md §7](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)

## 决策沿革

旧 facets 为分面字段的每个组合创建局部 scope 并路由数据。分面数据隔离仍有效，公开结构现由 facet arrangement 表达。

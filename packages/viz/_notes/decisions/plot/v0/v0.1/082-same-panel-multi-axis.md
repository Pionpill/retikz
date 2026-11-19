---
description: '旧 overlay 通过目标 scope 共用绘图区，但各自训练位置尺度'
keywords: 'same-panel、multi-axis、overlay、coordinateScope、placement、zIndex、coordinateView'
---

# ADR-082：same-panel multi-axis overlay

- 状态：Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[ADR-080 coordinate composition registry](./080-coordinate-composition-registry.md)、[ADR-081 facet grid data routing](./081-facet-grid-data-routing.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)

## 决策沿革

旧 overlay 通过目标 scope 共用绘图区，但各自训练位置尺度。多轴叠加仍可表达；图元与辅助线绑定 coordinate view，而非旧 scope 字段。

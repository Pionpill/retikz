---
description: '早期 interval 专指“类别带宽 × 基线到数值”的直角柱'
keywords: 'interval、bar、mark、baseline、value、bandwidth、rectangle、Node'
---

# ADR-015：interval(bar) mark（baseline→value 矩形，bandwidth 定柱宽，下沉 rectangle Node）

- 状态：Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot-design.md §3.7 mark / §4.5 mark 构造](../../../../architecture/plot-design.md)、[ADR-005 encoding/mark](./005-plot-encoding-mark.md)、[ADR-006 lowering](./006-plot-lowering.md)、[ADR-014 band scale](./014-band-scale.md)、[ADR-018 relation](./018-relation.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)

## 决策沿革

早期 interval 专指“类别带宽 × 基线到数值”的直角柱。现用通用区间边界与坐标投影表达柱和扇区；柱状语义不要求独立的矩形专用 mark。

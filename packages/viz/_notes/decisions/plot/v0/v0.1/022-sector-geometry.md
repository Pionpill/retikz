---
description: '曾将 SectorMark 作为独立入口生成饼图或环图'
keywords: 'sector、polar、interval、mark、CoordinateFrame、startField、endField'
---

# ADR-022：sector 几何（polar interval→径向柱/玫瑰 + sector mark 饼图/环图）

- 状态：Superseded
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md)、[ADR-021](./021-coordinate-polar.md)、[plot-design.md §3.3 transform / §3.7 mark / §8.3 投影分层](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)

## 决策沿革

曾将 SectorMark 作为独立入口生成饼图或环图。现在用 Interval 的角度和半径边界配合极坐标投影；累积角来自数据变换，不由独立 sector 图元保存。

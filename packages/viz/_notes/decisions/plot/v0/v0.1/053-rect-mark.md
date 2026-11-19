---
description: '原先用独立 RectMark 表达二维 band 交叉形成的热图格'
keywords: 'rect、mark、band、cell、heatmap、ADR-052、projectCell、sequential'
---

# ADR-053：rect mark——双维 band 正交 cell 的 heatmap 格，复用 ADR-052 `projectCell` 几何 + sequential color 取值

- 状态：Superseded
- 决策日期：2026-06-16
- 关联：[alpha.11 roadmap](./roadmap.md)、[ADR-052：cell-geometry-projection](./052-cell-geometry-projection.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.7 mark 表 / §8.3 mark 几何 × coordinate / §8.1 可连接性](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.1/060](060-mark-surface-convergence.md)、[plot v0.2/021](../v0.2/021-unified-mark-position-inputs.md)

## 决策沿革

原先用独立 RectMark 表达二维 band 交叉形成的热图格。现由 Interval 提供两维区间边界，坐标系负责投影；不需要矩形专用 mark。

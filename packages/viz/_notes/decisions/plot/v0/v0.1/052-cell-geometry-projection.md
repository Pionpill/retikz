---
description: '区间图元先构造角色空间中的 Cell，由 frame.projectCell 投影几何'
keywords: 'frame、projectCell、interval、sector、contour、boundaryPoint、CellGeometry'
---

# ADR-052：区间类几何投影契约——`frame.projectCell` 统一 interval / sector / 曲线轴下沉，闭式快路 ⊕ contour 兜底

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.11 roadmap](./roadmap.md)、[plot-design.md §8.3 mark 几何 × coordinate / §8.1 可连接性](../../../../architecture/plot-design.md)、[core ADR：contour shape](../../../../../../kernel/_notes/decisions/v0/v0.4/008-core-contour-shape.md)
- 参见：[plot v0.1/059](059-mark-abstraction-registry.md)

## 决策

区间图元先构造角色空间中的 Cell，由 frame.projectCell 投影几何。可精确表示为矩形或扇区时保留闭式结果，曲线边界需要采样时以轮廓表达；不应让每个 mark 重写同一坐标特例。缺少所需角色不是零宽 Cell，不能静默补值。

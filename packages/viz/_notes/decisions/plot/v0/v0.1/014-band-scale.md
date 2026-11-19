---
description: 'band 尺度将有序类别放入带宽内，point 尺度只给出位置'
keywords: 'band、point、scale、bandwidth、projector、PositionScale、scaleBand、scalePoint'
---

# ADR-014：band / point scale（分类域 + bandwidth；projector 抽象为 PositionScale）

- 状态：Partially Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.4 scale / §3.5 coordinate / §4.3 管线](../../../../architecture/plot-design.md)、[ADR-003 scale](./003-plot-scale.md)、[ADR-010 d3-scale](./010-d3-scale.md)、[ADR-015 bar mark](./015-interval-mark.md)、[ADR-018 relation](./018-relation.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

band 尺度将有序类别放入带宽内，point 尺度只给出位置。区间图元需要带宽时不能仅用类别中心猜出边界。

## 修订边界

这是映射与消费之间的约束，而非 Plot 专有 PositionScale 家族。通用算法归 Data，坐标消费其位置与带宽事实。

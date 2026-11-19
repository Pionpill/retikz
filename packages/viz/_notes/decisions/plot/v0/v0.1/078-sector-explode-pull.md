---
description: '扇区外移沿其中分角平移，距离以最终绘图单位计，零表示不移动'
keywords: 'Sector、pull、visual、offset、explode、IntervalMark、padAngle'
---

# ADR-078：Sector pull visual offset

- 状态：Partially Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[ADR-077](./077-stat-geom-surface.md)
- 后续决策：[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)

## 保留的决策

扇区外移沿其中分角平移，距离以最终绘图单位计，零表示不移动。它改变区间图元的视觉位置，不改写源数据，也不改变其它扇区的角度分配。

## 修订边界

固定 pull 属于属性，按行取值的 pull 属于编码；不能从旧顶层字段推断两者的输入形态。

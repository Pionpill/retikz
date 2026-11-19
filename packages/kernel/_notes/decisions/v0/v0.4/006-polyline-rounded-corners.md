---
description: '相邻直线的接缝可以倒圆角，半径按两侧可用线段长度夹紧；闭合路径也处理首尾接缝'
keywords: 'Path、cornerRadius'
---

# ADR-006：Path 任意折线的 cornerRadius

- 状态：Partially Superseded
- 决策日期：2026-06-15
- 关联：[ADR-007 smooth step](./007-smooth-curve-through-points.md)、[ADR-008 contour shape](./008-core-contour-shape.md)
- 后续决策：[kernel v0.5/083](../v0.5/083-path-position-modes.md)

## 保留的决策

相邻直线的接缝可以倒圆角，半径按两侧可用线段长度夹紧；闭合路径也处理首尾接缝。曲线接缝不因同一设置自动变成直线 fillet。

lineJoin 只改变描边接缝，不能代替会改变中心线、弧长和标签位置的几何倒角。

## 修订边界

步骤标签不再局限于倒角前的定位几何。可分别选择原始或圆角后几何，以及参数或弧长度量。

---
description: '局部与世界坐标的转换应复用同一组平移、旋转及其逆运算，否则不同形状的绘制和锚点会使用不同几何'
keywords: 'geometry、shape、localToWorld、worldToLocal、Anchor、RectAnchor、CenteredShape'
---

# ADR-010：geometry 4 shape 共享 `localToWorld` / `worldToLocal` + 死 `*Anchor` 类型清理

- 状态：Accepted
- 决策日期：2026-05-13
- 参见：[kernel v0.4/001](../v0.4/001-math-package-and-geometry-api.md)、[kernel v0.5/025](../v0.5/025-affine-matrix-primitives.md)

## 决策

局部与世界坐标的转换应复用同一组平移、旋转及其逆运算，否则不同形状的绘制和锚点会使用不同几何。形状共享同一锚点词汇时，无需另设含义相同的类型。通用计算归数学层，形状只决定自己的局部几何。

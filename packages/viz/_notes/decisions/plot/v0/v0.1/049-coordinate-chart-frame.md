---
description: '曲线轴需要在某个位置取得局部原点与切向，才能正确放置刻度和标签'
keywords: 'custom、coordinate、frameAlong、roles、CoordinateFrame、origin'
---

# ADR-049：坐标系局部标架与实验性 custom coordinate

- 状态：Partially Superseded
- 决策日期：2026-06-09
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md)、[plot-design §3.5 / §8.3](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.1/061](061-coordinate-registry.md)、[plot v0.1/105](105-ternary2d-removal.md)

## 保留的决策

曲线轴需要在某个位置取得局部原点与切向，才能正确放置刻度和标签。局部标架是几何需求，不取决于坐标是否内置。

## 修订边界

旧 custom operation 外壳与私有工厂注入已经退役，自定义坐标由统一 coordinate registry 承接。

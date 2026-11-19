---
description: '投影应由 coordinate frame 负责'
keywords: 'coordinate、polar2D、CoordinateFrame、PositionScale、bandwidth'
---

# ADR-021：coordinate 抽象通用化 + polar2D 投影

- 状态：Partially Superseded
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.5 coordinate / §3.6 encoding / §8.3 投影分层](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.2/009](../v0.2/009-polar-interpolation.md)

## 保留的决策

投影应由 coordinate frame 负责。极坐标把角度和半径映射到平面；图元不应为了同一组数据手写笛卡尔版和极坐标版。

## 修订边界

极坐标路径怎样连接采样点是单独的插值选择，不是投影本身；默认或显式覆盖遵循后续插值契约。

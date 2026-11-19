---
description: '内置 ternary2D 曾用三个角色投影成分数据，并提供三角轴'
keywords: 'ternary2D、guide、PositionEncodingSchema、GuideDimension、Ternary2DSchema'
---

# ADR-047：ternary2D 坐标系 + a/b/c 位置角色通道 + 三角轴 guide

- 状态：Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md)、[plot-design §3.5 CoordinateSystem / §3.6 Encoding](../../../../architecture/plot-design.md)、[ADR-045 frame 角色泛化](./045-coordinate-frame-roles.md)、[ADR-105](./105-ternary2d-removal.md)
- 后续决策：[plot v0.1/105](105-ternary2d-removal.md)

## 决策沿革

内置 ternary2D 曾用三个角色投影成分数据，并提供三角轴。该内置坐标及其专用 authoring 已移除；确有三元投影需求可通过 CoordinateDefinition 扩展，不恢复旧 a/b/c 专用入口。

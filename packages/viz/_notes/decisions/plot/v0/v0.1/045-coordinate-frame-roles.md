---
description: 'frame 以有序角色描述坐标维度，使投影和辅助线不局限于 x、y 两个键'
keywords: 'coordinate、frame、encoding、维度、位置通道'
---

# ADR-045：coordinate frame N 通道泛化 + 位置 encoding 角色化 + 每坐标系维度契约 + guide 维度校验

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.5 CoordinateSystem / §8.3 投影分层 / §3.6 Encoding](../../../../architecture/plot-design.md)、[ADR-021 coordinate 抽象](./021-coordinate-polar.md)、[ADR-046 cartesian1D](./046-cartesian1d.md)、[ADR-047 ternary2D](./047-ternary2d.md)
- 后续决策：[plot v0.1/105](105-ternary2d-removal.md)

## 保留的决策

frame 以有序角色描述坐标维度，使投影和辅助线不局限于 x、y 两个键。角色是否完整应由实际坐标契约判断。

## 修订边界

角色抽象仍适用；早期列举的 ternary2D 与 a/b/c 不是今天的内置坐标承诺。

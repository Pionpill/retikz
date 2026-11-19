---
description: 'ordinal 以离散域按顺序选择离散输出；颜色是典型消费方，但“枚举映射”与“绘制成什么颜色”是两层语义'
keywords: 'ordinal、color、scale、range、scaleOrdinal'
---

# ADR-017：ordinal·color scale + color 非位置通道（首个非位置通道，按系列着色）

- 状态：Partially Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot-design.md §3.4 scale / §3.6 encoding（位置 / 非位置）/ §4.2 通道分流](../../../../architecture/plot-design.md)、[ADR-005 encoding/mark](./005-plot-encoding-mark.md)、[ADR-014 band scale（inferCategoryDomain / CategoryValueSchema）](./014-band-scale.md)、[ADR-018 relation](./018-relation.md)、[ADR-020 DSL](./020-bindings-dsl.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

ordinal 以离散域按顺序选择离散输出；颜色是典型消费方，但“枚举映射”与“绘制成什么颜色”是两层语义。显式范围可固定类别与视觉值的对应。

## 修订边界

旧文将颜色作为首个非位置尺度，不构成尺度只能服务一种通道的注册限制。

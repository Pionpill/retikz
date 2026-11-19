---
description: 'log、pow、sqrt 表示不同的连续域映射'
keywords: 'scale、log、pow、sqrt、baseline、size、BuiltinPlotScale.Sqrt、trans'
---

# ADR-037：连续 scale 家族——log / pow / sqrt 连续 scale + L1 baseline 限制

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.4 Scale / §3.9 Guide](../../../../architecture/plot-design.md)、[ADR-038 通道→scale 抽象 + size](./038-channel-scale-resolver-size.md)、[ADR-039 color·series](./039-color-series.md)、[ADR-010 d3-scale](./010-d3-scale.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

log、pow、sqrt 表示不同的连续域映射。对数尺度有域的符号与零值限制；几何需要基线时不能假设任一连续映射都能有意义地计算零点。

## 修订边界

算法注册归 Data；基线是否适用、位置是否要求连续以及怎样布局由 Plot 消费方决定。

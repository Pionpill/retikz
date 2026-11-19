---
description: 'sequential 将数值位置映射为连续颜色，diverging 还需要语义中点'
keywords: 'sequential、diverging、color、scale、color.field、BuiltinPlotScale、ordinal'
---

# ADR-042：连续色阶——sequential / diverging color scale + 配色方案词表

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.4 Scale / §3.6 Encoding](../../../../architecture/plot-design.md)、[ADR-039 color·series](./039-color-series.md)、[ADR-043 离散化 scale](./043-discretization-scale.md)、[ADR-044 legend](./044-legend-guide.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

sequential 将数值位置映射为连续颜色，diverging 还需要语义中点。命名色板可序列化，作者也可显式指定颜色范围；离散类别与连续数值不是同一种颜色选型。

## 修订边界

Data 持有映射契约，Plot 解释颜色和图例；色带不是某个数学 scale 必须输出的图例形式。

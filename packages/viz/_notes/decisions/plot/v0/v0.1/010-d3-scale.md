---
description: '采用 d3-scale 是为了让域映射、刻度位置和格式化使用一致的数值及时间规则，而不是分别在轴和图元中手写近似公式'
keywords: 'd3-scale、scale、ticks、标度、刻度'
---

# ADR-010：采用 d3-scale 作 scale / 刻度 / 格式化基础（回溯 alpha.1 自写 linear）

- 状态：Partially Superseded
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.5 scale / §3.9 guide / §13（plot 可拉 d3-scale）](../../../../architecture/plot-design.md)、[ADR-006 lowerPlots](./006-plot-lowering.md)、[ADR-011 布局](./011-plot-area-layout.md)、[ADR-012 guide lowering](./012-guide-lowering.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

采用 d3-scale 是为了让域映射、刻度位置和格式化使用一致的数值及时间规则，而不是分别在轴和图元中手写近似公式。

## 修订边界

选用的数学实现不意味着 Plot 拥有公开的 ScaleDefinition；Data 提供映射，Plot 根据位置与视觉通道解释结果。

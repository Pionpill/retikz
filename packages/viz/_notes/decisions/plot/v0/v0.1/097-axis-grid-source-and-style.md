---
description: '网格是 axis 的一个部件，拥有自己的来源与样式'
keywords: 'Axis、grid、lineCap、grid.ticks、grid.density'
---

# ADR-097：Axis grid 来源与样式策略

- 状态：Partially Superseded
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.15 roadmap](./roadmap.md)、[plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)
- 后续决策：[plot v0.2/006](../v0.2/006-axis-grid-domain-endpoints.md)、[plot v0.2/007](../v0.2/007-axis-grid-theme-domain-endpoints.md)

## 保留的决策

网格是 axis 的一个部件，拥有自己的来源与样式。显式指定主、次网格的位置不应改变轴的 tick 展示策略，也不应训练新的数据域。

## 修订边界

默认按可见刻度取点仍有效；主网格还可显式包含 domain 首尾，主题默认只在该网格已启用时生效。

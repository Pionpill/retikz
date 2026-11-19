---
description: '同一条轴可以生成不同叠放层：网格在数据图元下方，轴线、刻度和文字可以在其上方'
keywords: 'guide、lowering、Axis、grid、ticks、plot、area、core'
---

# ADR-012：guide lowering（Axis（含 grid 子属性）+ ticks + plot area → core Path / Node(text)，绑 anchor id）

- 状态：Partially Superseded
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §8 lowering / §3.9 guide / §14 anchor](../../../../architecture/plot-design.md)、[ADR-009 guide IR](./009-guide-ir.md)、[ADR-010 d3-scale](./010-d3-scale.md)、[ADR-011 布局](./011-plot-area-layout.md)、[ADR-006 lowerPlots](./006-plot-lowering.md)
- 后续决策：[plot v0.1/097](097-axis-grid-source-and-style.md)、[plot v0.2/006](../v0.2/006-axis-grid-domain-endpoints.md)

## 保留的决策

同一条轴可以生成不同叠放层：网格在数据图元下方，轴线、刻度和文字可以在其上方。它们均降为 Core 图形，而非 renderer 特有的 axis。

## 修订边界

网格位置不再只能复制轴的可见 ticks；可选独立来源，还可显式包含 domain 首尾。改变网格来源不改变数据域。

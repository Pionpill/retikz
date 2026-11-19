---
description: '轴基线的跨度、位置、线端与端点箭头是几何配置，不与 tick 的来源或文字样式捆绑'
keywords: 'Axis、line、lineCap、line.arrow、line.extent、origin'
---

# ADR-093：Axis line 进阶几何

- 状态：Partially Superseded
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.15 roadmap](./roadmap.md)、[plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)
- 后续决策：[kernel v0.5/075](../../../../../../kernel/_notes/decisions/v0/v0.5/075-path-arrows-and-marks.md)

## 保留的决策

轴基线的跨度、位置、线端与端点箭头是几何配置，不与 tick 的来源或文字样式捆绑。轴线应降为 Core 路径，而非专门的 renderer primitive。

## 修订边界

旧方案曾把端点箭头表达成路径某个 pos 的 mark。现用 Path.arrow 的首尾声明；沿线 marks 不参与端点截短。

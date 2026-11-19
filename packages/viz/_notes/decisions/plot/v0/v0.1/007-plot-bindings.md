---
description: '最初的 React 和 Vanilla 包各自包装 Plot 规格、外部数据与绘图入口'
keywords: 'plot-react、Plot、plot-vanilla、renderPlot、renderToSvgString、PlotSchema.parse、width、height'
---

# ADR-007：框架绑定脚手架 + 薄包装（plot-react `<Plot>` / plot-vanilla `renderPlot`）

- 状态：Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap 拆分策略](./roadmap.md)、[plot-design.md §6 / §13.1](../../../../architecture/plot-design.md)、[ADR-006 lowerPlots](./006-plot-lowering.md)、[ADR-008 组合 DSL](./008-plot-react-dsl.md)
- 后续决策：[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 决策沿革

最初的 React 和 Vanilla 包各自包装 Plot 规格、外部数据与绘图入口。包仍分层，但共享的作者输入归一化取代了两套封装各自组装 IR 的方式。

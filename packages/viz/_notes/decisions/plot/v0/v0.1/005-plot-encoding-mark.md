---
description: '最初将固定的 point/line 与 x/y 编码绑定在一起'
keywords: 'Plot、Channel、Encoding、Point、Line、Mark、union、encoding'
---

# ADR-005：Plot 编码与图元（Channel / Encoding + Point / Line / Mark union）

- 状态：Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.7 mark / §3.8 order](../../../../architecture/plot-design.md)、[ADR-001 IRPlot](./001-plot-spec-root.md)、[ADR-002 data](./002-plot-data.md)、[ADR-004 coordinate](./004-plot-coordinate.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.1/060](060-mark-surface-convergence.md)、[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[plot v0.2/023](../v0.2/023-closed-mark-vocabulary.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 决策沿革

最初将固定的 point/line 与 x/y 编码绑定在一起。后来底层改按几何组织；当前固定属性与字段编码分组，基础图元仅有 Point、Path、Interval，折线由 Path 表达。

---
description: '曾在 Plot 内用固定 sort、stack 联合执行根变换'
keywords: 'transform、sort、stack、groupBy、expandPlot、order、rows'
---

# ADR-016：transform 阶段（sort / stack；groupBy 作为 stack 的分组参数）

- 状态：Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot-design.md §3.3 transform / §4.1 管线第 1 段 / §3.8 relation](../../../../architecture/plot-design.md)、[ADR-006 lowering](./006-plot-lowering.md)、[ADR-018 relation](./018-relation.md)、[ADR-015 bar mark](./015-interval-mark.md)
- 后续决策：[plot v0.1/062](062-transform-registry.md)、[plot v0.1/072](072-statistical-transform-algebra.md)、[plot v0.1/102](102-plot-transform-registration.md)、[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 决策沿革

曾在 Plot 内用固定 sort、stack 联合执行根变换。声明顺序和先变换后绘图仍有意义；通用操作、参数和执行实现归 Data，Plot 负责选择根或图元的作用域。

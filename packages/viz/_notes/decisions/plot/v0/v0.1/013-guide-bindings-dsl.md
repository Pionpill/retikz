---
description: '最初的绑定层会默认补轴，并用 bare 关闭可见装饰'
keywords: 'guide、Axis、grid、prop、bare、axis.grid、tickLabels'
---

# ADR-013：三包 guide 露出（`<Axis>` 子组件（含 `grid` prop）、默认自动出、`bare` 开关）

- 状态：Superseded
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md)、[plot v0.1 roadmap 拆分策略（三包 lockstep）](./roadmap.md)、[ADR-009 guide IR](./009-guide-ir.md)、[ADR-012 guide lowering](./012-guide-lowering.md)、[ADR-008 组合 DSL](./008-plot-react-dsl.md)、[ADR-007 薄包装](./007-plot-bindings.md)
- 后续决策：[plot v0.1/050](050-plot-thin-container.md)、[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 决策沿革

最初的绑定层会默认补轴，并用 bare 关闭可见装饰。现在 Plot 只渲染显式声明的 guide；默认轴属于上层配方，不需要一个开关撤销隐式行为。

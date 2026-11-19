---
description: '原先由 React 直接内省特定图元子组件并补齐尺度与坐标'
keywords: 'React、DSL、Plot、LineMark、PointMark、scale、coordinate、buildPlotIR'
---

# ADR-008：React 组合 DSL（`<Plot>` + `<LineMark>` / `<PointMark>`，自动推断 scale / coordinate）

- 状态：Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap 拆分策略](./roadmap.md)、[plot-design.md §5.2 Primitive API / §6.1](../../../../architecture/plot-design.md)、[ADR-007 薄包装](./007-plot-bindings.md)、[ADR-001~006](./001-plot-spec-root.md)
- 后续决策：[plot v0.1/060](060-mark-surface-convergence.md)、[plot v0.1/088](088-composition-api-structure.md)、[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 决策沿革

原先由 React 直接内省特定图元子组件并补齐尺度与坐标。声明式 JSX 保留，框架无关的归一化与默认语义不再由 React 独占，Vanilla 与 React 生成同一 Plot IR。

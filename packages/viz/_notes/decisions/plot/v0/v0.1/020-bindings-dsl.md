---
description: '旧绑定从 BarMark 或一组专属 props 猜测尺度、系列、堆叠和颜色'
keywords: 'DSL、BarMark、series、stack、color、props、scale、vanilla'
---

# ADR-020：三包 DSL 露出（&lt;BarMark&gt;、series/stack/color props、scale 类型选择；vanilla / docs 同步）

- 状态：Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot-design.md §5.2 Primitive API / §6 包结构](../../../../architecture/plot-design.md)、[ADR-007 bindings](./007-plot-bindings.md)、[ADR-008 react DSL](./008-plot-react-dsl.md)、[ADR-013 guide DSL](./013-guide-bindings-dsl.md)、[ADR-014](./014-band-scale.md)、[ADR-019](./019-time-scale.md)
- 后续决策：[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 决策沿革

旧绑定从 BarMark 或一组专属 props 猜测尺度、系列、堆叠和颜色。共享作者归一化与显式尺度/图元声明承接这些需求，不再以旧组件名选择一条特殊管线。

---
description: '曾由 Plot 自己定义 data.ref、模型与外部数据集的绑定'
keywords: 'Plot、DataRef、DataModel、model、data、field、a.b.c'
---

# ADR-002：Plot 数据引用与数据模型（DataRef / DataModel + 外部数据契约）

- 状态：Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3 核心概念 / §8 lowering](../../../../architecture/plot-design.md)、[ADR-001 IRPlot](./001-plot-spec-root.md)、[ADR-005 encoding+mark](./005-plot-encoding-mark.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾由 Plot 自己定义 data.ref、模型与外部数据集的绑定。声明引用与实际数据分离的原则保留；引用、字段模型和解析现在由 Data 提供，Plot 不再拥有一套同名协议。

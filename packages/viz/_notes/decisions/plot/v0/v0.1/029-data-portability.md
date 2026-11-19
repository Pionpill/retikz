---
description: '曾在 Plot 的绑定阶段维护逻辑字段、物理路径与值强转'
keywords: 'fieldMaps、DataFieldType、Date、data.model、lowerPlots'
---

# ADR-029：数据模型作为可移植契约——逻辑字段 + 绑定期 fieldMaps 映射 + 按 DataFieldType 值强制

- 状态：Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.1 Data / §8.2 数据绑定](../../../../architecture/plot-design.md)、[ADR-028 数据模型类型层](./028-data-model.md)、[ADR-002 DataRef/DataModel](./002-plot-data.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾在 Plot 的绑定阶段维护逻辑字段、物理路径与值强转。规格不依赖输入表的物理结构这一目的保留；字段映射、外部数据与归一化归 Data。

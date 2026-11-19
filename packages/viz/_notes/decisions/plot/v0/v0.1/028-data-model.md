---
description: '曾由 Plot 推断字段类型并校验绑定'
keywords: 'encoding、model、data.model、proportion、endField'
---

# ADR-028：数据模型类型层——字段类型集补全 + 缺省推断 + encoding 字段引用/类型校验

- 状态：Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.1 Data / §3.2 Dimension / §3.6 Encoding](../../../../architecture/plot-design.md)、[ADR-002 DataRef/DataModel](./002-plot-data.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)

## 决策沿革

曾由 Plot 推断字段类型并校验绑定。字段模型现由 Data 定义；Plot 消费数据视图与模型做通道选型，不维护另一套模型。

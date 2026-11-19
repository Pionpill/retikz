---
description: '为允许部分声明模型，旧 Plot 字段定义把字段名和测量类型分开：已知字段名不代表作者一定指定了类型'
keywords: 'FieldDef、type、model、name-only、resolveFieldTypes、FieldDef.type、IRDataFieldDefinition'
---

# ADR-032：`FieldDef.type` 改可选——部分声明 model，name-only 字段自动推断（解耦「字段存在」与「测量类型」）

- 状态：Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md)、[ADR-028 数据模型](./028-data-model.md)、[ADR-031 resolveField](./031-field-resolver.md)、[plot-design.md §3.1 数据模型](../../../../architecture/plot-design.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

为允许部分声明模型，旧 Plot 字段定义把字段名和测量类型分开：已知字段名不代表作者一定指定了类型。这个数据契约归 Data，不再由 Plot schema 定义。

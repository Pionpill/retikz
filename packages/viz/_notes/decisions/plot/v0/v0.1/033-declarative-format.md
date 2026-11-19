---
description: '曾用 Plot 字段 format 让同一份 JSON 规格声明如何解析值，而不是保存函数'
keywords: 'FieldDef、format、resolveField、temporal、continuous'
---

# ADR-033：声明式 `FieldDef.format`——可序列化的字段值解析词表，让 `resolveField` 退为纯逃生舱

- 状态：Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md)、[ADR-029 可移植契约](./029-data-portability.md)、[ADR-031 resolveField](./031-field-resolver.md)、[ADR-032 type 可选](./032-optional-field-type.md)、[plot-design.md §3.1 数据模型](../../../../architecture/plot-design.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾用 Plot 字段 format 让同一份 JSON 规格声明如何解析值，而不是保存函数。声明式格式及其 registry 已迁至 Data，Plot 消费解析结果。

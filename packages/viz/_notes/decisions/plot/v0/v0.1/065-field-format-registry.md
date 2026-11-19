---
description: '曾为声明式字段格式建立 Plot 层的 runtime definition'
keywords: 'FieldFormat、registry、coerce.ts、fieldType、resolveField、resolveLabel'
---

# ADR-065：FieldFormat registry

- 状态：Superseded
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾为声明式字段格式建立 Plot 层的 runtime definition。格式名可序列化、实现不进入 IR 的原则保留；格式定义、注册及解析已迁至 Data。

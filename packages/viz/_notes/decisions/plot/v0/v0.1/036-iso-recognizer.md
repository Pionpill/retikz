---
description: '曾扩大 Plot 的 temporal 推断，接受带明确时区、日期与时间以空格分隔的输入，而不把歧义格式一律当作时间'
keywords: 'temporal、ISO、datetime、SQL、coerceTimestamp、resolveField、isIsoDateString、format'
---

# ADR-036：扩宽 temporal 推断识别器——认空格分隔的带时区 ISO datetime（SQL 时间戳），归一化空格→T

- 状态：Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md)、[ADR-028 数据模型](./028-data-model.md)、[ADR-033 声明式 format](./033-declarative-format.md)
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾扩大 Plot 的 temporal 推断，接受带明确时区、日期与时间以空格分隔的输入，而不把歧义格式一律当作时间。时间识别与转换现属 Data。

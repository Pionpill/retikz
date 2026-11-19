---
description: '曾以 Plot 的 resolveField 回调覆盖字段类型或读取方式，让声明保持可移植'
keywords: 'resolveField、format、model、bigint、fieldMaps'
---

# ADR-031：可插拔字段解析 `resolveField`——运行时逃生舱按字段覆盖类型 + 自定义值解析，不进 IR

- 状态：Superseded
- 决策日期：2026-06-07
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)

## 决策沿革

曾以 Plot 的 resolveField 回调覆盖字段类型或读取方式，让声明保持可移植。字段解析和运行时 resolver 现在归 Data，不再通过 Plot 专有入口配置。

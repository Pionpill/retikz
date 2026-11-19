---
description: '最初在 Plot 数据模型中声明分类字段的顺序，以免把类别顺序误作独立的数据类型'
keywords: 'FieldDef、order、ordinal、def.domain、FieldDef.order、domain'
---

# ADR-034：`FieldDef.order`——分类轴顺序 + 有序性参数（不复活 ordinal 类型，有序由参数判定）

- 状态：Superseded
- 决策日期：2026-06-07
- 后续决策：[data v0.1/001](../../../data/v0/v0.1/001-plot-data-migration.md)、[data v0.2/003](../../../data/v0/v0.2/003-category-order.md)

## 决策沿革

最初在 Plot 数据模型中声明分类字段的顺序，以免把类别顺序误作独立的数据类型。顺序、内置规则与自定义规则的解析已归 Data，轴和图例消费排好的类别。

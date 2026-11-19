---
description: 'RelationMark 曾用 kind=ribbon 绘制关系流带；该宿主已移除'
keywords: 'Relation、ribbon、RelationMark、Path、path.route'
---

# ADR-073：Relation ribbon

- 状态：Superseded
- 决策日期：2026-06-25
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[kernel ADR-021](../../../../../../kernel/_notes/decisions/v0/v0.4/021-path-kind-registry.md)
- 后续决策：[plot v0.2/026](../v0.2/026-mark-target-endpoints.md)、[plot v0.2/027](../v0.2/027-path-step-construction.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 决策沿革

RelationMark 曾用 kind=ribbon 绘制关系流带；该宿主已移除。目标引用与步骤由 Path 承担，流带使用 Path 的 ribbon kind。数据关系来自 Data，端点图形可组合 Point，而非恢复 RelationMark。

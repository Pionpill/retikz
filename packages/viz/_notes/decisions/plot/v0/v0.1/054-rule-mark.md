---
description: '旧 RuleMark 用线或带表达参考值，ReferenceMark 曾是中间替代方案'
keywords: 'rule、mark、line、core、Path、band、ADR-052、projectCell'
---

# ADR-054：rule mark——数据驱动的常量位置参考标注，line 形态下沉 core `Path`、band 形态复用 ADR-052 `projectCell`；与 reference-line guide 划清「数据 vs scale 派生」分工

- 状态：Superseded
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.11 roadmap](./roadmap.md)、[plot-design.md §3.7 mark 表 rule / §3.9 guide / §3.10 layer](../../../../architecture/plot-design.md)、[ADR-052 区间几何投影](./052-cell-geometry-projection.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.1/060](060-mark-surface-convergence.md)、[plot v0.2/027](../v0.2/027-path-step-construction.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 决策沿革

旧 RuleMark 用线或带表达参考值，ReferenceMark 曾是中间替代方案。当前两者都不是公开图元：线按 Path 的端点或步骤构造，区域按实际区间几何组合。

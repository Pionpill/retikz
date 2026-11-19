---
description: '早期把系列、分组躲避和堆叠塞入图元的 relation 字段'
keywords: 'relation、series、group、dodge、stack、arrangement、y0Field、y1Field'
---

# ADR-018：relation —— series + group(dodge) + stack（多系列柱 / 折线几何）

- 状态：Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot-design.md §3.8 relation / §4.5 mark 构造（relation 是输入非后处理）](../../../../architecture/plot-design.md)、[ADR-015 bar mark](./015-interval-mark.md)、[ADR-016 transform](./016-transform.md)、[ADR-017 color](./017-color-scale.md)、[ADR-005 mark（line.order）](./005-plot-encoding-mark.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.1/071](071-mark-local-transform.md)、[plot v0.1/072](072-statistical-transform-algebra.md)、[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)

## 决策沿革

早期把系列、分组躲避和堆叠塞入图元的 relation 字段。按 series 组织观测的语义仍有效；统计派生走变换，图元用编码与几何边界表示结果，不保留旧 arrangement 表面。

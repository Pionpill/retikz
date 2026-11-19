---
description: '底层图元按几何语义而非图表成品分类'
keywords: 'mark、registry、point、interval、line、sector'
---

# ADR-059：抽象 mark 模型 + mark registry

- 状态：Partially Superseded
- 决策日期：2026-06-17
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[ADR-060 mark surface convergence](./060-mark-surface-convergence.md)、[plot-design.md §2 / §8.3](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[plot v0.2/021](../v0.2/021-unified-mark-position-inputs.md)、[plot v0.2/023](../v0.2/023-closed-mark-vocabulary.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 保留的决策

底层图元按几何语义而非图表成品分类。例如柱形、径向柱与热图格都可由区间边界结合坐标投影得到，不要求每种图表都有独立 mark。

## 修订边界

最初的五类图元及公开 Mark registry 已收敛。当前基础词汇是 point、path、interval；关系连线与流带由 Path 和目标引用表达。

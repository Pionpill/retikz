---
description: '视觉轮廓与连接面可以不同：同一节点可以画成一个形状，却让连线按另一个边界求交；单个端点的选择不应改变节点怎样绘制'
keywords: 'connection surface'
---

# ADR-014：连接面与视觉形状解耦

- 状态：Partially Superseded
- 决策日期：2026-06-06
- 关联：[ADR-009 shape 参数化](./009-shape-params-generalization.md)、[ADR-010 circle/ellipse](./010-circle-ellipse.md)
- 后续决策：[kernel v0.4/026](../v0.4/026-boundary-provider-contract.md)、[kernel v0.4/041](../v0.4/041-shape-aware-boundary-fit.md)

## 保留的决策

视觉轮廓与连接面可以不同：同一节点可以画成一个形状，却让连线按另一个边界求交；单个端点的选择不应改变节点怎样绘制。

## 修订边界

连接面不再只靠查找 shape 实现。Boundary 可以有自己的 provider，fit 决定其如何贴合绘制几何。

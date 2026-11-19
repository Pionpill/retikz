---
description: '标签随节点定位，不是另一个参加布局的同级节点；移动节点不应要求作者同步移动标签'
keywords: 'Node、label、Step.label、angleBoundaryOf、label.distance'
---

# ADR-003：Node `label` 边挂标签

- 状态：Partially Superseded
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../roadmap.md)
- 后续决策：[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)、[kernel v0.5/087](../v0.5/087-unified-label-text-block.md)

## 保留的决策

标签随节点定位，不是另一个参加布局的同级节点；移动节点不应要求作者同步移动标签。文字排版与标签挂在宿主哪一侧是不同决策。

## 修订边界

旧版简单文字、样式回退和绘制顺序不再定义标签文本协议。节点与路径标签共享 TextBlock，宿主分别决定附着与旋转。

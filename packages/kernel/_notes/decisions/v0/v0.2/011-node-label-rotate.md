---
description: '标签的附着位置与标签文字绕自身中心旋转分别计算'
keywords: 'Node、label、rotate、rotated-Node、labelCenter、inner、Node.label'
---

# ADR-011：Node label `rotate`（label 文本绕自身中心自旋 + 修 rotated-Node label 坐标空间）

- 状态：Partially Superseded
- 决策日期：2026-05-23
- 关联：[kernel v0 Roadmap](../roadmap.md)、[本 milestone ADR-010 文本 Node 包 g](./010-text-node-group-wrap.md)、[v0.1-ADR-003 node label](../v0.1/003-node-label.md)
- 后续决策：[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)、[kernel v0.5/087](../v0.5/087-unified-label-text-block.md)

## 保留的决策

标签的附着位置与标签文字绕自身中心旋转分别计算。节点已有旋转时不能再把同一次变换施加到标签位置，否则方向和边界距离会失真。

文字可保持水平、沿径向、沿切向或指定角度。keepUpright 只在旋转后的文字倒置时翻转 180°，恰好垂直时不翻。

## 修订边界

这些几何约束仍属节点；旧标签的专用文字字段不再定义排版，其内容与路径标签共用文本块。

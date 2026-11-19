---
description: 节点的外间距同时用于边界锚点和布局占位，不放大视觉轮廓。
keywords: 'outerSep、TikZ、outer、sep、border、anchor、anchorOf、margin'
---

# ADR-029：`outerSep` 对齐 TikZ outer sep——外推所有 border anchor 并计入布局占位

- 状态：Accepted
- 决策日期：2026-06-11
- 关联：[v0.3-beta.1 roadmap](./roadmap.md) · [v0.3-ADR-014 连接面](./014-connection-surface.md)

## 决策

外间距非负、默认 0。自动连接端点、显式罗盘方向和数字角度都在外扩后的连接面上求交，同一节点不会因引用方式不同出现两条连接边界。

布局占位与 viewBox 计入视觉包围盒四周的外间距；借用另一种连接面只改变交点，不改变占位。中心、形状命名特征点、边上指定点和标签附着点仍取视觉形状；标签距离不重复叠加外间距。

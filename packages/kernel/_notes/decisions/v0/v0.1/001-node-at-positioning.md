---
description: '相对定位保存“相对于谁、往哪个方向、相距多少”，而不是在作者侧固化最终坐标'
keywords: 'Node、positioning、position、evaluatePosition、AtPosition'
---

# ADR-001：Node `at` 节点间相对定位

- 状态：Partially Superseded
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../roadmap.md)
- 后续决策：[kernel v0.5/001](../v0.5/001-node-anchor-position.md)

## 保留的决策

相对定位保存“相对于谁、往哪个方向、相距多少”，而不是在作者侧固化最终坐标。八方向中的对角向量归一化，令同一个距离在对角与正交方向上有相同的几何长度。

## 修订边界

早期列举的坐标、极坐标和相对位置不是封闭全集。节点还可以指定自身锚点；省略位置表示当前局部原点，不是自动排列。

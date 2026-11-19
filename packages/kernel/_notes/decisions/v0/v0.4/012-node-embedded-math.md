---
description: '公式可以作为节点内容参与测量，边框仍由节点形状产生，不能为了“带框公式”让 TeX 接管节点外观'
keywords: 'math、公式、Node、embedded math'
---

# ADR-012：带框公式

- 状态：Partially Superseded
- 决策日期：2026-06-16
- 关联：[ADR-011 tex](./011-tex-package-and-node-math.md)、[ADR-013 行内混排](./013-inline-math-runs.md)
- 后续决策：[kernel v0.4/013](013-inline-math-runs.md)、[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)

## 保留的决策

公式可以作为节点内容参与测量，边框仍由节点形状产生，不能为了“带框公式”让 TeX 接管节点外观。

## 修订边界

公式不再需要一条仅供 Node 使用的内容通路；它是文本行内的一种片段，排版与其它片段协作。

---
description: '文本自动折行的阈值是上限而非强制段落宽度：短文本不因给出上限而被撑满，长文本由共用测量和换行规则决定行数'
keywords: 'maxTextWidth、TextMeasurer、IRLine、align'
---

# ADR-020：maxTextWidth 自动换行（折行阈值 + 短文本收缩）

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[ADR-019](./019-paint-basics.md)、[ADR-021](./021-pin.md)
- 后续决策：[kernel v0.5/038](../v0.5/038-node-fixed-width.md)、[kernel v0.5/081](../v0.5/081-shared-text-capabilities.md)

## 保留的决策

文本自动折行的阈值是上限而非强制段落宽度：短文本不因给出上限而被撑满，长文本由共用测量和换行规则决定行数。

## 修订边界

固定节点外框宽度是独立布局能力；正文与标签的硬换行、自动折行和行高以共享文本契约为准。

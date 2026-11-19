---
description: '对一组子元素逐个施加效果，与先把整组栅格化再施加效果会得到不同像素'
keywords: 'Group、Scope、shadow、blendMode、组效果'
---

# ADR-030：Group / Scope 级视觉效果延期边界

- 状态：Partially Superseded
- 决策日期：2026-07-03
- 关联：[ADR-028](./028-drawing-complete-alpha4-closeout.md)
- 后续决策：[kernel v0.5/066](../v0.5/066-complete-visual-style.md)、[kernel v0.5/068](../v0.5/068-remove-scope-frame.md)

## 保留的决策

对一组子元素逐个施加效果，与先把整组栅格化再施加效果会得到不同像素。前者可由后代默认值表达；后者涉及离屏缓冲、边界与混合隔离，不能用同一选项暗示支持。

## 修订边界

旧 nodeDefault/pathDefault 字段与后来移除的 Scope 外框都不是整组效果 API。

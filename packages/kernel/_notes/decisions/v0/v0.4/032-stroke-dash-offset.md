---
description: 'dashOffset 表示虚线序列的起始相位，可以是有限负数；它不改变段长序列'
keywords: 'Stroke、dash、offset、dashPattern、lineDashOffset、dashOffset、dashed'
---

# ADR-032: Stroke dash offset

- 状态：Partially Superseded
- 决策日期：2026-07-04
- 关联：[path dash pattern naming](../v0.1/023-path-dash-pattern-naming.md)
- 后续决策：[kernel v0.5/066](../v0.5/066-complete-visual-style.md)

## 保留的决策

dashOffset 表示虚线序列的起始相位，可以是有限负数；它不改变段长序列。SVG 与 Canvas 应得到相同相位，不以 CSS 或 Canvas 属性名作为作者词汇。

## 修订边界

该字段属于统一描边样式，其适用范围不受当时第一批图元清单限制。

---
description: '虚线以数值段长序列 dashPattern 表达，不把 SVG 的 stroke-dasharray 字符串或 Canvas API 写进绘图 IR'
keywords: 'Path、dash、pattern、TikZ、strokeDasharray、lineCap、lineJoin、dashPattern'
---

# ADR-023: Path dash pattern 命名对齐 TikZ

- 状态：Partially Superseded
- 决策日期：2026-05-14
- 关联：[TikZ actions](https://tikz.dev/tikz-actions)
- 后续决策：[kernel v0.4/032](../v0.4/032-stroke-dash-offset.md)、[kernel v0.5/066](../v0.5/066-complete-visual-style.md)

## 保留的决策

虚线以数值段长序列 dashPattern 表达，不把 SVG 的 stroke-dasharray 字符串或 Canvas API 写进绘图 IR。后端转换表示，但不得改变段长顺序。

## 修订边界

后续将该词汇归入描边契约，并以 dashOffset 表达相位；早期各层同名扁平字段不是现行 Source 的完整结构。

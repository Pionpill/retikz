---
description: '绘图区内部的轴、图例和分面/轨道 header 会占用空间，应通过统一测量和放置协调，而不是每个 guide 另加 magic margin'
keywords: 'Plot、decoration、placement、labels、GeometryLabelPosition、reserveSpace、layout.autoPadding'
---

# ADR-098：Plot decoration 空间布局与 placement 策略

- 状态：Partially Superseded
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.15 roadmap](./roadmap.md)、[plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)
- 后续决策：[plot v0.2/003](../v0.2/003-plot-presentation-boundary.md)

## 保留的决策

绘图区内部的轴、图例和分面/轨道 header 会占用空间，应通过统一测量和放置协调，而不是每个 guide 另加 magic margin。

## 修订边界

早期把整图标题、副标题、脚注与来源也纳入 Plot 根布局。外围 presentation 及其占位已移出 Plot；内部 guide 布局并未因此取消。

---
description: '最初以独立 RibbonMark 将两端位置与宽度绘成流带，后来短暂由 RelationMark.ribbon 承接'
keywords: 'ribbon、mark、Path、primitive、sankey、transform、endWidth、NodeTarget'
---

# ADR-056：ribbon mark——「源/目标/宽度 → 可填充曲带 Path」的几何 primitive，端点为字段对（经坐标系投影）；sankey 布局明确划出范围

- 状态：Superseded
- 决策日期：2026-06-16
- 后续决策：[plot v0.1/069](069-relation-mark-anchor.md)、[plot v0.1/073](073-relation-ribbon.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 决策沿革

最初以独立 RibbonMark 将两端位置与宽度绘成流带，后来短暂由 RelationMark.ribbon 承接。当前终点是 PathMark 的 ribbon kind；流量分配和 Sankey 布局不属于带状路径几何。

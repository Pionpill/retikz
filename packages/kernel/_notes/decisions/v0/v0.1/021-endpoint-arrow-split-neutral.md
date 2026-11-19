---
description: '路径拆分的依据是首尾端点和路径方向，而不是 SVG marker'
keywords: 'endpoint、arrow、split、arrowStart、arrowEnd、splitSubPathsForEndpointArrows、splitSubPathsForMarkers'
---

# ADR-021: endpoint arrow split 命名中性化

- 状态：Partially Superseded
- 决策日期：2026-05-14
- 关联：[ADR-008 renderer-neutral core](./008-core-comments-renderer-neutral.md)
- 后续决策：[kernel v0.5/070](../v0.5/070-marker-scene-primitives.md)、[kernel v0.5/075](../v0.5/075-path-arrows-and-marks.md)

## 保留的决策

路径拆分的依据是首尾端点和路径方向，而不是 SVG marker。子路径顺序决定哪一端能接箭头；SVG、Canvas 应消费相同的端点语义。

## 修订边界

旧 helper 名称与输出字段只说明当时如何拆分。当前端点声明与沿线 marks 分开，后端不要求专属 marker 图元。

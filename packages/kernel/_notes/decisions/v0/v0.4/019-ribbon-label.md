---
description: '带上的标签应附着于产生几何的宿主，不另叠一个脱离来源与命中关系的文本节点'
keywords: 'Ribbon、host、label、Path.label、GeometryLabelSchema、position、side'
---

# ADR-019：Ribbon host label

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 关联：[ADR-021](./021-path-kind-registry.md)、[plot ADR-079](../../../../../viz/_notes/decisions/plot/v0/v0.1/079-mark-label-surface.md)
- 后续决策：[kernel v0.4/021](021-path-kind-registry.md)

## 保留的决策

带上的标签应附着于产生几何的宿主，不另叠一个脱离来源与命中关系的文本节点。路径定位与文字内容分别处理。

## 修订边界

Ribbon 纳入 Path kind 后，路径标签共用 Path.label；上层以 Path ribbon 送入，不再要求专门的 RelationMark。

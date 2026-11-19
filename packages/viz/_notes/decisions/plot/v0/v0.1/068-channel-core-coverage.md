---
description: '通道只覆盖宿主确实能消费的图形属性；不能仅因某个字段存在于 Core 就允许任意 mark 编码它'
keywords: 'channel、core、coverage、opacity、strokeWidth、fillOpacity、drawOpacity'
---

# ADR-068：channel core coverage 对账

- 状态：Partially Superseded
- 决策日期：2026-06-22
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md)、[ADR-066 channel registry](./066-channel-registry.md)、[ADR-067 custom visual channel](./067-custom-visual-channel.md)
- 后续决策：[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[plot v0.2/024](../v0.2/024-core-graphic-style.md)

## 保留的决策

通道只覆盖宿主确实能消费的图形属性；不能仅因某个字段存在于 Core 就允许任意 mark 编码它。改变数据拓扑或几何构造也不是普通样式通道。

## 修订边界

字段编码与固定属性分开，样式取值复用 Core；早期通道清单不再是现行完整白名单。

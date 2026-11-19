---
description: '内置与自定义节点形状共用 Definition 注册入口'
keywords: 'Shape、Registry、NodeShape、ShapeDefinition、shape、anchor、Rect、boundaryPoint'
---

# ADR-007：Shape Registry（NodeShape 开放为字符串 + ShapeDefinition 注入面 + 内置 4 shape 改造为注册项）

- 状态：Partially Superseded
- 决策日期：2026-05-21
- 关联：[kernel v0 Roadmap](../roadmap.md)、[ADR-002 nodeIndex/anchor 解析](./002-node-index-anchor-resolution.md)、[v0.1-ADR-010 geometry 共享 transform / 死 anchor 清理](../v0.1/010-geometry-shared-transform-dead-anchor-cleanup.md)、[v0.1-ADR-015 onWarn 收集器](../v0.1/015-compile-on-warn-collector.md)
- 后续决策：[kernel v0.5/076](../v0.5/076-shape-circumscribed-geometry.md)

## 保留的决策

内置与自定义节点形状共用 Definition 注册入口。形状负责轮廓、连接锚点和绘制几何，不能把文字测量与容器布局复制进每个 provider。

## 修订边界

早期 circumscribe 返回值不能描述偏心内容。现行外接几何同时给出半轴和可选中心偏移，Core 统一消费。

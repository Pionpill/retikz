---
description: '形状引用应保存可序列化的注册身份和参数，而不把函数或实例放进 IR；简单形状可省略参数'
keywords: 'shape、type、params'
---

# ADR-009：shape 参数化泛化——注册的 type + params

- 状态：Partially Superseded
- 决策日期：2026-06-06
- 关联：[ADR-010 circle/ellipse](./010-circle-ellipse.md)、[ADR-011 arc/sector](./011-arc-sector.md)、[ADR-012 rectangle/polygon](./012-rectangle-polygon.md)、[ADR-013 star](./013-star.md)、[ADR-014 connection surface](./014-connection-surface.md)
- 后续决策：[kernel v0.5/076](../v0.5/076-shape-circumscribed-geometry.md)

## 保留的决策

形状引用应保存可序列化的注册身份和参数，而不把函数或实例放进 IR；简单形状可省略参数。参数如何决定轮廓和锚点属于该形状。

发射图形、锚点和边界求交使用同一局部坐标系。外接框若不能容纳实际轮廓，绘制、裁切与连线就会相互矛盾。

## 修订边界

参数化形状仍然成立；旧外接尺寸回调已由同时计算半轴与中心偏移的几何契约取代。

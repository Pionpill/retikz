---
description: '圆可视为等半轴椭圆的预设'
keywords: 'circle、ellipse、equal、preset'
---

# ADR-010：circle 作为 ellipse 的 equal preset

- 状态：Partially Superseded
- 决策日期：2026-06-06
- 关联：[ADR-009 shape 参数化机制](./009-shape-params-generalization.md)
- 后续决策：[kernel v0.5/076](../v0.5/076-shape-circumscribed-geometry.md)

## 保留的决策

圆可视为等半轴椭圆的预设。包含相同内容时，等半轴约束不能简单裁掉矩形内容的角；绘制轮廓和连接锚点使用同一几何。

在最初的矩形内容模型中，equal 的两个半轴均取内容半宽与半高的斜边长度；proportional 各自将半宽、半高乘以 √2。等半轴不是简单取两边中较大的一边。

## 修订边界

本篇确定的是圆与椭圆的几何关系，而非旧 circumscribe 方法签名。外接几何由 Shape Definition 统一返回。

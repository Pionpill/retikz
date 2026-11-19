---
description: '箭头不能只是后端贴在线段末端的一张标记：线身停在哪里取决于箭头的实际轮廓。'
keywords: 'IRPathArrow、ArrowDefinition、路径端点与箭头几何、path、endpoint、arrow、split、arrowStart、arrowEnd、splitSubPathsForEndpointArrows、splitSubPathsForMarkers、shrink'
---

# 路径端点与箭头几何

## 设计目的

箭头不能只是后端贴在线段末端的一张标记：线身停在哪里取决于箭头的实际轮廓。让端点方向、接触点和裁切共用几何，才能避免缩放时出现缝隙，或线身穿过空心箭头。

## 决策

`IRPathArrow` 保存路径的箭头配置；`ArrowDefinition` 提供箭头形状的几何定义。

路径拆分的依据是首尾端点和路径方向，而不是 SVG marker。子路径顺序决定哪一端能接箭头；SVG、Canvas 应消费相同的端点语义。

箭头与线身的接触位置和可见几何必须来自同一形状定义；如果线身裁切与箭头绘制各算一次尺寸，缩放后会出现缝隙或过度重叠。

内置和第三方箭头通过同一 Definition 表达几何，编译器据此确定箭头与宿主路径的接触，后端只执行生成的图元。

openStealth 是空心箭头，区别于用背景色填充的实心箭头。在不透明或透明背景上，线身与箭头的接触都应一致；SVG、Canvas 不应各猜一种遮盖方式。

## 历史记录

- Kernel v0.1：由路径方向和箭头接触位置决定端点几何（ADR-021、ADR-022）。
- Kernel v0.2：统一内置与扩展箭头定义（ADR-023）。
- Kernel v0.3：明确空心箭头和线身裁切（ADR-023）。

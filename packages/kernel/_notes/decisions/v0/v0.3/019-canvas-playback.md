---
description: 'Canvas 后端按给定时间绘制一帧，不在绘制函数中启动 rAF 或保存共享播放状态'
keywords: 'Canvas'
---

# ADR-019：Canvas 动画播放与共享插值引擎

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[ADR-017 动画 IR](./017-timeline-animation-ir.md)、[ADR-018 SVG 播放](./018-svg-playback.md)、[ADR-020 runtime 控制](./020-runtime-control.md)
- 后续决策：[kernel v0.5/074](../v0.5/074-animation-property-contract.md)

## 保留的决策

Canvas 后端按给定时间绘制一帧，不在绘制函数中启动 rAF 或保存共享播放状态。时钟与触发由宿主管理；画出的 base 不因后端不支持某个动画而消失。

## 修订边界

当时提供给自定义属性的插值/应用回调不再是公共契约。时间求值归 Render，并被各后端共用。

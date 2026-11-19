---
description: 'SVG 的 load 轨道可用内联 CSS 播放，让静态输出不依赖 JavaScript；visible、manual 与事件驱动的播放需要挂载后的宿主接线'
keywords: 'SVG、load、CSS、WAAPI'
---

# ADR-018：SVG 动画播放——load 用 CSS，交互用 WAAPI

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[ADR-017 动画 IR](./017-timeline-animation-ir.md)、[ADR-020 runtime 控制](./020-runtime-control.md)
- 后续决策：[kernel v0.5/074](../v0.5/074-animation-property-contract.md)

## 保留的决策

SVG 的 load 轨道可用内联 CSS 播放，让静态输出不依赖 JavaScript；visible、manual 与事件驱动的播放需要挂载后的宿主接线。没有播放器时仍可显示静止图。

## 修订边界

属性和缓动由统一轨道契约规定，SVG 映射不自行扩展词表或另定一套时间语义。

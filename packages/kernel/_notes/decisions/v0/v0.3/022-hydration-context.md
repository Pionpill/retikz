---
description: '水合事件提供后端中立的上下文，按用户 id 关联语义元素，不要求调用者从某个 DOM 节点猜出完整对象'
keywords: 'hydration、context、水合、事件上下文'
---

# ADR-022：hydration handler 的 renderer-neutral context

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[alpha.3 hydration](./008-hydration.md)、[ADR-017 动画 IR](./017-timeline-animation-ir.md)、[ADR-020 runtime 播放](./020-runtime-control.md)、[alpha.4 meta](./016-meta-provenance.md)
- 后续决策：[kernel v0.3/024](024-canvas-animation-trigger-bridge.md)

## 保留的决策

水合事件提供后端中立的上下文，按用户 id 关联语义元素，不要求调用者从某个 DOM 节点猜出完整对象。SVG 与 Canvas 可有不同的拾取实现。

## 修订边界

早期将 Canvas 的 per-id 动画列为未覆盖能力；触发桥现可单独管理命中元素的动画状态，不需要把整个 Scene 时钟一起重启。

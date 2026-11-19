---
description: '具名预设应当是返回可序列化轨道的纯工厂，而不是只在某个框架中才能执行的组件；作者可以直接组合结果或手写等价轨道'
keywords: 'preset、factory'
---

# ADR-021：具名动画 preset factory

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[ADR-017 动画 IR](./017-timeline-animation-ir.md)、[ADR-018 SVG](./018-svg-playback.md)、[ADR-019 Canvas](./019-canvas-playback.md)、[ADR-020 runtime](./020-runtime-control.md)
- 后续决策：[standard v0.1/031](../../../../../library/_notes/decisions/standard/v0/v0.1/031-animation-preset-migration.md)

## 保留的决策

具名预设应当是返回可序列化轨道的纯工厂，而不是只在某个框架中才能执行的组件；作者可以直接组合结果或手写等价轨道。

## 修订边界

跨领域可复用的预设由 Standard 提供；Kernel 定义轨道及其消费，不把配方清单变成底层词汇。

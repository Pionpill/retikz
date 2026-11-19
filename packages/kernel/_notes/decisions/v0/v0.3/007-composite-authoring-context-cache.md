---
description: '当时将 JSX 声明、展开上下文和展开结果缓存分别列为候选，目的是避免每个 adapter 自行编译领域组件'
keywords: 'Tier、JSX、authoring、expand、lowering、cache'
---

# ADR-007：Tier 2 JSX authoring、expand 上下文与 lowering cache

- 状态：Partially Superseded
- 决策日期：2026-06-02
- 关联：[ADR-006 Tier 2 支撑](./006-tier2-support.md)
- 后续决策：[kernel v0.5/029](../v0.5/029-vanilla-authoring-normalization.md)、[kernel v0.5/052](../v0.5/052-unified-composite-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

当时将 JSX 声明、展开上下文和展开结果缓存分别列为候选，目的是避免每个 adapter 自行编译领域组件。三者并非已经交付的一套 API。

## 修订边界

作者输入归共享归一化，统一 compile 上下文可承担子布局试算与重放；不再规划给 expand 增加参数。完整与增量驱动各自管理状态，不承诺 Core 的纯展开结果缓存。

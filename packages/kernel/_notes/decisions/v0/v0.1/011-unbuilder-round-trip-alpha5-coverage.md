---
description: '纯 Kernel IR 在 React 构建与反向转换之间应逐字段等价，不能只凭最终绘制相似就丢掉位置、标签或箭头的作者意图'
keywords: 'unbuilder、round-trip、arrowDetail、OffsetPosition、StepLabel.position'
---

# ADR-011：unbuilder round-trip 等价性

- 状态：Partially Superseded
- 决策日期：2026-05-13
- 关联：[ADR-006 arrowDetail](./006-path-arrow-detail.md)、[ADR-007 OffsetPosition](./007-position-offset.md)、[ADR-005 StepLabel position](./005-step-label-position-t.md)
- 后续决策：[kernel v0.5/052](../v0.5/052-unified-composite-compilation.md)

## 保留的决策

纯 Kernel IR 在 React 构建与反向转换之间应逐字段等价，不能只凭最终绘制相似就丢掉位置、标签或箭头的作者意图。

## 修订边界

这个保证不覆盖任意 Composite 或 Sugar 的原始写法；React 反向转换消费不含 Composite 的 Kernel IR，不负责逆推 Tier 2 组件。

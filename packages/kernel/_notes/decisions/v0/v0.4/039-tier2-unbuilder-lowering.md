---
description: '曾用 lowerIRToKernel 独立展开 Tier 2，再将结果反向转换为 Kernel JSX'
keywords: 'Tier、lowering、Kernel、JSX、convertIRToReactNode、IRScene、options.composites、lowerIRToKernel'
---

# ADR-039：Tier 2 IR lowering 后反向转换为 Kernel JSX

- 状态：Superseded
- 决策日期：2026-07-12
- 关联：[v0.3-alpha.2 Tier 2 支撑](../v0.3/006-tier2-support.md)
- 后续决策：[kernel v0.5/052](../v0.5/052-unified-composite-compilation.md)

## 决策沿革

曾用 lowerIRToKernel 独立展开 Tier 2，再将结果反向转换为 Kernel JSX。统一 Composite compile 后不再承诺能从任意领域组件恢复持久化 Kernel IR；反向转换仍适用于本来就不含 Composite 的 Kernel 树。

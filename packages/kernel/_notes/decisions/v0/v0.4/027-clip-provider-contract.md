---
description: 'Scope.clip 依 kind 选择统一的 ClipDefinition'
keywords: 'Clip、provider、contract、Scope.clip、ClipResource、Scope.clip.kind、ClipDefinition'
---

# ADR-027：Clip provider contract

- 状态：Partially Superseded
- 决策日期：2026-06-29
- 关联：[ADR-022](./022-provider-registry-contract.md)、[ADR-023](./023-provider-key-contract.md)、[ADR-024](./024-capability-provider-migration.md)、[ADR-025](./025-adapter-surface-and-docs.md)
- 后续决策：[kernel v0.5/031](../v0.5/031-single-clip-definition.md)、[kernel v0.5/073](../v0.5/073-clip-params-envelope.md)

## 保留的决策

Scope.clip 依 kind 选择统一的 ClipDefinition。内置与自定义裁剪走同一注册和输出路径，renderer 只消费已经生成的 Scene 裁剪几何。

## 修订边界

持久化声明统一为必填的 kind 与对象 params；Definition 拥有 schema 与 lower，不再分成中途 resolve 和另一套 shape 注册。

---
description: 'adapter 只接入底层 Definition，不再为同一 provider 发明框架专用的注册语义'
keywords: 'Adapter、surface、and、provider、authoring、docs、shapes、arrows'
---

# ADR-025：Adapter surface and provider authoring docs

- 状态：Partially Superseded
- 决策日期：2026-06-28
- 关联：[ADR-022](./022-provider-registry-contract.md)、[ADR-023](./023-provider-key-contract.md)、[ADR-024](./024-capability-provider-migration.md)
- 后续决策：[kernel v0.2/024](../v0.2/024-path-generator-definition.md)、[kernel v0.5/043](../v0.5/043-layout-extensions.md)

## 保留的决策

adapter 只接入底层 Definition，不再为同一 provider 发明框架专用的注册语义。内置和自定义实现使用同一能力入口。

## 修订边界

旧 React 顶层 provider 清单已调整为宿主 extensions，移除的 pathGenerators 不再列为可选能力。

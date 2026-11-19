---
description: 'provider 以 Definition 集合注入，让内置与自定义项遵守同一注册、冲突和查找规则'
keywords: 'Capability、provider、migration、CompileOptions、resolveXxxRegistry、ReadonlyMap'
---

# ADR-024：Capability provider migration

- 状态：Partially Superseded
- 决策日期：2026-06-28
- 关联：[ADR-022](./022-provider-registry-contract.md)、[ADR-023](./023-provider-key-contract.md)、[ADR-025](./025-adapter-surface-and-docs.md)
- 后续决策：[kernel v0.2/024](../v0.2/024-path-generator-definition.md)、[kernel v0.5/043](../v0.5/043-layout-extensions.md)

## 保留的决策

provider 以 Definition 集合注入，让内置与自定义项遵守同一注册、冲突和查找规则。集合描述有哪些能力，不应用后写覆盖掩盖重名。

## 修订边界

旧迁移清单中的 pathGenerators 已退出；数组注入原则不意味着每种历史能力都继续存在。

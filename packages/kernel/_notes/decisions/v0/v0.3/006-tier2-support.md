---
description: 'Tier 2 组件保留可序列化的领域声明，由注册的 Composite Definition 消费；React、Vanilla 和 renderer 不各自实现一套领域降解'
keywords: 'Tier、lowering'
---

# ADR-006：Tier 2 领域节点与可注册 lowering 管线

- 状态：Partially Superseded
- 决策日期：2026-06-01
- 关联：[ADR-007 延后项](./007-composite-authoring-context-cache.md)
- 后续决策：[kernel v0.5/052](../v0.5/052-unified-composite-compilation.md)、[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)

## 保留的决策

Tier 2 组件保留可序列化的领域声明，由注册的 Composite Definition 消费；React、Vanilla 和 renderer 不各自实现一套领域降解。

## 修订边界

早期定义回调 expand 递归展开到固定点。现行 Definition 只有 compile 回调，Core 持有原子语义，Reconciler 持有遍历及输出事务。

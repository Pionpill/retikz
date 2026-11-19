---
description: '默认情况下，嵌套 Scope 不隐藏子项 id；显式 localNamespace 才让子项名字只在局部可见'
keywords: 'nodeIndex、anchor、scope、localNamespace、Scope.localNamespace、NameStack、pushFrame'
---

# ADR-002：nodeIndex / anchor 跨 scope 解析语义

- 状态：Partially Superseded
- 决策日期：2026-05-16
- 关联：[本 milestone ADR-001](./001-scope-ir-and-compile.md)、[本 milestone ADR-003](./003-scope-id-bounding-box.md)、[ADR-006 (arrow geometry)](../v0.1/006-path-arrow-detail.md)
- 后续决策：[kernel v0.5/049](../v0.5/049-scope-position-contract.md)、[kernel v0.5/057](../v0.5/057-scope-acyclic-geometry-references.md)、[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

默认情况下，嵌套 Scope 不隐藏子项 id；显式 localNamespace 才让子项名字只在局部可见。内部从最近作用域向外查找，局部同名可遮蔽外层。Scope 自身的 id 在父作用域登记，不因隐藏子项而丢失外部引用入口。

同一作用域内重复登记 id 应发出诊断，按后登记者解析；不同局部作用域中的遮蔽不算重复。

## 修订边界

早期用栈和两遍扫描解释名称解析；这些是实现策略，不是对完整和增量驱动的数据结构要求。作用域可见也不代表可以构造循环几何依赖。

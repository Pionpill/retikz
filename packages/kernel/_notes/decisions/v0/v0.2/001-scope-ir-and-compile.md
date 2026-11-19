---
description: 'Scope 是可嵌套的容器：子项共享局部坐标、变换与继承环境，容器整体仍占父容器中的一个声明位置'
keywords: 'Scope、compile、GroupPrim、IRScope、transforms、ChildSchema'
---

# ADR-001：`<Scope>` IR 容器 + compile 下沉到 GroupPrim

- 状态：Partially Superseded
- 决策日期：2026-05-16
- 关联：[v0 roadmap §v0.2 预备](../roadmap.md)、[v0.2 总计划](./roadmap.md)、[ADR-004 (Scene 结构化)](../v0.1/004-scene-primitive-structured.md)
- 后续决策：[kernel v0.5/049](../v0.5/049-scope-position-contract.md)、[kernel v0.5/057](../v0.5/057-scope-acyclic-geometry-references.md)、[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

Scope 是可嵌套的容器：子项共享局部坐标、变换与继承环境，容器整体仍占父容器中的一个声明位置。是否隔离名字与是否形成一个图形组是两件事。

## 修订边界

原来的两遍编译只是当时的执行方式；Scope 的最终放置及几何依赖约束不依赖特定遍历算法。

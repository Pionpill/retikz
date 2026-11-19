---
description: '同一层中，路径需要延后解析引用，不能因此从它声明的位置漂到最后绘制'
keywords: 'compile、transform-free、frame、scopeChain、primitives、indexOf、GroupPrim'
---

# ADR-008：compile 输出 IR 顺序回归（占位槽回填恢复 transform-free frame 的声明序）

- 状态：Partially Superseded
- 决策日期：2026-05-23
- 关联：[v0.2 总计划 §alpha.1 收尾遗留 / §alpha.4 设计预想](./roadmap.md)、[ADR-001 Scope IR/compile](./001-scope-ir-and-compile.md)、[ADR-002 nodeIndex/anchor 解析](./002-node-index-anchor-resolution.md)、[v0.1-ADR-004 Scene PathPrim/GroupPrim 结构化](../v0.1/004-scene-primitive-structured.md)
- 后续决策：[kernel v0.5/049](../v0.5/049-scope-position-contract.md)、[kernel v0.5/057](../v0.5/057-scope-acyclic-geometry-references.md)、[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

同一层中，路径需要延后解析引用，不能因此从它声明的位置漂到最后绘制。没有显式栈序覆盖时，应保持 IR 的兄弟声明顺序。

## 修订边界

给输出数组插占位符再回填是早期两遍编译的办法，不是当前驱动必须暴露或复刻的中间状态。

---
description: '带 id 的 Scope 以内容包络对外提供一个可定位的整体，无需把内部节点全部暴露给父作用域'
keywords: 'scope、synthetic、bounding-box、namespace、frame、scope.id、NodeLayout、boundingBox'
---

# ADR-003：`scope.id` 注册 synthetic bounding-box 进父 namespace frame

- 状态：Partially Superseded
- 决策日期：2026-05-16
- 关联：[本 milestone ADR-001](./001-scope-ir-and-compile.md)、[本 milestone ADR-002](./002-node-index-anchor-resolution.md)、[本 milestone ADR-004](./004-relative-position-in-scope.md)
- 后续决策：[kernel v0.5/049](../v0.5/049-scope-position-contract.md)、[kernel v0.5/057](../v0.5/057-scope-acyclic-geometry-references.md)、[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

带 id 的 Scope 以内容包络对外提供一个可定位的整体，无需把内部节点全部暴露给父作用域。局部名字隔离不隐藏 Scope 本身；空包络不应凭空增加可见面积。

## 修订边界

旧版在第一遍结束时登记矩形并非唯一合法算法。最终几何受容器放置和变换影响；后代不可反过来依赖祖先待定的包络。

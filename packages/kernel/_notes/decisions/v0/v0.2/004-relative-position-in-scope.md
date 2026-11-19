---
description: '相对坐标先在可见命名范围内找到参照，再在一致的坐标系中计算距离和方向'
keywords: 'scope、Polar、Offset、evaluatePosition、applyScopeTransform、inverseScopeTransform、distance'
---

# ADR-004：scope 下相对定位（Polar / At / Offset）语义

- 状态：Partially Superseded
- 决策日期：2026-05-16
- 关联：[本 milestone ADR-001](./001-scope-ir-and-compile.md)、[本 milestone ADR-002](./002-node-index-anchor-resolution.md)、[本 milestone ADR-003](./003-scope-id-bounding-box.md)、[ADR-001 (Node.position direction/of)](../v0.1/001-node-at-positioning.md)、[ADR-007 (OffsetPosition)](../v0.1/007-position-offset.md)
- 后续决策：[kernel v0.5/049](../v0.5/049-scope-position-contract.md)、[kernel v0.5/057](../v0.5/057-scope-acyclic-geometry-references.md)、[kernel v0.5/080](../v0.5/080-unified-reconciler-compilation.md)、[kernel v0.5/086](../v0.5/086-independent-compilation-drivers.md)

## 保留的决策

相对坐标先在可见命名范围内找到参照，再在一致的坐标系中计算距离和方向。嵌套变换不能重复施加于已经解析的点；局部命名空间只改变能引用谁，不改变长度单位。

跨 Scope 引用时先将参照点从全局坐标变换到当前 Scope 的局部坐标，在局部施加偏移，再映回全局。旋转容器中的“向右”因此沿局部轴，而不是屏幕轴。

## 修订边界

原有两遍扫描和全局索引不是强制实现；Scope 放置与内容包络的依赖须无环。

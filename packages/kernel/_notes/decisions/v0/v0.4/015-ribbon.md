---
description: '可变宽带由中心线与宽度，或显式上下边界形成闭合轮廓'
keywords: 'Ribbon、IRRibbon'
---

# ADR-015：Ribbon 可变宽度路径

- 状态：Partially Superseded
- 决策日期：2026-06-25
- 关联：[ADR-021](./021-path-kind-registry.md)
- 后续决策：[kernel v0.4/021](021-path-kind-registry.md)

## 保留的决策

可变宽带由中心线与宽度，或显式上下边界形成闭合轮廓。Core 负责几何，renderer 执行普通 path；流量分配、排序和 Sankey 布局不属 Core。

## 修订边界

独立 IRRibbon 已收敛为 Path 的 ribbon kind，不形成第二种 path-like 宿主。

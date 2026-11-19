---
description: '容器可以向后代提供稀疏的默认样式'
keywords: 'Scope、resetStyle、color、样式继承、级联'
---

# ADR-005：Scope 样式继承（扁平 every-X 默认 + 主色 color + resetStyle 屏障）

- 状态：Partially Superseded
- 决策日期：2026-05-21
- 关联：[v0 roadmap §v0.2](../roadmap.md)、[kernel v0.2 Roadmap](./roadmap.md)、[ADR-001 Scope 容器](./001-scope-ir-and-compile.md)、[ADR-002 inside-out lookup](./002-node-index-anchor-resolution.md)
- 后续决策：[kernel v0.5/067](../v0.5/067-host-owned-defaults.md)、[kernel v0.5/071](../v0.5/071-macro-visual-property-resolution.md)

## 保留的决策

容器可以向后代提供稀疏的默认样式。局部显式值优先于继承值；隔离默认样式不应同时切断坐标、变换或名称查找。

## 修订边界

早期 nodeDefault、pathDefault 等字段清单不再是公开结构。默认值按宿主组织，具体绘制通道与主色回退独立继承。

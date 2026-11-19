---
description: 'Scope 的裁剪在局部坐标中解释，作用于其子树；图元引用后端中立的裁剪资源，SVG 或 Canvas 各自执行，不以 CSS 或 DOM 作为设计输入'
keywords: 'clip、裁剪、ClipResource、clipRef'
---

# ADR-028：clip 裁切（renderer-agnostic ClipResource + clipRef，复用 alpha.7 资源表）

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[ADR-019 Paint](./019-paint-basics.md)、[alpha.1 Scope](./)、[ADR-027](./027-partway-absolute-target.md)、[ADR-029](./029-viewbox-override.md)
- 后续决策：[kernel v0.5/085](../v0.5/085-scene-resources.md)

## 保留的决策

Scope 的裁剪在局部坐标中解释，作用于其子树；图元引用后端中立的裁剪资源，SVG 或 Canvas 各自执行，不以 CSS 或 DOM 作为设计输入。

## 修订边界

旧混合资源表已由分类资源容器替代；裁剪资源与填充资源不能共用未分类的数组位置。

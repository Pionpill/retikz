---
description: 'Layout 能为根下的图形提供与 Scope 一致的样式环境，避免作者仅为统一样式而额外包装一层容器'
keywords: 'Layout、Scope、IRScope、stroke、tikzpicture、LayoutProps'
---

# ADR-030：`<Layout>` 顶层支持 Scope 级联样式（隐式根 Scope）

- 状态：Partially Superseded
- 决策日期：2026-05-31
- 关联：[v0 roadmap](../roadmap.md)
- 后续决策：[kernel v0.5/067](../v0.5/067-host-owned-defaults.md)、[kernel v0.5/071](../v0.5/071-macro-visual-property-resolution.md)

## 保留的决策

Layout 能为根下的图形提供与 Scope 一致的样式环境，避免作者仅为统一样式而额外包装一层容器。

## 修订边界

历史实现合成一个根 Scope，并使用当时的平铺字段。长期契约是宿主默认值与继承结果等价，而非必须生成该中间节点。

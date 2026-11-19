---
description: 'stroke 与 ribbon 共享路径身份、来源、外观与标签语义，不能为了两种几何重复声明图元公共属性'
keywords: 'Path、Ribbon、shared、contract、DrawableStyleSchema、DrawableMetaSchema、Path.ribbon、Path.label'
---

# ADR-020：Path / Ribbon shared contract

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 关联：[ADR-021](./021-path-kind-registry.md)
- 后续决策：[kernel v0.4/021](021-path-kind-registry.md)

## 保留的决策

stroke 与 ribbon 共享路径身份、来源、外观与标签语义，不能为了两种几何重复声明图元公共属性。宽度 profile、两侧边界和端盖则只对 ribbon 有意义。

## 修订边界

公开宿主统一为 Path，具体 kind 决定可用几何字段；不维持两套平行的路径实体。

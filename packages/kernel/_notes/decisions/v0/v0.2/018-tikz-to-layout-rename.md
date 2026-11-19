---
description: '顶层容器称为 Layout，强调它接收并布局一棵图形树，而不是另一种绘图语言'
keywords: 'TikZ、Layout、deprecated、alias、system、prompt、TikZ.tsx、Layout.tsx'
---

# ADR-018：`<TikZ>` → `<Layout>` 顶层容器命名整理（deprecated alias + 文档 / 白名单 / system prompt 同步）

- 状态：Partially Superseded
- 决策日期：2026-05-23
- 关联：[v0.1-ADR-020 `<TikZ>` 组件化](../v0.1/020-tikz-to-tikz-component.md)、[ADR-016](./016-structured-target-anchor.md)
- 后续决策：[kernel v0.4/038](../v0.4/038-react-public-surface.md)

## 保留的决策

顶层容器称为 Layout，强调它接收并布局一棵图形树，而不是另一种绘图语言。

## 修订边界

TikZ 曾作为迁移期间的 deprecated alias；它不是现行 React API 承诺的第二个容器入口。

---
description: 'ComponentPreview 优先生成读者可直接使用的 Vanilla 作者代码'
keywords: 'ComponentPreview、vanilla、stepsToWay、parseWay、way、fallback、bend、circlePath'
---

# ADR-026：ComponentPreview vanilla 代码视图补齐——`stepsToWay` 逆映射对齐 `parseWay` 正向语法（零漂移），way 表达不了的走 IR fallback

- 状态：Accepted
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md)

## 决策

ComponentPreview 优先生成读者可直接使用的 Vanilla 作者代码。只有当步骤可无损还原为 way，且正向解析能得到相同路径语义时才使用简写；其余步骤保留显式表示。预览源码不能为了简短而丢失圆弧、端点或闭合方式。

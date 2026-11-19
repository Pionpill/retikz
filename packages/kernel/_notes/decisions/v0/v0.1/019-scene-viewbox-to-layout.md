---
description: '已编译图形的布局边界不应以 SVG 属性命名'
keywords: 'Scene、ViewBox、Layout、viewBox、computeLayout'
---

# ADR-019：Scene `ViewBox` → `Layout` 抽象

- 状态：Partially Superseded
- 决策日期：2026-05-14
- 关联：[ADR-004 Scene primitive structured](./004-scene-primitive-structured.md)、[ADR-008 renderer-neutral core](./008-core-comments-renderer-neutral.md)
- 后续决策：[kernel v0.2/029](../v0.2/029-viewbox-override.md)

## 保留的决策

已编译图形的布局边界不应以 SVG 属性命名。布局矩形用 x、y、width、height 表示，后端自行转换为取景参数。

## 修订边界

这一区分不禁止在 Source IR 指定 viewBox：作者指定的是可见范围，不是改名后的编译布局结果。

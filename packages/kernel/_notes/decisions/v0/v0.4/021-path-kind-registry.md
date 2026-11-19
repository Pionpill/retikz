---
description: 'Path 是唯一的路径类宿主，默认 stroke，ribbon 是同一宿主上的几何 kind'
keywords: 'Path、kind、registry、ribbon、RibbonSchema、IRRibbon、DrawableStyleSchema'
---

# ADR-021：Path registry

- 状态：Partially Superseded
- 决策日期：2026-06-27
- 关联：[ADR-015](./015-ribbon.md)、[ADR-016](./016-ribbon-boundary-and-alignment.md)、[ADR-017](./017-ribbon-arc-cap.md)、[ADR-019](./019-ribbon-label.md)、[ADR-020](./020-path-ribbon-shared-contract.md)
- 后续决策：[kernel v0.4/033](033-builtin-path-generator-ribbon-profile.md)、[kernel v0.5/075](../v0.5/075-path-arrows-and-marks.md)

## 保留的决策

Path 是唯一的路径类宿主，默认 stroke，ribbon 是同一宿主上的几何 kind。内置与自定义 kind 共用 Definition；未知 kind 或重复注册不得静默回退。运行时函数不进入 JSON。

## 修订边界

整条 Path 的 kind 与单个旧 generator 步骤不是同一扩展点；移除后者不影响前者。首尾箭头与沿线标记也不由 kind 名称推断。

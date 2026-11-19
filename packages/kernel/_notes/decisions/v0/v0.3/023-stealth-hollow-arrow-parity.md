---
description: 'openStealth 是空心箭头，区别于用背景色填充的实心箭头'
keywords: 'openStealth、SVG、Canvas、marker、parity、open、stealth、openDiamond'
---

# ADR-023：`openStealth` 空心箭头——补齐默认箭头的实心/空心对称 + SVG/Canvas marker parity

- 状态：Partially Superseded
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md)、[v0.2-ADR-023 arrow 定义](../v0.2/023-arrow-definition.md)、[v0.1-ADR-006 arrow detail](../v0.1/006-path-arrow-detail.md)
- 后续决策：[kernel v0.5/070](../v0.5/070-marker-scene-primitives.md)、[kernel v0.5/075](../v0.5/075-path-arrows-and-marks.md)

## 保留的决策

openStealth 是空心箭头，区别于用背景色填充的实心箭头。在不透明或透明背景上，线身与箭头的接触都应一致；SVG、Canvas 不应各猜一种遮盖方式。

## 修订边界

当前箭头由 Definition 生成基础图元，而非专属 marker 类型；端点接触与沿线标记分开。

---
description: 'React 元素的 props 在进入已知组件边界时收窄一次，后续处理使用对应的类型，不逐字段强转'
keywords: 'builder、cast、parseTargetSugar、Children.forEach、unknown、child.props'
---

# ADR-014：`_builder.ts` `as` cast 收敛到边界、`parseTargetSugar` 参数窄化

- 状态：Partially Superseded
- 决策日期：2026-05-13
- 后续决策：[kernel v0.5/029](../v0.5/029-vanilla-authoring-normalization.md)

## 保留的决策

React 元素的 props 在进入已知组件边界时收窄一次，后续处理使用对应的类型，不逐字段强转。字段改名或类型变化应由 TypeScript 指出，不靠运行时探测兜底。

## 修订边界

历史方案曾要求每种 Kernel 组件维护专用 builder；框架无关的作者输入归 Vanilla 归一化，React 负责识别组件并传递类型化输入。

---
description: '混合模式描述图元如何与已经绘制的背景合成；正常模式与未显式指定自定义混合效果应能区分'
keywords: 'Scene、blend、mode'
---

# ADR-010：Scene 图元级 blend mode

- 状态：Partially Superseded
- 决策日期：2026-06-16
- 关联：[ADR-009 drop shadow](./009-scene-drop-shadow.md)
- 后续决策：[kernel v0.5/066](../v0.5/066-complete-visual-style.md)、[kernel v0.5/068](../v0.5/068-remove-scope-frame.md)

## 保留的决策

混合模式描述图元如何与已经绘制的背景合成；省略或使用 normal 时不改变正常合成结果；不接受词汇表以外的任意后端模式。混合不是布局测量或命中测试规则。

## 修订边界

向后代继承 blendMode 不创建隔离组。Scope 的整组合成不是这项能力的延伸，不能用历史外框来模拟。

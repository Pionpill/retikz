---
description: '阴影属于可绘制图元，影响视觉范围而不创造新的可命中形状'
keywords: 'Scene、drop、shadow'
---

# ADR-009：Scene 图元级 drop shadow

- 状态：Partially Superseded
- 决策日期：2026-06-16
- 关联：[ADR-010 blend mode](./010-blend-mode.md)
- 后续决策：[kernel v0.5/066](../v0.5/066-complete-visual-style.md)、[kernel v0.5/068](../v0.5/068-remove-scope-frame.md)

## 保留的决策

阴影属于可绘制图元，影响视觉范围而不创造新的可命中形状。SVG 和 Canvas 应实现同一阴影语义，不让作者分别编写后端 filter。

预设提供一组默认值，显式字段逐项覆盖；颜色 alpha 与阴影透明度共同决定最终透明度。偏移与模糊使用绘图单位，不改变原图形的命中区域。

## 修订边界

通过 Scope 为后代提供默认阴影仍逐图元生效；这不等于把整棵 Scope 离屏合成后投影，也不恢复 Scope 外框。

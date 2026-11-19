---
description: '轴的可见域、显示的刻度与刻度文字分别负责不同事情'
keywords: 'Axis、domain、padding、tick、domainPadding、tickLabels.format、sqrt、singleValueSpan'
---

# ADR-089：Axis domain padding 与 tick 策略

- 状态：Partially Superseded
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.15 roadmap](./roadmap.md)、[plot-design.md §3.4 Scale](../../../../architecture/plot-design.md#34-scale)、[plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)
- 后续决策：[plot v0.2/008](../v0.2/008-domain-padding-units.md)、[plot v0.2/012](../v0.2/012-mark-aware-domain-padding.md)、[plot v0.2/016](../v0.2/016-point-mark-auto-padding.md)

## 保留的决策

轴的可见域、显示的刻度与刻度文字分别负责不同事情。扩展数据域以留白不等于增减 tick，也不应擅自改写作者给出的明确 padding。

单值域需先形成有效跨度，再按尺度语义处理两端留白。ticks.count 是提示，ticks.values 是显式刻度位置；格式化文字不会改变这些位置。

## 修订边界

早期未声明一概按零留白不足以解释图元感知的自动留白。Point 默认策略和显式 domainPadding 的优先关系由后继决策定义。

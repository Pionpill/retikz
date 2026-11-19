---
description: '时间域以可序列化的时间值表达；按 UTC 产生刻度和格式，避免同一张图因宿主时区而得到不同边界'
keywords: 'time、scale、scaleUtc、UTC、domain、epoch、Date、scaleTime'
---

# ADR-019：time scale（scaleUtc 刻度 / 格式 + 时间轴；UTC 语义，domain 用 epoch ms 进 IR）

- 状态：Partially Superseded
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md)、[plot-design.md §3.4 scale（time）/ §3.9 guide](../../../../architecture/plot-design.md)、[ADR-010 d3-scale](./010-d3-scale.md)、[ADR-014 PositionScale](./014-band-scale.md)、[ADR-020 DSL](./020-bindings-dsl.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

时间域以可序列化的时间值表达；按 UTC 产生刻度和格式，避免同一张图因宿主时区而得到不同边界。时间位置需要真实的日历间隔，不是给线性轴换一组字符串。

## 修订边界

时间映射归通用尺度层；Plot 的轴与图元只消费映射和刻度，不另立一套时间算法。

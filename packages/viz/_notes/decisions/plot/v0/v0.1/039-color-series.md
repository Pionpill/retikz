---
description: '旧方案限制 color 字段可用的尺度，并用 series 组织轨迹'
keywords: 'color、series、color.field、makeColorResolver'
---

# ADR-039：color 真通道收口 + series 一等化（B/C 规则）

- 状态：Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.3 Aesthetics / §3.7 Series](../../../../architecture/plot-design.md)、[ADR-038 通道→scale resolver](./038-channel-scale-resolver-size.md)、[ADR-027 datum locator](./027-datum-locator.md)
- 后续决策：[plot v0.1/042](042-continuous-color-scale.md)、[plot v0.1/066](066-channel-registry.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 决策沿革

旧方案限制 color 字段可用的尺度，并用 series 组织轨迹。颜色现在可消费连续与离散映射；系列身份与颜色独立，不因色值相同而自动合为同一轨迹。

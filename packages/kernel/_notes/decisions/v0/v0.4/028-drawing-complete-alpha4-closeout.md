---
description: '此次收口区分三件事：已存在的图元效果、尚未决定的交互 manifest、需要独立设计的整组合成'
keywords: 'Drawing Complete、视觉效果、完整性、审计'
---

# ADR-028：Drawing complete × alpha.4 视觉效果收口审计

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[ADR-029](./029-headless-interaction-boundary.md)、[ADR-030](./030-group-scope-effect-boundary.md)、[ADR-031](./031-scene-primitive-reference-closeout.md)
- 参见：[kernel v0.4/029](029-headless-interaction-boundary.md)、[kernel v0.4/030](030-group-scope-effect-boundary.md)、[kernel v0.4/031](031-scene-primitive-reference-closeout.md)

## 决策

此次收口区分三件事：已存在的图元效果、尚未决定的交互 manifest、需要独立设计的整组合成。功能完整性审计不能把后两者自动变成已支持的能力。图元的效果与命中、宿主交互状态分别归各自的契约。

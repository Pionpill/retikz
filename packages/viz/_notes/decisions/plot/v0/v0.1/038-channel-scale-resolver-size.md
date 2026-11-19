---
description: '早期在 Point 的 size 上抽取通用通道到尺度的解析函数'
keywords: 'PointMark、size、radius、scale、大小通道'
---

# ADR-038：通用「通道 → scale」抽象 + size 通道（仅 PointMark，radius scale）

- 状态：Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.3 Aesthetics / §3.4 Scale](../../../../architecture/plot-design.md)、[ADR-037 连续 scale 家族](./037-continuous-scale-family.md)、[ADR-039 color·series](./039-color-series.md)
- 后续决策：[plot v0.1/066](066-channel-registry.md)、[plot v0.1/068](068-channel-core-coverage.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 决策沿革

早期在 Point 的 size 上抽取通用通道到尺度的解析函数。按字段映射半径的能力保留；通道 registry 决定输出约束，共享尺度提供映射，不沿用旧私有 resolver 作接口。

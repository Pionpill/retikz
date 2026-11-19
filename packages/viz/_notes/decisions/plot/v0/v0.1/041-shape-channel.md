---
description: '将分类字段映射为 Point glyph 而非颜色，是 shape 通道的原始目的'
keywords: 'shape、PointMark、rectangle、circle、diamond'
---

# ADR-041：shape 通道（仅 PointMark）

- 状态：Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md)、[plot-design §3.3 Aesthetics](../../../../architecture/plot-design.md)、[ADR-038 通道→scale resolver](./038-channel-scale-resolver-size.md)、[ADR-039 color](./039-color-series.md)
- 后续决策：[plot v0.1/066](066-channel-registry.md)、[plot v0.1/068](068-channel-core-coverage.md)

## 决策沿革

将分类字段映射为 Point glyph 而非颜色，是 shape 通道的原始目的。这项能力保留，但已接入通用通道 registry，不另走一套 Point 私有解析路径。

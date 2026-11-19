---
description: '最初只有 Point 接受数据驱动 opacity'
keywords: 'PointMark、opacity、透明度'
---

# ADR-040：opacity 通道（仅 PointMark）

- 状态：Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md)、[plot-design §3.3 Aesthetics](../../../../architecture/plot-design.md)、[ADR-038 通道→scale resolver](./038-channel-scale-resolver-size.md)
- 后续决策：[plot v0.1/068](068-channel-core-coverage.md)、[plot v0.2/014](../v0.2/014-progressive-mark-properties.md)

## 决策沿革

最初只有 Point 接受数据驱动 opacity。透明度已成为可在适用宿主上消费的通道，整体、填充和描边透明度可以分别表达，不再使用 Point 专属的旧字段作为总契约。

---
description: '曾用独立 TextMark 给每行数据生成标签'
keywords: 'text、mark、datum、label、Node、field、Node.text'
---

# ADR-055：text mark——datum label 数据标签，优先挂宿主 Node.label、兜底新建带 `text` 的核心 Node

- 状态：Superseded
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.11 roadmap](./roadmap.md)、[plot-design.md §3.6 通道 / §3.7 mark 表（text=数据标签 label）](../../../../architecture/plot-design.md)、[ADR-052：cell 几何投影](./052-cell-geometry-projection.md)
- 后续决策：[plot v0.1/059](059-mark-abstraction-registry.md)、[plot v0.1/079](079-mark-label-surface.md)、[plot v0.2/022](../v0.2/022-label-encoding.md)

## 决策沿革

曾用独立 TextMark 给每行数据生成标签。现在可用 Point 表达文字图形，或在实际宿主上声明 label；固定文字与绑定字段分别进入 properties 和 encodings。

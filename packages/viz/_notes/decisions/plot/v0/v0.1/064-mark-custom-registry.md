---
description: '曾允许未知 mark type 通过 schema，交给自定义 Definition 的 lowering 回调'
keywords: 'mark、markDefinitions、IRPlot.marks、IRPlotMarkOperation、MarkDefinition'
---

# ADR-064：开放自定义 mark

- 状态：Superseded
- 后续决策：[plot v0.2/023](../v0.2/023-closed-mark-vocabulary.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 决策沿革

曾允许未知 mark type 通过 schema，交给自定义 Definition 的 lowering 回调。此扩展入口已关闭，不保留 defineMark 或 passthrough；使用内置几何，或直接组合下层绘图能力。

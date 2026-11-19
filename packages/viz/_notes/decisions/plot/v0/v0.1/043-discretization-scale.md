---
description: 'quantize 按等宽区间分档，threshold 依显式断点分档，quantile 依样本分布分档'
keywords: 'scale、quantize、threshold、quantile、domain、color、scaleQuantize、scaleThreshold'
---

# ADR-043：离散化 scale——quantize / threshold / quantile（连续 domain → 离散 color 档）

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.4 Scale](../../../../architecture/plot-design.md)、[ADR-042 连续色阶](./042-continuous-color-scale.md)、[ADR-044 legend](./044-legend-guide.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

quantize 按等宽区间分档，threshold 依显式断点分档，quantile 依样本分布分档。三者均把连续输入映射到离散输出，但不能相互替代。

## 修订边界

分档不再限于颜色。threshold 的输出数须比断点多一项；quantile 必须有样本，不能用最小最大值替代。通道决定输出怎样绘制。

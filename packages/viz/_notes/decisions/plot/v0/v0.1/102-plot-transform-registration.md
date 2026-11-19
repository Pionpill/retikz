---
description: 'Plot 曾自行注入 bin、stack、density、smooth 等默认变换，以便驱动绘图'
keywords: 'plot、plot-only、transform、stack、normalize、density、resolvePlotTransformRegistry'
---

# ADR-102：plot 自行注册 plot-only transform

- 状态：Superseded
- 决策日期：2026-07-06
- 关联：[plot v0.1-beta.1 roadmap](./roadmap.md)、[data ADR-002](../../../data/v0/v0.1/002-shared-provider-boundary.md)、[ADR-101：适配 @retikz/data 数据层](./101-data-package-adapter.md)、[plot-design.md §3.3 Transform / §8 lowering](../../../../architecture/plot-design.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)

## 决策沿革

Plot 曾自行注入 bin、stack、density、smooth 等默认变换，以便驱动绘图。这些操作并不依赖坐标或图元；它们的声明和执行契约现由 Data 提供，Plot 选择作用域并消费结果。

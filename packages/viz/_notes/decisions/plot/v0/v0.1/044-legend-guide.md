---
description: '图例解释非位置映射，是否绘制图例不应暗中创建一条轴'
keywords: 'legend、guide、scale、swatch、ramp、Axis、GuideSchema、IRPlot.scales'
---

# ADR-044：legend guide——非位置 scale 的图例（swatch / 色带 ramp / 分箱）+ 估算布局占位

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.9 Guide / §13.1 结构上限](../../../../architecture/plot-design.md)、[ADR-042 连续色阶](./042-continuous-color-scale.md)、[ADR-043 离散化 scale](./043-discretization-scale.md)、[alpha.7 size/opacity/shape](./roadmap.md)、[alpha.2 axis guide](./roadmap.md)
- 后续决策：[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

图例解释非位置映射，是否绘制图例不应暗中创建一条轴。离散色块、连续色带和分档标注承载不同读法。

## 修订边界

数学尺度只提供类别、采样或分档事实，图例由 Guide 结合颜色、形状或尺寸通道选型，不由 scale 强制指定。

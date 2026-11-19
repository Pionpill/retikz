---
description: '命名线性尺度把数据域映射到绘图范围，让坐标与消费图元共享同一映射'
keywords: 'Plot、LinearScale、Scale、union、linear、domain、range、nice'
---

# ADR-003：Plot 比例尺（LinearScale + Scale union）

- 状态：Partially Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.5 / §11.1](../../../../architecture/plot-design.md)、[ADR-001 IRPlot](./001-plot-spec-root.md)、[ADR-004 coordinate](./004-plot-coordinate.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

命名线性尺度把数据域映射到绘图范围，让坐标与消费图元共享同一映射。显式域优先于从数据推断的域，线性映射并不专属于某一图元。

## 修订边界

线性不再是唯一 scale 类型；映射算法和注册归 Data，Plot 负责将映射用于位置或视觉通道。

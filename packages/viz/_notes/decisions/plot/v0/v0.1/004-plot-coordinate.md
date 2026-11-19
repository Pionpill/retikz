---
description: '笛卡尔坐标把两个角色的尺度结果投影到同一绘图区；坐标负责屏幕方向，尺度负责数据映射'
keywords: 'Plot、Cartesian2D、Coordinate、union、scale、cartesian2D、scales、coordinate'
---

# ADR-004：Plot 坐标系（Cartesian2D + Coordinate union，持有位置 scale 绑定）

- 状态：Partially Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3.5](../../../../architecture/plot-design.md)、[ADR-001 IRPlot](./001-plot-spec-root.md)、[ADR-003 scale](./003-plot-scale.md)、[ADR-005 encoding+mark](./005-plot-encoding-mark.md)
- 后续决策：[plot v0.1/061](061-coordinate-registry.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

笛卡尔坐标把两个角色的尺度结果投影到同一绘图区；坐标负责屏幕方向，尺度负责数据映射。这使改变绘图区尺寸不必改变数据模型。

## 修订边界

最初以固定联合和必填 x/y 尺度名描述这项能力。现行 coordinate 可注册，尺度可按消费需求解析。

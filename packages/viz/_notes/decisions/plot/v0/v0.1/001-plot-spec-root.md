---
description: 'Plot 是 namespace/type 标识的领域组合节点，声明图元、坐标、尺度和要使用的数据；数据行、运行时函数与后端对象不进入可持久化 IR'
keywords: 'Plot、plot、composite、JSON、meta、plot.plot、lowerComposites'
---

# ADR-001：Plot 根节点（`plot` composite 节点 + 数据引用 + JSON 透传约束）

- 状态：Partially Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot v0.1 roadmap](./roadmap.md)、[plot-design.md §3 / §8 / §8.1 / §11 / §13.1](../../../../architecture/plot-design.md)、[ADR-002 data](./002-plot-data.md)、[ADR-003 scale](./003-plot-scale.md)、[ADR-004 coordinate](./004-plot-coordinate.md)、[ADR-005 encoding+mark](./005-plot-encoding-mark.md)
- 后续决策：[plot v0.2/003](../v0.2/003-plot-presentation-boundary.md)、[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)

## 保留的决策

Plot 是 namespace/type 标识的领域组合节点，声明图元、坐标、尺度和要使用的数据；数据行、运行时函数与后端对象不进入可持久化 IR。同一声明可从 JSON 或作者 API 得到。

## 修订边界

早期根字段表不是当前 schema：外围标题、说明和画框布局不由 Plot 承担；图元编码与固定属性分组存放。

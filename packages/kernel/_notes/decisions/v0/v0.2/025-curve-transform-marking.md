---
description: '曲线出入方向、自环及路径整体变换描述的是路径本身的几何；沿线标记是附着内容，不应成为另一条几何路径'
keywords: 'out、self-loop、marking、PathSchema、bend、bendDirection、bendAngle'
---

# ADR-025：out/in 曲线 + self-loop / 路径整体变换 / 中段 marking（三搭车项）

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[ADR-023](./023-arrow-definition.md)、[ADR-024](./024-path-generator-definition.md)、[alpha.1 Scope transform](./)
- 后续决策：[kernel v0.5/075](../v0.5/075-path-arrows-and-marks.md)、[kernel v0.5/083](../v0.5/083-path-position-modes.md)

## 保留的决策

曲线出入方向、自环及路径整体变换描述的是路径本身的几何；沿线标记是附着内容，不应成为另一条几何路径。

出入角控制曲线离开起点和接近终点的方向，looseness 控制控制点距离；起终点重合时不能仅以零弦长计算控制点，否则自环会退化。

## 修订边界

旧 marking 不能兼任首尾箭头。端点声明负责裁切和补偿，沿线 marks 则选择路径度量和定位几何。

---
description: 'arrowDetail 曾为同一路径的两端合并形状、尺寸和外观，解决箭头只能与线身同色同形的问题'
keywords: 'Path、arrowShape、arrowDetail、arrow、scale'
---

# ADR-006：Path 箭头重设计（删 `arrowShape`，加 `arrowDetail` 对象 + 起末分别配置）

- 状态：Superseded
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../roadmap.md)
- 后续决策：[kernel v0.5/075](../v0.5/075-path-arrows-and-marks.md)

## 决策沿革

arrowDetail 曾为同一路径的两端合并形状、尺寸和外观，解决箭头只能与线身同色同形的问题。现由 arrow.start 和 arrow.end 的存在分别启用端点箭头；marks 表达沿线标记，不决定端点截短。

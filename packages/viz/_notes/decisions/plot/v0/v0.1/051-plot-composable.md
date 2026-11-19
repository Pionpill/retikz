---
description: '多个 Plot 可以和 Core 图元共处在一棵图形树，形成独立图层、布局子项或被连接的对象'
keywords: 'Plot、Scope、IRPlot.width、height、IRPlot.id'
---

# ADR-051：让 `<Plot>` 可被组合

- 状态：Partially Superseded
- 决策日期：2026-06-13
- 关联：[alpha.10 roadmap](./roadmap.md)、[ADR-050](./050-plot-thin-container.md)、[plot-design](../../../../architecture/plot-design.md)、[core scope-id-bbox](../../../../../../kernel/_notes/decisions/v0/v0.2/003-scope-id-bounding-box.md)
- 后续决策：[kernel v0.5/052](../../../../../../kernel/_notes/decisions/v0/v0.5/052-unified-composite-compilation.md)、[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 保留的决策

多个 Plot 可以和 Core 图元共处在一棵图形树，形成独立图层、布局子项或被连接的对象。组合的单位是领域声明，不是把多张后端图像再叠起来。

## 修订边界

嵌入机制不再要求每个 Plot 接入自己的 expand 回调；它通过共享作者贡献与统一 Composite compile 参与父场景。

---
description: 'Plot 编译把外部数据、声明式规格与绘图区结合，输出 Core 可处理的图形，不让 SVG 或 Canvas 解释数据字段'
keywords: 'lowering、lowerPlots、Plot、core、Node、Scope、Path、CompileOptions.composites'
---

# ADR-006：最薄 lowering 纵向闭环（lowerPlots：Plot IR + 数据 → core IR）

- 状态：Partially Superseded
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md)、[plot-design.md §8 / §8.1 / §8.2 / §8.3](../../../../architecture/plot-design.md)、[ADR-001](./001-plot-spec-root.md)、[ADR-002](./002-plot-data.md)、[ADR-003](./003-plot-scale.md)、[ADR-004](./004-plot-coordinate.md)、[ADR-005](./005-plot-encoding-mark.md)
- 后续决策：[kernel v0.5/052](../../../../../../kernel/_notes/decisions/v0/v0.5/052-unified-composite-compilation.md)、[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 保留的决策

Plot 编译把外部数据、声明式规格与绘图区结合，输出 Core 可处理的图形，不让 SVG 或 Canvas 解释数据字段。首个闭环只需要一个可投影的数据图元。

## 修订边界

返回 expand 回调的 lowerPlots 示例属于早期接口。集成使用统一 Composite compile，React 与 Vanilla 共享作者归一化。

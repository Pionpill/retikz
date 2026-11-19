---
description: '图例应消费图元实际使用的颜色和通道范围，不应另拟合一份域或重新分配色板'
keywords: 'Legend、palette、guide、family、theme、colors、scheme、range'
---

# ADR-092：Legend、palette 与 guide family theme

- 状态：Partially Superseded
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.15 roadmap](./roadmap.md)、[plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)
- 后续决策：[kernel v0.5/069](../../../../../../kernel/_notes/decisions/v0/v0.5/069-theme-naming.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

图例应消费图元实际使用的颜色和通道范围，不应另拟合一份域或重新分配色板。显式 range 或 scheme 优先，领域配色用于未指定的默认。

## 修订边界

旧 PlotTheme.palette 不是现行根对象路径。映射输出归 Data，Plot Guide 结合通道解释色带、色块、形状或尺寸。

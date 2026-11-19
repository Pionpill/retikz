---
description: 'Plot 的轴、网格、图例、字体和绘图区可以共享领域默认值；更具体的作者显式配置应能覆盖默认，而不能靠各 lowering 阶段各自猜一套'
keywords: 'Theme、schema、merge、主题、合并优先级'
---

# ADR-091：Plot theme schema 与合并优先级

- 状态：Partially Superseded
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.15 roadmap](./roadmap.md)、[plot-design.md §11.1 模块清单](../../../../architecture/plot-design.md#111-模块清单)
- 后续决策：[kernel v0.5/069](../../../../../../kernel/_notes/decisions/v0/v0.5/069-theme-naming.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

Plot 的轴、网格、图例、字体和绘图区可以共享领域默认值；更具体的作者显式配置应能覆盖默认，而不能靠各 lowering 阶段各自猜一套。

## 修订边界

旧 IRPlot.theme 结构不是当前入口。Core 传递主题选择，Plot 持有领域词汇，根声明用 defaultPlot 提供稀疏默认值。

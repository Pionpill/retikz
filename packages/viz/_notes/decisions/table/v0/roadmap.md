# table v0 Roadmap

> 更新于 2026-07-19。本文件记录 `@retikz/table`、`@retikz/table-react` 与 `@retikz/table-vanilla` 的 v0 总体路线。具体 milestone 见对应 `v0.*/roadmap.md`，长期边界见 [`table-design.md`](../../../architecture/table-design.md)。

## 定位

Table 家族是 viz 的 Tier 2 表格可视化能力：把外部数据或显式内容组织为二维语义表格，经表格布局后 lowering 为 Core IR。

- `@retikz/table` 拥有 Table IR、结构、Cell 语义、呈现、布局、lowering 与追溯能力
- `@retikz/table-react` / `@retikz/table-vanilla` 只负责 authoring 与宿主接入
- Table 消费 `@retikz/data` 与 `@retikz/core`，不依赖 Plot，也不自带 renderer
- Table 家族以表格展示为核心，不承担单元格编辑或电子表格公式；虚拟滚动属于后续大表展示能力，不进入 v0.1
- 服务端分页、异步加载和缓存仍是宿主数据状态；Table 只消费宿主提供的当前数据视图

## 路线总览

### v0.1：完整静态表格语法

v0.1 建立从 TableSpec 到 Core IR 的完整静态表格闭环，覆盖：

- manual、detail、pivot、matrix 等基础 structure
- group / hierarchy / summary / transpose 等可组合 operation
- Cell formatter、presentation、条件视觉编码、rule 与 theme
- track sizing、span、border、内容 fit / overflow 与 fragmentation
- 文字、图片、Plot 等显式 `IRChild` Cell 的统一测量、放置和 lowering
- manifest、lineage、locator 与 diagnostics
- React / Vanilla 两套等价 authoring 表面

具体阶段见 [`v0.1 roadmap`](./v0.1/roadmap.md)。

### v0.2：大表展示与交互宿主

v0.2 在静态表格语法之上增加 viewport / window、overscan、虚拟滚动与滚动同步等大表展示能力。可复用的可见区计算和布局映射进入 Table，滚动容器与生命周期由 React / Vanilla adapter 接线；运行时窗口状态不反向写入 Table IR。

选择、排序状态和可访问性宿主可在后续 ADR 中按展示需求继续评估。单元格编辑、电子表格计算以及服务端分页 / 异步缓存状态仍不属于 Table 家族。

## 发布组

`@retikz/table`、`@retikz/table-react` 与 `@retikz/table-vanilla` 使用独立 `table` release group 并 lockstep 发布。Table 不与 Plot 同版本，但每个 milestone 必须声明所需 Data / Core 能力是否就绪。

## 参考

- [Table 完备设计](../../../architecture/table-visualization-complete.md)
- [Table 总设计](../../../architecture/table-design.md)
- [Table 竞品分析](../../../analysis/table-compare-analysis.md)
- [viz capability design](../../../../../../notes/architecture/capability-design.md)

## ADR 约定

ADR 放在 `packages/viz/_notes/decisions/table/`，按 `v0/v0.1/alpha.N/NN-slug.md` 组织。每个 milestone 独立编号；roadmap 可更新，Accepted ADR 只按仓库流程增补状态或 supersede 信息。

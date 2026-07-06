# ADR-05：Stat / geom structural surface

- 状态：Accepted
- 决策日期：2026-06-27
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [ADR-02](./02-quantile-band-boxplot.md) · [ADR-03](./03-density-transform.md) · [ADR-04](./04-smooth-regression.md)

## 背景

alpha.13 同时补齐 boxplot、density、smooth 等统计能力。若每个能力都以 chart preset 或 specialized mark 发布，plot 会迅速滑向“图表组件集合”，而不是 grammar 层。需要把统计和几何的边界明确写入文档、测试和 public surface。

## 决策记录

plot alpha.13 采用“stat = transform / reducer / selector，geom = abstract mark”的结构面：

- 统计能力以 transform、summary reducer、selector 暴露。
- 几何表达继续由 `PointMark`、`IntervalMark`、`PathMark`、`ReferenceMark`、`RelationMark` 等抽象 mark 承担。
- 不新增 `BoxPlot`、`DensityPlot`、`RegressionPlot`、`BoxPlotMark`、`DensityMark`、`RegressionMark`。
- React 与 Vanilla 都消费同一 PlotSpec；React 只做薄 authoring adapter。
- docs 以组合 demo 说明 boxplot、density、smooth，而不是宣传 chart preset。

文档 IA 使用 transform / summary / statistics 页面承载统计能力；demo 名称保持 `transform-boxplot`、`transform-density`、`transform-smooth` 这类 grammar 取向。

## 被否决方案

- 为常见统计图新增 preset：短期更像用户熟悉的 chart API，但会削弱底层 grammar 能力。
- 给 mark 加快捷统计 prop：会把 transform hidden 在 mark 内，破坏可组合性和 provenance。
- 只靠文档约定不加测试：后续很容易无意引入 specialized mark。

## 实现指针

- 发布版本：viz group `v0.1.0-alpha.13`。
- 验收范围：测试中显式保证没有 specialized chart marks，React/Vanilla PlotSpec 等价，docs 用 grammar 组合页解释统计闭环。
- 受约束 ADR：[ADR-02](./02-quantile-band-boxplot.md)、[ADR-03](./03-density-transform.md)、[ADR-04](./04-smooth-regression.md)。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/graph/v0/v0.1/alpha.13/05-stat-geom-surface.md`（封板全文）。

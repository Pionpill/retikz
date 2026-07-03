# ADR-02：Quantile-band statistics + boxplot composition

- 状态：Accepted
- 决策日期：2026-06-26
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [ADR-05](./05-stat-geom-surface.md)

## 背景

boxplot 是常见统计图，但 retikz plot 的方向不是内置 chart preset，而是提供可组合的 transform/reducer/mark grammar。alpha.13 需要补齐分位带、箱线图所需统计量与离群点选择能力，同时避免新增 `BoxPlotMark` 或 `BoxPlot` 组件。

## 决策记录

新增 `quantile-band` reducer 与 `outside-quantile-band` selector。

`quantile-band` reducer 输出可配置 lower/upper 分位数、中心点、spread/fence/whisker/min/max/count 等统计字段。whisker 策略支持 `minMax` 或按 spread factor 计算，默认 factor 为 `1.5`。

`outside-quantile-band` selector 基于 reducer 结果选择原始行中的离群点，保留 source row identity，方便后续用 `PointMark` 绘制离群点并保持 provenance。

boxplot 由现有 mark 组合表达：

- `IntervalMark` 表达箱体或分位带。
- `ReferenceMark` 表达 whisker / median / baseline。
- `PointMark` 表达 outside selector 选出的原始离群点。

## 被否决方案

- 新增 `BoxPlotMark` 或 `BoxPlot` preset：会绕开 stat = transform / geom = mark 的 grammar 方向。
- reducer 直接输出可渲染图元：统计层不应该知道 mark 或 core IR。
- selector 输出聚合行：离群点必须保留原始 datum identity。

## 实现指针

- 发布版本：viz group `v0.1.0-alpha.13`。
- 验收范围：`packages/viz/plot` summary/reducer/selector 测试，React/Vanilla 等价 PlotSpec，docs 以组合 demo 展示 boxplot。
- 结构约束见 [ADR-05](./05-stat-geom-surface.md)：不新增 boxplot chart preset。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/graph/v0/v0.1/alpha.13/02-quantile-band-boxplot.md`（封板全文）。

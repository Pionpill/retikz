# viz 内部文档

这里放 viz 组内部协作文档。`@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` 按 plot 发布组 lockstep；`@retikz/data` 独立维护版本，后续 chart、table、geo 按各自家族维护路线与版本。

## 目录

- [`architecture/`](./architecture)：viz 能力域与 plot / table 长期架构设计。
- [`decisions/`](./decisions)：版本路线、milestone roadmap、ADR。
- [`analysis/`](./analysis)：plot / table 相关一次性分析。

跨包长期架构原则仍放在根 [`notes/architecture`](../../../notes/architecture)。

## 当前入口

- [`architecture/plot-design.md`](./architecture/plot-design.md)：plot grammar-of-graphics、Plot IR、lowering 管线设计。
- [`architecture/data-capability-complete.md`](./architecture/data-capability-complete.md)：data 能力完备与宿主边界。
- [`architecture/plot-visualization-complete.md`](./architecture/plot-visualization-complete.md)：plot 可视化完备检测设计。
- [`architecture/table-visualization-complete.md`](./architecture/table-visualization-complete.md)：table 表格可视化完备检测设计。
- [`architecture/table-design.md`](./architecture/table-design.md)：table grammar、Table Algebra、约束布局与 lowering 总设计。
- [`decisions/plot/v0/roadmap.md`](./decisions/plot/v0/roadmap.md)：plot v0 总路线。
- [`decisions/plot/v0/v0.1/roadmap.md`](./decisions/plot/v0/v0.1/roadmap.md)：plot v0.1 路线与 milestone 索引。
- [`decisions/data/v0/roadmap.md`](./decisions/data/v0/roadmap.md)：data v0 总路线。
- [`decisions/chart/v0/v0.1/roadmap.md`](./decisions/chart/v0/v0.1/roadmap.md)：chart v0.1 路线与 Tier 3 `ChartSpec` 边界。
- [`decisions/_template.md`](./decisions/_template.md)：plot ADR 模板。
- [`analysis/plot-compare-analysis.md`](./analysis/plot-compare-analysis.md)：plot 横向对比。
- [`analysis/plot-rendering-performance.md`](./analysis/plot-rendering-performance.md)：plot 渲染性能分析。
- [`analysis/table-compare-analysis.md`](./analysis/table-compare-analysis.md)：table 竞品与能力差距分析。

## 规则

- roadmap 可持续更新；ADR Accepted 后只增补状态 / supersede，不改历史判断。
- plot / table 只消费 core 能力，不反向依赖 core 内部实现；需要通用底层能力时先补 kernel / core。
- 本目录不进入 npm 包；`@retikz/plot` 的 `package.json` 通过 `files` 白名单只发布 `dist/**/*`、`README.md`、`LICENSE` 和 `package.json`。

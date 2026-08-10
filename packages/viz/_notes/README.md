# viz 内部文档

这里放 viz 组内部协作文档。`@retikz/data` 独立维护版本；Plot 三包按 plot 发布组 lockstep；Table 三包按 table 发布组 lockstep。Chart 已有长期设计与 v0.1 路线草案，但 package manifest 和 release group 仍需具体能力 ADR 确认；未来 geo 也遵守同一关卡。

## 目录

- [`architecture/`](./architecture)：viz 能力域与 plot / chart / table 长期架构设计。
- [`decisions/`](./decisions)：版本路线、milestone roadmap、ADR。
- [`theme/`](./theme)：ThemeStyle 的 package owner 视觉映射；当前包含 Plot 指导。
- `plans/`：与 ADR 相对路径镜像的 ignored implementation plan、测试契约、任务状态与评审记录；不 stage / commit。
- [`analysis/`](./analysis)：plot / chart / table 相关一次性分析。

跨包长期架构原则仍放在根 [`notes/architecture`](../../../notes/architecture)。

## 当前入口

- [`architecture/plot-design.md`](./architecture/plot-design.md)：plot grammar-of-graphics、Plot IR、lowering 管线设计。
- [`architecture/data-capability-complete.md`](./architecture/data-capability-complete.md)：data 能力完备与宿主边界。
- [`architecture/plot-visualization-complete.md`](./architecture/plot-visualization-complete.md)：plot 可视化完备检测设计。
- [`architecture/chart-design.md`](./architecture/chart-design.md)：chart 类型封装、隐式配方、Plot 混合与 lowering 总设计。
- [`architecture/chart-encapsulation-complete.md`](./architecture/chart-encapsulation-complete.md)：chart 封装闭环、能力复用与准入检测设计。
- [`architecture/table-visualization-complete.md`](./architecture/table-visualization-complete.md)：table 表格可视化完备检测设计。
- [`architecture/table-design.md`](./architecture/table-design.md)：table grammar、Table Algebra、约束布局与 lowering 总设计。
- [`theme/plot/neutral.md`](./theme/plot/neutral.md)：Neutral 在 Plot surface、Axis、Legend 与 palette 上的映射。
- [`theme/plot/academic.md`](./theme/plot/academic.md)：Academic 在 Plot surface、Axis、Legend 与 palette 上的映射。
- [`theme/plot/vibrant.md`](./theme/plot/vibrant.md)：Vibrant 在 Plot surface、Axis、Legend 与 palette 上的映射。
- [`theme/plot/clean.md`](./theme/plot/clean.md)：Clean 在 Plot surface、Axis、Legend 与 palette 上的映射。
- [`decisions/plot/v0/roadmap.md`](./decisions/plot/v0/roadmap.md)：plot v0 总路线。
- [`decisions/plot/v0/v0.1/roadmap.md`](./decisions/plot/v0/v0.1/roadmap.md)：plot v0.1 路线与 milestone 索引。
- [`decisions/table/v0/roadmap.md`](./decisions/table/v0/roadmap.md)：table v0 总路线。
- [`decisions/table/v0/v0.1/roadmap.md`](./decisions/table/v0/v0.1/roadmap.md)：table v0.1 路线与 milestone 索引。
- [`decisions/table/v0/v0.1/alpha.1/roadmap.md`](./decisions/table/v0/v0.1/alpha.1/roadmap.md)：table alpha.1 ADR 索引与执行顺序。
- [`decisions/data/v0/roadmap.md`](./decisions/data/v0/roadmap.md)：data v0 总路线。
- [`decisions/chart/v0/v0.1/roadmap.md`](./decisions/chart/v0/v0.1/roadmap.md)：chart v0.1 路线与 Tier 3 `ChartSpec` 边界。
- [`decisions/_template.md`](./decisions/_template.md)：viz ADR 模板。
- [`analysis/plot-compare-analysis.md`](./analysis/plot-compare-analysis.md)：plot 横向对比。
- [`analysis/plot-rendering-performance.md`](./analysis/plot-rendering-performance.md)：plot 渲染性能分析。
- [`analysis/chart-compare-analysis.md`](./analysis/chart-compare-analysis.md)：chart 类型封装、type taxonomy 与文档分类横向分析。
- [`analysis/table-compare-analysis.md`](./analysis/table-compare-analysis.md)：table 竞品与能力差距分析。

## 规则

- roadmap 可持续更新；ADR Accepted 后只增补状态 / supersede，不改历史判断。
- ADR 从 Proposed 起只保留长期功能与架构契约；具体文件、私有逻辑、测试 case / 命令和 review 过程写入同构 `plans/` 镜像。
- plot / table 只消费 core 能力，不反向依赖 core 内部实现；需要通用底层能力时先补 kernel / core。
- 本目录不进入 npm 包；`@retikz/plot` 的 `package.json` 通过 `files` 白名单只发布 `dist/**/*`、`README.md`、`LICENSE` 和 `package.json`。

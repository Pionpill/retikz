# ADR-01：bin + aggregate transform

状态：Accepted
发布：`@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` `0.1.0-alpha.12`

## 背景

v0.1-alpha.12 补齐 grammar of graphics 中 Statistics 的基础能力。此前 plot 只有 `sort` / `stack` 这类保行数或重排 transform，缺少把观测行规约成分箱、分组汇总行的能力；histogram、分组聚合柱、连续 x 区间柱都需要这类“改行数” transform。

本 ADR 处理两类基础规约：

- `bin`：把连续字段切成区间，每个 bin 输出一行派生数据。
- `aggregate`：按 `groupBy` 聚合，输出每组一行。

真实数据仍不进入 IR；IR 只描述 transform operation 和字段名。

## 决策

新增 `PlotTransform.Bin` 与 `PlotTransform.Aggregate`。二者都是 row-changing transform，会生成新的数据行，并通过 provenance 记录其源行集合。

`bin` 支持互斥的分箱策略：按箱数、按步长或按显式阈值。输出行包含区间字段与统计字段，默认可产出 `binStart` / `binEnd` / `binValue` 一类派生列。空箱仍可产出行，以保证连续区间图形和 guide 对齐。

`aggregate` 支持 `groupBy` 复合键，并支持内置 reducer：`count`、`sum`、`mean`、`min`、`max`。输出行保留分组键与 `as` 指定的派生字段。

为让 histogram 可以直接落成连续 x 区间柱，interval mark 在 alpha.12 增加了区间字段入口（实现中的最终字段以代码 schema 为准）。这让 `bin` 的区间输出可以被 interval lowering 消费，而不需要把连续字段强行转成 band。

## Authoring Surface

React 侧不为每个统计 transform 继续扩展 mark prop 自动装配，而是统一走显式 transform 表面：

- `<Transform kind="bin" ... />`
- `<Transform kind="aggregate" ... />`
- `<Plot transforms={[...]} />`

`<Transform>` 是返回 `null` 的声明组件，由 `<Plot>` 同步内省并按声明顺序折叠进 `spec.transform`。这样 transform pipeline 是显式、可排序、可复用的；后续新增 transform 也走同一表面。

Vanilla / SSR 侧不需要额外 API，`renderPlot(spec, datasets, options)` 通过同一 Plot IR 与 lowering 自动消费 transform。

## 实现指针

最终行为以代码为准，主要落在：

- `packages/graph/plot/src/schemas/transform/**`
- `packages/graph/plot/src/providers/transform/**`
- `packages/graph/plot/src/providers/statistics/**`
- `packages/graph/plot/src/pipeline/{expand,provenance}.ts`
- `packages/graph/plot-react/src/components/{transform,build-plot-spec}.ts`

验证覆盖：

- `packages/graph/plot/tests/transform/statistics.test.ts`
- `packages/graph/plot/tests/lower/transform.test.ts`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`

## 影响

用户可直接用 Plot IR 或 React composition DSL 声明 histogram、分组聚合柱等统计图。lowering 仍保持同步、确定、renderer-agnostic，输出继续下沉到 core IR。

这也是后续 `alpha.13` density / smooth / quartile / boxplot 等统计能力的基础：这些能力可以复用 row-changing transform、provenance 和显式 pipeline 表面。

## 不在本 ADR 范围

- KDE、回归、quartile、boxplot 等高级统计。
- mark-local transform；本轮只处理 root transform pipeline。
- 数据加载、CSV / URL / JSON I/O。
- 把真实数据写入 IR。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:notes/decisions/graph/v0/v0.1/alpha.12/01-bin-aggregate.md`（封板全文）。

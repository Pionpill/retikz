# chart v0.1 Roadmap

> 本文件汇总 `@retikz/chart` v0.1 的路线。chart 是 viz 的 Tier 3 封装层，依赖 `@retikz/data` 与 `@retikz/plot`，不拥有 renderer，不直接 lower 到 core。
> 关联：[`plot v0 roadmap`](../../../v0/roadmap.md) · [`plot v0.2 roadmap`](../../../v0/v0.2/roadmap.md) · [`plot-design.md §5.1`](../../../../architecture/plot-design.md)
> ⚠️ 草案：由 2026-07-05 版本规划讨论开出，待人工 review。

## 定位

`@retikz/chart` 面向快速上手和常见图表类型。它可以拥有自己的 JSON-safe Tier 3 IR：`ChartSpec`。

执行链路固定为：

```text
ChartSpec / Chart IR
  -> lowerChartSpec(...)
PlotSpec / Plot IR
  -> lowerPlots(...)
Core Scene / IR
```

`ChartSpec` 用来表达 chart type、series、默认装饰、主题 preset、推荐 layout 与语义配置；它不直接表达 core Node / Path，不直接 lower 到 core。plot 表达不了的能力，先补 data / plot / core，再由 chart 封装。

## 与 plot v0.2 的关系

chart v0.1 与 plot v0.2 并行迭代：

- 初始 alpha 可先基于 plot v0.1 GoG 基座封装 line / bar / area / scatter / pie 等常规类型。
- plot v0.2 补交互能力后，chart v0.1 后续 alpha 暴露 tooltip / hover / legend interaction 等高层配置。
- plot v0.2 补 layout transform 后，chart v0.1 后续 alpha 暴露 tree / network / wordCloud / treemap / gauge / progress 等 type。

chart 不封装 table；geo-backed chart type 等 geo 边界决策后再定。

## Milestones

| Milestone | 主题 | 模块 / 产出 | 状态 |
| --- | --- | --- | --- |
| chart v0.1-alpha.1 | **ChartSpec + lowerChartSpec + 三包表面** | 新增 `@retikz/chart` 的 ChartSpec schema 与 lowerChartSpec；新增 `@retikz/chart-react` `<Chart>` 与 `@retikz/chart-vanilla` builder；首批常规 chart type lower 成 PlotSpec | 待起草 |

## 版本与发布组

chart 使用自己的发布家族：`@retikz/chart` / `@retikz/chart-react` / `@retikz/chart-vanilla` lockstep。它不与 plot 全域同版本，但 chart v0.1 的每个 alpha 必须声明可消费的 `@retikz/plot` 与 `@retikz/data` 版本范围。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。plot 能力不足时，不在 chart 内绕开实现；先回到 data / plot / core 补能力。

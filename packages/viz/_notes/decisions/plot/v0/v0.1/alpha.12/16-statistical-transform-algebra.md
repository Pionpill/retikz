# ADR-16：Statistical transform algebra

状态：Accepted
决策日期：2026-06-27
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-01 bin + aggregate](./01-bin-aggregate.md) · [ADR-06 transform registry](./06-transform-registry.md) · [ADR-14 relation derived data](./14-relation-derived-data-routing.md) · [ADR-15 mark-local transform](./15-mark-local-transform.md)

## 背景

ADR-15 把 transform 提升为所有 mark 的公共数据视图能力，但内置统计语义仍然碎片化：`aggregate`、`bin` 的私有 reduce 字段、`derive-relation` 的 endpoint selector 与 difference measure 都在表达相近的统计概念，却各自定义小语法。

后续极值点、top-N、均值线、分位数、组内排名、最低点到最高点连线等需求都属于 Statistics 层。继续新增一批业务动词式 transform 会重复 selector、reducer、provenance 与字段契约。

## 决策

transform 仍是唯一统计入口；mark 只消费 transform 后的 rows。内置统计收敛为四个通用 transform 家族：

| transform   | 语义                                            | 输出                 |
| ----------- | ----------------------------------------------- | -------------------- |
| `summarize` | 按组规约并计算 reducer metrics                  | 一组一行             |
| `select`    | 按组选择代表原始行                              | 被选中的原始行       |
| `annotate`  | 按组计算统计并回填到每个原始行                  | 保持行数             |
| `relate`    | 按组选择 source / target 并投影为 relation rows | source-target 派生行 |

`ReducerOperation` 与 `SelectorOperation` 成为共享统计子算子。`summarize` / `annotate` / `bin` 复用 reducer；`select` / `relate` 复用 selector。`difference` / `ratio` 等 source-target 二元计算属于 pair measure，不混入 group reducer。

长尾能力分两级扩展：

- 完整新数据语义继续用 Data 的 `defineTransform`。
- 可嵌入通用 transform 的统计子语义通过 `defineStatReducer` / `defineRowSelector` 注入，并由 `options.statReducerDefinitions` / `options.rowSelectorDefinitions` 传入。

旧 `aggregate` 被 `summarize` 替代，旧 `derive-relation` 被 `relate` 替代；`bin` 的 `reduce` / `reduceField` / `valueField` 改为共享 `metrics`。字段名不再自动猜测，reducer 输出必须显式 `as`。最终 owner 边界是：`summarize` / `select` / `annotate` 与 reducer / selector definitions 属于 Data，`relate` 与 `bin` 等 plot-only transform 属于 Plot。

## 最终形态

- `groupBy` 省略或 `[]` 都表示全局单组。
- `select` 默认输出原始行并保留 source provenance；`top` / `bottom` / `tie:'all'` 可每组输出多行。
- `summarize` / `bin` 输出组级 source indices；`annotate` 保留原 row provenance；`relate` 同时记录 source / target 与组级 provenance。
- `collectTransformFields` 需要递归读取 reducer、selector 与 pair measure 的 input / output fields。
- 删除的旧内置 kind 不应被 external passthrough 静默接住，错误应提示迁移到 `summarize` / `relate`。

## 影响

- ⚠️ BREAKING：删除 `aggregate` operation，改用 `summarize.metrics[]`。
- ⚠️ BREAKING：删除 `derive-relation` operation，改用 `relate`。
- ⚠️ BREAKING：`bin` 的私有 reduce 字段删除，改用共享 reducer metrics；默认输出 `binCount`。
- React / Vanilla 的 transform 表面接受新 operation，并透传统计子算子 definitions。
- docs 的 transform 章节需要改写为统计代数视角，并展示 root / mark-local transform 中的用法。

## 长期边界

- 不引入表达式语言或函数进入 IRPlot。
- 不做 named data view、join、facet scoped dataset。
- 不设计 rolling window、lag / lead、moving average 等时间序列窗口能力。
- 不做几何 routing；`relate` 只产 relation rows，routing 仍归 ADR-14。
- 不实现 chart preset 层快捷组件。

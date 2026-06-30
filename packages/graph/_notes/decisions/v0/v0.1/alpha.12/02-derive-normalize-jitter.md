# ADR-02：normalize + derive-interval + jitter

状态：Accepted
发布：`@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` `0.1.0-alpha.12`

## 背景

在 ADR-01 处理“改行数”统计 transform 后，alpha.12 还需要一组保行数的逐行派生 / 调整 transform：百分比归一化、从字段派生区间、以及确定性 jitter。它们不会改变行数，但会给后续 scale、mark、locator 提供新的字段或坐标值。

这三类能力分别支撑：

- 百分比堆叠：`normalize` 后接 `stack`。
- 显式区间图元：`derive-interval` 产出 start/end 字段。
- 重叠散点可读性：`jitter` 在数据空间里加入确定性偏移。

## 决策

新增 `PlotTransform.Normalize`、`PlotTransform.DeriveInterval`、`PlotTransform.Jitter`。三者均为 row-preserving transform。

`normalize` 在组内计算占比，支持 `groupBy` 数组以及 fraction / percent 输出。组和为 0 时输出 0，不产生 `NaN`。它与 `stack` 正交组合：百分比堆叠由显式 `[normalize, stack]` 表达。

`derive-interval` 为每一行产出 `[start, end]` 字段。它只处理单行内的 baseline-to-value 或 two-field interval；跨行累计仍属于 `stack`。

`jitter` v1 只处理连续数值字段的 pre-scale 数据空间偏移。随机性必须由可序列化 `seed` 驱动，并使用确定性 PRNG，保证 SSR 与 hydration 以及 datum locator 预演的一致性。分类带内 jitter、像素空间 jitter 等后置能力不在本轮。

## Authoring Surface

React 侧复用 ADR-01 引入的统一 transform 表面：

- `<Transform kind="normalize" ... />`
- `<Transform kind="derive-interval" ... />`
- `<Transform kind="jitter" ... />`
- `<Plot transforms={[...]} />`

不为这三个 transform 新增专属组件，也不继续扩大 mark prop 自动装配。transform 顺序由用户显式声明，保持可解释性。

Vanilla / SSR 侧继续通过 Plot IR 自动消费，无额外 API。

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

alpha.12 后，Plot pipeline 可以表达百分比堆叠、派生区间柱、可复现 jitter 散点等常见统计图形。所有变换仍保持 JSON-serializable IR 与确定性 lowering。

`derive-interval` 与 ADR-01 的连续 x 区间能力共同支撑 histogram；`normalize` 与既有 `stack` 组合支撑百分比图；`jitter` 为后续更多 mark 和 interaction parity 留下确定性约束。

## 不在本 ADR 范围

- 分类带内 jitter、像素空间 jitter。
- 高级统计 transform。
- mark-local transform。
- 真实数据加载或异步数据处理。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/02-derive-normalize-jitter.md`（封板全文）。

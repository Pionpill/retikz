# ADR-06：Regression 的 mark-local Smooth 配方

- 状态：Proposed（公开 adapter 与 docs 受 ADR-04 capability gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-05](./05-connected-scatter.md)

## 背景与目标

Regression 同时展示原始散点与拟合趋势。Plot 的 Smooth transform 会输出采样后的趋势 rows；若把它放在 Plot root，原始散点也会被替换。因此拟合只能作为 trend Path 的 mark-local transform。

## 决策：Point 读取原始 rows，trend Path 读取 mark-local Smooth rows

```ts
type RegressionChartSpec = ChartCommon & {
  type: 'regression';
  encoding: {
    x: { field: string };
    y: { field: string };
    series?: string;
    color?: StrictColorChannel;
  };
  mark?: RegressionPointPatch;
  components?: {
    trend?: {
      transform?: RegressionSmoothPatch;
      mark?: RegressionPathPatch;
    };
  };
};
```

recipe 固定生成原始 Point 与趋势 Path。Smooth 只挂在 trend Path，输入来自 x / y field，输出写入稳定的派生字段；trend Path 读取派生字段并保持开放，Point 继续读取 root-transformed 原始 rows。Point、mark-local Smooth、trend Path 及其输入输出关系构成不可撤销核心。

隐式 Smooth 与 trend Path 的完整基础契约固定为：

```ts
const trendX = '__chart.regression.trend.x';
const trendY = '__chart.regression.trend.y';

const smooth = {
  kind: 'smooth',
  x: spec.encoding.x.field,
  y: spec.encoding.y.field,
  groupBy: resolvedSeries === undefined ? undefined : [resolvedSeries],
  ...allowedSmoothPatch,
  xAs: trendX,
  yAs: trendY,
};

const trendPath = {
  type: 'path',
  order: trendX,
  series: resolvedSeries,
  closed: false,
  transform: [smooth],
  encoding: {
    x: { field: trendX },
    y: { field: trendY },
    color: resolvedColorChannel,
  },
};
```

省略的 optional 字段不写入最终 PlotSpec。`__chart.regression.trend.x` / `y` 是 Chart 保留的 mark-local output fields：二者不得相同，不得出现在 Smooth `groupBy`，ChartSpec root transform、显式 Plot extension 或声明数据模型若输出 / 占用这些保留字段必须 fail-loud，不能覆盖、重命名或自动选择替代名称。Point 永远读取 authored x / y fields；只有 trend Path 读取这两个派生字段。

用户可以调整 Smooth method、sample count、extent 与两种 Mark 的表现样式，但不能移除 Smooth、改变其 kind / input / output、把 transform 移到 root，或改写核心 Point / Path identity 和 view。

公开 patch contract 固定为：

- `RegressionPointPatch` 精确复用 ADR-04 `ScatterPointPatch`
- `RegressionSmoothPatch` 是 strict object，只允许 Plot Smooth 的 `method`、`sampleCount`、`extent`
- `RegressionPathPatch` 是 strict object，只允许 `curve`、`strokeWidth`、`opacity`、`lineCap`、`lineJoin`、`roundedCorners`、`fill`、`stroke`、`strokeOpacity`、`fillRule`、`thickness`、`marks`、`dashPattern`、`shadow`、`blendMode`、`label`

所有 value contract 直接复用对应 Plot schema。Path patch 特意不接受 `connectNulls`，也不接受 `type`、`id`、`order`、`series`、`closed`、`closure`、`encoding`、`transform`、`coordinateView`、`anchorId`、`zIndex`、`rotate` 或 `scale`。Recipe encoding / Smooth 先成立，Point 与 trend style patch 只覆盖各自允许的表现字段。

## 行为、失败语义与兼容性

- x / y 是严格 field-only roles，不接受 constant 或 binding-level scale
- `series` 同时驱动 Smooth grouping 与 Path series；color constant 可统一着色
- color field 省略 series 时自动成为 grouping；同时提供 series 与不同 color field 时 schema fail-loud，避免由代表 row 猜测颜色
- 只有 series 时提供 categorical color default；continuous / temporal 字段需要显式兼容 color scale
- 每个 Smooth group 必须保留至少两个 finite pair，且 x 至少有两个不同值；任一组失败时整个 Chart fail-loud，不只返回 points
- root transforms 先作用于共同输入，Smooth 再只处理 trend；Chart 不做数值 coercion 或回归算法 fallback
- coordinate / composition 复用二维 role contract，Point、trend 与 axes 始终属于同一 view；Polar 只改变 role projection，不闭合趋势

## 功能与包边界

- Chart 拥有 Regression 的复合 recipe、field roles、grouping / color 约束和 patch 边界
- Plot 拥有 Smooth definition、mark-local transform pipeline、Point / Path、field validation、coordinate、lowering 与 trace
- Chart 不实现拟合算法、不暴露第二根 dataset，也不捕获 Smooth 错误返回部分结果

## 架构验证

- Canonical Type 判定：原始 observations 与拟合趋势同时存在，形成区别于 Scatter / Connected Scatter 的稳定配方
- 内部表达：完全组合 Plot mark-local Smooth、Point 与 Path，无新 transform contract
- 外部扩展：Smooth method 与表现样式沿现有 schema 调整，额外 Plot members 沿正式 extension 追加
- trace：Point locator 指向 root-transformed rows；trend series locator、Smooth group provenance 与 lineage 穿过 presentation 保持连续

## 被否决方案

- 把 Smooth 放到 root：会替换 Point 输入并破坏原始 observations
- Chart 私自计算回归或吞掉坏组：会复制 Plot provider并产生部分结果歧义
- 允许任意 callback method：破坏 JSON-safe IR 与 adapter parity

## 测试策略摘要

需要 schema、mark-local rows、series / color grouping、Smooth 数据边界、coordinate / composition、core invariant、错误传播、inspection / trace 与三入口 parity 证据。关键不变量是 Point 保留共同输入，只有 trend 消费 Smooth rows，所有 group 要么共同成功要么整体失败。

## 不在本 ADR 范围

- 新回归算法、置信区间与统计显著性
- runtime callback method
- 把 fitted rows 暴露为第二根 dataset

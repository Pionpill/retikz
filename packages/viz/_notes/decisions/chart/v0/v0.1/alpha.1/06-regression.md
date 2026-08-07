# ADR-06：Regression 的 mark-local Smooth 配方

- 状态：Proposed（公开 adapter 与 docs 受 ADR-04 capability gate 阻塞；可执行 lowering 另受 transform output reservation gate 阻塞）
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

Point 与 trend Path 的颜色使用同一个 resolved color channel：显式 `color` constant 让两者使用同一常量；显式 `color` field 让两者使用同一 field binding 与同一 scale identity。显式 field 未指定 scale 时，recipe 使用保留 identity `__chart.regression.scale.color` 的 Plot ordinal scale，并把 Plot resolver 的最终 `plot.palette.categorical` 物化为 range；省略 `color` 而存在 `series` 时，将 `series` 作为两者共同的 field-bound color，使用保留 identity `__chart.regression.scale.series-color`，并把最终 `plot.palette.series` 物化为 range。用户可以通过正式 `scales` 成员按对应 identity 调整合成 scale。

Smooth `groupBy` 由本段颜色规则确定。省略 `series` 而使用 color field 时，该 field 同时成为 Smooth grouping 与 trend Path `series`。`series` 与不同 color field 同时存在时，Smooth `groupBy` 同时包含 series 与 color field，使两个字段都保留在趋势输出中；trend Path 仍按 `series` 分组，并由 Plot 对输出 rows 验证每个 series 内颜色恒定，不恒定时整体 fail-loud。两者都省略时，recipe 调用 Plot 公开纯 resolver，从最终 series palette 第一项解析同一个常量，分别写入 Point color 与 trend Path stroke，不合成 scale、descriptor 或 legend。显式 color 始终优先于 series-only 和 palette default。

field-bound color 在 default legend 允许时生成一个绑定实际共享 scale identity 的 color legend；constant 与 palette default 不生成 color legend，显式 `guides` 仍整体替换表现性 defaults。

公开 patch contract 固定为：

- `RegressionPointPatch` 精确复用 ADR-04 `ScatterPointPatch`
- `RegressionSmoothPatch` 是 strict object，只允许 Plot Smooth 的 `method`、`sampleCount`、`extent`
- `RegressionPathPatch` 是 strict object，只允许 `curve`、`strokeWidth`、`opacity`、`lineCap`、`lineJoin`、`roundedCorners`、`fill`、`stroke`、`strokeOpacity`、`fillRule`、`thickness`、`marks`、`dashPattern`、`shadow`、`blendMode`、`label`

所有 value contract 直接复用对应 Plot schema。Path patch 特意不接受 `connectNulls`，也不接受 `type`、`id`、`order`、`series`、`closed`、`closure`、`encoding`、`transform`、`coordinateView`、`anchorId`、`zIndex`、`rotate` 或 `scale`。Recipe encoding / Smooth 先成立，Point 与 trend style patch 只覆盖各自允许的表现字段。

## 行为、失败语义与兼容性

- x / y 是严格 field-only roles，不接受 constant 或 binding-level scale
- `series` 同时驱动 Smooth grouping 与 Path series；color constant 可统一着色
- color field 省略 series 时自动成为 grouping；同时提供 series 与不同 color field 时二者共同进入 Smooth grouping，使趋势输出保留两个字段，但 Path 仍按 series 分组并要求组内颜色恒定；Chart 不预扫描 rows 或选择代表颜色
- field color 未指定 scale 时两个核心 Mark 共享消费最终 categorical palette 的保留 ordinal scale；continuous / temporal 字段必须显式引用兼容 scale
- 只有 series 时，两个核心 Mark 通过同一保留 ordinal scale 消费最终 series palette；若数据模型把该字段声明为 continuous / temporal，Plot 按正式 field / scale compatibility 诊断 fail-loud，用户必须显式提供兼容的 `color` 与 scale
- color 与 series 都省略时，Point 与 trend Path 使用最终 series palette 第一色的同一 resolved constant，不依赖 mark index 的默认色
- field-bound color 在默认 guide 允许时生成绑定实际 scale identity 的 color legend；constant 与 palette default 不生成 legend，显式 guides 整体替换 defaults
- 每个 Smooth group 必须保留至少两个 finite pair，且 x 至少有两个不同值；任一组失败时整个 Chart fail-loud，不只返回 points
- root transforms 先作用于共同输入，Smooth 再只处理 trend；Chart 不做数值 coercion 或回归算法 fallback
- coordinate / composition 复用二维 role contract，Point、trend 与 axes 始终属于同一 view；Polar 只改变 role projection，不闭合趋势

## 功能与包边界

- Chart 拥有 Regression 的复合 recipe、field roles、grouping / color 约束和 patch 边界
- Plot 拥有 Smooth definition、mark-local transform pipeline、Point / Path、field validation、coordinate、lowering 与 trace
- Chart 不实现拟合算法、不暴露第二根 dataset，也不捕获 Smooth 错误返回部分结果

## Transform output reservation capability gate

Regression 的保留输出字段只有在 Data / Plot owner 补齐正式 reservation preflight 后才能进入可执行 lowering：

1. preflight 在完整 transform registry 已解析后运行，内置与自定义 definition 都通过同一 `outputFields` contract 声明实际写入字段
2. Chart 保留字段随完整 PlotSpec 进入正式 Plot/Data 验证链；root transforms、显式 mark-local transforms、隐式 Smooth 之外的 Plot extensions 与声明 data model 统一参与冲突检查
3. 冲突必须在 transform 执行和 mark lowering 前 fail-loud，并稳定定位保留字段与冲突 writer；lowering、lineage 与 locator 使用同一份验证结果

该 gate 未解除时，可以构造并检查 Regression 的 owner-private ChartSpec 与完整 PlotSpec，但不得执行可能让外部 transform 静默覆盖保留字段的 lowering。Chart 不预扫描 operation 配置、不维护内置 transform 白名单、不禁用自定义 definition，也不复制 Data / Plot registry。

## 架构验证

- Canonical Type 判定：原始 observations 与拟合趋势同时存在，形成区别于 Scatter / Connected Scatter 的稳定配方
- 内部表达：趋势配方完全组合 Plot mark-local Smooth、Point 与 Path；保留字段冲突依赖 Data / Plot 正式 transform output reservation，不由 Chart 新建平行 transform contract
- 外部扩展：Smooth method 与表现样式沿现有 schema 调整，额外 Plot members 沿正式 extension 追加
- trace：Point locator 指向 root-transformed rows；trend series locator、Smooth group provenance 与 lineage 穿过 presentation 保持连续
- 依赖结论：完整 registry 下的 transform output reservation 是 Data / Plot 现有扩展闭环缺口，先下沉修复；gate 解除前 Regression 只形成 owner-private spec / recipe，不进入可执行 lowering

## 被否决方案

- 把 Smooth 放到 root：会替换 Point 输入并破坏原始 observations
- Chart 私自计算回归或吞掉坏组：会复制 Plot provider并产生部分结果歧义
- 允许任意 callback method：破坏 JSON-safe IR 与 adapter parity

## 测试策略摘要

需要 schema、mark-local rows、series / color grouping 与输出字段保真、四种 color / series 分支、scale identity / legend、Smooth 数据边界、transform output reservation preflight、coordinate / composition、core invariant、错误传播、inspection / trace 与三入口 parity 证据。reservation 证据必须覆盖完整 registry 中不同 transform 来源的保留字段冲突。关键不变量是 Point 保留共同输入，只有 trend 消费 Smooth rows，所有 group 要么共同成功要么整体失败。

## 不在本 ADR 范围

- 新回归算法、置信区间与统计显著性
- runtime callback method
- 把 fitted rows 暴露为第二根 dataset

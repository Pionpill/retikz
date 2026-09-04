# ADR-06：Regression 的分组拟合与复合 semantic mark

- 状态：Accepted
- 决策日期：2026-08-29
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [Data 能力完备设计](../../../../../architecture/data-capability-complete.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Regression 需要同时展示原始观测点与拟合趋势，并允许按一个稳定的数据角色为每组生成独立趋势线。原始 Point 必须继续读取 root transforms 与 encoding-derived operations 之后的共同数据；趋势 Path 则需要在同一数据视图上执行只属于自身的拟合，不能用 root transform 替换 Point 输入，也不能由 Chart 预扫描 rows、实现回归算法或建立第二条数据管线。

Plot 已拥有 mark-local transform、`Smooth` Definition、分组后的 replace output model、Path series、facet panel data view、scale domain、lineage 与 locator 主链。Regression 因此应成为 `point` family 的独立精确 recipe，并把算法扩展放入 Plot 的同一 `Smooth` contract，而不是恢复旧的根级 `type: 'regression'`、`components` 或 transform patch 模型。

## 决策：独立 Regression recipe 生成 Point 与 mark-local Smooth Path

Regression 使用 `namespace: 'chart'`、`type: 'point'` 与全局唯一的 `recipe.chartType: 'regression'`。它生成唯一 `kind: 'regression'` semantic group，组内按固定顺序包含原始 Point 与趋势 Path：Point 消费共同数据，Path 在当前 mark data view 上执行 `Smooth` 后消费派生趋势 rows。

`series` 是 Regression 私有的可选分组角色。省略时拟合整份当前数据视图；提供时按每个 series 独立拟合，并让 Point 与 Path 共享同一个 categorical color binding、scale identity 与 legend。Regression 不增加第二个可能与分组产生函数依赖冲突的字段颜色角色；常量外观继续通过 point / trend properties 表达。

理由：

1. Point 与趋势线必须共享 root transforms、字段解析、facet panel 与坐标上下文，同时保留各自不同的 row shape；mark-local transform 是唯一不复制数据主链的表达
2. `series` 同时承担分组与默认颜色，能为每条趋势线保留稳定 identity、legend、lineage 与 locator，不需要 Chart 合成复合 key 或扫描组内颜色
3. 回归方法是 Plot `Smooth` 的策略，Chart 只冻结 recipe 组合和可覆盖边界；内置与自定义 transform 继续经过 Data 的同一 Definition、registry、output model 与 apply pipeline
4. 一个 Regression semantic group 可以确定性生成多个 Plot marks，并让 `RegressionMark` 的追加或 override 始终替换完整的“观测点 + 趋势”语义

## 基础数据结构与公开契约

Regression 使用 Chart 公共 strict Source shell，并拥有独立的精确 recipe：

```ts
type IRRegressionChartRecipe = {
  chartType: 'regression';
  encodings: {
    x: RegressionPositionMapping;
    y: RegressionPositionMapping;
    series?: RegressionSeriesMapping;
    row?: RegressionPartitionMapping;
    column?: RegressionPartitionMapping;
    facet?: IRPlotFacetOptions;
  };
  properties?: IRRegressionChartProperties;
  marks?: Array<IRRegressionMark>;
};

type IRRegressionChartProperties = {
  method?: IRPlotSmoothMethod;
  sampleCount?: number;
  extent?: [number, number];
  point?: IRRegressionPointProperties;
  trend?: IRRegressionTrendProperties;
};

type IRRegressionMark = {
  kind: 'regression';
  override?: boolean;
  encodings?: {
    x?: string;
    y?: string;
  };
  properties?: IRRegressionChartProperties;
};
```

这些名称表示 Regression 的公开角色，不复制 Data / Plot 已拥有的字段 mapping、partition、facet、Point、Path 或 Smooth 原子。recipe 的 `x` 与 `y` 复用 Point position mapping；`series` 只接受 direct 字段映射及可选的 categorical color scale binding，不接受 aggregate 或 derived operation。`series` 是 recipe-only 的稳定 identity，所有内建与 authored Regression semantic group 都继承同一字段与 scale binding，不能在 `RegressionMark` 中改写。authored mark 与现有 Chart mark 一致，只能用共同 data view 中已经存在的 direct 字段名覆盖 x / y，不创建 mark 私有 encoding-derived operation 或 scale operation。

`IRRegressionPointProperties` 精确复用 Point 的完整常量 property vocabulary。`IRRegressionTrendProperties` 只接受 Plot Path 对应 constant branch 的 `stroke`、`strokeWidth`、`strokeOpacity`、`opacity`、`lineCap`、`lineJoin`、`zIndex`、`dashPattern`、`shadow` 与 `blendMode`；不接受字段绑定。trend properties 不能改写 Path 的类型、数据、position encoding、series、order、closed、closure、curve、fill、transform、coordinate view、趋势输出字段、label 或 decoration。

Plot 的 Smooth method 是严格判别联合：

```ts
type IRPlotSmoothMethod =
  | { kind: 'linear' }
  | { kind: 'quadratic' }
  | { kind: 'polynomial'; order?: number }
  | { kind: 'logarithmic' }
  | { kind: 'exponential' }
  | { kind: 'power' };
```

`polynomial.order` 是 2～6 的整数，省略时为 3。`quadratic` 是无额外配置的二次回归语义，内部可以复用多项式求解，但不是旧名别名。公开 discriminator 使用完整名称，不提供 `quad`、`poly`、`log`、`exp` 或 `pow` 兼容写法。

方法语义固定为：linear 对 `y = a + bx` 做普通最小二乘；quadratic 对 `y = a + bx + cx²` 做普通最小二乘；polynomial 对 `y = c₀ + c₁x + … + cₙxⁿ` 做普通最小二乘，其中 `n = order`；logarithmic 对 `y = a + b ln(x)` 做普通最小二乘；exponential 先对 `ln(y) = α + bx` 做普通最小二乘，再以 `a = exp(α)` 得到 `y = a exp(bx)`；power 先对 `ln(y) = α + b ln(x)` 做普通最小二乘，再得到 `y = a xᵇ`。Stage 1 不做权重、robust fitting 或非线性最小二乘，也不对系数或预测值做展示性舍入。

具体入口为：

- `@retikz/chart/point/regression`：Regression exact Source 与 provider contribution
- `@retikz/chart-vanilla/point/regression`：`normalizeRegressionChart` 与 `createRegressionChart`
- `@retikz/chart-react/point/regression`：`RegressionChart`、`RegressionEncodings`、`RegressionProperties` 与 `RegressionMark`

JSON、Vanilla 与 React 最终生成同一个 `IRRegressionChart`。`RegressionMark` 默认追加一组新的 Point 与趋势 Path；`override: true` 原位替换内建 `regression` semantic group，两种情况都保留不可移除的 mark-local Smooth 与完整复合结构。

## 行为、失败语义与兼容性

- 默认行为：`method` 省略时使用普通最小二乘线性回归；`sampleCount` 必须是至少为 2 的整数，省略时每组输出 64 个按 x 等距排列的预测点；`extent` 省略时每组使用当前有效观测的 x 范围
- 分组与颜色：省略 recipe `series` 时生成一条全局趋势，Chart 为 Point 与趋势 Path 写入同一 semantic group 内两个不同的 Plot `defaultColorGroup`，使省略 point color / fill 与 trend stroke 时依次使用 `palette.series` 的不同槽位；提供时每组独立拟合，Point 与 Path 使用同一个 categorical color scale identity，并默认生成一个 categorical legend。series 生成的 field color 高于 `point.color` / `point.fill` 与 `trend.stroke`，其它常量外观保持有效
- mark 继承：`RegressionMark` 省略的 x / y 与 properties 继承 recipe；显式 x / y 使用 direct 字段覆盖。所有 Regression group 无条件继承 recipe series；recipe 省略 series 时所有 group 都保持未分组，并为 Point 与趋势 Path 分别保留 member-local Plot 默认色板组。method / sampleCount / extent 按字段覆盖，point / trend block 按各自 property 字段合并。普通 mark 不增加自动 guide；`override: true` 也不改变 recipe scaffold，因此 recipe `series` 是共享 categorical scale 与默认 legend 的唯一来源
- 数据顺序：root transforms 与 encoding-derived operations 先作用于共同输入；Point 直接消费该数据，Smooth 只在趋势 Path 上运行。facet 时拟合针对每个 panel 的当前 rows 独立执行；坐标投影只改变最终展示，不改变数据空间中的拟合，趋势 Path 始终保持开放
- 模型约束：linear、logarithmic、exponential 与 power 每组至少需要两个有效 pair 和两个不同的自变量值；quadratic 至少需要三个，polynomial 至少需要 `order + 1` 个并形成满秩拟合。秩退化、不可确定系数或非有限预测必须 fail-loud
- 值域约束：非有限 x / y 沿用 Smooth 的无效 pair 策略；logarithmic 要求有限 x 为正，exponential 要求有限 y 为正，power 要求有限 x / y 都为正。方法值域不匹配、显式 extent 非递增、logarithmic / power extent 包含非正 x，或任一 series 有效样本不足时整张 Chart fail-loud，不降级为 Point-only 结果
- 结构约束：作者不能移除 Smooth、把它移到 root、改写其 input / output / groupBy、在 authored mark 改写 series、让 trend 读取原始 y、关闭或重排复合 semantic group，或让 Chart 私自实现拟合与 fallback；需要独立 series、完全控制 transform 或多数据视图时直接使用 Plot
- 失败与诊断：缺少 x / y、非法 recipe series、在 `RegressionMark` 中声明 series、未知 method、非法 polynomial order、未知 property / mark 字段、重复 Regression override、未注册 chartType / provider dependency、transform output model 不闭合及 Point / Path lowering 失败均由对应 schema、Chart resolve、Data transform 或 Plot owner 边界 fail-loud
- 兼容性：这是新的 `regression` chartType，并扩展既有 Plot Smooth method union；既有 Smooth 省略 method 或显式 `linear` 的行为保持不变。旧根 `type: 'regression'`、`encoding`、`components`、patch、短 method 名和兼容 fallback 不保留
- React / Vanilla 等价性：React 只把 declarations 组装成 Vanilla Input，Vanilla 只生成精确 Source；算法选择、分组、默认、mark-local transform、provider lookup、facet、lineage、locator 与 lowering 只在 Chart / Data / Plot 正式主链中解析

## 实现结果与剩余边界

Regression 已按本决策形成完整公开闭环：Plot Smooth 提供 linear、quadratic、polynomial、logarithmic、exponential 与 power 六种内置方法；Chart 以精确 Source 和复合 semantic group 组织 Point 与趋势 Path；JSON、Vanilla 与 React 入口复用同一 provider、resolve、transform 和 lowering 主链；用户文档覆盖基础用法、方法选择、分组、样式控制与公开 API

当前实现保留本 ADR 的 Stage 1 边界，不包含权重、robust fitting、非线性最小二乘、置信区间、系数输出或自定义 chartType 注册。需要完全控制数据视图、transform 或多层趋势结构时继续直接使用 Plot；这些扩展不构成当前 Regression 契约的残余实现缺口

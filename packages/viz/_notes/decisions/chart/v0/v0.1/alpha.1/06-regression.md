# ADR-06：Regression 的 mark-local Smooth 配方

- 状态：Proposed（公开 adapter 与 docs 受 ADR-04 capability gate 阻塞；可执行 lowering 另受 transform output reservation gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-05](./05-connected-scatter.md)

## 背景与目标

Regression 同时展示原始散点与拟合趋势。Plot 的 Smooth transform 会输出采样后的趋势 rows；若放在 Plot root，原始散点也会被替换，因此拟合必须是 trend Path 的 mark-local transform。

## 核心决策与基础数据结构

```ts
type RegressionChartIR = ChartCommon & {
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

recipe 固定生成原始 Point 与趋势 Path。Smooth 只挂在 trend Path，输入来自 x / y field，输出写入稳定派生字段；trend Path 读取派生字段，Point 继续读取 root-transformed 原始 rows。用户可调整 Smooth `method`、`sampleCount`、`extent` 与表现样式，但不能移除 Smooth、改变其 kind / input / output、把 transform 移到 root，或改写核心 Point / Path identity 与 view。

隐式输出字段固定为：

```ts
const trendX = '__chart.regression.trend.x';
const trendY = '__chart.regression.trend.y';
```

Smooth 使用 `xAs: trendX`、`yAs: trendY`；trend Path 使用 `order: trendX`、`closed: false`、`x: trendX`、`y: trendY`。这两个字段不得相同，不得出现在 Smooth `groupBy`，也不得由 root transform、显式 Plot extension 或声明 data model 输出 / 占用；冲突必须 fail-loud，不能覆盖、重命名或自动选择替代字段。

Point 与 trend Path 使用同一个 resolved color channel：显式 color constant 共享常量，显式 color field 共享 field binding 与 scale identity；省略 color 而有 series 时，series 同时作为 color 与 grouping；两者都省略时使用 Plot 最终 series palette 第一色的同一 constant。field-bound color 在默认 guide 允许时生成共享 scale identity 的 color legend，constant 不生成 legend，显式 guides 整体替换 defaults。

公开 patch contract：`RegressionPointPatch` 复用 ADR-04 `ScatterPointPatch`；`RegressionSmoothPatch` 只允许 Plot Smooth 的 `method`、`sampleCount`、`extent`；`RegressionPathPatch` 只允许 Plot Path 的 curve、stroke / fill、line、marks、shadow、blendMode、label 等表现字段。Path patch 不接受 `connectNulls`、`type`、`id`、`order`、`series`、`closed`、`encoding`、`transform`、view、anchor、zIndex、rotate、scale 或未知字段。

## 行为、失败语义与兼容性

- x / y 是严格 field-only roles，不接受 constant 或 binding-level scale
- `series` 驱动 Smooth grouping 与 Path series；color field 在省略 series 时成为 grouping；同时存在不同 color field 时两者共同进入 Smooth grouping，Path 仍按 series 分组并要求组内颜色恒定
- field color 未指定 scale 时使用 Plot categorical palette 的保留 ordinal scale；只有 series 时使用 Plot series palette 的保留 ordinal scale；continuous / temporal 字段必须显式引用兼容 scale
- 每个 Smooth group 至少有两个 finite pair 且 x 至少有两个不同值；任一组失败时整张 Chart fail-loud，不只返回 points
- root transforms 先作用于共同输入，Smooth 再只处理 trend；Chart 不做数值 coercion、回归算法或 fallback
- Point、trend 与 axes 属于同一 view；coordinate / composition 复用二维 role contract，Polar 只改变 role projection，不闭合趋势

## 功能与包边界

Chart 拥有 Regression recipe、field roles、grouping / color 约束与 patch 边界；Plot 拥有 Smooth definition、mark-local transform pipeline、Point / Path、field validation、coordinate、lowering 与 trace。Chart 不实现拟合算法、不暴露第二根 dataset，也不吞掉 Smooth 错误返回部分结果。

## 当前实现结果与遗留风险

本 ADR 已冻结 Point 保留共同输入、trend 独占 Smooth rows、保留输出字段与 color / grouping 语义，状态仍为 Proposed。可执行 lowering 必须依赖 Data / Plot 统一的 transform output contract：所有内置与自定义 definition 都声明实际写入字段，保留字段冲突在 transform 执行和 mark lowering 前定位并失败，且 lowering、lineage、locator 使用同一验证结果。

长期风险是 Chart 不能以 operation 预扫描、内置白名单或私有 registry 替代 Data / Plot 的 output reservation；否则会导致外部 transform 静默覆盖派生字段并破坏 Point / trend parity。

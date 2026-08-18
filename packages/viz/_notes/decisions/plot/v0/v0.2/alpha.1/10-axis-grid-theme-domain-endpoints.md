# ADR-10：Axis grid 值域端点主题默认

- 状态：Accepted
- 决策日期：2026-08-10
- 关联：[plot v0.2 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-08：Axis 主题 Token 作用域规则](./08-axis-theme-token-rules.md) · [ADR-09：Axis grid 包含值域端点](./09-axis-grid-domain-endpoints.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

ADR-09 已允许单个 Axis guide 通过 `grid.includeDomain` 保留常规网格，同时保证 effective scale domain 首尾位置具有主网格线。该字段默认关闭，并被限定在 guide 局部结构语义中；Plot Theme 只能决定网格是否默认启用及其线条视觉样式。

这条边界使内建风格无法完整表达自己的 Axis 参考框架。Neutral 已为 x / y Axis 默认启用低对比网格，但不能声明这些默认网格应覆盖 effective domain 两端；若在 guide lowering 中按风格名硬编码，用户又无法通过统一 Theme cascade 检查、覆盖或扩展该行为。

本决策把“已启用的主网格是否补齐 domain 端点”提升为 Axis-scoped canonical Theme 默认。Neutral 的 x / y Axis 默认开启该策略，其余内建风格保持关闭；单个 Axis guide 的显式配置仍拥有最高优先级。

本决策窄化取代 ADR-08 中“Axis token 只覆盖视觉默认、grid token 不改变 source 语义”的限制，以及 ADR-09 中“Theme 不得提供端点默认”的限制。ADR-08 的统一 Axis rule 机制与 ADR-09 的 guide 字段、端点解析、投影去重和非目标继续有效。

## 决策：用 canonical Axis token 表达端点默认

Plot Theme 增加 `axis.grid.includeDomain` boolean token，并把同名字段纳入原生 Axis grid theme。该 token 只为 Theme 当前已启用的 major grid 提供默认值，不单独创建 grid，不修改 scale domain、tick source、density 或 minor grid。它调整的是与 `axis.grid.enabled` 同属一组的辅助参考结构，不改变数据、mark 几何或交互语义。

理由：

1. ThemeStyle 已通过 `axis.grid.enabled` 和 dimension rule 决定已有 Axis 的网格默认；端点覆盖是同一 Axis grid 默认的正交组成，应复用相同 token、rule、inspection 与 cascade，而不是建立风格专用分支。
2. canonical token 使内建风格、自定义 Plot style、全局 token、Axis-scoped rule、原生 Plot theme 与局部 guide 共享一条可检查、可覆盖的链路。
3. Vega-Lite 的 `config.axis` 与 `axisX` / `axisY`、ECharts theme 的 axis family / split-line 默认以及 Highcharts 的 Axis 默认均把轴级结构与视觉默认放在统一配置面，并让单轴配置覆盖全局默认。Retikz 采用同一原则，但不复制其字段或实现，也不让端点默认改变 scale domain。

## 基础数据结构与公开契约

canonical token 增加：

```ts
const PlotThemeToken = {
  AxisGridIncludeDomain: 'axis.grid.includeDomain',
} as const;
```

完整 token map 中该字段为必需 boolean；用户的稀疏 `plotThemeTokens` 与 Axis-scoped token rule 中该字段可选。原生 Plot Axis theme 的 grid object 增加同名可选字段：

```ts
type IRPlotTheme = {
  axis?: {
    grid?:
      | false
      | {
          // 既有 Axis grid line style
          includeDomain?: boolean;
        };
  };
};
```

内建 style 的基础 token 值均为 `false`。Neutral 通过既有 x / y dimension rule 同时设置：

```ts
{
  select: { dimension: ['x', 'y'] },
  tokens: {
    'axis.grid.enabled': true,
    'axis.grid.includeDomain': true,
  },
}
```

Academic、Vibrant 与 Clean 不新增端点 rule，继续使用基础 `false`。自定义 Plot style 通过既有 definition 返回同一 token 与 token rule，不新增 registry 或专用 preset contract。

## 行为、失败语义与兼容性

- 默认行为：Neutral 下已有 x / y Axis 的默认 major grid 包含 effective domain 首尾位置；其他内建风格默认不包含。
- 创建边界：`axis.grid.includeDomain: true` 不单独启用 grid。当前 dimension 的有效 `axis.grid.enabled` 为 `false` 时，该 token 保持休眠且不进入原生 Axis theme。局部 guide 随后以 `grid: true` 重新启用网格时，沿用既有 disabled-theme merge 语义，不恢复休眠的 grid 默认；需要端点时应写入 guide object，或在更高优先级 Theme 输入中同时启用 grid。
- 合并语义：Theme 值只作为 guide 默认；局部 `grid.includeDomain` 显式 boolean 覆盖 Theme，局部 `grid: false` 关闭整个 grid。
- 优先级：单个 Axis guide > 原生 `plotTheme.axis.grid` > Plot-local Axis token rule > `plotThemeTokens` > 内建 style rule > 内建基础 token。
- 端点语义：启用后的 source → density → endpoints 顺序、effective domain、有限投影、`bandPosition`、循环坐标去重与 major-over-minor overlap 继续由 ADR-09 决定。
- ThemeMode：Light / Dark 使用相同 boolean；mode 只继续调整 paint，不改变端点结构。
- 失败与诊断：token 与原生 theme 字段只接受 boolean；未知字段、显式 `undefined` 和错误类型沿用严格 Theme schema 的现有诊断。
- 兼容性：这是 Neutral 默认输出的有意变化，已启用的 x / y 主网格最多新增两个端点位置。显式写入 guide 或更高优先级 Theme 值可恢复关闭状态；其他 style 与未启用 grid 的 Axis 输出不变。完整 token map 增加必需字段，因此自定义 Plot style definition 必须显式返回该 token；0.x 阶段不增加缺省补全或兼容 fallback。
- React / Vanilla 等价性：两套 adapter 与手写 JSON 继续传递同一 Plot theme token、原生 theme 与 Axis guide 契约，不增加 adapter 专用 prop。

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete 的 Plot Theme / Guide 协作面，解决 ThemeStyle 无法声明 Axis major grid 端点默认的问题。
- 主责包与协作包：`@retikz/plot` 拥有 token、style definition、resolver、native theme 映射、guide merge 与 lowering；Core 只提供 effective Theme style / mode，Chart 只转发 Plot 公开输入，React / Vanilla 只提供等价 authoring。
- 拥有：端点 Theme token、Axis dimension rule、统一 cascade、原生 Theme 映射和局部 guide 覆盖。
- 不拥有：scale domain 推断、端点几何、renderer 描边、Chart recipe、Core Theme token 或跨领域 Axis contract。
- 外部扩展与下游闭环：自定义 Plot style 和 Plot-local Axis rule 使用同一 canonical token；解析后映射为原生 Axis theme，再由既有 guide merge 写入 ADR-09 的 guide 字段，最终沿同一 Plot lowering 输出 Core Path。
- 不支持边界：按 ThemeMode 改变端点策略、按 start / end 分别控制、minor grid 自动端点、端点专用样式、按 scale family 新增 selector 或由 token 创建 Axis / grid。

## 最终结果与遗留边界

`axis.grid.includeDomain` 已贯通完整与稀疏 token map、Axis dimension rule、原生 Plot Theme、inspection 和 guide merge。Neutral 的既有 x / y Axis 默认同时启用 major grid 与 domain 端点，其余内建风格保持关闭；端点 token 自身不创建 grid，局部 guide boolean 继续最终优先。

完整 resolved token map 必须包含该 boolean，自定义 Plot style 缺失时 fail-loud；稀疏 token、Axis rule 与原生 Theme 允许省略字段，但拒绝显式 `undefined`、未知字段和错误类型。端点追加、投影去重、density 顺序与 minor overlap 继续完全由 ADR-09 的既有 lowering 决定。

## 长期边界

- 改变 Academic、Vibrant 或 Clean 的端点默认。
- 把所有 guide 结构字段开放为 Theme token。
- 修改 Neutral 的网格颜色、线宽、透明度、tick source 或 density。
- 新增 scale family、coordinate kind、Axis placement 或 ThemeMode selector。
- 改变 ADR-09 的端点投影、去重、排序与 minor overlap 规则。

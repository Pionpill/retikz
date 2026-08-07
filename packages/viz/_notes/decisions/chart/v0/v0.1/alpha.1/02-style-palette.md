# ADR-02：Chart presentation token 与 Plot theme 转发

- 状态：Proposed
- 决策日期：2026-08-07
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 基础设施 ADR-01](./01-chart-infrastructure.md) · [Plot 主题 ADR-01](../../../../plot/v0/v0.2/alpha.1/01-chart-layering.md) · [Plot inherited theme token ADR-02](../../../../plot/v0/v0.2/alpha.1/02-inherited-theme-token-scope.md) · [Core ADR-13：Theme Token Namespace Context 与共享颜色](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/13-theme-token-namespace-context.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [通用视觉主题设计](../../../../../../../../notes/architecture/visual-theme-design.md)

## 背景与目标

Chart 是 Plot 之上的封闭类型封装。它需要为 Chart canvas、title / subtitle / caption / note / source / credit 等 presentation，以及 recipe 默认 axis / grid / legend 是否生成，提供稳定、可覆盖的表现性默认；同时必须让内部 Plot 与直接使用的 Plot 在同一 Core effective Theme 下得到相同的 Plot resolution。

早期 Chart style contract 同时承载 Chart presentation 和 Plot surface、guide、label、palette，造成 Chart 与 Plot 的重复 token vocabulary。Core ADR-13 和 Plot v0.2-alpha.1 ADR-02 已冻结 namespace context 与 Plot contribution；本 ADR 将 Chart 的输入、definition 聚合和 owner 边界对齐到这条主链。

本 ADR 对 Chart 基础设施 ADR-01 中“全部 variant 共享 forwarded `theme`”的字段表述作出替代：Plot-compatible 视觉轴仍由全部 variant 共享，但公开字段改为 `plotThemeTokens`、`colors` 与 `plotTheme`；旧 `theme` 不再属于 ChartSpec contract。

## 决策：Chart 拥有 presentation，Plot 拥有 Plot theme

Chart 只拥有 Chart canvas、presentation 和 recipe-default token。Plot surface、typography、label、Axis / Legend visual token、palette 与 native theme 全部由 Plot owner 解析。Chart 不复制 Plot schema、preset、resolver、merge 或 resolved map。

ChartSpec 不重复保存 Core 的 `style`、`mode` 或 `themeMode`。Chart Composite 从当前位置读取完整 Core effective Theme，并把同一环境分别交给 Chart resolver 与 Plot resolver。

## 基础数据结构与公开契约

Chart 的主题 authoring surface 固定为：

```ts
type IRChartThemeInput = Readonly<{
  chartThemeTokens?: IRChartThemeTokenOverrides;
  plotThemeTokens?: IRPlotThemeTokenOverrides;
  colors?: IRPlotSpec['colors'];
  plotTheme?: IRPlotSpec['plotTheme'];
}>;
```

- `chartThemeTokens` 只接受 Chart-owned strict、flat、dot-namespaced token
- `plotThemeTokens` 复用 Plot owner 的 strict sparse schema，并作为 Plot contribution 进入最终 PlotSpec
- `colors` 是 Plot 的显式颜色 shorthand，仍由 Plot resolver 消费
- `plotTheme` 是 Plot native structured theme，仍由 Plot resolver 消费
- Chart 不提供 `styleTokens`、`plotStyleTokens`、`theme` 或 `themeMode` 的兼容别名

Chart 的公开 definition 与 contribution 使用 Core 通用协议：

```ts
type ChartThemeTokenDefinition = ThemeTokenDefinition<'chart', IRChartThemeTokenOverrides>;

declare const defineChartThemeTokens: (
  tokens: IRChartThemeTokenOverrides,
) => ThemeTokenContribution<'chart', IRChartThemeTokenOverrides>;
```

`ChartThemeTokenDefinition` 是 Chart 导出的冻结 singleton，绑定 Chart owner 的 strict sparse schema；`defineChartThemeTokens` 只产生 JSON-safe contribution，不携带 schema、函数、ReactNode、class instance 或 renderer handle。Chart adapter 聚合 Chart definition 与 Plot definition，因为每条 Chart lowering 主链都消费 Plot；standalone Chart 与 embedded Chart 使用同一聚合语义，同一 singleton 的重复聚合按 Core contract 去重，同 namespace 的不同 definition 对象 fail-loud。direct headless `compileToScene()` 或 plain JSON 使用方必须在 `CompileOptions.themeTokenDefinitions` 中显式注入 Chart 与 Plot definitions，Core 不静态导入 Chart / Plot 语义，也不隐式猜测 owner。

Chart token 的长期语义包括 canvas surface、presentation slot 的 foreground / font / alignment、padding、gap，以及只控制 recipe 默认生成的 `chart.axis.enabled`、`chart.axis.grid.enabled`、`chart.legend.enabled`。这些开关不能过滤显式 guides，也不能撤销 Chart type 的核心 recipe。

## 行为、默认值、失败语义与兼容性

未声明 Theme 时使用 Core `neutral + light` effective environment；Chart 使用与该环境相容的 Chart preset，Plot 使用 Plot owner 的对应 preset。ChartSpec 省略 theme fields 不产生第二套默认 environment，也不把 style / mode 写入 ChartSpec。

Chart 与 Plot 的输入必须是 plain JSON-safe data。unknown Chart key、未知 presentation slot、非法 value、重复 namespace、冲突 definition、无法消费的 Chart token、Plot namespace / key / value 错误都 fail-loud，并指向可修改的输入层和 namespace / key 路径。Chart 不静默回退 renderer 默认、Chart palette 或旧字段。

这是 `0.x` 的破坏性命名迁移：

- `styleTokens` → `chartThemeTokens`
- `plotStyleTokens` → `plotThemeTokens`
- forwarded Plot `theme` → `plotTheme`
- ChartSpec 重复的 `style` / `themeMode` → 外层 Scene / Scope Theme

不保留 alias、双读或静默 bridge。主题只能调整可撤销的表现性默认，不能改变 Chart type 核心配方、数据角色、Plot lowering 或 Standard composition 的核心不变量。

React 局部 `theme` 与在 Chart 外建立等价 Core Scope Theme 同义，只影响该 Chart 及其 lowering 后代；Vanilla、SSR、plain JSON 与 direct headless 使用同一 IR、definition registry、cascade 和诊断语义。

## Cascade 与 Plot handoff

Chart 与 Plot 在同一 Core effective Theme 下分别解析：

```text
Core effective Theme
  -> Chart style/mode preset
  -> inherited theme.tokens.chart
  -> local chartThemeTokens
  -> explicit Chart presentation / recipe config

Core effective Theme
  -> Plot style/mode preset
  -> shared categorical projection
  -> inherited theme.tokens.plot
  -> local plotThemeTokens
  -> colors
  -> plotTheme
  -> explicit Plot scale / channel / guide / mark config
```

Chart 调用 Plot resolver 时传入同一 inherited Plot namespace 与 Chart-local `plotThemeTokens` contribution；Chart 不把 Plot namespace 改写成 Chart namespace，也不把 resolved Plot map 物化回 ChartSpec。Chart recipe 需要默认 series color 时，只消费 Plot resolver 的最终 palette，绝不直接索引 Core shared categorical array。

显式 Chart presentation / recipe config 只能覆盖 Chart-owned defaults；显式 Plot config 只能沿 Plot owner 的优先级覆盖 Plot palette 和 native theme。Chart 不复制 Plot source inspection，inherited Plot token 不能被标记成 Chart-owned。

## 功能与包边界

- 所属能力域与解决的问题：Chart Encapsulation Complete 的 presentation / recipe default resolution 与 Plot consumption boundary
- `@retikz/chart` 拥有 ChartSpec、Canonical Type recipe、Chart token vocabulary、preset、resolver、mapping、inspection 与 Chart + Plot definition aggregation
- `@retikz/plot` 拥有 Plot token vocabulary、shared categorical projection、Plot palette、named schemes、resolver、mapping 与 Plot inspection
- `@retikz/core` 拥有 Theme namespace bag、继承、ThemeTokenDefinition registry、owner schema runtime validation、shared colors 与 Composite context
- `@retikz/standard` 拥有领域无关 surface / layout / presentation composite；只消费已解析的正式输入与 `InspectionAppearance`
- chart-react、chart-vanilla 与 Plot adapters 只构造等价 JSON-safe input、聚合 definitions 和接入宿主生命周期
- Render 只执行已物化 Scene，不解析 Chart 或 Plot Theme

Chart 不拥有 Plot token、Plot preset / resolver、Plot native theme merge、Table token、Core shared palette policy、CSS theme 或 renderer-specific style。Chart 不建立 Chart registry 或自定义 Chart type registry；需要新增 Plot provider 时沿 Plot 正式 registry 扩展。

## 架构验证与能力完备性

- 现有 Core effective Theme、Plot resolver、Standard composition 与 Chart type recipe 足以组合本能力；Chart 新增的是 presentation token owner、Plot handoff 与 definition aggregation，不新增 GoG 能力轴
- Core 负责 namespaced context、registry binding 与 validation；Chart 负责 Chart vocabulary / preset / resolver / mapping；Plot 负责 Plot vocabulary / preset / resolver / mapping；Standard 负责通用布局；adapter 只提供等价入口
- Chart adapter 聚合 Chart + Plot definitions，standalone、embedded 与 direct headless 都必须能在同一 registry 下得到同一 owner validation；Chart 不建立旁路 theme registry
- 闭环为 effective Theme → Chart / Plot namespace validation → 各自 resolver → Chart presentation + complete PlotSpec → Standard / Core lowering → Scene / manifest / inspection
- Chart 默认 series color 的唯一入口是 Plot resolver 最终 palette；Core shared categorical 只经 Plot projection 进入 Plot palette，Standard Inspector 只消费 Core `InspectionAppearance`
- 本轮结论：扩展 Chart Encapsulation 的主题编排边界，组合 Core / Plot / Standard 现有能力，不把 Plot 视觉语义吸回 Chart

## 被否决方案

- Chart 继续维护 Plot token catalog：会使直接 Plot 与 Chart 内 Plot 分叉
- Chart 直接读取 Core shared categorical：会绕过 Plot palette resolver 和 source inspection
- Chart 先 materialize 完整 Plot theme 再交给 Plot：会遮蔽 inherited/local source 并复制 cascade
- 在 ChartSpec 重复保存 style / mode：会绕开 Scene / Scope 继承并产生嵌套漂移
- 让 adapter、CSS 或 renderer 根据 preset 名称补默认：会破坏 JSON、React、Vanilla、SVG 与 Canvas parity
- 为了 definition 聚合建立 Chart 私有 registry：会复制 Plot 的 provider extension contract

## 测试策略摘要

需要 schema / type 证据证明 Chart token、Plot handoff、命名迁移与 ChartSpec JSON-safe 边界；registry 证据证明 Chart + Plot definitions 在 standalone、embedded、React、Vanilla 与 direct headless 入口同路聚合、去重和失败；resolution 证据证明 inherited chart namespace、local chart tokens、同一 inherited plot namespace、local plot tokens、Plot final palette 与 recipe defaults 的 owner isolation；adapter / renderer parity 证据证明局部 React Theme 等价 Scope，Chart 默认 series color 不绕过 Plot resolver，最终 SVG / Canvas 只消费同一 Scene。详细矩阵属于后续 ignored implementation plan。

## 不在本 ADR 范围

- Plot canonical token 目录、具体 Plot preset 色值、scale scheme 与 interpolator
- Chart type 清单、核心 recipe 字段、数据角色和新增 Mark / Transform 能力
- Table、Geo 或其它领域 token vocabulary
- Core shared color preset 的具体色值、命名主题 loader、远程分发与宿主 UI theme
- Chart interaction state、tooltip、brush、selection、animation、dashboard 与 export chrome

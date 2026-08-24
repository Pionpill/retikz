# ADR-02：Chart presentation token 与 Plot theme 转发

- 状态：Superseded（2026-08-22，由 [ADR-09](./09-family-recipe-chart-schema.md) 的三 owner Theme slice 与 Core mode / style cascade 替代）
- 决策日期：2026-08-07
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 基础设施 ADR-01](./01-chart-infrastructure.md) · [Chart authoring ADR-03](./03-presentation-standard-layout.md) · [Plot 主题 ADR-01](../../../../plot/v0/v0.2/alpha.1/01-chart-layering.md) · [Plot inherited theme token ADR-02](../../../../plot/v0/v0.2/alpha.1/02-inherited-theme-token-scope.md)
- Supersedes：Core ADR-15 已取代 ADR-13 的持久化 namespace bag、Theme token Definition / Contribution 与 Core token registry；本文采用轻量 selector、owner-local style definition 与本地 token 输入

## 背景与目标

Chart 需要为 Chart canvas、title / subtitle / caption / note / source / credit 等 presentation，以及 recipe 默认 axis / grid / legend 是否生成，提供稳定、可覆盖的表现性默认；同时必须让内部 Plot 与直接使用的 Plot 在同一 Core effective Theme 下得到相同的 Plot resolution。

Chart 不再重复拥有 Plot surface、guide、label 或 palette 的 token vocabulary。本 ADR 也替代 ADR-01 中“全部 variant 共享 forwarded `theme`”的字段表述：公开字段改为 `plotThemeTokens`、`colors` 与 `plotTheme`，旧 `theme` 不属于 IRChart contract。

## 核心决策

Chart 只拥有 Chart canvas、presentation 和 recipe-default token。Plot surface、typography、label、Axis / Legend visual token、palette 与 native theme 全部由 Plot owner 解析。Chart 不复制 Plot schema、preset、resolver、merge 或 resolved map。

IRChart 不重复保存 Core 的 `style`、`mode` 或 `themeMode`。Chart Composite 从当前位置读取完整 Core effective Theme，并把同一环境分别交给 Chart resolver 与 Plot resolver。

## 基础数据结构与公开契约

```ts
type IRChartThemeInput = Readonly<{
  chartThemeTokens?: IRChartThemeTokenOverrides;
  plotThemeTokens?: IRPlotThemeTokenOverrides;
  colors?: IRPlot['colors'];
  plotTheme?: IRPlot['plotTheme'];
}>;
```

- `chartThemeTokens` 只接受 Chart-owned strict、flat、dot-namespaced token
- `plotThemeTokens` 复用 Plot owner 的 strict sparse schema，并作为 Plot-local 输入进入最终 IRPlot
- `colors` 是 Plot 的显式颜色 shorthand，仍由 Plot resolver 消费
- `plotTheme` 是 Plot native structured theme，仍由 Plot resolver 消费
- 不提供 `styleTokens`、`plotStyleTokens`、`theme` 或 `themeMode` 的兼容别名

Chart 公开 owner-local `ChartThemeDefinition`，通过可选 `base` 与稀疏 owner slices 表达命名覆盖。Chart adapter 注入 Chart definitions 与 Plot style definitions；standalone、embedded 与 direct headless 使用同一 owner registry 和 name lookup。plain JSON 只持久化 selector 与 IRChart 本地字段，Core 不静态导入 Chart / Plot 语义，也不隐式猜测 owner。

Chart token 的长期语义包括 canvas surface、presentation slot 的 foreground / font / alignment、padding、gap，以及只控制 recipe 默认生成的 `chart.axis.enabled`、`chart.axis.grid.enabled`、`chart.legend.enabled`。这些开关不能过滤显式 guides，也不能撤销 Chart type 的核心 recipe。

## 行为、默认值、失败语义与兼容性

未声明 Theme 时使用 Core 匿名 light effective environment；Chart 从 shell / recipe fallback 建立默认值，Plot 使用自己的 mode-aware 默认 preset。IRChart 省略 theme fields 不产生第二套默认 environment，也不把 style / mode 写入 IRChart。

unknown Chart key、未知 presentation slot、非法 value、缺失同名 style definition、无法消费的 Chart token、Plot key / value 错误都 fail-loud，并指向可修改的输入层和 token path。Chart 不静默回退 renderer 默认、Chart palette 或旧字段。

这是 `0.x` 的破坏性命名迁移：`styleTokens` → `chartThemeTokens`，`plotStyleTokens` → `plotThemeTokens`，forwarded Plot `theme` → `plotTheme`，IRChart 重复的 `style` / `themeMode` → 外层 Scene / Scope Theme。不保留 alias、双读或静默 bridge。主题只能调整表现性默认，不能改变 Chart type 核心配方、数据角色、Plot lowering 或 Standard composition 的核心不变量。

React 局部 `theme` 与等价 Core Scope Theme 同义，只影响该 Chart 及其 lowering 后代；Vanilla、SSR、plain JSON 与 direct headless 使用同一 selector IR、owner-local style registry、cascade 和诊断语义。

## Cascade 与 Plot handoff

```text
Core effective Theme
  -> Chart shell / recipe fallback -> named sparse owner slices -> local chartThemeTokens -> explicit Chart presentation / recipe config

Core effective Theme
  -> Plot style/mode preset -> shared categorical projection -> local plotThemeTokens
  -> colors -> plotTheme -> explicit Plot scale / channel / guide / mark config
```

Chart 调用 Plot resolver 时传入同一 effective Theme 与 Chart-local `plotThemeTokens`；Chart 不把 Plot token 改写成 Chart token，也不把 resolved Plot map 物化回 IRChart。默认 series color 只消费 Plot resolver 的最终 palette，不直接索引 Core shared categorical array。Chart-owned style baseline 与 `chartThemeTokens` 记录为 Core `ThemeTokenSource.Local`，Plot 的 inherited value 仍由 Plot owner 记录。

## 功能与包边界

Chart 拥有 Chart token vocabulary、preset、resolver、mapping、inspection 与 Chart + Plot definition 注入；Plot 拥有 Plot token vocabulary、palette、named schemes、resolver、mapping 与 Plot inspection；Core 拥有 selector 继承、style registry、shared colors 与 Composite context；Standard 拥有领域无关 surface / layout / presentation composite。adapter 只构造等价 JSON-safe input、注入 definitions 和接入宿主生命周期，Render 只执行已物化 Scene。

Chart 不拥有 Plot token、Plot preset / resolver、Plot native theme merge、Table token、Core shared palette policy、CSS theme 或 renderer-specific style，也不建立 Chart registry 或自定义 Chart type registry。

## 当前实现结果与遗留风险

当前冻结的是 owner-local Chart theme contract、Plot handoff 和命名迁移边界；ADR 状态仍为 Proposed，公开 Chart adapter、完整 canvas surface 与 Chart → Plot 空间透明性尚未形成统一的公开结果。

后续实现必须保持 Chart / Plot effective Theme 同源、owner isolation、JSON / React / Vanilla parity，并让 identity、provenance、locator 与 lineage 穿过 presentation；不能以 adapter、CSS 或 renderer 默认补齐缺失契约。

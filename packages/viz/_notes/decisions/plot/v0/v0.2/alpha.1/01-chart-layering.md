# ADR-01：Plot 主题 token 所有权与 Chart 消费边界重构

- 状态：Accepted
- 决策日期：2026-08-06
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [plot v0.2 roadmap](../roadmap.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md) · [Chart 基础设施 ADR-01](../../../../chart/v0/v0.1/alpha.1/01-chart-infrastructure.md) · [通用视觉主题设计](../../../../../../../../notes/architecture/visual-theme-design.md) · [原子契约与组合设计](../../../../../../../../notes/architecture/atomic-contract-design.md)

## 背景与目标

Plot 是数据语义到 Core 图形语义的 Grammar-of-Graphics owner；Chart 是建立在 Plot 之上的封闭类型封装。当前 Chart 已不再是对裸 PlotSpec 做一次自动装饰的无 IR helper，而是拥有 JSON-safe ChartSpec、封闭 Canonical Type recipe、统一 resolution、结构化 inspection 和逐类型 Composite，并把图本体解析为完整 PlotSpec，把单图 presentation 交给 Standard 组合。

这一实现证明了 Chart / Plot 的纵向分层，但早期主题实现把 Plot surface、axis、legend 与 palette token 统一定义在 Chart，再映射为 Plot theme。该顺序使直接使用的 Plot 无法独立响应 Core effective Theme，也让 Chart 实际拥有了 Plot guide 与 palette 的同义 token vocabulary，与 Visualization Complete 和原子 owner 规则冲突。

本 ADR 解决两个长期问题：

1. 以当前 ChartSpec 与封闭 recipe 主链重新冻结 Chart / Plot 的单向分层，不恢复早期“PlotSpec 装饰 helper”模型
2. 把 Plot 视觉 token、preset、解析和映射收回 `@retikz/plot`，让直接 Plot 与 Chart 内部 Plot 消费同一 Core Theme 环境和 Plot contract

## 决策：Chart 保持独立封装，Plot 先完成领域主题闭环

Chart 保持独立 Tier 3 包：ChartSpec 选择封闭 Canonical Type，Chart recipe 生成完整 PlotSpec，并可把 Chart presentation 与 Plot body 组合为单一 renderer-neutral 结果。Chart 不拥有新的 GoG、Plot registry、Plot lowering 或 renderer 路径；Plot 也不解释 ChartSpec 或把 Chart 作为 Plot member。

Plot 作为 Visualization Complete owner，拥有 Plot surface、guide、label 和 palette 的 canonical theme token vocabulary、四种通用 style 在 light / dark mode 下的领域 preset、token resolver、到 `IRPlotTheme` 与正式 guide / scale / lowering 输入的映射，以及相应 inspection。Chart 只拥有 Chart presentation 与 Chart recipe 表现性默认；需要配置内部 Plot 时，组合或传递 Plot 公开 token contract，不复制 Plot key、value schema、preset 或 merge 规则。

Core 继续只拥有 `ThemeStyle`、`ThemeMode`、Scene / Scope 继承与 Composite effective Theme context，不拥有 Plot 或 Chart token。Plot 与 Chart 在同一 effective Theme 下分别解析自己的 token family；最终 Core primitive 只接收已经物化的显式样式值，不按 preset 名称分支。

理由：

1. Axis、Legend、Plot label 与 palette 是 Plot 可视化语义，直接 Plot 与 Chart 内部 Plot 必须共享一个 owner 和一条消费主链
2. Chart 的价值是封闭类型配方、稳定覆盖、presentation 与 inspection，不是替 Plot 建立主题前置层
3. Core Theme context 已能向 Composite 提供完整 style / mode，领域包继续维护同义环境字段只会产生不一致默认
4. Chart 生成的 PlotSpec 保持可独立校验和检查后，Plot 可以统一处理 direct、nested、React、Vanilla 与手写 JSON 输入

## 基础数据结构与公开契约

### Chart / Plot resolution 边界

```text
ChartSpec
  -> closed Chart recipe + invariant validation
  -> complete PlotSpec + optional Chart presentation
  -> Plot lowering + Standard presentation composition
  -> Core IR
```

- ChartSpec 是独立、严格、JSON-safe 的封闭判别 union，不是 PlotSpec alias
- Chart recipe 可以复用、组合或提供符合现有 Plot contract 的具体 definition，但不能增加新的 GoG 能力轴或私有执行路径
- Chart 可以包含显式 Plot members；Plot 不包含 Chart
- 完整 PlotSpec 必须可独立校验与 inspection，Chart 最终组合不能吞掉 Plot 的 identity、provenance、locator 或空间 handle
- Chart type 核心配方不可被表现性配置撤销；theme token 只控制可撤销的视觉默认

### Plot theme token contract

PlotSpec 在既有 `colors` shorthand 与原生 `IRPlotTheme` 之外，提供 Plot-owned sparse token override：

```ts
type IRPlotSpec = {
  styleTokens?: IRPlotStyleTokenOverrides;
  colors?: ReadonlyArray<string>;
  theme?: IRPlotTheme;
};
```

`PlotStyleToken` 是 canonical key 的 const object enum，`IRPlotStyleTokenOverrides` 从严格、稀疏、JSON-safe 的 `PlotStyleTokenOverridesSchema` 派生；完整消费态 `IRPlotResolvedStyleTokens` 从 required `PlotResolvedStyleTokensSchema` 派生。两份 schema 必须组合同一份 canonical field contract，内置 preset 也必须通过 required schema；不得为 sparse override、resolved map 与 preset 分别手写同义字段或 TS interface。Plot 从包根公开 key、两份 schema 与派生 type，供直接 Plot、Chart 和外部主题数据包消费。

原子 owner 固定如下：

| Token value 语义                  | 权威原子契约                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| surface / guide line paint        | Core `PaintValueSchema` / `IRPaintValue`                                                           |
| guide text foreground             | Plot `GuideTextStyleSchema` 的 `textColor` 字段                                                    |
| font family / size / weight       | Core `FontSchema` / `FontSizeSchema` 的对应字段                                                    |
| opacity                           | Core `OpacitySchema`                                                                               |
| axis line / grid / tick / gap     | Plot `AxisLineStyleSchema`、`AxisGridLineStyleSchema`、`AxisTickMarkSchema` 与 tick-label gap 字段 |
| legend title / label text         | Core text / font atoms，经 Plot guide text contract 收窄                                           |
| legend title / sample / entry gap | Standard Legend / layout 的对应 gap atom                                                           |
| legend swatch / ramp / symbol     | Plot-owned guide-to-sample size / scale / fit atom，映射为 Standard Legend sample                  |
| categorical / series / sector     | Plot-owned non-empty ordered palette atom；元素复用 Core CSS color atom                            |
| sequential / diverging scheme     | Plot `ColorSchemeNameSchema`；resolver 复用 built-in + `options.colorSchemes` 查找与诊断           |

`IRPlotTheme` 的同义叶子也必须复用这些原子，不得保留 Chart-private primitive、手写 palette schema 或与 Core paint / font 不同的约束。`IRPlotTheme.background` 与 `plot.surface.fill` 统一复用 Core paint atom；Chart presentation 自己的 token 则继续由 Chart / Standard 的原子契约负责。

Plot token family 固定覆盖：

| Token family        | Plot 语义与正式消费位置                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `plot.surface.*`    | Plot panel 的 renderer-neutral surface 默认                               |
| `plot.typography.*` | Plot guide 的全局文字默认                                                 |
| `plot.label.*`      | Plot-owned static / data-anchored label 默认                              |
| `axis.line.*`       | 已存在 AxisGuide 的 baseline 视觉默认                                     |
| `axis.tick.*`       | tick mark 图元与视觉默认                                                  |
| `axis.tickLabel.*`  | tick label 可见性、排版与间距默认                                         |
| `axis.title.*`      | axis title 排版与视觉默认                                                 |
| `axis.grid.*`       | 已启用 grid 的线条视觉默认                                                |
| `legend.*`          | Legend title、label、swatch、symbol、ramp 与内部间距默认                  |
| `plot.palette.*`    | categorical、series、sector、sequential 与 diverging 的 Plot palette 默认 |

第一版 canonical key 固定如下；后续新增 key 属于 Plot 公开 token contract 扩展，重命名、删除或改变 value contract 属于 breaking change：

| Token group     | Canonical keys                                                                                                                                                                                                                                                                                                                           | Value contract                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Plot surface    | `plot.surface.fill`                                                                                                                                                                                                                                                                                                                      | Core paint atom                               |
| Plot typography | `plot.typography.foreground`、`plot.typography.font.family`、`plot.typography.font.size`                                                                                                                                                                                                                                                 | Plot text foreground、Core font family / size |
| Plot label      | `plot.label.foreground`、`plot.label.font.size`                                                                                                                                                                                                                                                                                          | Plot text foreground、Core font size          |
| Axis line       | `axis.line.enabled`、`axis.line.stroke`、`axis.line.strokeWidth`、`axis.line.drawOpacity`                                                                                                                                                                                                                                                | boolean、Plot axis line style atoms           |
| Axis tick       | `axis.tick.mark`                                                                                                                                                                                                                                                                                                                         | Plot AxisTickMark contract                    |
| Axis tick label | `axis.tickLabel.enabled`、`axis.tickLabel.foreground`、`axis.tickLabel.font.size`、`axis.tickLabel.gap`                                                                                                                                                                                                                                  | boolean、Plot text、Core font、Plot gap atoms |
| Axis title      | `axis.title.foreground`、`axis.title.font.size`、`axis.title.font.weight`                                                                                                                                                                                                                                                                | Plot text、Core font size / weight            |
| Axis grid       | `axis.grid.stroke`、`axis.grid.strokeWidth`、`axis.grid.drawOpacity`                                                                                                                                                                                                                                                                     | Plot grid line style atoms                    |
| Legend          | `legend.title.foreground`、`legend.title.font.size`、`legend.title.font.weight`、`legend.label.foreground`、`legend.label.font.size`、`legend.swatch.size`、`legend.swatch.gap`、`legend.entry.gap`、`legend.title.gap`、`legend.ramp.length`、`legend.ramp.thickness`、`legend.symbol.size`、`legend.symbol.scale`、`legend.symbol.fit` | Plot legend text / layout / symbol atoms      |
| Plot palette    | `plot.palette.categorical`、`plot.palette.series`、`plot.palette.sector`、`plot.palette.sequential`、`plot.palette.diverging`                                                                                                                                                                                                            | non-empty palettes / resolvable scheme names  |

这些 token 的 value contract 必须复用上表的 Core 原子和 Plot guide / scale 公开 schema。`data.palette.*` 不再作为 canonical namespace：Data 不拥有视觉 palette，相关 key 归入 `plot.palette.*`。

Token 到原生 Plot contract 的语义映射固定为：

| Token group         | 正式 Plot 目标                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `plot.surface.*`    | `IRPlotTheme.background`                                                                  |
| `plot.typography.*` | `IRPlotTheme.typography`                                                                  |
| `plot.label.*`      | `IRPlotTheme.labelText`                                                                   |
| `axis.line.*`       | `IRPlotTheme.axis.line`；`enabled: false` 映射为 `false`，否则组合 line style             |
| `axis.tick.*`       | `IRPlotTheme.axis.ticks.mark`                                                             |
| `axis.tickLabel.*`  | `IRPlotTheme.axis.tickLabels`；`enabled: false` 映射为 `false`，否则组合 text / gap style |
| `axis.title.*`      | `IRPlotTheme.axis.title`                                                                  |
| `axis.grid.*`       | `IRPlotTheme.axis.grid`，只设置已启用 grid 的视觉默认                                     |
| `legend.*`          | `IRPlotTheme.legend`，再由 Plot guide resolver 映射为已解析的 Standard Legend input       |
| `plot.palette.*`    | `IRPlotTheme.palette`；scheme name 继续由 Plot color-scheme resolver 统一解析             |

Mapping 只能组合合法叶子并经正式 Plot schema 校验；不能用同名字符串直接 spread 到异构结构，也不能让 token 只进入 inspection 而没有 lowering consumer。

### Theme environment 与 cascade

Plot Composite 消费当前位置完整的 Core effective Theme，并固定以下优先级：

```text
Core effective Theme
  -> Plot preset tokens
  -> PlotSpec styleTokens
  -> PlotSpec colors
  -> PlotSpec theme
  -> local guide / mark / scale config
```

- effective Theme 的 `style` / `mode` 选择 Plot 的完整 preset；PlotSpec 不重复声明同义 style / mode
- `styleTokens` 稀疏覆盖 canonical key；每个 key 都是原子替换，array 与 `axis.tick.mark` 等对象 token 不 deep merge 或 concat
- `colors` 只作为 categorical / series / sector palette shorthand，不覆盖 sequential / diverging
- 原生 `IRPlotTheme` 是更接近 Plot 正式结构的显式覆盖
- 具体 guide、mark 与 scale 配置优先；显式 scale range / scheme 始终高于 theme palette
- `IRPlotTheme` 合并中，数组、scalar、`false` 与带不同 discriminator 的对象按完整值替换；同一结构对象只合并其合法字段

Chart Composite 从同一个 effective Theme 解析 Chart-owned token。ChartSpec 的主题 authoring surface 固定拆分为：

```ts
type IRChartShared = {
  styleTokens?: IRChartStyleTokenOverrides;
  plotStyleTokens?: IRPlotStyleTokenOverrides;
  colors?: ReadonlyArray<string>;
  theme?: IRPlotTheme;
};
```

- `styleTokens` 只接受 Chart presentation 与 Chart recipe token，不再接受任何 Plot key
- `plotStyleTokens` 原样进入最终 `PlotSpec.styleTokens`；`colors` 与 `theme` 继续进入同名 PlotSpec 字段
- ChartSpec 删除重复的 `style` / `themeMode`，Chart 与内部 Plot 都读取 Composite context 中同一个 effective Theme
- Chart resolver 不把 resolved Plot token 或完整 materialized Plot theme 写回 PlotSpec；因 recipe identity 需要读取 series palette 等值时，调用 Plot 公开纯 resolver 取得瞬时结果，并让最终 Plot 再沿同一确定性主链消费原始输入

Plot 公开纯 resolver 的稳定输入是 effective `ResolvedTheme` 与 PlotSpec 的 `styleTokens` / `colors` / `theme`，稳定输出至少包含 complete resolved token map、逐 token source 与经 schema 校验的 resolved native theme / palette。它不读取 dataset、Chart type、adapter 或 renderer 状态；直接 Plot、Chart inspection 与最终 Plot lowering 必须复用这一份解析语义。

`axis.enabled`、`axis.grid.enabled` 与 `legend.enabled` 当前决定 Chart recipe 是否创建默认 guide，不是 Plot 对已有 guide 的视觉映射，因此不进入 Plot token map。它们继续属于 Chart-owned recipe token；具体 Chart key 由 Chart ADR 维护，但不得占用无 owner 的 `axis.*` / `legend.*` Plot namespace。

### Inspection 与诊断

Plot theme inspection 至少能够观察 effective style / mode、complete resolved Plot token map、每个 token 的来源、原生 Plot override 入口及 token 到正式 Plot 配置的映射。Chart inspection 可以引用或组合这份 Plot 结果，但不能把 Plot token 重新标记为 Chart-owned。

Token map 是闭合数据，不执行代码、不按名称 dispatch，因此本 ADR 不引入 theme registry。未知 key、错误 value、空 palette、缺失 required token、无法解析的 scheme、未消费 token 或无法映射的 token 必须 fail-loud；不得静默回退为 renderer 默认。

## 行为、失败语义与兼容性

- Core 默认 `neutral + light` 下，直接 Plot 的既有视觉基线保持稳定；第一版 Plot preset 必须以当前 Plot resolver 默认作为兼容基线，不能机械复制 Chart 默认后改变 direct Plot
- 非默认 Scene / Scope Theme 开始同时驱动直接 Plot、Chart 内部 Plot 与 Chart presentation；同一 PlotSpec 在相同 effective Theme 下不因是否位于 Chart 内而获得不同 Plot preset
- 当前 Chart catalog 中已经映射到 Plot 的 palette、axis、legend 与 Plot surface 值作为非默认 style / mode 与 Chart 迁移的设计输入；迁移后由 Plot owner 维护，不因现有代码位置继续归 Chart。精确 hex、尺寸和 scheme 是 Plot preset 数据，可在不改变四种人格和上述兼容基线的前提下审阅调优
- 已有 `IRPlotTheme`、`colors` 与具体 guide / scale 配置继续有效，并按本 ADR 的优先级获得更高覆盖权
- Plot 新增 sparse token surface 是公开能力扩展；接入 Core Theme 后，非默认 Theme 环境下的视觉变化是有意的用户可观察行为
- Chart 尚未稳定发布，可以移除重复的 Chart-local style / mode vocabulary，并按 Chart ADR 更新 Plot token authoring 表面，不保留同义兼容别名
- Chart 核心 recipe、数据角色、必需 transform、mark 组合与 composition 不因 theme 改变；token 不能绕过核心不变量检查
- React、Vanilla、SSR 与手写 JSON 必须表达同一 Plot / Chart token 输入并得到等价 lowering 结果；adapter 不补 preset 或默认

## 功能与包边界

| Owner                    | 拥有                                                                                | 不拥有                                                |
| ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `@retikz/plot`           | Plot token vocabulary、preset、resolver、mapping、inspection 与 lowering            | Chart presentation、Canonical Type、Core Theme 继承   |
| `@retikz/chart`          | ChartSpec、封闭 recipe、Chart presentation / recipe token、resolution 与 inspection | Plot token、Plot registry / lowering、Standard solver |
| `@retikz/standard`       | 去除领域词汇后的 presentation、layout、surface 与通用绘图 composite                 | Plot guide / palette、Chart type                      |
| `@retikz/core`           | Theme style / mode、继承、Composite context、Core IR 与 Scene compile               | 领域 preset、Plot / Chart token、领域 cascade         |
| React / Vanilla adapters | 等价 authoring、datasets / definitions 注入与 runtime 接线                          | 新 token、adapter-only preset、不同 merge             |
| renderer                 | 执行已物化的统一 Scene                                                              | preset 选择、token 解析、Chart / Plot 特判            |

Chart 需要新的可视化语法能力时，先补 Plot schema / contract / provider / pipeline 闭环；需要通用 presentation 或布局时消费 Standard；需要 renderer-neutral 图形底座时下沉 Core / Math。当前代码位置、单个 type 需求或 adapter 展示能力不能改变所有权。

## 架构验证与能力完备性检查

- 所属能力域与能力面：Visualization Complete 的 Guide、Scale / Palette、Layer / Lowering 与 Chart consumption boundary
- 解决的问题：让 Plot 在任何宿主中独立解析领域主题，并阻止 Chart 复制 Plot 视觉语义
- 主责包与协作包：Plot 主责；Chart、Standard、Core 与 adapters 协作
- 是否可由现有能力组合：既有 `IRPlotTheme`、guide / scale schema、Plot lowering 与 Core effective Theme 可作为主链，但需要扩展 Plot-owned token contract 与 preset resolver
- 是否需要下沉：Theme environment 已由 Core 提供；token value atom 继续复用 Core / Plot schema，不新增 Core 领域词汇
- 内部表达链路：effective Theme 与 PlotSpec token / theme 输入解析为正式 guide、palette、label 与 surface 配置，再沿既有 Plot lowering 下沉
- 外部扩展链路：token vocabulary 闭合且不采用 registry；自定义 Mark、Scale、Coordinate、Channel 等能力仍沿 Plot define-registry，scheme name 继续沿 built-in + `options.colorSchemes` 的现有 resolver 扩展并在 Plot lowering 中诊断
- 下游闭环：Chart 产生完整 PlotSpec，Plot 统一解析，Standard 处理通用呈现，Core / renderer 执行已物化结果；adapter 不建立旁路
- provenance / locator：Plot 的 identity、provenance、locator 与空间 handle 保持原 owner；theme inspection 作为独立可解释 sidecar，不改写数据 lineage
- 本轮结论：扩展 Visualization Complete，并把已倒置的 Plot token 所有权从 Chart 收回 Plot

## 被否决方案

- 保留 Chart 统一 token catalog，再为直接 Plot 增加第二套 preset：会形成两个 Plot 视觉真源
- 把所有领域 token 汇总进 Core Theme：会让 Core 拥有 Plot / Chart / Table 领域词汇和巨型 schema
- 在每个领域 spec 重复 `style` / `mode`：会绕开 Scene / Scope 继承并使嵌套结果不一致
- 让 Chart 把 resolved Plot theme 完全物化后再交给 Plot：会遮蔽 Plot token 来源，使直接 Plot 与 nested Plot 的 inspection 和默认链分叉
- 让 adapter、CSS 或 renderer 根据 preset 名称补默认：会破坏 JSON、React、Vanilla 与 renderer parity
- 恢复早期无 ChartSpec 的 PlotSpec 装饰 helper：无法承载封闭 type identity、核心 recipe、presentation 与结构化 inspection

## 测试策略摘要

需要以下稳定证据层：

- schema / type 证明 Plot token 的 sparse、resolved 与 preset 复用单一字段契约，未知 key、错误 value 与缺失 required token fail-loud
- provider / pipeline 证明四 style × 两 mode 完整、cascade 确定、每个 token 都有正式 consumer，consumer 不按 preset 名称分支
- Core / Composite 集成证明 Scene / Scope Theme 继承进入直接 Plot 与 Chart 内部 Plot，并保持相同 PlotSpec 的 Plot 结果等价
- Chart resolution 证明 recipe 核心不变量与主题默认正交，Chart 只消费 Plot 公开 token / resolver
- inspection 证明 effective environment、token 来源、原生覆盖和 owner mapping 可解释
- React / Vanilla / JSON 与 renderer parity 证明 adapter、SVG、Canvas 不维护独立主题默认
- 兼容性证据证明 `neutral + light` 保持当前 Plot 默认，显式 `colors`、`IRPlotTheme`、guide 与 scale 配置优先级稳定
- docs / API catalog 证明 canonical key、value contract、默认来源、cascade 与 Chart 的 `plotStyleTokens` 转发面和公开 schema 同步

## 不在本 ADR 范围

- Chart Canonical Type 清单、recipe 字段和 presentation 精确契约；由 Chart 路线维护
- Plot interaction state token、hover、selected、tooltip、brush 与 animation
- Table、Geo 或其它领域的 token vocabulary 与 preset 具体值
- 自定义主题命名、继承、动态加载、远程分发或 theme registry
- Standard surface / Legend composite 的具体布局和实现迁移
- 实现文件、执行顺序、测试 case、命令与 commit 切分

# ADR-02：Plot Theme owner 与 shared categorical projection

- 状态：Accepted
- 决策日期：2026-08-07
- 关联：[alpha.1 roadmap](./roadmap.md) · [plot v0.2 roadmap](../roadmap.md) · [ADR-01：Plot 主题 token 所有权与 Chart 消费边界](./01-chart-layering.md) · [Core ADR-13：Theme Token Namespace Context 与共享颜色](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/13-theme-token-namespace-context.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)
- Supersedes：本 ADR 取代 ADR-01 中关于 inherited token scope、局部 token 输入名称与 Core namespace context 的冲突边界；ADR-01 其余 Plot / Chart 主题所有权与消费边界继续有效
- Superseded in part by：[Core ADR-15：轻量 Theme IR 与可扩展 Style 解析](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/15-lightweight-theme-resolution.md) 已移除持久化 namespace bag、Theme token Definition / Contribution 与 Core token registry。本文保留 Plot token owner、shared categorical projection、本地覆盖、级联和最终消费决策

## 背景与目标

Plot ADR-01 已把 Plot surface、guide、label 与 palette 的语义 owner 收回 Plot，但早期输入名称仍把局部 token、native theme 与 Core effective Theme 分散在 PlotSpec 和 Chart forwarding 字段中。直接 Plot、Chart 内部 Plot 与嵌套 Scope 因此缺少同一条 inherited token context；颜色默认也可能在 Plot 与 Core shared colors 之间形成两套 active categorical array。

本 ADR 冻结 Plot 如何把 Core shared categorical 投影到 Plot 领域、如何应用 owner-local style definition 与本地输入，以及哪些颜色能力继续留在 Plot。它不改变 ADR-01 已接受的 Plot / Chart owner 分界。早期 namespace bag 与 token contribution 入口由 Core ADR-15 取代。

## 决策：Plot 在 Core effective Theme 上解析自己的 token 与颜色主链

Plot 是 Plot token vocabulary、style definition、resolver、mapping、inspection 和最终消费的唯一 owner。Core 只提供 effective Theme、shared colors 与二元来源词汇，Chart 只组合或转发 Plot 公开输入。Plot 不把 resolved domain map 写回 Core Theme，也不把 Plot 的连续色阶语义上移到 Core。

理由：

1. 直接 Plot、Chart 内部 Plot 和嵌套 Plot 必须在相同 effective Theme 下复用同一条 Plot 解析语义
2. shared categorical 是跨包 value contract，Plot 必须投影它而不能复制另一套 active palette
3. Plot 的 sequential / diverging scheme 与 interpolator 具有连续色阶语义，不能被无领域的 Core palette contract 取代

## 基础数据结构与公开契约

Plot 局部输入使用破坏性重命名后的公开字段：

```ts
type IRPlotThemeTokenOverrides = Readonly<Record<string, IRJsonValue>>;

type IRPlotSpec = Readonly<{
  plotThemeTokens?: IRPlotThemeTokenOverrides;
  plotTheme?: IRPlotTheme;
}>;
```

`plotThemeTokens` 是 Plot strict、flat、dot-namespaced 的 sparse vocabulary；`plotTheme` 是 Plot native structured theme。二者都属于 Plot owner，不进入 Core Theme IR，也不能写入 Chart、Table 或其它 owner 的输入。Layout / Scope 只继承 `style` 与 `mode` selector；Plot 在消费位置通过同名 runtime style definition 构建 baseline，再应用局部 Plot 输入。

以下早期 Theme token Definition / Contribution 形态已由 Core ADR-15 supersede：

```ts
type PlotThemeTokenDefinition = ThemeTokenDefinition<'plot', IRPlotThemeTokenOverrides>;

declare const definePlotThemeTokens: (
  tokens: IRPlotThemeTokenOverrides,
) => ThemeTokenContribution<'plot', IRPlotThemeTokenOverrides>;
```

当前 Plot 只公开 owner-local `PlotThemeStyleDefinition` 与 style registry。standalone、embedded、Chart 内部 Plot 和 direct headless lowering 必须注入同义的 Plot style definitions；plain JSON 只持久化 selector 和 PlotSpec 本地字段。没有 Plot consumer 的 Core-only Scene 不要求注册 Plot definition，也不因注册它而改变输出。

## Cascade、颜色投影与行为

Plot 在当前位置的 Core effective Theme 上按以下顺序解析：

```text
Core shared categorical
  < Plot style/mode definition
  < local plotThemeTokens
  < plotTheme
  < explicit scale / channel / guide / mark config
```

后层只能覆盖可撤销的表现性默认，不能关闭 Plot 核心结构、改变数据角色或撤销 type recipe 不变量。Plot resolver 输出最终 domain palette、正式 guide / scale 输入与 lowering 输入；resolved Plot map 只在 Plot owner 内作为 consumer view 存在，不写回 Core Theme。

未声明 Theme 时使用 Core 的 `neutral + light` effective environment，Plot 选择与当前 Plot baseline 相容的完整 preset。未声明 Plot-local token 时不产生空的伪 token map；有效 Plot resolver 仍必须产出完整、可消费的 Plot domain view。

Core shared `palette.categorical` 是一套当前生效的非空 active CSS color array，也是内建 categorical 色值的单一真源。内建 Plot definition 接收 `ResolvedTheme.colors.categorical`，detached 投影为 `categorical`、`series`、`sector`，不在 Plot paint catalog 复制另一套默认色值。自定义 Plot style definition 可以显式提供这三类 palette，并作为完整 style baseline 高于 Core；之后仍可被 Plot-owned token、`plotTheme` 或显式 scale 覆盖。style definition 产出的 token 直接记录为 `local + $style/...`，resolver 不通过 style 名称或最终数组值反推来源。

Plot 的 sequential / diverging named scheme、interpolator、采样逻辑与 `options.colorSchemes` 继续由 Plot 拥有，不读取或改写 shared categorical array。显式 scale range、scheme、channel 或 mark config 按 Plot 的正式优先级覆盖主题 palette。

Plot 同时拥有独立于颜色的非空 shape palette。内建 `plot.palette.shape` 提供八项有序默认值，`plotThemeTokens['plot.palette.shape']` 与 `plotTheme.palette.shape` 可用 `Array<string | IRShapeRef>` 覆盖；该 palette 不投影 Core shared colors，按相同 cascade 解析并由 shape channel 与 legend 同源消费。

## 失败语义、兼容性与入口等价

- Plot token 与 native input 必须是 plain JSON-safe data
- unknown Plot key、非法 token value、空或非法颜色数组、缺失同名 style definition、无法解析的 scheme 与无法映射的 token 都 fail-loud
- 诊断必须指出输入层以及 token key 或 Plot native path；不得静默退回 D3 默认、renderer 默认或 Chart 私有 palette
- Plot inspection 的 source `kind` 只使用 Core `inherit | local`。当前完整 style baseline、`plotThemeTokens` 与 `plotTheme` 为 `local`；具体入口和优先级由稳定 `path` 保留
- plain JSON、React、Vanilla、standalone Plot、embedded Plot、Chart 内部 Plot 与 direct headless compile 在相同 style definition registry 和 Core effective Theme 下产生同义 Plot resolution、Scene 输入与诊断
- `0.x` 采用破坏性入口收敛：`styleTokens` 改为 `plotThemeTokens`，Plot native `theme` 改为 `plotTheme`，冗余 `colors` 简写删除并统一使用 `plotTheme.palette`，不保留 alias、双读或静默 bridge

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete 的 Theme / Palette 与 Plot lowering，解决 Plot token 无法沿 Core Scope 继承和 shared categorical 多重真源问题
- `@retikz/plot` 拥有 Plot token vocabulary、四种 style × 两种 mode 的 Plot preset、resolver、shared color projection 与显式领域 palette 覆盖、scale / guide / channel / mark mapping、inspection 与最终 Plot consumer
- `@retikz/core` 拥有 selector 继承、Core style registry、Core shared colors、`ThemeTokenSource` 与 `InspectionAppearance`；不解释 Plot token 语义
- `@retikz/chart` 拥有 Chart token 与 recipe；只转发或贡献 Plot 输入，并在需要默认 series color 时读取 Plot resolver 的最终 palette
- `@retikz/standard` 只消费 Plot 已解析的领域无关 presentation / layout 输入与 Core `InspectionAppearance`，不读取 Plot token
- plot-react、plot-vanilla、chart-react、chart-vanilla 与 plain JSON 只构造同义 JSON-safe input、注入 runtime definition 和接入生命周期，不拥有 preset 或 merge
- Render 只执行已物化 Scene，不解析 Plot Theme、preset、palette 或 scheme

Plot 不拥有 Core selector 继承协议、Chart presentation、Table token、业务状态色、宿主 CSS theme 或 renderer-specific effect。Core shared categorical 只提供一套 active array；Plot-owned named schemes 不属于 shared colors。

## 架构验证与能力完备性

- 现有 Core effective Theme、Composite context、Plot schema / provider / pipeline 与 Standard lowering 可以组合出本能力；新增的是 Plot owner-local style definition 与 shared color projection 的跨层契约
- Math 不承载 Theme；Runtime 不解释 Plot token；Core 解析 selector 与 shared colors；Plot 解析并 mapping；Standard 消费正式输入；React / Vanilla 与 plain JSON 生成等价输入；Render 只执行 Scene
- `PlotThemeStyleDefinition` 进入 Plot owner registry，standalone、embedded、Chart adapter 与 direct headless 使用同一 name lookup 和失败语义；Plot 不建立跨 owner theme registry
- 闭环为 Core effective Theme → Plot style definition 注入或覆盖 categorical baseline → local token resolution → Plot mapping → Standard / Core formal input → Scene / manifest / inspection
- shared categorical 的非空约束、detached projection 与 stable index consumption 属于跨包 value contract；sequential / diverging 仍由 Plot resolver 完整闭环
- 本轮结论：扩展 Visualization Complete 的 Plot Theme / Palette 能力并接入 Core effective Theme；不下沉 Plot 语义，不改变 Plot → Core lowering 方向

## 最终实现与验证摘要

最终实现已闭合 Plot owner style definition、resolver、mapping、inspection 与 shared categorical projection，并让内建 definition 复用 Core palette、自定义 definition 显式 palette 高于 Core。standalone Plot、embedded Plot 与 Chart bundle 复用同一 Plot registry 和 cascade；React、Vanilla、headless 与根 Theme authoring 共享正式 definition 注入及失败语义，Plot native input 与局部 token 也已完成破坏性命名迁移。

验证覆盖 inherited / local source 分类、Plot token cascade、Plot native theme 与显式配置优先级、owner/source inspection、Chart handoff、SSR 与 SVG / Canvas 最终语义；fresh / retained compile 环境的完整验证、对抗验证以及双语文档和浏览器验收均无遗留阻塞。

## 被否决方案

- 让 Chart 继续拥有 Plot token：直接 Plot 与 Chart 内部 Plot 会形成两套 vocabulary、preset 与 resolver
- 让 Core 汇总 Plot token schema 或解释 Plot key：会反向引入 Tier 2 语义并形成巨型 schema
- 让 Plot、Chart、Standard 各自维护 active categorical array：Inspector、series 与 sector 会得到不同颜色真源
- 用 `plotStyleTokens` 或 native `theme` 保留旧 alias：会让新旧 namespace 输入长期双读并掩盖迁移错误
- 让 Chart 先物化完整 Plot theme：会遮蔽 inherited/local source 并使 Chart 内外 Plot cascade 分叉
- 把 sequential / diverging scheme 与 interpolator 下沉 Core：会丢失连续色阶的 Plot 语义 owner
- 让 adapter、CSS 或 renderer 补 preset：会破坏 JSON、React、Vanilla、SVG 与 Canvas parity

## 测试策略摘要

需要 schema / type 证据证明 Plot token、native theme 与 shared categorical projection 的 JSON-safe、strict、non-empty 和 breaking naming 边界；registry 证据证明 Plot style definition 在 standalone、embedded、Chart adapter 与 direct headless 入口使用同一注入、name lookup 和失败语义；compile / pipeline 证据证明 Core Scope selector inheritance、Plot cascade、正式 mapping、inspection source 与 Scene / manifest consumer 闭环；颜色证据证明内建 Plot categorical / series / sector 从同一 `ResolvedTheme.colors.categorical` detached 投影、自定义 definition palette 高于 Core，并记录直接 winning entry，sequential / diverging 不读取该数组；React、Vanilla、plain JSON、SSR、SVG、Canvas 与 nested Chart parity 证据证明 adapter 和 renderer 不维护旁路默认。详细矩阵属于后续 ignored implementation plan。

## 不在本 ADR 范围

- Plot token 的完整 canonical key 目录、具体 preset 色值与未来 token 扩展
- Chart type recipe、Chart presentation 与 Table token vocabulary
- Core shared color preset 的具体色值、命名主题 loader、远程主题分发与宿主 UI theme
- Plot interaction state、hover、selected、tooltip、brush、animation 与 transition token
- sequential / diverging scheme 的新增算法或 Plot scale family 设计

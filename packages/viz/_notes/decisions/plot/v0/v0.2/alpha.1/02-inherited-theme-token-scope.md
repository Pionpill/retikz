# ADR-02：继承 Theme Token Scope 与 Plot owner contribution

- 状态：Proposed
- 决策日期：2026-08-07
- 关联：[alpha.1 roadmap](./roadmap.md) · [plot v0.2 roadmap](../roadmap.md) · [ADR-01：Plot 主题 token 所有权与 Chart 消费边界](./01-chart-layering.md) · [Core ADR-13：Theme Token Namespace Context 与共享颜色](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/13-theme-token-namespace-context.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)
- Supersedes：本 ADR 取代 ADR-01 中关于 inherited token scope、局部 token 输入名称与 Core namespace context 的冲突边界；ADR-01 其余 Plot / Chart 主题所有权与消费边界继续有效

## 背景与目标

Plot ADR-01 已把 Plot surface、guide、label 与 palette 的语义 owner 收回 Plot，但早期输入名称仍把局部 token、native theme 与 Core effective Theme 分散在 PlotSpec 和 Chart forwarding 字段中。直接 Plot、Chart 内部 Plot 与嵌套 Scope 因此缺少同一条 inherited token context；颜色默认也可能在 Plot 与 Core shared colors 之间形成两套 active categorical array。

本 ADR 冻结 Plot 如何消费 Core 的 namespace bag、如何把 shared categorical 投影到 Plot 领域、如何聚合 Plot definition，以及哪些颜色能力继续留在 Plot。它不改变 ADR-01 已接受的 Plot / Chart owner 分界，只明确并 supersede 其中与 inherited token 输入名称和 scope contribution 冲突的旧表述。

## 决策：Plot 在 Core effective Theme 上解析自己的 namespace 与颜色主链

Plot 是 Plot token vocabulary、preset、resolver、mapping、inspection 和最终消费的唯一 owner。Core 只传播和校验 `plot` namespace，Chart 只组合或转发 Plot 公开输入。Plot 不把 resolved domain map 写回 Core Theme，也不把 Plot 的连续色阶语义上移到 Core。

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

`plotThemeTokens` 是 Plot strict、flat、dot-namespaced 的 sparse vocabulary；`plotTheme` 是 Plot native structured theme。二者都属于 Plot owner，不是 Core 的完整 `theme.tokens`，也不能写入 `chart`、`table` 或其它 namespace。Layout / Scope 通过通用 `theme.tokens.plot` 继承 Plot contribution，局部 Plot 组件再提供 `plotThemeTokens`。

Plot 的 definition 与 authoring contribution 使用 Core 的类型擦除边界：

```ts
type PlotThemeTokenDefinition = ThemeTokenDefinition<'plot', IRPlotThemeTokenOverrides>;

declare const definePlotThemeTokens: (
  tokens: IRPlotThemeTokenOverrides,
) => ThemeTokenContribution<'plot', IRPlotThemeTokenOverrides>;
```

`PlotThemeTokenDefinition` 是 Plot 导出的冻结 singleton，绑定 Plot owner 的 strict sparse schema；`definePlotThemeTokens` 只产生 JSON-safe contribution，不把 schema、函数、ReactNode、class instance 或 renderer handle 写入 IR。Definition 与 contribution 不混成一个全仓 token catalog：同一 definition 对象重复聚合按 Core contract 去重，同 namespace 的不同 definition 对象与同次组合中的重复 contribution fail-loud。

Definition 聚合必须保持入口等价：

- standalone Plot authoring 自动贡献 Plot definition
- embedded Plot 把 Plot definition 贡献给所在 Composite 的同一 compile context，并在同一 context 中确定性去重
- Chart adapter 同时贡献 Chart definition 与 Plot definition，因为 Chart lowering 必然包含 Plot consumer
- direct headless `compileToScene()` 或 plain JSON 使用方必须在 `CompileOptions.themeTokenDefinitions` 中显式注入所需 definition；Core 不通过静态导入 Tier 2 语义，也不因输入是 JSON 而隐式猜测 owner

上述入口使用同一 namespace schema、继承、失败诊断和 lowering 语义。没有 Plot consumer 的 Core-only Scene 不因注册 Plot definition 而改变输出。

## Cascade、颜色投影与行为

Plot 在当前位置的 Core effective Theme 上按以下顺序解析：

```text
Plot style/mode preset
  < shared categorical projection
  < inherited theme.tokens.plot
  < local plotThemeTokens
  < colors shorthand
  < plotTheme
  < explicit scale / channel / guide / mark config
```

后层只能覆盖可撤销的表现性默认，不能关闭 Plot 核心结构、改变数据角色或撤销 type recipe 不变量。Plot resolver 输出最终 domain palette、正式 guide / scale 输入与 lowering 输入；resolved Plot map 只在 Plot owner 内作为 consumer view 存在，不写回 Core Theme。

未声明 Theme 时使用 Core 的 `neutral + light` effective environment，Plot 选择与当前 Plot baseline 相容的完整 preset。未声明 Plot-local token 时不产生空的伪 token map；有效 Plot resolver 仍必须产出完整、可消费的 Plot domain view。

Core shared `palette.categorical` 是一套当前生效的非空 active CSS color array。Plot 将它 detached 投影为 `categorical`、`series`、`sector` 的 designated baseline；未被 Plot-owned token、`colors`、`plotTheme` 或显式 scale 覆盖时，三类用途都从同一共享来源得到确定性结果。Plot 不复制、反向修改或按名称选择另一套 shared categorical array。

Plot 的 sequential / diverging named scheme、interpolator、采样逻辑与 `options.colorSchemes` 继续由 Plot 拥有，不读取或改写 shared categorical array。显式 scale range、scheme、channel 或 mark config 按 Plot 的正式优先级覆盖主题 palette。

## 失败语义、兼容性与入口等价

- Theme token bag、contribution 和 Plot native input 必须是 plain JSON-safe data
- unknown Plot namespace、unknown Plot key、重复 contribution、冲突 definition identity、非法 token value、空或非法颜色数组、无法解析的 scheme 与无法映射的 token 都 fail-loud
- 诊断必须指出输入层以及 namespace / key 或 Plot native path；不得静默退回 D3 默认、renderer 默认或 Chart 私有 palette
- Plot inspection 保留 preset、inherited、local、`colors`、`plotTheme` 与 explicit config 的 owner/source 区分；shared categorical projection 不能伪装成 Plot 私有 preset 数组
- plain JSON、React、Vanilla、standalone Plot、embedded Plot、Chart 内部 Plot 与 direct headless compile 在相同 definition registry 和 Core effective Theme 下产生同义 Plot resolution、Scene 输入与诊断
- `0.x` 采用破坏性命名迁移：`styleTokens` 改为 `plotThemeTokens`，Plot native `theme` 改为 `plotTheme`，不保留 alias、双读或静默 bridge

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete 的 Theme / Palette 与 Plot lowering，解决 Plot token 无法沿 Core Scope 继承和 shared categorical 多重真源问题
- `@retikz/plot` 拥有 Plot token vocabulary、四种 style × 两种 mode 的 Plot preset、resolver、shared color projection、scale / guide / channel / mark mapping、inspection 与最终 Plot consumer
- `@retikz/core` 拥有 `theme.tokens` 的通用传播、ThemeTokenDefinition registry、owner schema runtime validation、Core shared colors 与 `InspectionAppearance`；不解释 Plot token 语义
- `@retikz/chart` 拥有 Chart token 与 recipe；只转发或贡献 Plot 输入，并在需要默认 series color 时读取 Plot resolver 的最终 palette
- `@retikz/standard` 只消费 Plot 已解析的领域无关 presentation / layout 输入与 Core `InspectionAppearance`，不读取 Plot token bag
- plot-react、plot-vanilla、chart-react、chart-vanilla 与 plain JSON 只构造同义 JSON-safe input、聚合 definition 和接入生命周期，不拥有 preset 或 merge
- Render 只执行已物化 Scene，不解析 Plot Theme、preset、palette 或 scheme

Plot 不拥有 Core namespace 继承协议、Chart presentation、Table token、业务状态色、宿主 CSS theme 或 renderer-specific effect。Core shared categorical 只提供一套 active array；Plot-owned named schemes 不属于 shared colors。

## 架构验证与能力完备性

- 现有 Core effective Theme、Composite context、Plot schema / provider / pipeline 与 Standard lowering 可以组合出本能力；新增的是 Plot owner contribution、Core definition binding 与 shared color projection 的跨层契约
- Math 不承载 Theme；Runtime 不解释 Plot token；Core 传播并校验 namespace；Plot 解析并 mapping；Standard 消费正式输入；React / Vanilla 与 plain JSON 生成等价输入；Render 只执行 Scene
- `PlotThemeTokenDefinition` 必须进入 Core 统一 registry，因为 standalone、embedded、Chart adapter 与 direct headless 需要同一 owner schema runtime validation；Plot 不建立第二套 theme registry
- 闭环为 Core effective Theme → Plot definition validation → Plot preset / projection / token resolution → Plot mapping → Standard / Core formal input → Scene / manifest / inspection
- shared categorical 的非空约束、detached projection 与 stable index consumption 属于跨包 value contract；sequential / diverging 仍由 Plot resolver 完整闭环
- 本轮结论：扩展 Visualization Complete 的 Plot Theme / Palette 能力并接入 Core namespace context；不下沉 Plot 语义，不改变 Plot → Core lowering 方向

## 被否决方案

- 让 Chart 继续拥有 Plot token：直接 Plot 与 Chart 内部 Plot 会形成两套 vocabulary、preset 与 resolver
- 让 Core 汇总 Plot token schema 或解释 Plot key：会反向引入 Tier 2 语义并形成巨型 schema
- 让 Plot、Chart、Standard 各自维护 active categorical array：Inspector、series 与 sector 会得到不同颜色真源
- 用 `plotStyleTokens` 或 native `theme` 保留旧 alias：会让新旧 namespace 输入长期双读并掩盖迁移错误
- 让 Chart 先物化完整 Plot theme：会遮蔽 inherited/local source 并使 Chart 内外 Plot cascade 分叉
- 把 sequential / diverging scheme 与 interpolator 下沉 Core：会丢失连续色阶的 Plot 语义 owner
- 让 adapter、CSS 或 renderer 补 preset：会破坏 JSON、React、Vanilla、SVG 与 Canvas parity

## 测试策略摘要

需要 schema / type 证据证明 Plot token、native theme 与 shared categorical projection 的 JSON-safe、strict、non-empty 和 breaking naming 边界；registry 证据证明 Plot definition 在 standalone、embedded、Chart adapter 与 direct headless 入口使用同一绑定、去重和失败语义；compile / pipeline 证据证明 Core Scope inheritance、Plot cascade、正式 mapping、inspection source 与 Scene / manifest consumer 闭环；颜色证据证明 Plot categorical / series / sector 从同一 active shared array 投影，sequential / diverging 不读取该数组；React、Vanilla、plain JSON、SSR、SVG、Canvas 与 nested Chart parity 证据证明 adapter 和 renderer 不维护旁路默认。详细矩阵属于后续 ignored implementation plan。

## 不在本 ADR 范围

- Plot token 的完整 canonical key 目录、具体 preset 色值与未来 token 扩展
- Chart type recipe、Chart presentation 与 Table token vocabulary
- Core shared color preset 的具体色值、命名主题 loader、远程主题分发与宿主 UI theme
- Plot interaction state、hover、selected、tooltip、brush、animation 与 transition token
- sequential / diverging scheme 的新增算法或 Plot scale family 设计

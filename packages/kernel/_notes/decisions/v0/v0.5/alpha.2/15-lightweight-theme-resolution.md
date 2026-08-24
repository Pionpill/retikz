# ADR-15：轻量 Theme IR 与可扩展 Style 解析

- 状态：Accepted
- 决策日期：2026-08-08
- 关联：[ADR-09](./09-inherited-theme-context.md) · [ADR-13](./13-theme-token-namespace-context.md)
- Supersedes：ADR-13 中将 namespaced token bag、Theme token Definition / Contribution 与其 registry 写入 Core Theme IR 的决策。ADR-09 的 Scene / Scope 继承、Composite context、probe / replay 与 adapter 等价性继续有效

## 背景与目标

ADR-13 允许 `Theme` 在可持久化的 Scene / Scope IR 中直接携带按 namespace 编排的 token 值。即使约定为 sparse bag，schema 也不能区分稀疏 authoring override 与完整 resolved token map；任一调用方都能把领域 preset、色板或完整 token catalog 写入 IR。这样会放大 JSON snapshot、增量 diff 与跨 adapter 传递成本，并让完整默认值在持久化输入与领域 resolver 中重复存在。

只保留闭合的内置 `style` 虽然解决了持久化负担，却会让使用者无法定义自己的视觉人格及其 Core、Plot、Chart 默认值。将领域 token 再收回 Core 会重新引入无边界 token bag，也不能解决领域所有权问题。

本 ADR 的目标是保留 Theme 的轻量、可继承环境语义：IR 只表达稳定 selector；Core、Plot、Chart、Table 分别维护完整默认值，并通过同名的运行时 style definition 提供稀疏覆盖；完整 token、resolver 函数和 Definition 都不得进入任何 Scene / Scope IR。

## 决策：持久化 selector，按 owner 注册同名 Style resolver

Core Theme 固定为 `style` 和 `mode`。两者都按 Scene 到 Scope 的字段级继承。`style` 是非空名称而非闭合集合，`mode` 保持 Core 定义的闭合明暗环境。未声明时使用匿名默认 shared colors 与 light mode。

```ts
type IRTheme = Readonly<{
  style?: string;
  mode?: ThemeModeValue;
}>;

type ThemeStyleDefinition = Readonly<{
  name: string;
  resolve(context: Readonly<{ mode: ThemeModeValue }>): ThemeStyleColorOverrides;
}>;

type ResolvedTheme = Readonly<{
  style?: string;
  mode: ThemeModeValue;
  colors: ResolvedThemeColors;
}>;

type PlotThemeStyleDefinition = Readonly<{
  name: string;
  resolve(context: ResolvedTheme): PlotThemeStyleOverrides;
}>;

type ChartThemeDefinition = Readonly<{
  name: string;
  base?: string;
  tokens?: ChartThemeOwnerSlices;
}>;
```

`ThemeStyleDefinition` 是 Core 的公开 runtime contract。自定义 style 经统一 registry 查找；Core compile 入口通过 `themeStyles` 接收 definition。Core resolver 先建立当前 mode 的默认 shared colors，再合并 definition 的稀疏覆盖：`semantic` 按角色合并，显式 `categorical` 整体替换默认 palette，最后形成 compile-local、只读的完整 colors。已知 sparse 字段显式返回 `undefined` 时按省略处理；未知字段、空白颜色、空 palette 与非法值仍由严格 provider-output schema fail-loud。

发布包只提供匿名的 mode-aware 默认 baseline，不预注册命名 style。`ThemeStyleValue` 是开放的非空字符串，因此应用可以通过同一 definition / registry 链路提供任意命名 style。Academic、Vibrant、Clean 是文档站用于展示扩展能力的应用级 preset，不属于 Core、Plot、Chart 或 Table 的默认产物，也不进入这些包的内置集合。

Plot、Chart、Table 分别拥有自己的 token vocabulary 和 style definition contract。它们的 resolver 以同一个 effective `style` 名称、`mode` 与 Core shared colors 为输入，先建立 owner 默认值，再合并 definition 的稀疏 owner-local 覆盖，最终返回完整 token map；各领域入口通过 owner-local options 接收自定义 definition。

所有领域 resolver 都消费完整 `ResolvedTheme`，不以 `style + mode` 重新查找或复制 Core 色表。直接调用 Plot 或 Chart resolver 的使用者必须提供由 Core 同一 registry 解析的完整 effective Theme；匿名默认入口使用 light mode 的完整默认值。

每个 owner 只解析自己拥有的默认值。Plot 先用 mode 与 Core shared categorical 建立默认 tokens / Axis rules，再合并 style tokens 并追加 style rules，随后按既有优先级应用 `plotThemeTokens` 和 native `plotTheme`。Chart 从 shell / recipe fallback 开始合并命名与 inline owner slices。Table 从 mode-aware preset 开始合并 style tokens，随后投影 Core shared categorical 并应用 `tableThemeTokens`；Table style 不拥有第二份 shared categorical。Chart 继续把 Plot authoring 输入原样转发，并调用 Plot 的公开 resolver，不复制 Plot token、preset 或 merge 语义。

在一个实际消费 style 的 owner 中，若找不到同名 definition，必须 fail-loud。也就是说，自定义 `brand` style 用于 Plot 时必须注册同名 `PlotThemeStyleDefinition`；用于 Chart 时还必须注册同名 `ChartThemeDefinition`，并提供 Chart 调用的 Plot definition；用于 Table 时必须注册同名 Table definition。纯 Core Scene 不要求注册不消费它的领域 definition。

理由：

1. `style` 是跨 Scope、跨领域共享的最小稳定引用；函数、稀疏覆盖与完整 token map 可由它和 mode 在运行时重建，不应写入 Snapshot
2. Core shared colors、Plot token 与 Chart token 是不同 owner 的语义。让它们以同名 selector 协作，既保证视觉人格一致，又不向 Core 注入领域 vocabulary
3. 对已消费的领域强制同名 definition，能把配置遗漏定位到实际 owner，避免静默回退到 neutral 或生成不一致的主题

## 决策：来源关系收敛为 inherit 与 local

Core 提供最小公开来源词汇：

```ts
const ThemeTokenSource = {
  Inherit: 'inherit',
  Local: 'local',
} as const;

type ThemeTokenSourceValue = ValueOf<typeof ThemeTokenSource>;
```

`inherit` 只表示 owner resolver 从上层完整 `ResolvedTheme` 直接投影 token 值，例如 Table 对 Core shared categorical 的投影。`local` 表示当前 owner 的默认值、style definition 或 authored override 产生的值，包括领域 token、shorthand 与 native theme。

来源关系不编码 cascade precedence。领域 inspection 使用 `kind` 回答“继承还是本地”，使用稳定 `path` 区分具体入口，例如 `$default/<mode>/<token>`、`$style/<style>/<mode>/<token>`、`$theme/colors/categorical` 与 `$spec/<field>`。未被 style 显式覆盖的值必须保留 default path；resolver 必须按输入层确定来源，不得通过最终值相等反推 winning source。Core 不增加领域 source 枚举、path parser、source record schema 或领域 resolver。

## 行为、失败语义与兼容性

- 默认行为：未声明 Theme 时使用 light mode，并由 Core、Plot、Chart、Table 各自的匿名默认 baseline 生成完整值
- 继承行为：Scene、外层 Scope、内层 Scope 依次覆盖显式 selector；内层未声明字段继续继承。style 变更会重新解析 Core shared colors
- 直接解析行为：Core compile、Plot lowering、Chart resolution 与 Table resolution 使用相同的 effective Theme 形态。自定义 style 的直接领域解析必须先通过 Core style registry 取得完整 `ResolvedTheme`，不得以局部 fallback 色表模拟
- Definition 行为：自定义 definition 使用统一的 `define`、registry、查找和消费链路。自定义 name 可以新增；与另一自定义 definition 重名时 fail-loud，省略字段时由 owner 默认 baseline 补全
- 失败与诊断：Theme 的空 style、未知字段和 token bag 在 schema 边界 fail-loud。有效 selector 在 Core 中未注册时 fail-loud；已解析到领域 owner 但缺少对应同名 definition 时在该 owner fail-loud。Definition 回调的输入和输出遵循 TypeScript contract，不为内部 typed 调度增加平行运行时类型断言
- 兼容性：`style` 从闭合枚举改为非空名称；移除 `theme.tokens`、Theme token Definition / Contribution、registry 与 `themeTokenDefinitions`。这是 `0.x` breaking change，不提供 alias、双读或静默迁移
- React / Vanilla 等价性：React、Vanilla 与 plain JSON 都只能将 selector 写入 Scene / Scope Theme；所有 runtime definition 由等价的 Core / Plot / Chart / Table options 注入。领域本地 override 仍使用同一领域 schema 和 resolver

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的可继承视觉环境与 shared colors，以及 Visualization Complete / Chart 封装中的领域视觉默认值扩展。解决自定义 style 无法贯通 Core 与 Tier 2 的问题，同时避免把 token map 持久化回 IR
- 主责包与协作包：`@retikz/core` 拥有 selector IR、继承、Core style contract / registry、shared colors 与来源原子；`@retikz/plot`、`@retikz/chart`、`@retikz/table` 各自拥有 style contract / registry、领域 token cascade 与消费入口；React / Vanilla 只负责等价 authoring / runtime 接线；Render 只执行物化 Scene
- 拥有：每个 owner 的 definition contract、匿名默认 baseline、registry、resolver、diagnostic 与完整默认值。Core 额外拥有 `style` / `mode` 与 shared semantic / categorical color contract
- 不拥有：Core 不拥有领域 token key、完整领域 token map、领域 preset 或领域 registry；Plot 不拥有 Chart token；Chart 不拥有 Plot token / preset / merge；adapter 与 renderer 不拥有平行 resolver
- 外部扩展与下游闭环：自定义 style 在 Core 和每个实际消费它的领域 owner 中注册同名 definition。应用级 preset 负责组合这些 owner-local definitions，但不建立跨 owner definition 或 registry；Core composite context 提供 resolved Theme，Plot / Chart / Table 将解析后的正式输入下沉既有 Core / Standard 链路。未来 owner 若需消费开放 style，必须新增其 owner-local definition 与同样的注册闭环，不复用既有领域 token contract
- 不支持边界：不支持通过 Scope 下发任意 token key、以一个 Core definition 携带领域 token、未注册领域时的默认 fallback、Definition 覆盖命名 style、动态 mode 注册、远程 Theme loader、Theme lineage、交互状态和动画 token

## 长期边界

- 跨领域的 Scope token override、命名 Theme loader、Theme lineage、交互状态和动画 token
- 任意用户定义 `mode`、style inheritance 策略、Definition 覆盖 / 叠加、按局部 selector 自动发现 definition
- Plot、Chart 各自 token key、preset 内容、resolver 算法和局部 override DSL 的重新设计
- 尚无公开 authoring 表面的 Chart adapter API；该能力在 adapter 具备正式 Chart runtime 接线时，以同一 Chart resolution options 透传，不另造 adapter 私有入口
- renderer-specific CSS variables、宿主 UI theme 或 renderer 默认样式

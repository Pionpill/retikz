# ADR-15：轻量 Theme IR 与可扩展 Style 解析

- 状态：Proposed
- 决策日期：2026-08-08
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-09：可继承 Theme IR 与 Composite 编译上下文](./09-inherited-theme-context.md) · [ADR-13：Theme Token Namespace Context 与共享颜色](./13-theme-token-namespace-context.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Visualization Complete](../../../../../../viz/_notes/architecture/plot-visualization-complete.md)
- Supersedes：ADR-13 中将 namespaced token bag、Theme token Definition / Contribution 与其 registry 写入 Core Theme IR 的决策。ADR-09 的 Scene / Scope 继承、Composite context、probe / replay 与 adapter 等价性继续有效

## 背景与目标

ADR-13 允许 `Theme` 在可持久化的 Scene / Scope IR 中直接携带按 namespace 编排的 token 值。即使约定为 sparse bag，schema 也不能区分稀疏 authoring override 与完整 resolved token map；任一调用方都能把领域 preset、色板或完整 token catalog 写入 IR。这样会放大 JSON snapshot、增量 diff 与跨 adapter 传递成本，并让完整默认值在持久化输入与领域 resolver 中重复存在。

只保留闭合的内置 `style` 虽然解决了持久化负担，却会让使用者无法定义自己的视觉人格及其 Core、Plot、Chart 默认值。将领域 token 再收回 Core 会重新引入无边界 token bag，也不能解决领域所有权问题。

本 ADR 的目标是保留 Theme 的轻量、可继承环境语义：IR 只表达稳定 selector；Core、Plot、Chart、Table 分别通过同名的运行时 style definition 解析各自拥有的完整默认值；完整 token、resolver 函数和 Definition 都不得进入任何 Scene / Scope IR。

## 决策：持久化 selector，按 owner 注册同名 Style resolver

Core Theme 固定为 `style` 和 `mode`。两者都按 Scene 到 Scope 的字段级继承。`style` 是非空名称而非闭合集合，`mode` 保持 Core 定义的闭合明暗环境。未声明时使用内置 `neutral + light`。

```ts
type IRTheme = Readonly<{
  style?: string;
  mode?: ThemeModeValue;
}>;

type ThemeStyleDefinition = Readonly<{
  name: string;
  resolve(context: Readonly<{ mode: ThemeModeValue }>): ResolvedThemeColors;
}>;

type ResolvedTheme = Readonly<{
  style: string;
  mode: ThemeModeValue;
  colors: ResolvedThemeColors;
}>;

type PlotThemeStyleDefinition = Readonly<{
  name: string;
  resolve(context: ResolvedTheme): IRPlotResolvedThemeTokens;
}>;

type ChartThemeStyleDefinition = Readonly<{
  name: string;
  resolve(context: ResolvedTheme): IRChartResolvedThemeTokens;
}>;
```

`ThemeStyleDefinition` 是 Core 的公开 runtime contract。内置 style 与自定义 style 经同一 registry 查找；Core compile 入口通过 `themeStyles` 接收自定义 definition。Core resolver 用 effective selector 查找 definition，并将其结果作为 compile-local、只读的 shared colors。

发布包只内置 `neutral`。`ThemeStyle` 只列出发布包保证无需额外注册即可使用的名称；`ThemeStyleValue` 继续是开放的非空字符串，因此应用可以通过同一 definition / registry 链路提供任意命名 style。Academic、Vibrant、Clean 是文档站用于展示扩展能力的应用级 preset，不属于 Core、Plot、Chart 或 Table 的默认产物，也不进入这些包的内置集合。

Plot、Chart、Table 分别拥有自己的 token vocabulary 和 style definition contract。它们的 resolver 以同一个 effective `style` 名称、`mode` 与 Core shared colors 为输入，返回本 owner 的完整 token map；各领域入口通过 owner-local options 接收自定义 definition。内置 style 同样经各自 owner registry 提供。

所有领域 resolver 都消费完整 `ResolvedTheme`，不以 `style + mode` 重新查找或复制 Core 色表。直接调用 Plot 或 Chart resolver 的使用者必须提供由 Core 同一 registry 解析的完整 effective Theme；内置默认入口可以使用 `neutral + light` 的完整值。

每个 owner 只解析自己拥有的默认值。Plot style resolver 的输出是 Plot token cascade 的基线，随后先投影 Core shared categorical，再按既有优先级应用 `plotThemeTokens` 和 native `plotTheme`。Chart style resolver 的输出是 Chart token cascade 的基线，随后只应用 `chartThemeTokens`。Table style resolver 的输出是 Table token cascade 的基线，随后投影 Core shared categorical 并应用 `tableThemeTokens`。Chart 继续把 Plot authoring 输入原样转发，并调用 Plot 的公开 resolver，不复制 Plot token、preset 或 merge 语义。

在一个实际消费 style 的 owner 中，若找不到同名 definition，必须 fail-loud。也就是说，自定义 `brand` style 用于 Plot 时必须注册同名 `PlotThemeStyleDefinition`；用于 Chart 时还必须注册同名 `ChartThemeStyleDefinition`，并提供 Chart 调用的 Plot definition；用于 Table 时必须注册同名 Table definition。纯 Core Scene 不要求注册不消费它的领域 definition。

理由：

1. `style` 是跨 Scope、跨领域共享的最小稳定引用；函数与完整 token map 可由它和 mode 在运行时重建，不应写入 Snapshot
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

`inherit` 只表示 owner resolver 从上层完整 `ResolvedTheme` 直接投影 token 值，例如 Plot 与 Table 对 Core shared categorical 的投影。`local` 表示当前 owner 的 style definition 或 authored override 产生的值，包括领域 token、shorthand 与 native theme。

来源关系不编码 cascade precedence。领域 inspection 使用 `kind` 回答“继承还是本地”，使用稳定 `path` 区分具体入口，例如 `$style/<style>/<mode>/<token>`、`$theme/colors/categorical` 与 `$spec/<field>`。resolver 必须按输入层确定来源，不得通过最终值相等反推 winning source。Core 不增加领域 source 枚举、path parser、source record schema 或领域 resolver。

## 行为、失败语义与兼容性

- 默认行为：未声明 Theme 时使用唯一内置的 `neutral + light`，并由内置 Core、Plot、Chart、Table definitions 生成各自默认值
- 继承行为：Scene、外层 Scope、内层 Scope 依次覆盖显式 selector；内层未声明字段继续继承。style 变更会重新解析 Core shared colors
- 直接解析行为：Core compile、Plot lowering、Chart resolution 与 Table resolution 使用相同的 effective Theme 形态。自定义 style 的直接领域解析必须先通过 Core style registry 取得完整 `ResolvedTheme`，不得以局部 fallback 色表模拟
- Definition 行为：内置与自定义 definition 使用同一 `define`、registry、查找和消费链路。自定义 name 可以新增；与内置或另一自定义 definition 重名时 fail-loud，不支持覆盖内置默认值
- 失败与诊断：Theme 的空 style、未知字段和 token bag 在 schema 边界 fail-loud。有效 selector 在 Core 中未注册时 fail-loud；已解析到领域 owner 但缺少对应同名 definition 时在该 owner fail-loud。Definition 回调的输入和输出遵循 TypeScript contract，不为内部 typed 调度增加平行运行时类型断言
- 兼容性：`style` 从闭合枚举改为非空名称；移除 `theme.tokens`、Theme token Definition / Contribution、registry 与 `themeTokenDefinitions`。这是 `0.x` breaking change，不提供 alias、双读或静默迁移
- React / Vanilla 等价性：React、Vanilla 与 plain JSON 都只能将 selector 写入 Scene / Scope Theme；所有 runtime definition 由等价的 Core / Plot / Chart / Table options 注入。领域本地 override 仍使用同一领域 schema 和 resolver

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的可继承视觉环境与 shared colors，以及 Visualization Complete / Chart 封装中的领域视觉默认值扩展。解决自定义 style 无法贯通 Core 与 Tier 2 的问题，同时避免把 token map 持久化回 IR
- 主责包与协作包：`@retikz/core` 拥有 selector IR、继承、Core style contract / registry、shared colors 与来源原子；`@retikz/plot`、`@retikz/chart`、`@retikz/table` 各自拥有 style contract / registry、领域 token cascade 与消费入口；React / Vanilla 只负责等价 authoring / runtime 接线；Render 只执行物化 Scene
- 拥有：每个 owner 的 definition contract、仅含 `neutral` 的内置集合、registry、resolver、diagnostic 与 Neutral 完整默认值。Core 额外拥有 `style` / `mode` 与 shared semantic / categorical color contract
- 不拥有：Core 不拥有领域 token key、完整领域 token map、领域 preset 或领域 registry；Plot 不拥有 Chart token；Chart 不拥有 Plot token / preset / merge；adapter 与 renderer 不拥有平行 resolver
- 外部扩展与下游闭环：自定义 style 在 Core 和每个实际消费它的领域 owner 中注册同名 definition。应用级 preset 负责组合这些 owner-local definitions，但不建立跨 owner definition 或 registry；Core composite context 提供 resolved Theme，Plot / Chart / Table 将解析后的正式输入下沉既有 Core / Standard 链路。未来 owner 若需消费开放 style，必须新增其 owner-local definition 与同样的注册闭环，不复用既有领域 token contract
- 不支持边界：不支持通过 Scope 下发任意 token key、以一个 Core definition 携带领域 token、未注册领域时的 neutral fallback、Definition 覆盖内置 style、动态 mode 注册、远程 Theme loader、Theme lineage、交互状态和动画 token

## 架构验证

- 是否可由现有能力组合：不能完全由现有能力组合。ADR-09 已提供 Scene / Scope Theme 继承和 Composite context，Plot / Chart / Table 已各有 owner-local token resolver；缺口是闭合 selector 与硬编码 preset 没有统一的 runtime definition / registry。该 ADR 扩展现有 Theme、Plot、Chart 与 Table 域，不新建平行 IR 或 renderer 分支
- math / core / render / adapter 责任切分：Math 与 Runtime 不解释 Theme；Core 解析 selector、Core registry 与 shared colors；Plot / Chart / Table 各自解析 token；Render 不读取 Theme；React / Vanilla 只将相同 runtime definitions 转交 owner 入口
- 是否需要新 IR / contract / registry：需要 Core、Plot、Chart 与 Table 四个 owner-local Definition / registry contract；不新增 token IR 或跨 owner token registry
- Scene / manifest / renderer / diagnostics 如何闭环：Scene / Scope 只持有 selector，Composite 读取完整 effective Theme，owner resolver 物化正式样式输入，最终 Scene 只含已物化 primitive。Core 与 owner registry 在各自可定位的消费边界报告缺失 definition；renderer 无需理解 Theme
- provenance / locator / Interaction Readiness 是否适用：现有 Theme locator、Scope traversal、probe / replay 与 incremental snapshot 继续使用轻量 selector；本 ADR 不新增 interaction 语义
- 结论：扩展既有 Core / Plot / Chart / Table 能力域，按 owner 补齐 definition / registry / resolver / consumer 链路；不下沉领域 token，也不恢复 token bag

## 被否决方案

- 保留 generic sparse token bag：稀疏性无法阻止完整 map 进入 IR，仍无法保证 snapshot 体积与领域边界
- 仅开放 Core `ThemeStyleDefinition`：Plot / Chart / Table 仍会在闭合 preset 查找处断链，或被迫回退到不匹配的内置视觉默认值
- 把 Plot / Chart / Table token resolver 放入 Core definition：会让 Core 反向依赖领域 vocabulary，并把独立 owner 的发布和演进耦合在一个定义中
- 缺少领域 definition 时回退 neutral：配置遗漏会静默产生混合视觉人格，不能表达用户为该 style 定义的领域 token
- 把 Academic、Vibrant、Clean 留在发布包内置集合：展示型 preset 会让每个视觉 owner 的默认产物、测试与维护矩阵持续扩张，并把应用选择错误地升级为所有使用者的基础能力
- 由 Core 提供跨 owner preset bundle：会让 Core 反向依赖领域 definition，并破坏 owner-local registry 边界；应用只能组合 definitions，不能定义新的统一 resolver
- 让 Zod schema 在 parse 时生成 token：schema 应只定义 JSON 输入合法性，不能读取 registry、领域 preset 或 runtime context

## 测试策略摘要

需要 schema / type 证据证明 Theme 只接受轻量 selector、允许非空自定义 style 并拒绝 token bag；Core contract / provider / compile 证据证明内置与自定义 Core definition 同路、Scene / Scope 继承、缺失 definition 诊断及 probe / replay 一致；Plot、Chart 与 Table contract / provider / resolver 证据证明同名 custom style 解析各自 token、保持局部 override 优先级，并缺失 owner definition 时 fail-loud；inspection / manifest 证据证明 `inherit | local` 与稳定 path 保留来源；adapter parity 证据证明 React、Vanilla、plain JSON、standalone 与 embedded lowering 传递同一套 definitions；docs 证据说明跨 owner 注册要求与不持久化边界。

## 不在本 ADR 范围

- 跨领域的 Scope token override、命名 Theme loader、Theme lineage、交互状态和动画 token
- 任意用户定义 `mode`、style inheritance 策略、Definition 覆盖 / 叠加、按局部 selector 自动发现 definition
- Plot、Chart 各自 token key、preset 内容、resolver 算法和局部 override DSL 的重新设计
- 尚无公开 authoring 表面的 Chart adapter API；该能力在 adapter 具备正式 Chart runtime 接线时，以同一 Chart resolution options 透传，不另造 adapter 私有入口
- renderer-specific CSS variables、宿主 UI theme 或 renderer 默认样式

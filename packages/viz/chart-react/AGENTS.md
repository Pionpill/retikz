# @retikz/chart-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供 Chart Source 与精确 chartType 的 React authoring、presentation marker、Chart mark 组件与运行时接线
- **拥有的契约**：逐 chartType concrete Chart 的完整 IR-like 根配置、`ChartData` / `ChartLayout` / `ChartCoordinate` / `ChartExtension`、exact recipe declarations、presentation marker、直接子节点收集和 React 生命周期接线；根入口只提供 Chart 公共 declaration、presentation 与 Theme 能力
- **不拥有的能力**：Chart schema/registry/recipe/resolve、Plot 算法与 lowering、数据处理、Core compile、Standard Surface / Layout、identity、renderer 或 Vanilla normalize 规则
- **输入与输出**：接收 typed Chart 根配置、runtime rows 与可选 declaration children，映射为同一 `@retikz/chart-vanilla` Input，并输出统一 Chart InputEmbed contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，无框架 normalize/SSR 进入 `@retikz/chart-vanilla`，Core dependency aggregation 与 compile 进入 Kernel adapter owner

## Source 与 React children 边界

- 根入口只提供 presentation markers、`ChartThemeProvider` 与共享类型，不提供 generic `<Chart source={...}>`
- `/point` 入口的具体 `<XxxChart>` 通过入口身份确定 family 与 chartType，并以 `rows`、`data`、`layout`、`coordinate`、`presentation`、`recipe`、`plotExtension` 提供完整 IR-like 配置；组件仍调用对应 Vanilla factory，不直接构造 Chart Source 外壳
- `children` 可选；root-only、declaration-only 与跨 slot hybrid 必须生成同一 Source。缺少 runtime rows 或 exact recipe encodings 时在 React 边界 fail-loud
- `ChartData`、`ChartLayout`、`ChartCoordinate`、`ChartExtension`、presentation markers 与逐类型 declarations 都是根配置同一 owner slot 的 headless JSX sugar，不是第二套 grammar
- 根配置与 declaration 可以跨 slot 混用；同 slot 双来源 fail-loud，不定义优先级或隐式 merge。`recipe.marks` 的显式空数组也视为 authored 来源；presentation 按单 slot 判冲突
- 根 `coordinate` prop 或 `ChartCoordinate` 把字符串 / 对象原样交给 Chart Vanilla；React 不解析坐标配置，不把 coordinate 放入 `ChartExtension`
- 根 `plotExtension` 接受 JSON-safe fragment；Plot declaration children 只能放入 `ChartExtension`。两种入口互斥；Path 等独立 Plot mark 与 axis、guide、transform 继续由 Plot React / Vanilla owner 收集、诊断和归一化
- presentation marker 按固定 slot 归一为 `title`、`subtitle`、`note`、`source`；JSX 出现顺序不改变 slot 语义，同类 marker 最多一次，Fragment 只透明分组
- marker children 只接受字符串、透明 Fragment 和整行 Core `Text` authoring；普通 DOM、任意 ReactNode、Plot declaration 或嵌套 mark 组件 fail-loud
- 根 `layout.width` / `height` 同时配置 standalone 隐式 Layout host；embedded 时只作为 Source border-box。`ChartLayout.width` / `height` 保持同一行为的 JSX sugar，显式 `layout` 不与简写维度字段级合并

## Runtime 复用

- React 只把结构化根 props / markers / marks 映射为 Vanilla Input，复用逐类型 normalizer；不查找 registry、不解析 Theme、不生成 Plot IR
- `themeDefinitions` 只作为具体 chartType provider 的运行时输入；recipe / mark Definition 不以平铺数组注入。`lowerOptions` 只转发 Plot lowering 选项；两者均不得写入 JSON Source
- 具体 Chart 组件共用 `ChartInputEmbedAdapter` 和 Chart provider contribution，不保留 Base / typed 平行 IR、private bind 或 renderer 分支
- 具体 Chart 组件 standalone 时只建立一个 `Layout` Scene host；放入外层 `Layout` 时只贡献 Chart-to-Plot Scope/composite 并继承外层 effective Theme。embedded `ChartLayout` 只允许 Source `layout`，声明 `width` / `height`（含显式 `undefined`）必须 fail-loud；根 `layout` 始终是 Source 配置。renderer、CSS、动画与高级 host 字段只由外层 `Layout` 提供
- 不保留根入口 typed alias、旧 `type` prop、旧 `config`、旧 Theme token 字段或兼容 fallback

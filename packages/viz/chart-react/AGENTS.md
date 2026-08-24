# @retikz/chart-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供 Chart Source 与精确 chartType 的 React authoring、presentation marker、Chart mark 组件与运行时接线
- **拥有的契约**：逐 chartType `XxxChartProps`、`ChartTitle` / `ChartSubtitle` / `ChartNote` / `ChartSource`、`ScatterMark`、直接子节点收集和 React 生命周期接线；根入口只提供共享 presentation 与 Theme 能力
- **不拥有的能力**：Chart schema/registry/recipe/resolve、Plot 算法与 lowering、数据处理、Core compile、Standard Surface / Layout、identity、renderer 或 Vanilla normalize 规则
- **输入与输出**：接收精确 Source IR 或 typed chart props 与受限 children，映射为同一 `@retikz/chart-vanilla` Input，并输出统一 Chart InputEmbed contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，无框架 normalize/SSR 进入 `@retikz/chart-vanilla`，Core dependency aggregation 与 compile 进入 Kernel adapter owner

## Source 与 React children 边界

- 根入口只提供 presentation markers、`ChartThemeProvider` 与共享类型，不提供 generic `<Chart source={...}>`
- `/point` 入口的 `<ScatterChart>` 通过入口身份确定 family 与 chartType，并调用对应 Vanilla factory；组件不直接构造 Chart Source 外壳
- Point Chart 的 `encodings` 只接受字段绑定；`properties` 只接受常量；直接 `<ScatterMark>` 只表达 Chart-owned `recipe.marks` payload，普通 mark 按 authored order 追加，`override` 原样写入 Source 供 Chart resolver 匹配内建 semantic group；Path 等独立 Plot mark 通过 `plotExtension.marks` 传入
- presentation marker 按固定 slot 归一为 `title`、`subtitle`、`note`、`source`；JSX 出现顺序不改变 slot 语义，同类 marker 最多一次，Fragment 只透明分组
- marker children 只接受字符串、透明 Fragment 和整行 Core `Text` authoring；普通 DOM、任意 ReactNode、Plot declaration 或嵌套 mark 组件 fail-loud
- `width` / `height` 是 React host 尺寸，不自动写入 Source `layout`；需要 Chart border-box 分配时显式使用 Source / typed input 的 `layout`

## Runtime 复用

- React 只把 props / markers / marks 映射为 Vanilla Input，复用逐类型 normalizer；不查找 registry、不解析 Theme、不生成 Plot IR
- `themeDefinitions` 只作为具体 chartType provider 的运行时输入；recipe / mark Definition 不以平铺数组注入。`lowerOptions` 只转发 Plot lowering 选项；两者均不得写入 JSON Source
- 具体 Chart 组件共用 `ChartInputEmbedAdapter` 和 Chart provider contribution，不保留 Base / typed 平行 IR、private bind 或 renderer 分支
- 具体 Chart 组件 standalone 时只建立一个 `Layout` Scene host；放入外层 `Layout` 时只贡献 Chart-to-Plot Scope/composite 并继承外层 effective Theme。全部 `ChartHostProps` 只属于 standalone host，embedded own-property（含显式 `undefined`）必须 fail-loud；Source `layout` 继续独立表达 Chart border-box。
- 不保留根入口 typed alias、旧 `type` prop、旧 `config`、旧 Theme token 字段或兼容 fallback

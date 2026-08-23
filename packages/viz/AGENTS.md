# viz 分组工作指南

本文件覆盖 `packages/viz/`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。

## 包职责与边界

| 包                      | 解决的问题                                               | 拥有                                                                                                                                                 | 不拥有                                                                                                                         |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `@retikz/data`          | 为多个可视化宿主提供统一数据处理底座                     | 数据模型、字段解析、通用 transform / statistics、registry、lineage                                                                                   | channel、scale、mark、可视化布局、renderer                                                                                     |
| `@retikz/plot`          | 把数据语义映射成可组合的 Core 图形语义                   | Plot IR / schema、channel / scale / coordinate / mark / guide 领域解析、Plot style definition / token / preset / resolver、composition、lowering     | `InputPlot` 与 authoring normalize、通用数据算法、Chart presentation、通用 Legend 呈现、Core IR 语义、renderer、框架 authoring |
| `@retikz/plot-react`    | 用 React JSX authoring 和运行 Plot                       | React 组件、`XxxProps`、children 收集与 React runtime 接线；把 React 输入交给 Plot Vanilla 的统一 normalize / InputEmbed adapter                     | `InputPlot` 类型与 normalize、Data / Plot 算法、Core 编译、renderer                                                            |
| `@retikz/plot-vanilla`  | 无框架 authoring、SSR 和运行 Plot                        | `InputPlot` 等 TypeScript authoring 类型、`normalizePlot`、`PlotSource` / `InputPlotEmbed`、Tier 2 InputEmbed adapter、数据注入与 vanilla / SSR 编排 | Data / Plot 算法、Core 编译、renderer、React 组件                                                                              |
| `@retikz/chart`         | 把 family 分类与具体 chartType 高层意图解析为完整 IRPlot | Chart Source shell、逐 chartType 精确 schema、recipe Definition / registry、semantic mark、Chart mark 继承、Chart shell / recipe Theme、presentation | Plot mark / scale / guide / composition 与 lowering、Data 算法、Standard / Layout 实现、Core 编译、adapter、renderer           |
| `@retikz/chart-react`   | 用 React authoring 和运行 Chart                          | 逐 chartType 精确 props、presentation marker / mark 组件、Chart Vanilla Input 映射与 runtime 接线                                                    | Chart schema / registry / recipe、Plot 算法、Core 编译、renderer                                                               |
| `@retikz/chart-vanilla` | 无框架 authoring、SSR 和运行 Chart                       | Chart TypeScript Input、逐 chartType factory、Input-to-Source-IR normalize、plain presentation / mark 输入与 SSR                                     | Chart schema / registry / recipe、Plot lowering、identity bypass、Core 编译、renderer                                          |
| `@retikz/table`         | 把数据或显式内容组织为二维语义表格                       | Table IR、结构/呈现、visual encoding / Legend 领域解析、约束布局、lowering、追溯                                                                     | 通用数据算法、通用 Legend 呈现、Core 测量、Plot 语义、renderer                                                                 |
| `@retikz/table-react`   | 用 React authoring 和运行 Table                          | Table / DetailTable / ManualTable、数据注入、composite 与宿主 runtime 接线                                                                           | Table 算法、Core 编译、renderer                                                                                                |
| `@retikz/table-vanilla` | 无框架 authoring、SSR 和运行 Table                       | plain helper、Tier 2 adapter、数据注入与 SSR convenience                                                                                             | Table 算法、Core 编译、renderer                                                                                                |

未来的 geo 等边界只在 ADR 或 roadmap 明确后落包；AGENTS 不为未存在包保留详细规则。

## 分层约束

- viz 组是领域 Tier 2 能力层，不向 core / library 组反向注入实现；通用机制或几何缺口优先补 `@retikz/core` / `@retikz/math`，移除领域词汇后仍成立且被多个官方 Tier 2 包复用的绘图 composite 进入 `@retikz/standard`。
- `@retikz/data` 是数据模型、字段与值语义、transform 和通用数据处理契约真源；plot / chart / table 不复制数据处理算法。
- `@retikz/plot` 是 plot 语义、composition、guide 领域解析、Plot surface / typography / Axis / Legend / Mark 视觉 token、palette、style definition / preset / resolver / mapping / inspection 和 lowering 真源；它只拥有可持久化的 `IRPlot*` schema / 类型，不拥有 `InputPlot*` authoring 类型或 normalize。Chart 的 `theme.tokens.plot`、`plotExtension` fragment 与所有生成 mark 必须继续进入 Plot 正式主链，adapter 不复制 data、scale、coordinate、mark、guide、Theme 或 lowering 算法。完整图表 title / subtitle / note / source 由 Chart presentation 通过 Standard 组合，Plot 只保留 Axis、Legend、Facet、datum、mark、reference 与 annotation 文本。
- `@retikz/chart` 拥有 Chart shell 与 recipe Theme token；所有 Chart 共用的 canvas / presentation 进入 shell slice，特定 Scatter、Heatmap 等 recipe 默认进入当前 chartType 的精确 recipe slice。recipe / mark Definition 是包内实现契约，concrete provider contribution 是公开 authoring/runtime 边界。Plot token 仍由 Plot owner 解析；不同 owner 只复用 Core value atom，不共享或复制 token key、definition 或 resolver。
- Chart 根固定使用 `namespace + type + recipe.chartType`：`type` 是 family，`chartType` 是全局唯一 recipe key 并唯一映射到一个 family。`recipe` 保存精确 field-only `encodings`、可选 `properties` 与有序 `marks`；用户显式 Plot 调整进入可选 `plotExtension`。每个 chartType 拥有独立 strict schema；`OpenString` 只开放已注册 key，不建立接受全部 payload 的宽 union。
- Chart 以 `point`、`bar`、`line`、`relation` 等一级 family owner 作为横向扩展轴；每个 family module 只声明一次 family 并聚合真实共享内容。应用层可以按自己的模块加载策略维护 family / chartType catalog 与 JSON 路由；Chart runtime 不维护全局 catalog 或全局 parse/router。所有 family 共用的 shell、contract、resolve、Theme、Plot 组合与 provider 进入 `_chart`；family 内复用项进入对应 `family/shared`，不建立根 `_shared` owner。
- Chart recipe Definition 生成 shared scaffold 与 built-in semantic mark，semantic mark 可以 lower 为一个或多个 Plot mark。recipe 通过有序 binding 单向声明允许的 Chart mark 及可继承 encodings / properties；mark Definition 不反向保存 family、chartType 或继承表。`plotExtension.marks` 保持完全显式、相互独立，不读取 Chart context。
- Chart presentation 使用固定 title → subtitle → plot → note → source 顺序；JSON 属性顺序与 React marker 顺序没有语义。自由 presentation 排列与多 Chart composition 需要后续独立设计，不进入当前 Source IR。
- `@retikz/table` 是表格结构、Cell 呈现、visual encoding / Legend 领域解析、约束布局和 lowering 真源；通用 Legend 呈现消费 Standard，显式 Plot 等 Tier 2 Cell 只通过 Core `IRChild` / composite 进入，Table 不依赖或特判 Plot。
- plot-specific transform 可以在 plot 实现，但必须复用 data 的 definition、registry 与 apply contract；宿主无关的 rows / fields / statistics 算法归 data。
- viz 内共用几何类型和工具优先来自 `@retikz/math` / `@retikz/core`。例如二维坐标用 `Position`，有限 / 无穷数值判断用既有 helper，不在 plot 内重复定义。
- 已存在的本包工具应复用；如果工具应上移到 math/core，先迁移再使用。

每个包的输入输出与缺口流向以就近 `AGENTS.md` 为准。宿主无关的数据处理进入 data；可视化映射语义进入 plot；`InputPlot` 与统一输入接入进入 plot-vanilla，React 只负责 `XxxProps` / children 到 Vanilla 输入的桥接；通用图形机制或几何缺口下沉 core / math，跨领域复用的官方绘图 composite 进入 Standard。当前实现位置和 adapter 是否能展示都不能改变这条所有权链。

## 能力完备性

- `@retikz/data` 的主责边界见 [`data-capability-complete.md`](./_notes/architecture/data-capability-complete.md)。
- `@retikz/plot` 的主责边界见 [`plot-visualization-complete.md`](./_notes/architecture/plot-visualization-complete.md)。
- `@retikz/table` 的主责边界见 [`table-visualization-complete.md`](./_notes/architecture/table-visualization-complete.md)。
- 新能力先判断属于 Data Complete、Visualization Complete、Tabular Visualization Complete 还是应下沉 Drawing Complete；adapter / preset 能展示不等于能力闭环。

## 代码风格

从 d3 生态导入的运行时函数、常量和值对象统一用 `d3Xxx` 本地名；类型统一用 `D3Xxx` 本地名，避免与项目内 scale / formatter / schema 命名混淆。

## 验证

改 `@retikz/plot` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/plot exec eslint . --fix
pnpm --filter @retikz/plot exec tsc --noEmit
```

改 `@retikz/table` 结构化文件后至少运行：

```bash
pnpm --filter @retikz/table exec eslint . --fix
pnpm --filter @retikz/table exec tsc --noEmit
```

adapter 改动按对应包运行同类命令；跨包 API 改动同步 docs。

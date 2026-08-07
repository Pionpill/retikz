# @retikz/plot 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：用可扩展的 grammar-of-graphics 把数据与可视化语义确定性地映射为 Core IR，而不依赖 chart type、framework 或 renderer
- **拥有的契约**：Plot IR / schema、channel / scale / coordinate / mark / guide 领域解析 / layout definitions 与 registries、Plot surface / typography / label / Axis / Legend 视觉 token、palette、preset / resolver / mapping / inspection、plot-specific transform、lowering、visualization provenance / locator
- **不拥有的能力**：Chart canvas / presentation / recipe token、宿主无关的数据模型与 transform 算法、跨领域 Legend 视觉结构 / 内部布局 / lowering、Core Theme 继承、Core IR / Scene 语义、SVG / Canvas 执行、React / Vanilla authoring、业务 dashboard 状态
- **输入与输出**：接收 Plot IR、Data view / datasets、plot definitions 与 lowering options，向 Standard 产生已经解析好的通用绘图输入，并输出 Core IR contribution、plot lineage / locator 和 diagnostics；不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：通用数据能力下沉 `@retikz/data`；通用机制 / 几何能力下沉 core / math；被多个领域复用的绘图 composite 进入 `@retikz/standard`；chart-level 组合上移 preset；authoring / runtime 进入对应 adapter；只有依赖可视化语法轴的能力才进入 plot

新增或迁移可视化能力前，先按 [`plot-visualization-complete.md`](../_notes/architecture/plot-visualization-complete.md) 确认 Visualization Complete 与 Data / Drawing Complete 的交界。

## 分层

```text
shared/       无依赖共享词汇、纯函数、映射和工具类型
schemas/      Zod schema 与 Plot IR 类型真源
contract/     coordinate / scale / mark / channel / guide / locator 等可视化扩展契约与公开类型
providers/    内置 definition、plot-specific transform、BUILTIN_*、registry resolver、dispatch / apply / resolve，以及 Plot preset / token / `plotTheme` 解析
pipeline/     Tier 2 -> Kernel IR 下沉编排，消费 providers / contract；guide / locator 等运行时编排也归这里
```

- `shared` 不依赖其他 plot 层；跨层复用的纯函数和稳定词汇优先放这里。
- `contract` 不依赖 `providers` / `pipeline`；providers 依赖 contract；pipeline 负责编排。providers 里的既有 provenance helper 依赖是历史例外，新增代码不要扩大例外。
- `schemas` 可被所有层依赖，但 schema 不读取实现层。
- `pipeline/guide` 负责 axis / legend 下沉为 Kernel IR；`contract/guide` 只放 coordinate provider 与 pipeline 共用的 guide context 类型。
- Plot Composite 从 Core context 消费 effective Theme；PlotSpec 不重复 Core style / mode。`plotThemeTokens`、`colors`、native `plotTheme` 与 local guide / mark / scale config 按公开 cascade 解析；inherited `theme.tokens.plot` 与 Core shared categorical 位于 preset 之后。
- `PlotThemeTokenDefinition` 固定注册 `plot` namespace；`definePlotThemeTokens` 生成经 schema 校验的 contribution。React / Vanilla adapter 必须把同一 Definition 注入 Core `themeTokenDefinitions`，standalone、embedded 与 plain lowering 共用这条 registry 语义
- Plot canonical palette 使用 `plot.palette.*`；`data.palette.*` 不属于 Data 或 Plot 的公开 token namespace，不保留 alias 或双读。
- Chart 与其它上层只能传递 Plot 公开 token contract 或调用 Plot 公开纯 resolver，不得复制 Plot key、schema、preset、merge 或 resolved theme。
- `pipeline/locator` 负责通过 lowering 流程解析 datum / series 锚点；`contract/locator` 只放公开 locator 类型。
- 模块外 import 优先走对应顶层 barrel（`../shared` / `../contract` / `../providers` / `../pipeline`）；公共 API barrel 可 deep import 做表面裁剪。
- 新共享逻辑放到最小合理归属层；多个语法层都需要时优先下沉到更底层，或上移到 `@retikz/math` / `@retikz/core`。

改上述分层、依赖方向或 define-registry 能力前，先按根 AGENTS 读取 `standard-structure` 及对应层级 skill。

## 公共能力复用

- 几何坐标类型使用 `@retikz/math` 的 `Position`。
- core IR / Scene 类型从 `@retikz/core` 获取，不在 plot 内复制。
- title、entries、swatch / ramp / symbol、约束布局与 artifact 等通用 Legend 呈现使用 `@retikz/standard`；plot 只拥有 channel / scale / formatter、guide resolve、theme mapping、provenance / locator 与交互意图。
- 有限 / 无穷数值判断、字段解析、label 格式化、scale 解析等优先使用所属模块已有 helper。
- 通用数据模型、字段、transform / statistics / format 与 lineage 从 `@retikz/data` 获取；plot-specific transform 复用 data contract，不复制 apply pipeline。
- 函数保持纯计算和 plain data；不要把 d3 scale 函数、class 实例、ReactNode 等放入 IR。

## Registry 规则

- 内置与自定义 definition 经同一 `resolveXxxRegistry` 分派，不写内置白名单分支。
- `contract/<层>` 放 `XxxDefinition`、`defineXxx`、`AnyXxxDefinition`、key extractor 和共享接口。
- `providers/<层>` 放内置 definition、注册清单和 resolve / dispatch / apply 实现。
- channel 按 `ChannelDefinitionKind` 组织内置实现；scale 只负责 scale family，不把通道消费逻辑塞进 scale。

## 公开 API

- `src/index.ts` 是包公开入口；新增公开能力必须评估 docs 同步。
- 子目录 `index.ts` 是模块边界；模块外 import 优先经过 barrel。
- 0.x 阶段可做破坏性命名 / schema 调整，但代码、测试、docs 必须一致。

## 测试

- schema / 数据契约改动：补 `tests/ir` 或 data/model 相关测试。
- lowering 行为改动：补 `tests/lower`，覆盖 IR 输出形状和边界输入。
- 坐标 / cell / mark 几何改动：补对应单测，避免只靠视觉 demo。

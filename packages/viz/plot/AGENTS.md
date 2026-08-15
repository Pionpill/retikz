# @retikz/plot 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：用可扩展的 grammar-of-graphics 把数据与可视化语义确定性地映射为 Core IR，而不依赖 chart type、framework 或 renderer
- **拥有的契约**：Plot IR / schema、channel / scale / coordinate / mark / guide / composition 领域解析与 registries、Plot surface / typography / Axis / Legend 视觉 token、palette、style definition / preset / resolver / mapping / inspection、plot-specific transform、lowering、visualization provenance / locator
- **不拥有的能力**：Chart canvas / presentation / recipe token、宿主无关的数据模型与 transform 算法、跨领域 Legend 视觉结构 / 内部布局 / lowering、Core Theme 继承、Core IR / Scene 语义、SVG / Canvas 执行、React / Vanilla authoring、业务 dashboard 状态
- **输入与输出**：接收 Plot IR、Data view / datasets、plot definitions 与 lowering options，向 Standard 产生已经解析好的通用绘图输入，并输出 Core IR contribution、plot lineage / locator 和 diagnostics；不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：通用数据能力下沉 `@retikz/data`；通用机制 / 几何能力下沉 core / math；被多个领域复用的绘图 composite 进入 `@retikz/standard`；完整图表 presentation 上移 Chart；authoring / runtime 进入对应 adapter；只有依赖可视化语法轴的能力才进入 plot

新增或迁移可视化能力前，先按 [`plot-visualization-complete.md`](../_notes/architecture/plot-visualization-complete.md) 确认 Visualization Complete 与 Data / Drawing Complete 的交界。

## 分层

```text
shared/       无依赖共享词汇、纯函数、映射和工具类型
schemas/      Zod schema 与 Plot IR 类型真源
contract/     coordinate / scale / mark / channel / guide / locator 等可视化扩展契约与公开类型
providers/    内置 definition / implementation、plot-specific transform、BUILTIN_* 与 registry merge
resolve/      消费 Source IR + 窄 resolve context，统一做 context determination、lookup、默认、优先级与领域校验，产出 Canonical / Effective / Resolution
pipeline/     创建 context、排阶段并调度 resolver，消费已确定结果后完成 Tier 2 -> Kernel IR 的 lowering / emit
```

- `shared` 不依赖其他 plot 层；跨层复用的纯函数和稳定词汇优先放这里。
- 依赖方向固定为 `shared -> schemas -> contract -> providers -> resolve -> pipeline`；左侧不得反向依赖右侧。
- `schemas` 可被所有层依赖，但 schema 不读取实现层。
- `contract` 只定义作者扩展契约和公开类型；`providers` 只提供内置 definition / implementation、`BUILTIN_*` 集合与内置/自定义 registry 合并，不拥有 pipeline dispatch、领域 apply 或 context resolve。
- `resolve` 拥有 channel、scale、coordinate、mark、guide、theme、composition 与 lineage 的 Source IR + context determination，以及 lookup、默认/级联、补全后校验和 Canonical / Effective / Resolution；`resolveXxxRegistry` 仅用于 providers 的 registry 合并。
- `pipeline` 负责建立并维护 context、确定阶段顺序、调用 `resolveXxx`，并消费结果执行 data transform、guide / locator 编排与 Core IR lowering / emit；不得直接 lookup registry、解释领域默认或建立平行 resolve / apply 阶段。
- `pipeline/guide` 负责 axis / legend 下沉为 Kernel IR；`contract/guide` 只放公开契约和 provider / resolve / pipeline 共用的 guide context 类型。
- `composition` 的 registry、arrangement policy/layout、facet panel 与相关 context determination 属于 `resolve/composition`；pipeline 只消费其结果编排 frame / layout / lowering。
- `lineage` 的默认与有效选项属于 `resolve/lineage`；pipeline 只执行 lineage lowering / locator。
- `theme` 的内置 catalog、preset、token definition 与 registry merge 属于 `providers/theme`；Plot theme mapping、cascade、effective token 与 resolution 属于 `resolve/theme`。`scale`、`channel`、`mark` 遵循同一规则：definition / implementation / registry merge 在 providers，lookup、默认、校验与语义 determination 在 resolve。
- Plot Composite 从 Core context 消费 effective Theme；PlotSpec 不重复 Core style / mode。省略 `style` 时使用随 `mode` 变化的 Plot 默认 token baseline；显式 `PlotThemeStyleDefinition` 经 Plot registry 解析完整 token baseline。`plotThemeTokens`、`colors`、native `plotTheme` 与 local guide / mark / scale config 按公开 cascade 覆盖该基线。resolver 接收 Core shared colors 并负责默认 palette，不在后续阶段无条件重写 palette
- `plotThemeStyles` 是 Plot lowering 的 runtime definition 入口。React / Vanilla adapter 必须将同一 option 传给 standalone、embedded 与 plain lowering；自定义 style 解析到 Plot 时缺少同名 definition 必须 fail-loud
- Plot canonical palette 使用 `plot.palette.*`；`data.palette.*` 不属于 Data 或 Plot 的公开 token namespace，不保留 alias 或双读。
- Chart 与其它上层只能传递 Plot 公开 token contract 或调用 Plot 公开纯 resolver，不得复制 Plot key、schema、preset、merge 或 resolved theme。
- `pipeline/locator` 负责通过 lowering 流程解析 datum / series 锚点；`contract/locator` 只放公开 locator 类型。
- 模块外 import 必须走目标 owner 的顶层 barrel（`../shared` / `../schemas` / `../contract` / `../providers` / `../resolve` / `../pipeline`）；同 owner 内部可相邻导入，公共 API barrel 仅在有意裁剪表面时选择性导出，不从非 owner 模块转手导出。
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

- 内置与自定义 definition 经同一 `resolveXxxRegistry` 合并，不写内置白名单分支；具体 provider lookup、fallback、默认与上下文诊断由 `resolveXxx` 负责。
- `contract/<层>` 放 `XxxDefinition`、`defineXxx`、`AnyXxxDefinition`、key extractor 和共享接口。
- `providers/<层>` 放内置 definition / implementation、注册清单和 `BUILTIN_*` 集合；不放领域 resolve、pipeline dispatch 或阶段级 apply。
- channel 按 `ChannelDefinitionKind` 组织内置实现；scale 只负责 scale family，不把通道消费逻辑塞进 scale。

## 公开 API

- `src/index.ts` 是包公开入口；新增公开能力必须评估 docs 同步。
- 子目录 `index.ts` 是模块边界；模块外 import 优先经过 barrel。
- 0.x 阶段可做破坏性命名 / schema 调整，但代码、测试、docs 必须一致。

## 测试

- schema / 数据契约改动：补 `tests/ir` 或 data/model 相关测试。
- lowering 行为改动：补 `tests/lower`，覆盖 IR 输出形状和边界输入。
- 坐标 / cell / mark 几何改动：补对应单测，避免只靠视觉 demo。

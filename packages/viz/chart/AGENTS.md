# @retikz/chart 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让基础 Chart 的完整 Plot authoring 与封闭 typed Chart recipe 形成完整 PlotSpec，再归一为 canonical IRChart，并把可选 presentation 映射为 Layout Flex、把完整内容映射为 Standard Surface
- **拥有的契约**：typed ChartSpec、保留整图 identity / Chart token handoff 的 canonical IRChart、四类 presentation preset、共享 authoring normalizer、封闭 recipe 协议、Chart style definition、Plot style option 转发、Chart 到 Plot 的 merge / validation、inspection 和单一 `chart.chart` composite definition
- **不拥有的能力**：Plot surface / typography / guide / palette token、Plot preset / resolver / `plotTheme` merge、Axis / Legend / Facet / mark / reference / annotation 文本、Data 算法、Plot lowering / registry、Layout solver、Standard Surface lowering、Core compile、renderer、框架 authoring、跨 adapter definition 聚合
- **输入与输出**：接收完整 PlotSpec 或 JSON-safe typed Chart variant 与 framework-neutral presentation authoring，输出 canonical IRChart、裸 Plot或 Layout Flex content、Standard Surface、Chart identity 与 inspection；不直接输出 DOM、SVG 或 Canvas
- **缺口流向**：数据能力下沉 `@retikz/data`；可视化 operation 与 lowering 进入 `@retikz/plot`；通用布局进入 `@retikz/layout`；领域无关 presentation composite 进入 `@retikz/standard`；composite / adapter 聚合与 identity 进入 Kernel owner；React / Vanilla authoring 进入对应 adapter

## 源码 owner 与依赖方向

Chart 是 Tier 3 的横向类型封装，不以 `schemas/providers/pipeline` 作为主要导航轴。源码按语义 owner 组织：

```text
shared/       Chart-wide 基础词汇、JSON helper 与无状态 ID 工具
schemas/      Chart-wide ChartSpec contract、公共 schema fragments 与封闭 union
families/     正式 Chart family 与 family/type-specific schema、recipe、invariant
presentation/ canonical IRChart presentation、四类 preset、authoring normalizer、Layout Flex / Standard Surface 投影与 inspection
style/        Chart canvas / presentation / recipe token、preset、resolver 与 inspection；不定义 Plot token
inspection/   中立 contribution/member records 到公开 inspection 的投影
resolution/   closed catalog、dispatch、通用 merge/validation、错误归一化与 owner 接线
internal/     仅供测试路径使用的 private fixture，不属于正式 family 或 public surface
```

正式 family 使用 roadmap 的语义分类：`scatter-points`、`line-area`、`bar-column`。`point`、`path`、`interval` 是 Plot Mark 骨架，不是 Chart family。当前已实现的 `scatter`、`bubble`、`connected-scatter` 位于 `families/scatter-points/`，其中 `scatter` 与 `bubble` 是平级 Canonical Type。

允许的主要方向为：

```text
shared -> schemas / presentation / style / inspection / families/shared
schemas + families/shared -> families/<family>/<type>
style -> presentation -> Layout + Standard
families + schemas + presentation + style + inspection -> resolution
```

- 根 `shared` 不得依赖 presentation、style 或 resolution；当前 `schemas/shared.ts` 组合了高层 ChartSpec 字段，迁移后归 `schemas/common.ts`
- type owner 拥有自己的 schema、recipe 与 invariant，不得导入 resolution；typed recipe 在 Core compile 前由共享 resolver 归一为 canonical `IRChart`
- `resolution` 只聚合 recipe、dispatch、通用 merge/validation、错误归一化与 composite 接线，不复制 type recipe、Plot lowering 或 inspection provenance
- 唯一 `chart.chart` dependency provider 直接、按序依赖 `standard.surface`、`layout.flexLayout`、`plot.plot` 三个完整 key；不得发布逐类型 Core provider、按 adapter 拆分、动态发现或用单 namespace maker 补依赖
- `inspection` 只消费中立的 final member/contribution 输入，不依赖 `MergedChartMember` 等 resolver 私有类型，也不通过 Plot 数组下标猜来源
- `style` 只解析 Core effective Theme 下的 Chart-owned token；省略 `style` 时使用随 `mode` 变化的 Chart 默认 token baseline，显式 `ChartThemeStyleDefinition` 经 Chart registry 生成完整 Chart token baseline，`chartThemeTokens` 只覆盖 Chart key；`plotThemeTokens` / `colors` / native `plotTheme` 与 `plotThemeStyles` 原样转发到 Plot；Core style / mode 只来自宿主 Theme
- `chartThemeStyles` 与 `plotThemeStyles` 是 Chart resolution / composite 的 runtime definition 入口。自定义 style 解析到 Chart 时缺少同名 Chart 或 Plot definition 必须 fail-loud，不通过 Core token registry 聚合
- recipe toggle 使用 `chart.axis.enabled`、`chart.axis.grid.enabled`、`chart.legend.enabled`；无 Chart namespace 的旧 key 与 `data.palette.*` 不保留 alias 或双读
- recipe 需要 palette 等 Plot 结果时只能调用 Plot 公开纯 resolver，不复制 Plot preset / merge，也不把 resolved Plot theme 物化回 PlotSpec
- `presentation` 只接受唯一 Plot placeholder 与 title / subtitle / note / source TextBlock preset；authoring-only position 在 canonical IR 前消失，resolver 严格按 children 顺序投影到 Layout Flex，再用 Standard Surface 包装完整内容
- canonical `IRChart` 保留整图 `id` 与 `chartThemeTokens`；Plot-owned theme 和 intrinsic contract 只保留在完整 PlotSpec。基础 Chart spec 模式保留显式 Plot id，DSL 模式只在 Chart id 存在时派生 `${chartId}/plot`，不得生成计数 id
- 首个公开入口只能导出经 ADR 冻结的 typed ChartSpec、IRChart、单一 `ChartDefinition`、presentation / inspection / Chart style 数据契约，以及 `resolveChartSpec` 这一条 framework-neutral typed authoring resolver；recipe、catalog、resolver 私有类型、逐类型 definition factory 与 fixture 不得泄漏

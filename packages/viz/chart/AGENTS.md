# @retikz/chart 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：把封闭的 Chart 类型配方确定性解析为完整 PlotSpec，并把可选 presentation 映射为 Standard Flex 输入，同时提供可诊断的 resolution inspection
- **拥有的契约**：Chart shared / presentation schema fragments、封闭 recipe 协议、Chart style definition、Chart canvas / presentation / recipe-default token 与 preset / resolver / mapping、Plot style option 与 authoring 输入转发、Chart 到 Plot 的 merge / validation、inspection 和逐类型 composite definition
- **不拥有的能力**：Plot surface / typography / guide / palette token、Plot preset / resolver / `plotTheme` merge、Axis / Legend / Facet / mark / reference / annotation 文本、Data 算法、Plot lowering / registry、Standard layout、Core compile、renderer、框架 authoring、跨 adapter definition 聚合
- **输入与输出**：接收 JSON-safe Chart variant 输入，输出完整 PlotSpec、裸 Plot 或 Standard Flex content、Chart identity node 与 inspection；不直接输出 Core primitives、Scene、DOM、SVG 或 Canvas
- **缺口流向**：数据能力下沉 `@retikz/data`；可视化 operation 与 lowering 进入 `@retikz/plot`；通用布局进入 `@retikz/standard`；composite / adapter 聚合与 identity 进入 Kernel owner；React / Vanilla authoring 进入对应 adapter

## 源码 owner 与依赖方向

Chart 是 Tier 3 的横向类型封装，不以 `schemas/providers/pipeline` 作为主要导航轴。源码按语义 owner 组织：

```text
shared/       Chart-wide 基础词汇、JSON helper 与无状态 ID 工具
schemas/      Chart-wide ChartSpec contract、公共 schema fragments 与封闭 union
families/     正式 Chart family 与 family/type-specific schema、recipe、invariant、definition factory
presentation/ Chart-level presentation schema、Standard Flex 投影与 presentation inspection
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
style -> presentation -> Standard
families + schemas + presentation + style + inspection -> resolution
```

- 根 `shared` 不得依赖 presentation、style 或 resolution；当前 `schemas/shared.ts` 组合了高层 ChartSpec 字段，迁移后归 `schemas/common.ts`
- type owner 拥有自己的 schema、recipe、invariant 与 definition factory，不得导入 resolution；definition factory 通过中立 `ChartExpand` callback 接入
- `resolution` 只聚合 recipe、dispatch、通用 merge/validation、错误归一化与 composite 接线，不复制 type recipe、Plot lowering 或 inspection provenance
- `inspection` 只消费中立的 final member/contribution 输入，不依赖 `MergedChartMember` 等 resolver 私有类型，也不通过 Plot 数组下标猜来源
- `style` 只解析 Core effective Theme 下的 Chart-owned token；`ChartThemeStyleDefinition` 与内置 style 经同一 Chart registry 生成完整 Chart token 基线，`chartThemeTokens` 只覆盖 Chart key；`plotThemeTokens` / `colors` / native `plotTheme` 与 `plotThemeStyles` 原样转发到 Plot；Core style / mode 只来自宿主 Theme
- `chartThemeStyles` 与 `plotThemeStyles` 是 Chart resolution / composite 的 runtime definition 入口。自定义 style 解析到 Chart 时缺少同名 Chart 或 Plot definition 必须 fail-loud，不通过 Core token registry 聚合
- recipe toggle 使用 `chart.axis.enabled`、`chart.axis.grid.enabled`、`chart.legend.enabled`；无 Chart namespace 的旧 key 与 `data.palette.*` 不保留 alias 或双读
- recipe 需要 palette 等 Plot 结果时只能调用 Plot 公开纯 resolver，不复制 Plot preset / merge，也不把 resolved Plot theme 物化回 PlotSpec
- `presentation` 消费 resolved Chart token 并投影到 Standard；Standard 继续拥有 Flex schema、布局语义与求解
- 包根只导出明确允许公开的 shared / presentation / inspection / Chart style data symbols；Plot token 直接从 Plot owner 导入，ChartSpec union、recipe、catalog、resolver、definition 与 fixture 不得泄漏

# ADR-02：Chart presentation / recipe token 与 Plot token 转发

- 状态：Proposed
- 决策日期：2026-08-06
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-03](./03-presentation-standard-layout.md) · [Plot 主题所有权 ADR-01](../../../../plot/v0/v0.2/alpha.1/01-chart-layering.md) · [Chart 总设计 §6](../../../../../architecture/chart-design.md) · [通用视觉主题设计](../../../../../../../../notes/architecture/visual-theme-design.md) · [原子契约与组合设计](../../../../../../../../notes/architecture/atomic-contract-design.md)

## 背景与目标

Chart 是 Plot 之上的封闭类型封装。它需要为完整 Chart canvas、title / subtitle / caption / note / source / credit 等 presentation，以及 recipe 默认 axis / grid / legend 是否生成，提供稳定、可覆盖的表现性默认。

Plot surface、Plot typography / label、Axis / Legend 视觉样式与 palette 则属于 Visualization Complete。早期 Chart 主题目录同时声明这些 Plot token，并把 resolved 结果映射成 Plot theme，导致直接 Plot 无法独立响应 Core effective Theme，也让 Chart 与 Plot 拥有同义 schema、preset、resolver 和 cascade。

本 ADR 按 Plot 主题所有权 ADR-01 重构 Chart 公开面：

1. Chart 只拥有 Chart presentation 与 Chart recipe default token
2. Plot token 通过 Plot 的公开 contract 原样进入最终 PlotSpec
3. style / mode 只由 Core Scene / Scope Theme 选择，ChartSpec 不重复声明
4. Chart 与内部 Plot 在同一 effective Theme 下分别沿自己的 owner 主链解析

## 决策：Chart token 与 Plot token 分离

Chart 继续为 Core 的四种通用 style——`neutral`、`academic`、`vibrant`、`clean`——在 light / dark mode 下提供 Chart-owned preset。该 preset 只包含 Chart canvas、presentation 与 recipe defaults；不包含 Plot surface、Plot label / typography、Axis / Legend 视觉 token 或 palette。

Plot 由 `@retikz/plot` 独立提供同一 effective Theme 下的 Plot preset、token resolver、native theme mapping、palette 与 inspection。Chart 可以转发 Plot 公开输入，也可以在需要稳定 recipe identity 时调用 Plot 公开纯 resolver读取瞬时结果，但不能复制 Plot token schema、preset、merge 规则，或把 resolved Plot theme 写回 PlotSpec。

Core 继续拥有 `ThemeStyle`、`ThemeMode`、Scene / Scope Theme 继承与 Composite effective Theme context；Chart 不定义、转出或持久化同义 style / mode 字段。

## 基础数据结构与公开契约

### ChartSpec 主题 authoring surface

```ts
type IRChartShared = {
  styleTokens?: IRChartStyleTokenOverrides;
  plotStyleTokens?: IRPlotStyleTokenOverrides;
  colors?: IRPlotSpec['colors'];
  theme?: IRPlotSpec['theme'];
};
```

- `styleTokens` 只接受 Chart-owned canonical key
- `plotStyleTokens` 复用 Plot 公开的严格 sparse token schema，并原样进入最终 `PlotSpec.styleTokens`
- `colors` 与 `theme` 原样进入最终 PlotSpec 的同名字段
- ChartSpec 不包含 `style` 或 `themeMode`；Chart Composite 从当前位置读取完整 Core effective Theme
- Chart 不转出 Plot token key、schema 或派生类型；使用方直接从 Plot owner 导入

Chart sparse override 与 complete resolved map 必须组合同一份 canonical field contract，并从严格 schema 派生公开类型。内置 preset 必须通过 required resolved schema；不得为 sparse、resolved 与 preset 分别手写同义字段或 TypeScript interface。

### Chart canonical token

`styleTokens` 是 strict、flat、dot-namespaced、JSON-safe object。canonical token 固定为：

| Token family      | Canonical keys                                                                                                                   | Value contract                                     | 正式消费位置                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| Canvas            | `chart.canvas.fill`                                                                                                              | Core paint atom                                    | Standard arbitrary-child surface        |
| Layout            | `chart.padding`、`chart.gap`                                                                                                     | Standard padding、finite non-negative gap          | Standard surface / Flex input           |
| Typography        | `chart.font.family`                                                                                                              | Core font family atom                              | Chart presentation text fallback        |
| Presentation slot | `chart.<slot>.foreground`、`chart.<slot>.font.size`、`chart.<slot>.font.weight`、`chart.<slot>.lineHeight`、`chart.<slot>.align` | Core paint / font / line-height / text-align atoms | 对应 Chart text preset                  |
| Axis recipe       | `chart.axis.enabled`、`chart.axis.grid.enabled`                                                                                  | boolean                                            | recipe 是否生成默认 AxisGuide / grid    |
| Legend recipe     | `chart.legend.enabled`                                                                                                           | boolean                                            | recipe 是否生成可成立的默认 LegendGuide |

`<slot>` 是闭合集合 `title`、`subtitle`、`caption`、`note`、`source`、`credit`。未知 slot、未知 key、错误 value 与开放嵌套对象均 fail-loud。

这些 key 的 owner 与边界固定如下：

- `chart.axis.enabled` 与 `chart.axis.grid.enabled` 只决定 Chart recipe 是否创建默认 guide，不过滤显式 `guides`，也不改变 tick source / density / format、grid projection、Coordinate 或 type 核心语义
- `chart.legend.enabled: true` 只允许 recipe 在存在可图例化 channel 时创建默认 legend；它不凭空制造 channel 或 descriptor
- 显式 `guides` 按 Chart recipe contract 替换表现性 guide defaults，不能撤销 type 核心配方
- Plot 对已有 Axis / Legend 的视觉呈现继续由 Plot token、native theme 与 local config 决定

Chart 不接受以下 key：

- Plot-owned `plot.surface.*`、`plot.typography.*`、`plot.label.*`
- Plot-owned `axis.line.*`、`axis.tick.*`、`axis.tickLabel.*`、`axis.title.*`、`axis.grid.*`
- Plot-owned `legend.title.*`、`legend.label.*`、`legend.swatch.*`、`legend.ramp.*`、`legend.symbol.*`
- Plot-owned `plot.palette.*`
- 无 owner 的旧 `data.palette.*`、`axis.enabled`、`axis.grid.enabled`、`legend.enabled`

### Preset 与 mode 行为

四种 Chart preset 的稳定人格与通用主题设计一致：

| Preset     | Chart-owned 倾向                                 |
| ---------- | ------------------------------------------------ |
| `neutral`  | 安静 canvas、清晰层级、克制间距，作为默认        |
| `academic` | 高可读、低干扰、适合出版的 presentation          |
| `vibrant`  | 更明确的 canvas 层级、较活跃的 presentation 层次 |
| `clean`    | 减少非数据装饰和外层留白，但保留必要可读性       |

Mode 只改变依赖背景的 Chart paint。padding、gap、font、字号、字重、行高、对齐与 recipe guide topology 在 light / dark 之间保持不变。

第一版 mode-invariant Chart 值固定为：

| Token                     |                           neutral |                                   academic |                              vibrant |                             clean |
| ------------------------- | --------------------------------: | -----------------------------------------: | -----------------------------------: | --------------------------------: |
| `chart.padding`           |                                16 |                                         16 |                                   16 |                                12 |
| `chart.gap`               |                                 6 |                                          6 |                                    8 |                                 4 |
| `chart.font.family`       | `system-ui, Segoe UI, sans-serif` | `Inter, Helvetica Neue, Arial, sans-serif` | `Inter, Segoe UI, Arial, sans-serif` | `system-ui, Segoe UI, sans-serif` |
| `chart.axis.enabled`      |                              true |                                       true |                                 true |                              true |
| `chart.axis.grid.enabled` |                              true |                                       true |                                 true |                             false |
| `chart.legend.enabled`    |                              true |                                       true |                                 true |                              true |

Presentation typography 以 `size / weight / lineHeight / align` 表示：

| Slot            | neutral               | academic              | vibrant               | clean                 |
| --------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| title           | 18 / 600 / 22 / start | 18 / 600 / 22 / start | 20 / 700 / 24 / start | 17 / 600 / 21 / start |
| subtitle        | 13 / 400 / 18 / start | 13 / 400 / 18 / start | 14 / 500 / 19 / start | 12 / 400 / 17 / start |
| caption         | 12 / 400 / 17 / start | 12 / 400 / 17 / start | 12 / 400 / 17 / start | 11 / 400 / 15 / start |
| note            | 11 / 400 / 15 / start | 11 / 400 / 15 / start | 11 / 400 / 15 / start | 10 / 400 / 14 / start |
| source / credit | 11 / 500 / 15 / start | 11 / 400 / 15 / start | 11 / 500 / 15 / start | 10 / 400 / 14 / start |

Light paint：

| Token group         | neutral               | academic              | vibrant               | clean                 |
| ------------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| `chart.canvas.fill` | `#FFFFFF`             | `#FFFFFF`             | `#F8FAFC`             | `#FFFFFF`             |
| title / subtitle    | `#09090B` / `#3F3F46` | `#111827` / `#374151` | `#172B4D` / `#425466` | `#111827` / `#374151` |
| caption / note      | `#52525B` / `#71717A` | `#4B5563` / `#6B7280` | `#52616B` / `#66788A` | `#4B5563` / `#6B7280` |
| source / credit     | `#71717A` / `#71717A` | `#6B7280` / `#6B7280` | `#66788A` / `#66788A` | `#6B7280` / `#6B7280` |

Dark paint：

| Token group         | neutral               | academic              | vibrant               | clean                 |
| ------------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| `chart.canvas.fill` | `#09090B`             | `#0F172A`             | `#111827`             | `#0B0F14`             |
| title / subtitle    | `#FAFAFA` / `#D4D4D8` | `#F9FAFB` / `#D1D5DB` | `#FFFFFF` / `#E2E8F0` | `#F9FAFB` / `#D1D5DB` |
| caption / note      | `#A1A1AA` / `#A1A1AA` | `#CBD5E1` / `#94A3B8` | `#CBD5E1` / `#94A3B8` | `#D1D5DB` / `#9CA3AF` |
| source / credit     | `#A1A1AA` / `#A1A1AA` | `#94A3B8` / `#94A3B8` | `#94A3B8` / `#94A3B8` | `#9CA3AF` / `#9CA3AF` |

Plot canvas、guide、label 与 palette 的具体值不在本 ADR 中冻结；它们由 Plot owner 的同 style / mode preset 决定。

## Resolution、cascade 与 inspection

Chart 与 Plot 从同一个 Core effective Theme 开始，但分别解析：

```text
Core effective Theme
  -> Chart preset tokens
  -> ChartSpec styleTokens
  -> explicit Chart presentation / recipe config

Core effective Theme
  -> Plot preset tokens
  -> PlotSpec styleTokens
  -> PlotSpec colors
  -> PlotSpec theme
  -> local guide / mark / scale config
```

- Chart token 按 canonical key 整体替换；不 deep merge composite value
- `plotStyleTokens`、`colors` 与 `theme` 只沿第二条链生效，不进入 Chart resolved token map
- Chart resolver 不读取 dataset、adapter 或 renderer 状态，也不根据 Plot preset 名称分支
- recipe 因稳定 identity 需要 palette 等 Plot 结果时，调用 Plot 公开纯 resolver；最终 PlotSpec 仍保留原始 Plot 输入，并由 Plot 再沿同一确定性主链解析

Chart inspection 至少公开 effective style / mode、complete resolved Chart token map、每个 Chart token 的来源、Chart token 到 Standard / recipe 配置的 mapping，以及对 Plot inspection 的 owner-preserving 引用或组合。它不能复制 Plot resolved token map并重新标记为 Chart-owned，也不能把 `plotStyleTokens` 伪装成 Chart token 来源。

Token map 是闭合数据，不执行代码、不按名称 dispatch，因此本 ADR 不引入 theme registry。未知 key、错误 value、缺失 required Chart token、未消费 Chart token 或无法映射的 token 必须 fail-loud。

## 行为、失败语义与兼容性

- Core 默认 `neutral + light` 下，Chart-owned canvas、presentation 与 recipe defaults 保持上述基线
- 非默认 Scene / Scope Theme 同时驱动 Chart presentation 与内部 Plot，但两者分别由 Chart / Plot owner 解析
- 同一 PlotSpec 在相同 effective Theme 下，不因直接使用或位于 Chart 中而得到不同 Plot preset
- Chart type 核心 recipe、数据角色、必需 Transform、Mark 组合与 composition 不因 theme 改变
- React、Vanilla、SSR 与手写 JSON 表达同一 Chart / Plot token 输入；adapter 不补 preset 或默认
- 本次为未稳定 Chart 公开面的破坏性重构：移除 ChartSpec `style`、`themeMode`，移除 Chart `styleTokens` 中的 Plot key，并增加 `plotStyleTokens`
- 不为旧 `data.palette.*`、无 Chart namespace 的 recipe toggle、Chart-owned Plot token、`style` 或 `themeMode` 保留 alias、双读或迁移 bridge

## 功能与包边界

| Owner               | 拥有                                                                                                                | 不拥有                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `@retikz/chart`     | ChartSpec、封闭 recipe、Chart canvas / presentation / recipe token、Chart preset / resolver / mapping / inspection  | Plot token、Plot preset / resolver / native theme merge、Standard solver |
| `@retikz/plot`      | Plot surface / typography / label、Axis / Legend 视觉 token、palette、Plot preset / resolver / mapping / inspection | Chart presentation、Chart recipe toggle、Core Theme 继承                 |
| `@retikz/standard`  | 去除领域词汇后的 surface、layout、presentation 与通用 composite                                                     | Plot guide / palette、Chart type                                         |
| `@retikz/core`      | Theme style / mode、Scene / Scope 继承、Composite context、paint / font 等原子与 Scene compile                      | 领域 token、preset、领域 cascade                                         |
| adapters / renderer | 等价 authoring / runtime 接线；执行统一 Scene                                                                       | 新 token、preset 选择、不同 merge 或 renderer-only theme                 |

完整 Chart canvas 仍依赖 Standard arbitrary-child surface。该 capability 未闭环前，不允许 Chart 私造 layout / bbox / background primitive，不允许 adapter 用 DOM / CSS 替代，也不得宣称完整 canvas 或 dark mode 已实现。

## 架构验证与能力完备性检查

- 所属能力域与能力面：Chart Encapsulation 的 Default Resolution / Presentation，以及 Visualization Complete 的 Plot theme consumption boundary
- 解决的问题：阻止 Chart 复制 Plot 视觉语义，同时保留 Chart presentation 与 recipe default 的稳定自定义面
- 主责包与协作包：Chart 主责 Chart token；Plot 主责 Plot token；Core 提供环境；Standard 消费通用呈现
- 是否可由现有能力组合：Chart 复用 Core effective Theme、Plot 公开 token / resolver 与 Standard presentation，不新增能力轴
- 是否需要下沉：Chart canvas 需要 Standard surface；Core 只在 Standard 证明缺少通用底座时协作
- 内部表达链路：Chart effective Theme + Chart sparse token 映射为 presentation / recipe defaults；Plot 输入原样进入完整 PlotSpec
- 外部扩展链路：Chart / Plot token 都是闭合数据，不采用 registry；Plot scheme 仍沿 Plot 现有 built-in + custom resolver
- 下游闭环：Chart 生成完整 PlotSpec 与 Standard composition，Plot / Standard 分别 lower，Core / renderer 执行已物化结果
- adapter 等价性：React、Vanilla、JSON 共享同一 ChartSpec、effective Theme 与 owner resolver
- 本轮结论：组合现有 Core / Plot / Standard 能力，并收窄 Chart 主题所有权；不在 Chart 扩展 Plot token 能力

## 被否决方案

- 继续由 Chart 维护 Plot token catalog：会让直接 Plot 与 Chart 内 Plot 分叉
- 把全部领域 token 上移 Core：会形成带 Plot / Chart / Table 词汇的巨型 Theme schema
- 在 ChartSpec 重复 style / mode：会绕开 Scene / Scope 继承
- Chart 先 materialize 完整 Plot theme 再交给 Plot：会遮蔽来源并复制 cascade
- 用无 namespace 的 `axis.enabled` / `legend.enabled` 混合 recipe 与 Plot 视觉语义：owner 不清且无法稳定扩展
- adapter、CSS 或 renderer 根据 preset 名称补默认：破坏 JSON、React、Vanilla 与 renderer parity

## 测试策略摘要

需要以下稳定证据层：

- schema / type 证明 Chart sparse、resolved 与 preset 复用单一字段契约，并拒绝 Plot key、旧 key、未知 key 与错误 value
- preset 证明四 style × 两 mode complete，mode 只改变声明的 Chart paint
- Chart resolution 证明 recipe toggle 只控制 default guide，显式 guides 与 type 核心不变量优先
- Plot handoff 证明 `plotStyleTokens`、`colors`、`theme` 原样进入 PlotSpec，且 Chart 不 materialize 或复制 Plot theme
- Core / Composite 集成证明 Scene / Scope effective Theme 同时进入 Chart 与内部 Plot
- inspection 证明 Chart / Plot token owner、来源和 mapping 不混淆
- React / Vanilla / JSON 与 SVG / Canvas parity 证明 adapter、renderer 不维护独立主题默认
- Standard surface 证明 canvas 覆盖裸 Plot 与带 presentation 的完整 Chart

## 不在本 ADR 范围

- Plot canonical token、preset 具体值、native theme merge 与 palette resolver
- 用户注册命名 preset、preset 继承与远程 theme loader
- 自动读取系统 dark mode 或 CSS media query
- CSS class、React style object 或 renderer-specific theme
- 通用 `mark.*` token、tooltip、interaction、toolbar、export 与 dashboard state
- 实现文件、执行步骤、测试 case、验证命令与 commit 切分

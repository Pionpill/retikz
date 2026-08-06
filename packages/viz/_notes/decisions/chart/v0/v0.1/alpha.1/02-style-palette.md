# ADR-02：Style preset、明暗模式与公开样式 token

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-03](./03-presentation-standard-layout.md) · [Chart 总设计 §6](../../../../../architecture/chart-design.md) · [通用视觉主题设计](../../../../../../../../notes/architecture/visual-theme-design.md)

## 背景与目标

Chart 的 `style` 表达一套开箱即用的视觉人格，而不是给 Plot `theme` 与颜色数组换名。alpha.1 复用 Core 提供的四个通用 style 取值：`neutral`、`academic`、`vibrant`、`clean`，并由 Chart 为这些取值提供自己的 preset catalog。其中 `neutral` 参考 shadcn 的安静界面框架、清晰内容层级与克制数据色彩，并作为默认风格；其它 preset 分别表达出版型、明快型和极简型人格，但不承诺与任何开源库像素兼容。

明暗环境与视觉人格正交。同一 preset 在 light / dark 下保持 guide 拓扑、排版、间距和装饰密度连续，只调整依赖背景的 paint、opacity 与 palette。因此 `light` / `dark` 是 mode，不是 style 名称。

用户需要像覆盖 VS Code theme colors 一样稀疏覆盖稳定 token，例如关闭默认轴、替换 tick 图元或调整 legend 间距。主题协议必须公开、严格、JSON-safe、renderer-neutral，并映射回 Plot / Standard 的正式能力，而不是形成平行 style engine。

## 决策：四个 preset × 两个 mode 解析为严格 token map

```ts
import { ThemeMode, ThemeStyle } from '@retikz/core';
import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

type ChartStyleSurface = {
  style?: ThemeStyleValue;
  themeMode?: ThemeModeValue;
  styleTokens?: IRChartStyleTokenOverrides;
  colors?: IRPlotSpec['colors'];
};
```

`ThemeStyle` 与 `ThemeMode` 是 Core 的通用词汇真源；Chart 不再定义或转出同义的 `ChartStyle`、`ChartThemeMode` 及其取值类型

默认值是 `style: 'neutral'` 与 `themeMode: 'light'`。内置 catalog 为四个 preset 的两个 mode 分别提供完整 token map；用户 `styleTokens` 只对 canonical key 做稀疏覆盖。内置 map、稀疏覆盖和最终 resolved map 复用同一份字段契约，未知 key、错误值、空 palette、非法 tick 图元或完整 map 缺 key 均 fail-loud。

token map 是闭合数据，不执行代码、不按名称 dispatch，也不拥有 provider 生命周期，因此不采用 define-registry。用户可以直接共享合法 JSON / npm 数据包；未来若需要主题命名、继承或动态加载，再由独立 ADR 设计 registry / loader。

## 基础数据结构与公开契约

`styleTokens` 是 dot-namespaced flat object，不接受开放嵌套对象：

```json
{
  "axis.line.enabled": false,
  "axis.tick.mark": {
    "kind": "circle",
    "size": 5,
    "fill": "#ffffff",
    "stroke": "#111827"
  },
  "data.palette.categorical": ["#2563eb", "#f97316", "#16a34a"]
}
```

公开 schema 分为两种严格形态：稀疏 overrides 的所有 token optional；resolved tokens 的所有 token required。公开 token catalog 固定如下；paint 都是 non-empty renderer-neutral paint string，font / tick / padding 等复用表中 owner 的公开 fragment，不平行定义近似类型。

### Chart、Plot 与 presentation

| Token                      | Value contract             | 正式消费方                          |
| -------------------------- | -------------------------- | ----------------------------------- |
| `chart.canvas.fill`        | paint                      | Standard Chart surface              |
| `chart.padding`            | Standard padding           | Standard surface inset              |
| `chart.gap`                | finite non-negative number | presentation default column row gap |
| `chart.font.family`        | non-empty string           | Chart / Plot typography fallback    |
| `chart.<slot>.foreground`  | paint                      | slot text foreground                |
| `chart.<slot>.font.size`   | Core font size             | slot font size                      |
| `chart.<slot>.font.weight` | Core font weight           | slot font weight                    |
| `chart.<slot>.lineHeight`  | Core line height           | slot line height                    |
| `chart.<slot>.align`       | Core text align            | slot text align                     |
| `plot.surface.fill`        | paint                      | Plot background                     |
| `plot.foreground`          | paint                      | Plot guide typography fallback      |
| `plot.label.foreground`    | paint                      | Plot static label foreground        |
| `plot.label.font.size`     | Core font size             | Plot static label size              |

`<slot>` 是闭合集合 `title`、`subtitle`、`caption`、`note`、`source`、`credit`；上表的五个 slot token 分别对六个 slot 展开，不接受其它 key。

### Axis

| Token                       | Value contract             | 正式消费方               |
| --------------------------- | -------------------------- | ------------------------ |
| `axis.enabled`              | boolean                    | recipe default AxisGuide |
| `axis.line.enabled`         | boolean                    | Plot axis line default   |
| `axis.line.stroke`          | paint                      | Plot axis line           |
| `axis.line.strokeWidth`     | finite non-negative number | Plot axis line           |
| `axis.line.drawOpacity`     | normalized opacity         | Plot axis line           |
| `axis.tick.mark`            | Plot AxisTickMark contract | Plot tick glyph          |
| `axis.tickLabel.enabled`    | boolean                    | Plot tick label default  |
| `axis.tickLabel.foreground` | paint                      | Plot tick label          |
| `axis.tickLabel.font.size`  | Core font size             | Plot tick label          |
| `axis.tickLabel.gap`        | finite non-negative number | tick-to-label gap        |
| `axis.title.foreground`     | paint                      | Plot axis title          |
| `axis.title.font.size`      | Core font size             | Plot axis title          |
| `axis.title.font.weight`    | Core font weight           | Plot axis title          |
| `axis.grid.enabled`         | boolean                    | recipe default grid      |
| `axis.grid.stroke`          | paint                      | Plot grid                |
| `axis.grid.strokeWidth`     | finite non-negative number | Plot grid                |
| `axis.grid.drawOpacity`     | normalized opacity         | Plot grid                |

`axis.enabled` 与 `axis.grid.enabled` 只控制 recipe 表现性 defaults，不过滤显式 guides，也不改变 tick source / density / format、grid projection、Coordinate 或 type 核心语义。

### Legend

| Token                      | Value contract             | 正式消费方                 |
| -------------------------- | -------------------------- | -------------------------- |
| `legend.enabled`           | boolean                    | recipe default LegendGuide |
| `legend.title.foreground`  | paint                      | Plot legend title          |
| `legend.title.font.size`   | Core font size             | Plot legend title          |
| `legend.title.font.weight` | Core font weight           | Plot legend title          |
| `legend.label.foreground`  | paint                      | Plot legend label          |
| `legend.label.font.size`   | Core font size             | Plot legend label          |
| `legend.swatch.size`       | finite positive number     | Plot swatch size           |
| `legend.swatch.gap`        | finite non-negative number | Plot swatch gap            |
| `legend.entry.gap`         | finite non-negative number | Plot entry gap             |
| `legend.title.gap`         | finite non-negative number | Plot title gap             |
| `legend.ramp.length`       | finite positive number     | Plot ramp length           |
| `legend.ramp.thickness`    | finite positive number     | Plot ramp thickness        |
| `legend.symbol.size`       | finite positive number     | Plot symbol size           |
| `legend.symbol.scale`      | finite positive number     | Plot symbol scale          |
| `legend.symbol.fit`        | Plot LegendSymbolFit       | Plot symbol fit            |

`legend.enabled: true` 不为没有可图例化 channel 的 Chart 凭空生成 legend；显式 guide 始终具有更高优先级。

### Data palette

| Token                      | Value contract             | 正式消费方                |
| -------------------------- | -------------------------- | ------------------------- |
| `data.palette.categorical` | non-empty color array      | categorical scale default |
| `data.palette.series`      | non-empty color array      | mark / series default     |
| `data.palette.sector`      | non-empty color array      | sector default            |
| `data.palette.sequential`  | non-empty Plot scheme name | sequential scale default  |
| `data.palette.diverging`   | non-empty Plot scheme name | diverging scale default   |

Scheme 名只在 token schema 校验 JSON 形态，是否注册由 Plot resolver fail-loud。数组与 scalar 按 token key 整体替换，不逐项合并。

alpha.1 不增加 `mark.*` token。当前 Mark 类型没有足够稳定的共享 style contract；主 Mark 与追加 Mark 继续通过 type-specific patch 或正式 Plot mark 配置表达。

## Preset 与 mode 行为

| Preset     | 稳定人格                             | 主要结构倾向                                |
| ---------- | ------------------------------------ | ------------------------------------------- |
| `neutral`  | 安静框架、清晰层级、克制数据色彩     | 弱边界、低对比 grid、清晰文字，默认使用     |
| `academic` | 面向论文、出版与严肃分析             | 高可读、低干扰、适合打印的轴与刻度          |
| `vibrant`  | 清晰 panel、鲜明层级、受控高辨识色彩 | 更明确的层次和更活跃的数据 palette          |
| `clean`    | 最大限度减少非数据装饰               | 保留必要可读性，弱化 baseline、tick 与 grid |

同一 preset 的 light / dark 结果具有完全相同的 token key，并保持 guide 是否存在、tick glyph、padding、gap、字号、字重和 legend 尺寸不变。alpha.1 的规范 resolved values 如下。

### Mode-invariant 结构、尺寸与 scheme

| Token                                   |                           neutral |                                   academic |                              vibrant |                             clean |
| --------------------------------------- | --------------------------------: | -----------------------------------------: | -----------------------------------: | --------------------------------: |
| `chart.padding`                         |                                16 |                                         16 |                                   16 |                                12 |
| `chart.gap`                             |                                 6 |                                          6 |                                    8 |                                 4 |
| `chart.font.family`                     | `system-ui, Segoe UI, sans-serif` | `Inter, Helvetica Neue, Arial, sans-serif` | `Inter, Segoe UI, Arial, sans-serif` | `system-ui, Segoe UI, sans-serif` |
| `plot.label.font.size`                  |                                11 |                                         11 |                                   12 |                                10 |
| `axis.enabled`                          |                              true |                                       true |                                 true |                              true |
| `axis.line.enabled`                     |                             false |                                       true |                                false |                             false |
| `axis.line.strokeWidth` / `drawOpacity` |                             1 / 1 |                                      1 / 1 |                                1 / 1 |                             1 / 1 |
| `axis.tick.mark`                        |                             false |                    line, length 4, width 1 |                                false |                             false |
| `axis.tickLabel.enabled`                |                              true |                                       true |                                 true |                              true |
| `axis.tickLabel.font.size` / gap        |                            11 / 5 |                                     11 / 5 |                               12 / 6 |                            10 / 4 |
| `axis.title.font.size` / weight         |                          12 / 600 |                                   12 / 600 |                             13 / 600 |                          11 / 600 |
| `axis.grid.enabled`                     |                              true |                                       true |                                 true |                             false |
| `axis.grid.strokeWidth` / `drawOpacity` |                          1 / 0.55 |                                    1 / 0.6 |                                1 / 1 |                             1 / 1 |
| `legend.enabled`                        |                              true |                                       true |                                 true |                              true |
| `legend.title.font.size` / weight       |                          12 / 600 |                                   12 / 600 |                             13 / 700 |                          11 / 600 |
| `legend.label.font.size`                |                                11 |                                         11 |                                   12 |                                10 |
| `legend.swatch.size` / gap              |                            12 / 6 |                                     12 / 6 |                               14 / 7 |                            10 / 5 |
| `legend.entry.gap` / title gap          |                             6 / 6 |                                      6 / 6 |                                8 / 8 |                             5 / 5 |
| `legend.ramp.length` / thickness        |                           96 / 10 |                                   100 / 10 |                             112 / 14 |                            88 / 8 |
| `legend.symbol.size` / scale / fit      |                      12 / 1 / fit |                               12 / 1 / fit |                         14 / 1 / fit |                      10 / 1 / fit |
| `data.palette.sequential`               |                           cividis |                                    cividis |                                turbo |                           cividis |
| `data.palette.diverging`                |                              brbg |                                       rdbu |                             spectral |                              rdbu |

academic 的 tick line 完整值为 `{ kind: 'line', length: 4, line: { stroke: <effective axis.line.stroke>, strokeWidth: 1 } }`。

Presentation typography 以 `size / weight / lineHeight / align` 表示：

| Slot            | neutral               | academic              | vibrant               | clean                 |
| --------------- | --------------------- | --------------------- | --------------------- | --------------------- |
| title           | 18 / 600 / 22 / start | 18 / 600 / 22 / start | 20 / 700 / 24 / start | 17 / 600 / 21 / start |
| subtitle        | 13 / 400 / 18 / start | 13 / 400 / 18 / start | 14 / 500 / 19 / start | 12 / 400 / 17 / start |
| caption         | 12 / 400 / 17 / start | 12 / 400 / 17 / start | 12 / 400 / 17 / start | 11 / 400 / 15 / start |
| note            | 11 / 400 / 15 / start | 11 / 400 / 15 / start | 11 / 400 / 15 / start | 10 / 400 / 14 / start |
| source / credit | 11 / 500 / 15 / start | 11 / 400 / 15 / start | 11 / 500 / 15 / start | 10 / 400 / 14 / start |

### Light paint 与 palette

下表斜杠顺序与 group label 一一对应：canvas / plot 是 `chart.canvas.fill` / `plot.surface.fill`；plot foreground / label 是 `plot.foreground` / `plot.label.foreground`；六个 presentation slot 按各自行写入 `chart.<slot>.foreground`；axis 四元组是 line / tick label / title / grid 的 stroke 或 foreground；legend 二元组是 title / label foreground。Dark 表同义。

| Token group                           | neutral                                       | academic                                      | vibrant                                       | clean                                         |
| ------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| canvas / plot                         | `#FFFFFF` / `#FAFAFA`                         | `#FFFFFF` / `#FFFFFF`                         | `#F8FAFC` / `#E5ECF6`                         | `#FFFFFF` / `#FFFFFF`                         |
| plot foreground / label               | `#18181B` / `#3F3F46`                         | `#1F2937` / `#374151`                         | `#2A3F5F` / `#2A3F5F`                         | `#111827` / `#374151`                         |
| title / subtitle                      | `#09090B` / `#3F3F46`                         | `#111827` / `#374151`                         | `#172B4D` / `#425466`                         | `#111827` / `#374151`                         |
| caption / note                        | `#52525B` / `#71717A`                         | `#4B5563` / `#6B7280`                         | `#52616B` / `#66788A`                         | `#4B5563` / `#6B7280`                         |
| source / credit                       | `#71717A` / `#71717A`                         | `#6B7280` / `#6B7280`                         | `#66788A` / `#66788A`                         | `#6B7280` / `#6B7280`                         |
| axis line / tick label / title / grid | `#D4D4D8` / `#52525B` / `#3F3F46` / `#E4E4E7` | `#9CA3AF` / `#4B5563` / `#374151` / `#D1D5DB` | `#AAB8C2` / `#2A3F5F` / `#2A3F5F` / `#FFFFFF` | `#9CA3AF` / `#374151` / `#374151` / `#E5E7EB` |
| legend title / label                  | `#3F3F46` / `#52525B`                         | `#374151` / `#4B5563`                         | `#2A3F5F` / `#425466`                         | `#374151` / `#4B5563`                         |

```text
neutral:  #E76E50 #2A9D90 #274754 #E8C468 #F4A462
academic: #4E79A7 #F28E2B #E15759 #76B7B2 #59A14F #EDC948 #B07AA1 #FF9DA7 #9C755F #BAB0AC
vibrant:  #636EFA #EF553B #00CC96 #AB63FA #FFA15A #19D3F3 #FF6692 #B6E880 #FF97FF #FECB52
clean:    #0072B2 #E69F00 #009E73 #CC79A7 #56B4E9 #D55E00 #F0E442 #000000
```

### Dark paint 与 palette

| Token group                           | neutral                                       | academic                                      | vibrant                                       | clean                                         |
| ------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| canvas / plot                         | `#09090B` / `#18181B`                         | `#0F172A` / `#111827`                         | `#111827` / `#1E293B`                         | `#0B0F14` / `#0B0F14`                         |
| plot foreground / label               | `#FAFAFA` / `#D4D4D8`                         | `#E5E7EB` / `#D1D5DB`                         | `#F8FAFC` / `#E2E8F0`                         | `#F3F4F6` / `#D1D5DB`                         |
| title / subtitle                      | `#FAFAFA` / `#D4D4D8`                         | `#F9FAFB` / `#D1D5DB`                         | `#FFFFFF` / `#E2E8F0`                         | `#F9FAFB` / `#D1D5DB`                         |
| caption / note                        | `#A1A1AA` / `#A1A1AA`                         | `#CBD5E1` / `#94A3B8`                         | `#CBD5E1` / `#94A3B8`                         | `#D1D5DB` / `#9CA3AF`                         |
| source / credit                       | `#A1A1AA` / `#A1A1AA`                         | `#94A3B8` / `#94A3B8`                         | `#94A3B8` / `#94A3B8`                         | `#9CA3AF` / `#9CA3AF`                         |
| axis line / tick label / title / grid | `#3F3F46` / `#D4D4D8` / `#E4E4E7` / `#3F3F46` | `#64748B` / `#CBD5E1` / `#E2E8F0` / `#334155` | `#64748B` / `#E2E8F0` / `#F1F5F9` / `#475569` | `#6B7280` / `#D1D5DB` / `#E5E7EB` / `#374151` |
| legend title / label                  | `#E4E4E7` / `#D4D4D8`                         | `#E2E8F0` / `#CBD5E1`                         | `#F1F5F9` / `#E2E8F0`                         | `#E5E7EB` / `#D1D5DB`                         |

```text
neutral:  #4C78A8 #59A14F #F28E2B #B07AA1 #E15759
academic: #60A5FA #FDBA74 #F87171 #5EEAD4 #86EFAC #FDE047 #D8B4FE #FDA4AF #D6A77A #CBD5E1
vibrant:  #636EFA #EF553B #00CC96 #AB63FA #FFA15A #19D3F3 #FF6692 #B6E880 #FF97FF #FECB52
clean:    #56B4E9 #F0B44D #4DD4AC #E58AC8 #7AC7F0 #FF7A59 #F6E36B #E5E7EB
```

每套 palette 同时写入 categorical、series 与 sector。以上 structure table 是 mode-invariant；light / dark 表覆盖全部 mode-sensitive paint 与 palette，因此八个 resolved maps 都可确定性展开，无未声明默认。

## Cascade、失败语义与兼容性

低到高优先级固定为：

```text
Plot built-in defaults
  < type recipe presentational defaults
  < built-in style tokens[style][themeMode]
  < user styleTokens
  < colors
  < raw Plot theme
  < explicit guide / mark / component config
```

- token override 按 canonical key 整体替换；palette array 不逐项合并
- Plot theme 的对象值按其稳定语义保留未覆盖 sibling；scalar、array、`false` 或 discriminator 改变时整体替换
- 显式 `guides` 整体替换 recipe guide defaults，topology token 不得删除显式 guide
- `colors` 与 raw Plot theme 继续交给 Plot 正式 resolver；显式 scale range / scheme 保持最高的领域局部优先级
- theme 只影响可撤销的表现性默认，不能改变数据角色、主 Mark、Transform、Coordinate、guide 语义或 Chart type identity
- 这是 alpha.1 新公开协议，不为早期草案名 `light`、`dark`、`simple` 或 `dashboard` 保留别名

## Inspection 契约

ADR-02 扩展 ADR-01 的唯一 inspection：公开实际采用的 style / mode、完整 resolved token map、每个 token 的 preset 或用户来源，以及 token 之后生效的 `colors` / raw Plot theme 覆盖来源。来源顺序必须确定，locator 使用 owner-qualified canonical path；inspection 不复制 PlotSpec、Plot provenance 或 lineage。

## 功能与包边界

- `@retikz/core` 拥有跨领域的 `ThemeStyle` / `ThemeMode` 词汇及其取值类型；`@retikz/chart` 拥有 Chart preset、领域 token vocabulary、catalog、resolver、mapping 与 inspection
- `@retikz/plot` 拥有 Plot theme、guide、tick glyph、palette / scheme 与 scale 消费
- `@retikz/standard` 拥有可包装任意 child 的 renderer-neutral surface / background / padding capability
- Core 还拥有跨领域的 Theme style / mode 词汇；Chart 的具体 preset token 值仍归 Chart 所有
- chart-react / chart-vanilla 只透传同一 ChartSpec，不新增 CSS theme 或 adapter-only props

`plot.surface.fill` 可以映射到 Plot panel；`chart.canvas.fill` 与 `chart.padding` 必须覆盖整个 Chart，包括裸 Plot 和带 presentation 的组合。现有能力无法完整表达时，必须先由 Standard ADR 补齐 arbitrary-child surface，必要的 Core 缺口再由 Core owner 处理。该 gate 未解除前可以验证 token catalog 与纯 resolution，但不得宣称完整 canvas、dark mode 或最终 Chart composition 已闭环。

## 架构验证

- 归属结论：preset / token 属于 Chart 封装的表现性默认；Plot / Standard / Core 各消费自己拥有的正式能力
- 内部表达：strict token map 能确定性映射为 recipe guide defaults、Plot theme / palette 与 presentation / surface 输入
- 外部扩展：自定义 sparse map 与内置 catalog 同 schema、同 resolver、同 consumer；闭合数据无需 registry
- 下游闭环：Chart 只做纯映射，不生成 renderer 图元或计算布局；Plot 与 Standard 分别 lower 到 Core
- adapter parity：JSON、React、Vanilla 解析相同 style / mode / token 输入
- capability 结论：token / preset 扩展 Chart 当前域；完整 canvas 先下沉 Standard 并保持公开入口 gate

## 被否决方案

- 把 `light` / `dark` 当作 preset：混淆视觉人格与 canvas 环境
- 只提供不透明 `theme + colors` bundle：无法形成稳定 token 自定义与 inspection
- token resolver 直接绘制 axis、legend 或 surface：会绕过 Plot / Standard owner
- adapter / renderer 私补 dark mode：破坏 renderer-neutral 与入口等价
- alpha.1 泛化 `mark.*`：会把不同 Mark 的专有语义压成不稳定最小公分母

## 测试策略摘要

需要 schema、catalog、resolution / cascade、Plot mapping、presentation handoff、inspection、adapter parity、renderer parity 与视觉验收证据。关键不变量是八个 built-in 组合都生成 complete valid map，mode 只改变声明为 mode-sensitive 的值，稀疏覆盖拒绝未知 key，高优先级输入按冻结 cascade 生效，theme 不撤销 type 核心语义，且上游 surface gate 到位后三入口和 SVG / Canvas 消费等价 lowering 结果。

## 不在本 ADR 范围

- 用户注册命名 preset、preset 继承与远程主题 loader
- 自动读取系统 dark mode 或 CSS media query
- CSS class、React style object 或 renderer-specific theme
- accessibility contrast 自动修正或强制 recolor 用户 palette
- 通用 `mark.*` token、tooltip、interaction、toolbar、export 与 dashboard state

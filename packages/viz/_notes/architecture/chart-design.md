# Chart 类型封装与 Plot-backed 解析总设计

> **状态：当前长期架构。** 本文定义 `@retikz/chart` 的 Source IR、type recipe、Base 汇合点、Plot 混合、presentation 与 adapter 边界。历史 ADR 记录当时决策，不作为当前内部文件结构真源。

## 1. 核心判断

Chart 是 Plot 之上的 Tier 3 类型封装，不是第二套图形语法：

- Plot 沿 data、transform、scale、coordinate、mark、guide 等 GoG 维度纵向扩展
- Chart 用稳定 `type` 横向组合 Plot 语义，并增加整图 presentation、Chart theme 与 canvas
- `chart` 始终是 namespace；`base`、`scatter`、`bubble`、`connected-scatter` 是平级 type
- 所有 type 最终解析为 `IRBaseChart`，Core 只消费 `chart.base`

```text
exact Source IR
  -> namespace + type dispatch
  -> exact schema parse once
  -> matching recipe bind
  -> resolveChart(BoundChart, context)
  -> IRBaseChart { plot: IRPlot, presentation? }
  -> chart.base -> Standard Surface -> Layout Flex? -> Plot
```

## 2. 精确 schema，而不是公开 union

Chart 不定义公开或持久化的 `ChartSchema`、`IRChart` union、`PointChartSchema` 或 `IRPointChart`。每个 type 拥有完整、精确、可独立解析和 JSON round-trip 的 schema：

- `BaseChartSchema` / `IRBaseChart`
- `ScatterChartSchema` / `IRScatterChart`
- `BubbleChartSchema` / `IRBubbleChart`
- `ConnectedScatterChartSchema` / `IRConnectedScatterChart`

它们遵循一致字段布局，但不是同一个宽对象类型：

```ts
type TypedChartSource = {
  namespace: 'chart';
  type: 'scatter' | 'bubble' | 'connected-scatter';
  id?: string;
  chartThemeTokens?: ChartThemeTokenOverrides;
  presentation?: ChartPresentation;
  plot: ChartPlot;
  config: ExactTypeConfig;
};

type BaseChartSource = {
  namespace: 'chart';
  type: 'base';
  id?: string;
  chartThemeTokens?: ChartThemeTokenOverrides;
  presentation?: ChartPresentation;
  plot: IRPlot;
};
```

Base Chart 接受完整 `PlotSchema`，没有 `config`。封装类型的 `plot` 使用从 `PlotSchema` 投影的 `ChartPlotSchema`，允许 Plot-owned 扩展但可省略 recipe 隐含的主结构；`config` 只保存当前 type 的数据角色和专属配置。

## 3. Owner 边界

| Owner    | 拥有                                                               | 不拥有                                         |
| -------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| Chart 根 | identity、`chartThemeTokens`、presentation、精确 type              | Plot data/mark/guide/theme                     |
| `plot`   | data、transform、scale、Plot theme、spatial root、guide、附加 mark | type-specific 数据角色、Chart presentation     |
| `config` | 当前 type 的 encoding、组件配置和必要专属配置                      | 通用 Plot 配置、解析函数、family discriminator |
| recipe   | type 核心结构与表现性默认                                          | renderer、数据算法、Plot registry              |
| adapter  | framework authoring、datasets、runtime definitions、宿主生命周期   | schema union、recipe 算法、平行 lowering       |

Plot-owned schema 字段直接从 `PlotSchema` 组合复用，不复制第二套手写字段契约。`coordinate` 与 `composition` 仍保持单一空间根。

## 4. Dispatch、绑定与解析

未知 JSON 入口先用最小 envelope 检查 `namespace + type`，再从封闭 catalog 选择一个精确 schema。命中 schema 只 parse 一次，随即绑定为内部 `BoundChart`：

```ts
type BoundChart = {
  type: ChartType;
  base: Omit<IRBaseChart, 'plot'>;
  plot: IRChartPlot | IRPlot;
  createPlot(style): IRPlot;
};
```

`resolveChart` 只消费 `BoundChart` 与当前 Theme/context，不重新解析 Source IR。它解析 Chart/Plot style，由 recipe 直接生成完整 `IRPlot`，再通过 Plot 与 Base Chart schema 校验并返回唯一 `IRBaseChart`。

错误路径必须反映 Source owner：类型独有错误以 `config` 开头，Plot-owned 错误以 `plot` 开头；未知 type 固定定位到 `type`。

## 5. Type recipe 语义

`type` 是持续成立的高层意图，不是生成后可丢弃的 preset。每个 recipe 同时声明：

- 主 mark、必要 scale 与空间根等不可撤销核心
- Chart token 与 Plot palette 驱动的表现性默认
- `config` 对类型核心结构的直接补充
- `plot` 对 Plot-owned 内容的直接补充

例如 `bubble` 隐含主 Point mark 与字段型 size 角色，因此 `plot.marks` 不必重复主 Point；显式附加 mark 仍放在 `plot.marks`。Bubble 不是 `scatter + style`，而是拥有独立 schema、失败语义和 round-trip identity 的 type。

Chart type catalog 封闭且静态，不提供 `defineChart` 或开放 type registry。新增横向 Plot 能力继续进入 Plot definition/registry；自定义图表配方优先直接组合 Plot。

## 6. Presentation 与 Theme

presentation 属于 Chart 根，不属于 Plot 或 type 核心配方。Canonical presentation 只包含一个 Plot placeholder，以及 title、subtitle、note、source 四类可选 TextBlock preset。Vanilla 拥有 plain record、shorthand 与 presentation normalize；React marker 只映射为同一 Vanilla Input。`position` 只在 authoring normalization 中决定 Plot 前后顺序，不进入 Source IR。

Chart 只拥有 canvas、presentation 与 recipe-default token。Plot theme token、native `plotTheme`、palette、guide 与 label style 由 Plot owner 解析。Core Scene/Scope Theme 提供有效 style/mode；同名 style 缺少 Chart 或 Plot definition 时必须 fail-loud。

## 7. React 与 Vanilla API

API 按具体组件/工厂公开，不暴露通用 type selector：

- Base：`<Chart />`、`createChart()`
- Point entry：`<ScatterChart />`、`<BubbleChart />`、`<ConnectedScatterChart />`
- Point entry：`createScatterChart()`、`createBubbleChart()`、`createConnectedScatterChart()`

Vanilla 根公开精确 `InputChart` / `normalizeChart` 与 `createChart`；Point 子入口公开逐类型 `InputXxxChart` / `normalizeXxxChart` 与 factory，不建立接受通用 `type` 的 Input 或 Point union。React 组件把 props 和 markers 映射为这些 Vanilla Input，并调用同一 normalize；Source IR 随后直接绑定匹配 recipe，运行时共享只消费已绑定 Chart 的内部 adapter。

`/point` 是文档导航、源码归置与多入口导入边界，不是 schema 或解析逻辑层级。根入口公开 Base 能力；family subpath 只公开该 family 的具体 API，不转发根入口。

## 8. 源码结构

```text
chart/src/
  _chart/       Base、dispatch、resolve、presentation、style、provider
  _shared/      constants、Plot schema projection、recipe contracts、纯复用
  point/        scatter、bubble、connected-scatter 具体实现与入口

chart-vanilla/src/
  normalize/    Base 与逐类型 Input、presentation shorthand 和 Input-to-IR 组装
```

`_shared` 不依赖 `_chart` 或 family；family 只消费 `_shared`，不导入 `_chart`。`_chart` 的封闭 dispatch 可静态登记具体 recipe。Chart React 依赖 Chart Vanilla 的公开 normalize，不建立平行 Chart Source IR builder。

## 9. 非目标

- 不建立公开统一 Chart 数据 union
- 不按 family 建 schema、catalog、resolver 或 adapter 主链
- 不发布 `chart.scatter`、`chart.bubble` 等逐类型 Core provider
- 不复制 Plot schema、registry、lowering、theme 或 renderer
- 不把函数、ReactNode、provider 实例或宿主运行时状态写入 IR
- 不用 DOM-only presentation 外壳绕开 Chart composite

## 10. 缺口流向

- 新数据算法进入 `@retikz/data`
- 新 GoG operation、definition、registry 与 lowering 进入 `@retikz/plot`
- 通用布局进入 `@retikz/layout`
- 跨领域 presentation composite 进入 `@retikz/standard`
- Core composite、identity、provider 与 adapter 聚合缺口进入 Kernel owner

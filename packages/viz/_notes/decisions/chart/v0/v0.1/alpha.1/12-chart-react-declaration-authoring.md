# ADR-12：Chart React 根配置与 headless 声明收敛

- 状态：Accepted（2026-08-31 人工确认 concrete Chart 根组件完整配置入口）
- 决策日期：2026-08-28
- 修订日期：2026-08-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [框架适配职责设计](../../../../../../../../notes/architecture/package-responsibility-design.md) · [ADR-10](./10-chart-plot-declaration-authoring.md) · [ADR-11](./11-chart-encoding-field-mapping.md)

## 背景与目标

具体 Chart React 组件既是图表身份入口，也是最容易被应用直接消费的配置入口。此前 `ScatterChart` 等根组件只暴露 Chart 身份、主题、运行时接线和 `coordinate`，其余 Source 配置必须拆成 `ChartData`、`ChartLayout`、`XxxEncodings`、`XxxProperties`、`XxxMark`、presentation marker 与 `ChartExtension`。这种设计使完整配置不能从根组件集中发现，也让声明组件从可选 JSX sugar 变成必需 grammar。

Chart Source 已有稳定的 `data`、`layout`、`coordinate`、`presentation`、`recipe` 与 `plotExtension` 层级。React 根组件应沿用这套结构，而不是把 `width`、`height`、encoding 或 presentation slot 展平为大量互不相关的 prop。具体组件身份可以确定 `namespace`、family 与 `recipe.chartType`；运行时 rows 则继续留在 JSON Source 之外。

本 ADR 将 `ScatterChart`、`BubbleChart`、`ConnectedScatterChart`、`RegressionChart` 与 `RangedDotChart` 定义为完整 IR-like authoring 入口，同时保留现有 headless declaration components 作为等价的 JSX 简化写法。React 只负责把两种 authoring 形式收敛到既有 Vanilla Input，不建立新的持久化 grammar、normalizer、resolver 或 lowering。

## 决策：concrete Chart 根组件提供完整 IR-like 配置

每个 concrete Chart 根组件统一支持：

- `rows`：运行时数据行，不写入 Source IR
- `data`：Source `data` 配置
- `layout`：Source `layout` 配置，维度保持在该对象内
- `coordinate`：Chart 根坐标系 operation 或 Vanilla 字符串简写
- `presentation`：固定 title、subtitle、note、source slots
- `recipe`：当前 chartType 的 exact encodings、properties 与 marks，根组件身份隐式补齐 `chartType`
- `plotExtension`：显式 Plot-owned fragment
- 既有 `id`、`theme`、panel、Theme definitions 与 lower options 运行时接线

根组件不接收展平的 `width` / `height`、`encodings`、`properties`、`marks` 或 presentation props。完整根配置示例：

```tsx
<ScatterChart
  rows={rows}
  data={{ reference: 'chart.data', model }}
  layout={{ width: 800, height: 500 }}
  coordinate={{ type: 'polar2D' }}
  presentation={{ title: 'Fertility and work' }}
  recipe={{
    encodings: { x: 'fertility', y: 'work' },
    properties: { size: 5 },
    marks: [],
  }}
  plotExtension={{ guides: [] }}
/>
```

`namespace`、family 与 `recipe.chartType` 由组件身份确定，不作为可配置 prop。`children` 可省略，因此根组件可以独立完成 authoring。

## 类型与映射契约

根配置从当前 exact Source 类型推导，不复制 schema：

```ts
type TypedChartRootAuthoring<TSource extends IRChartSource> = Readonly<{
  rows?: Array<ExternalRow>;
  data?: TSource['data'];
  layout?: TSource['layout'];
  coordinate?: InputChartCoordinate;
  presentation?: TSource['presentation'];
  recipe?: Partial<Omit<TSource['recipe'], 'chartType'>>;
  plotExtension?: TSource['plotExtension'];
  children?: ReactNode;
}>;
```

`recipe` 在 React authoring 层按 owner slot 局部可选，使根配置与 declaration 可以跨 slot 组合；最终进入 Vanilla factory 前，runtime rows 与 exact encodings 必须已经由任一 authoring 形式提供。exact recipe schema 仍是最终 Source 真源。

React 根配置到既有 Vanilla Input 的映射固定为：

| React 根配置            | Vanilla Input / Source 结果                  |
| ----------------------- | -------------------------------------------- |
| `rows`                  | runtime `data`                               |
| `data.reference`        | `dataRef` → `source.data.reference`          |
| `data.model`            | `dataModel` → `source.data.model`            |
| `layout`                | `layout`                                     |
| `coordinate`            | `coordinate`                                 |
| `presentation.title` 等 | 既有 presentation shorthand → `presentation` |
| `recipe.encodings`      | `encodings`                                  |
| `recipe.properties`     | `properties`                                 |
| `recipe.marks`          | `marks`                                      |
| `plotExtension`         | `plotExtension`                              |

React 不直接构造 Source，也不解析 recipe、coordinate 或 Plot extension；这些值继续交给既有 Vanilla normalize 和 Chart / Plot owner 主链。

## Headless declaration components

现有声明组件全部保留为同一配置的 JSX sugar：

- `ChartData` 提供 runtime rows 与 `data` slot
- `ChartLayout` 用 `width` / `height` 简写构造 `layout`，并为 standalone host 配置同一尺寸
- `ChartCoordinate` 提供 `coordinate` slot
- `ChartTitle`、`ChartSubtitle`、`ChartNote`、`ChartSource` 分别提供一个 presentation slot
- `XxxEncodings`、`XxxProperties`、`XxxMark` 分别提供 `recipe.encodings`、`recipe.properties`、`recipe.marks`
- `ChartExtension` 提供 `plotExtension`，并继续承载 Plot React declarations

声明组件不拥有第二套语义，不改变 Source shape，也不是根组件才能表达配置的补丁接口。相同配置仅因 authoring 风格不同而产生不同 Vanilla Input 或 Source 结果属于缺陷。

声明式等价写法：

```tsx
<ScatterChart>
  <ChartData data={rows} reference="chart.data" model={model} />
  <ChartLayout width={800} height={500} />
  <ChartCoordinate coordinate={{ type: 'polar2D' }} />
  <ChartTitle>Fertility and work</ChartTitle>
  <ScatterEncodings x="fertility" y="work" />
  <ScatterProperties size={5} />
  <ChartExtension guides={[]} />
</ScatterChart>
```

## 混合 authoring 与冲突语义

根配置和 declaration 可以跨 owner slot 混用，例如根 `recipe.encodings` 配合 child `ScatterProperties`，或根 `presentation.subtitle` 配合 child `ChartTitle`。同一 slot 不定义优先级、覆盖或隐式合并；重复来源必须在 Chart React 边界 fail-loud。

冲突按以下粒度判断：

- 根 `rows` / `data` 与 `ChartData` 属于同一数据 authoring slot
- 根 `layout` 与 `ChartLayout` 冲突
- 根 `coordinate` 与 `ChartCoordinate` 冲突
- 根 `plotExtension` 与 `ChartExtension` 冲突
- 根 `recipe.encodings` 与 `XxxEncodings` 冲突
- 根 `recipe.properties` 与 `XxxProperties` 冲突
- 根 `recipe.marks` 与任意 `XxxMark` 冲突，包括显式空数组
- 根 `presentation` 的单个 slot 只与同 slot marker 冲突；不同 presentation slots 可以混用

所有存在性判断基于字段是否 authored，而不是 truthiness；`false`、`0`、空字符串（schema 允许时）与空数组都必须保留。数组与透明 Fragment 只做分组；声明收集不穿透普通 DOM 或自定义 React wrapper。

缺少 runtime rows 或 exact recipe encodings 时，Chart React 必须给出稳定的 fail-loud 诊断。根配置和 declaration 同时出现时，不允许通过后写覆盖、对象 spread 或默认值掩盖错误。

## Layout 与宿主边界

根 `layout` 保持完整 Source 对象，并为 standalone Chart 的隐式 `Layout` 提供其中的 width / height。embedded Chart 的 `layout` 只表达 Chart border-box，由外层 `Layout` 决定实际宿主。

`ChartLayout` 继续是更便于 JSX 的简写：`width` / `height` 同时构造 Source `layout` 并配置 standalone host；显式 `layout` 不与简写维度逐字段合并。embedded Chart 不能通过 `ChartLayout.width` / `height` 配置宿主。

CSS string 尺寸、`className`、`style`、renderer、动画、compile callback 与完整 host configuration 继续只属于外层 Core `Layout`，不复制到每个 concrete Chart 根组件。

## ChartExtension 与 Plot owner

根 `plotExtension` 适合 JSON-safe Plot fragment；`ChartExtension` 是同一 slot 的 JSX sugar，并允许通过 children 收集 Plot React declarations。两者互斥，不做逐字段或 source-aware merge。

Chart 根 `coordinate` 继续是唯一显式 coordinate Source slot。`plotExtension` 不重新拥有 coordinate；root coordinate 与 Plot composition 同时建立两个空间根时沿既有 Chart Source 契约 fail-loud。operation schema、Definition、registry、resolve、scale binding、lowering、identity、provenance 与 diagnostics 仍由 Plot 唯一拥有。

## 兼容性与边界

这是 `@retikz/chart-react` 的 breaking authoring 修订，但不删除现有 declaration 写法。此前必须通过 declarations 表达的配置新增根级结构化入口；已有根 `coordinate` 保持不变。

本 ADR 不改变：

- Chart Source IR、exact recipe schema 或 JSON serialization
- Chart Vanilla public input 的现有字段与 normalize 主链
- Chart registry、resolver、provider 与 lowering
- Plot operation、Definition、registry 或 renderer
- Core `Layout` 的 host、renderer、CSS、animation 与 compile 生命周期

根组件与 declaration 必须生成同一 exact Chart Source，并保持 standalone、embedded、SSR、Theme/runtime sidecar 与 InputEmbed 行为一致。

## 结论

concrete Chart 根组件是一等、完整、可发现的 React authoring 入口；headless declaration components 是相同 owner slots 的 JSX 简化写法。两者共享一个 Vanilla Input 和一条 Chart / Plot pipeline，不建立优先级、隐式 merge 或平行 grammar。

# ADR-12：Chart React 声明组件与根属性收敛

- 状态：Proposed
- 决策日期：2026-08-28
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [框架适配职责设计](../../../../../../../../notes/architecture/package-responsibility-design.md) · [ADR-10](./10-chart-plot-declaration-authoring.md) · [ADR-11](./11-chart-encoding-field-mapping.md)

## 背景与目标

具体 Chart 的 React 入口同时承载数据行、Source 数据引用与模型、Chart border-box、React host、recipe encodings / properties / marks、Plot extension、主题、运行时 sidecar 与 presentation children。随着精确 encoding、Chart mark 和 Plot declaration 能力增加，单个 `ScatterChart` 根属性已经混合多个 owner；用户既难以从补全中识别常用图表意图，也难以判断某个字段最终写入 Source、runtime dataset、隐式 Layout 还是 Plot fragment。

Chart 已经通过 `ChartTitle` 和 `ScatterMark` 证明 headless React declaration 可以表达固定 owner slot，并在进入 Vanilla 前折叠为既有 typed Input。该模式应扩展到数据、尺寸、Plot extension 与具体 chartType recipe，但不能把 React 组件树变成新的持久化 grammar，也不能复制 Vanilla normalize、Chart schema 或 Plot declaration resolver。

本 ADR 让具体 Chart 根组件只保留跨声明的 Chart 身份、主题与运行时接线；Chart 公共 singleton、chartType 私有 singleton、Chart marks 与 Plot extension 分别使用明确声明组件。React 最终仍组装现有 Vanilla Input，JSON Source、Vanilla API、Chart resolve 与 Plot lowering 保持唯一真源。

## 决策：用 owner-scoped declaration components 组装同一 Vanilla Input

`@retikz/chart-react` 提供 Chart 公共的 `ChartData`、`ChartLayout` 与 `ChartExtension`；每个具体 chartType 入口提供自己的 exact encoding、properties 与 mark 声明。Scatter 提供 `ScatterEncodings`、`ScatterProperties` 与既有 `ScatterMark`。

理由：

1. 数据、Chart layout、recipe 和 Plot extension 是稳定且互斥的 owner slot，组件身份可以在不增加 Source 字段的前提下消除根属性混杂
2. exact chartType 类型继续来自当前 schema；React 只负责收集和调度，不建立通用 `ChartEncodings`、平行 Input 或 adapter 默认
3. Plot declarations 进入显式 `ChartExtension` 容器后，Chart-owned children 与 Plot-owned children 的层级边界可以从 JSX 直接识别
4. 高级 renderer、CSS、动画与 compile callback 继续由 Core `Layout` 宿主拥有，不由每个具体 Chart 重复暴露

ADR-10 的 `PlotXxx` 命名与 Plot declaration owner 继续有效；本 ADR 以 `ChartExtension` 容器替代具体 Chart 根级 `plotExtension` prop 和直接 Plot child authoring。ADR-11 的 exact encodings、Source 结构与 owner operation 语义不变。

## 基础数据结构与公开契约

Chart 公共声明直接复用现有数据、Source layout 与 Plot extension 类型：

```ts
type ChartDataProps = Readonly<{
  data: Array<ExternalRow>;
  reference?: IRChartSource['data']['reference'];
  model?: IRChartSource['data']['model'];
}>;

type ChartLayoutProps = Readonly<{
  width?: NonNullable<IRChartSource['layout']>['width'];
  height?: NonNullable<IRChartSource['layout']>['height'];
  layout?: NonNullable<IRChartSource['layout']>;
}>;

type ChartExtensionProps = Readonly<
  IRChartPlotExtension & {
    children?: ReactNode;
  }
>;
```

具体 chartType declaration 不重新定义 schema 字段：

```ts
type ScatterEncodingsProps = IRScatterChartEncodings;
type ScatterPropertiesProps = IRScatterChartProperties;
```

具体 Chart 根只保留 Source identity / Theme、Chart runtime 接线和 children：

```ts
type ScatterChartProps = Pick<IRScatterChart, 'id' | 'theme'> &
  ChartPanelProps &
  ChartThemeDefinitionsProps &
  Readonly<{
    children: ReactNode;
  }>;
```

Chart 公共声明从 `@retikz/chart-react` 导出；Scatter 私有声明从 `@retikz/chart-react/point/scatter` 导出。具体 chartType 子入口不重复转发 Chart 公共声明。

最小 Scatter React authoring 为：

```tsx
<ScatterChart>
  <ChartData data={rows} />
  <ChartLayout width={800} height={500} />
  <ScatterEncodings x="x" y="y" />
</ScatterChart>
```

需要显式 Plot 能力时使用独立容器：

```tsx
<ScatterChart>
  <ChartData data={rows} />
  <ScatterEncodings x="x" y="y" />
  <ScatterProperties size={5} opacity={0.75} />
  <ScatterMark properties={{ stroke: '#fff' }} />
  <ChartExtension>
    <PlotTransform kind="sort" field="x" order="ascending" />
    <PlotAxis dimension="x" grid />
    <PointMark x="targetX" y="targetY" />
  </ChartExtension>
</ScatterChart>
```

## 行为、失败语义与兼容性

### 声明基数与顺序

- `ChartData` 与当前 chartType 的 encodings declaration 恰好各一个；缺失或重复时由 Chart React fail-loud
- `ChartLayout`、`ChartExtension`、`ScatterProperties` 以及每个 presentation slot 最多一个；重复时 fail-loud
- `ScatterMark` 可以出现多次并保留 authored order；其 `override`、继承与追加语义保持不变
- 数组与透明 Fragment 只提供分组，不改变 owner slot；声明组件不穿透普通 DOM 或自定义 React 组件
- singleton、presentation、Chart marks 与 Plot extension 之间的 JSX 相对位置不改变既有解析顺序。presentation 仍使用固定 slot，Chart marks 仍先于显式 Plot marks

### ChartData

- `data` 是必需 runtime rows，不写入 JSON Source；`reference` 写入 `source.data.reference`，省略时继续使用稳定的 `chart.data`
- `model` 写入 `source.data.model`；字段模型继续由 Data owner 消费
- 一个 Chart 只有一个主数据声明。多数据集、mark-local data branch 与 raw / aggregate 并行视图不由多个 `ChartData` 隐式表达

### ChartLayout 与宿主边界

- `width` / `height` 是正数 standalone host 尺寸；省略显式 `layout` 时，同名已声明维度同时写入 Source `layout`
- 显式 `layout` 作为完整 Source 值，不与 `width` / `height` 做逐字段合并；此时 `width` / `height` 只配置 standalone host
- embedded Chart 已由外层 `Layout` 拥有 host；其 `ChartLayout` 只允许 `layout`，声明 `width` / `height` 时 fail-loud
- CSS string 尺寸、`className`、`style`、renderer、Core Theme definitions、runtime、动画与 compile callback 只进入显式外层 `Layout`
- 未声明 `ChartLayout` 时不创建 Source `layout`，standalone host 继续使用 Layout 默认行为

### ChartExtension

- `ChartExtension` props 直接对应 `IRChartPlotExtension`；children 只接受 Plot React declarations、数组、透明 Fragment 与空 slot
- Plot declaration children 复用 Plot React collector 与 Plot Vanilla 的 chart-extension normalizer；函数 runtime sidecar 不写入 Source
- props 中的 transform 先于 child `PlotTransform` 有序追加。scales、coordinate / composition、marks、guides 等 slot 同时由 props 与 children 声明时，沿 Plot 的 source-aware conflict contract fail-loud，不新增 Chart merge 规则
- `ScatterMark`、presentation 与其它 Chart declaration 不能放入 `ChartExtension`；Plot declaration 也不能再作为具体 Chart 的直接 child
- 没有显式 props 且没有有效 Plot child 时不创建空 `plotExtension`

### 兼容性与 React / Vanilla 等价性

这是 `@retikz/chart-react` 的 breaking authoring 变更：

- 从具体 Chart 根删除 `data`、`dataRef`、`dataModel`、`layout`、`encodings`、`properties`、`marks` 与 `plotExtension`
- 从具体 Chart 根删除全部 standalone `ChartHostProps`；删除 `ChartHostProps` 与 `ChartCommonProps` 公共类型，宿主消费者改用 Core React 的 `LayoutProps` 权威契约
- 删除具体 Chart 直接接收 Plot declaration children 的路径，迁移到 `ChartExtension`
- 不保留 deprecated prop、组件别名、fallback 或新旧双轨

Vanilla `CreateScatterChartInput` 与 JSON Source 继续使用现有 plain fields；`IRScatterChart` 的 `data`、`layout`、`recipe` 与 `plotExtension` 结构不变。React collector 只把声明组件折叠为同一 Vanilla Input，再由当前 normalizer 生成精确 Source；registry、schema parse、Theme resolve、encoding operation、Chart mark resolve 与 Plot lowering 均不进入 React adapter。

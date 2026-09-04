# ADR-10：Chart / Plot 声明组件分层与命名

- 状态：Accepted
- 决策日期：2026-08-24
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md) · [ADR-09](./09-family-recipe-chart-schema.md)

> **后续演进：** [`ADR-11`](./11-chart-encoding-field-mapping.md) 已在当前alpha工作实现中把 `ChartFacet`、Vanilla root `facet`与`recipe.facet`迁移为exact `encodings.row / column / facet`。ADR-11获得Acceptance前本文仍为Accepted历史决策；届时仅上述Chart-owned facet surface被替代，`PlotXxx`命名、Plot声明owner与Plot canonical facet resolver继续有效。本文后续涉及`ChartFacet`的代码与示例只用于记录原决策，不代表当前公开API。[`ADR-12`](./12-chart-react-declaration-authoring.md) 进一步把高频 coordinate 选择提升为 Chart 根级 Source 与公共 declaration；本文关于低层 coordinate 只能位于 `plotExtension` 的原决策由 ADR-12 替代，Plot CoordinateDefinition、registry 与 resolve owner 不变。

## 背景与目标

Chart 以精确 recipe 压缩常见图表的 Source IR，并用 `plotExtension` 保留完整 Plot 出口。简单 Chart 可以通过少量 props 完成 authoring；需要 transform、facet、guide 或其它 Plot 能力时，用户目前只能重新拼装较大的 `plotExtension` 对象。对象虽然保持 JSON-safe，却把多个正交能力重新集中到一个 React prop，削弱了 Chart 从常用意图渐进进入 Plot 的组合路径。

Plot React 已经使用 headless declaration component 表达 transform、scale、guide 与 composition，并由 Plot Vanilla 的统一 authoring 规则归一为 Plot Source。Chart 不应复制这些 declaration 的组件、collector 或 normalizer；但 Chart 自己拥有的高层语义也不能伪装成同名 Plot declaration。两层组件必须在 JSX 中直接显示 owner，并最终落入各自唯一的 Source 与 resolve 链路。

本 ADR 建立一条统一规则：纯 Plot declaration 使用 `PlotXxx`，Chart 语义压缩使用 `ChartXxx`；语义完全一致时 Chart 直接复用 Plot component identity，语义或最终 Source 不同时由 Chart 提供独立 marker。首个 Chart-owned composition marker 是 `ChartFacet`。

## 决策：用组件前缀明确声明 owner

`@retikz/plot-react` 的非 Mark declaration component 统一使用 `PlotXxx` 名称：

| 现有名称    | 新名称          | Props 名称           |
| ----------- | --------------- | -------------------- |
| `Facet`     | `PlotFacet`     | `PlotFacetProps`     |
| `Scaffold`  | `PlotScaffold`  | `PlotScaffoldProps`  |
| `Track`     | `PlotTrack`     | `PlotTrackProps`     |
| `Axis`      | `PlotAxis`      | `PlotAxisProps`      |
| `Legend`    | `PlotLegend`    | `PlotLegendProps`    |
| `Scale`     | `PlotScale`     | `PlotScaleProps`     |
| `Transform` | `PlotTransform` | `PlotTransformProps` |

根组件继续名为 `Plot`；`PlotPlot` 不增加信息。Mark declaration 的命名由 Mark 自身契约决定，不属于本 ADR 的改名范围。Theme provider、runtime API 与非 declaration function 已经具有明确语义，也不按本表机械改名。

旧的非前缀 component 与 Props 导出直接删除，不保留 alias、deprecated export 或新旧双轨。组件身份、收集顺序、Plot Source 结果和 runtime sidecar 语义不因改名改变。

Chart children 可以直接包含 `PlotXxx` declaration。Chart React 只负责识别 owner 并把这些节点交给 Plot React collector；Plot React 继续把声明交给 Plot Vanilla 的 `chart-extension` authoring 模式。Chart 不读取 Plot component props 来重建 fragment，也不实现第二套 Plot composition 或 normalization。

理由：

1. Chart 与 Plot 会出现在同一 JSX children tree；前缀让单独阅读 JSX 时也能判断声明最终属于 `recipe` 还是 `plotExtension`
2. 改名只改变 React authoring vocabulary，不改变 Plot IR、Vanilla Input 或 lowering owner
3. 直接复用同一个 component identity、collector 与 normalizer，可以保证 Chart extension 与独立 Plot 的同名能力保持同一契约
4. owner 前缀只应用于 declaration component，不机械制造 `PlotPlot` 或改写无冲突的 runtime API

## 决策：`ChartXxx` 只承载 Chart Source 语义

新增 `ChartFacet`，表达“按字段重复当前 Chart recipe”的高层意图。它不是 `PlotFacet` 的 wrapper、alias 或另一种 Plot collector 入口，也不接收 Plot 的 `view`、`coordinate`、`viewIdTemplate` 或 nested children。`ChartFacet` 的直接 props 写入当前精确 Chart Source 的 `recipe.facet`；Chart resolve 在 recipe scaffold 已确定后，使用 recipe 的 coordinate 与 scale identity 生成正式 Plot composition。

Plot 提供可独立复用的 `PlotFacetConfigurationSchema` 与 schema-derived `IRPlotFacetConfiguration`。Plot 自己的 facet arrangement 在该原子配置之外增加 `kind`、`view`、`coordinate` 与 panel-id template；Chart Source 只复用原子配置，不复制完整 arrangement。

`recipe.facet` 只保存不能从其它 Source 字段推导的 authored facts：

```ts
type IRPlotFacetConfiguration = {
  id: string;
  row?: PlotFacetDimension | Array<PlotFacetDimension>;
  column?: PlotFacetDimension | Array<PlotFacetDimension>;
  empty?: PlotFacetEmptyPolicy;
  header?: PlotFacetHeader;
  resolve?: PlotCompositionResolve;
  spacing?: PlotCompositionSpacing;
};

type IRChartRecipe = {
  chartType: string;
  encodings: object;
  properties?: object;
  marks?: Array<object>;
  facet?: IRPlotFacetConfiguration;
};
```

其中 `IRPlotFacetConfiguration` 必须由 `PlotFacetConfigurationSchema` 推导，代码块只展示其稳定字段。facet dimension、empty、header、resolve 与 spacing 继续由 Plot 拥有；Chart 不复制 Plot 的字段语义、默认、布局或 lowering。`id` 必填，用于保持 arrangement、panel、provenance 与 locator identity 稳定；`row` 与 `column` 至少提供一个。Vanilla `InputChartFacet` 与 React `ChartFacetProps` 可以接受 Plot 已有的 row / column 字段名 shorthand，但 normalize 后的 Source 始终保存 `IRPlotFacetConfiguration`。

Plot 同时提供唯一的 domain-level facet composition resolver，供 Chart resolve 与 Plot Vanilla authoring 共同消费：

```ts
type PlotFacetCompositionResolveContext = {
  coordinate: IRPlotCoordinateOperation;
  templateViewId?: string;
  facetCoordinate?: IRPlotCoordinateOperation;
  panelViewIdTemplate?: string;
};

declare const resolvePlotFacetComposition: (
  configuration: IRPlotFacetConfiguration,
  context: PlotFacetCompositionResolveContext,
) => NonNullable<IRPlot['composition']>;
```

该 resolver 生成完整而非局部的 composition：template view id 默认为 `${configuration.id}Panel`；`defaultView` 指向该 template view；`views` 用传入的 recipe / Plot coordinate 注册同一 view，从而保留真实 scale identity；facet arrangement 的 `view` 也指向该 template view。`facetCoordinate`、`panelViewIdTemplate` 与显式 `templateViewId` 只服务 Plot 自己已有的低层 authoring，Chart resolve 只传入 recipe coordinate，不把这些控制面暴露为 `ChartFacet` props。

未显式设置 `coordinateView` 的 recipe 或 extension mark / guide 由 `defaultView` 绑定到 template scope；显式 scope 保持不变并继续接受 Plot schema 的正式引用校验。生成 panel 的 identity 继续使用 Plot canonical 规则 `${configuration.id}.panel.${rowKey}.${columnKey}`；provenance、locator、guide / mark scope 与 lowering 仍由 Plot 正式 resolve / pipeline 消费。Plot Vanilla 的 facet declaration 必须调用同一个 resolver，不再单独维护 template view、composition 或默认 scope 的组装规则。

具体 chartType 必须明确支持 `ChartFacet`。支持能力只由该 chartType 的精确 recipe schema 是否包含 `facet` 决定，不增加平行 capability flag。支持时，facet 只包裹该 recipe 已解析的单一 coordinate scaffold；recipe 已拥有不可组合的 composition 或精确 schema 未接受 facet 时 fail-loud。完全控制 view、coordinate、track 或嵌套 composition 的作者继续使用 `Plot`，或通过显式 `plotExtension` 使用低层 Plot Source。

`ChartEncodings` 不进入公共 API。每个 chartType 的 encodings 都由自己的精确 schema 拥有；一个跨 chartType 的通用组件会形成宽 props 或重复具体 recipe 类型。`encodings` 继续作为具体 Chart component 与 Vanilla factory 的精确字段。后续只有某个配置组形成稳定 Chart Source 语义且能维持 JSON、Vanilla、React 精确等价时，才新增对应 `ChartXxx`。

## 公开 authoring 契约

React authoring 的最小形态为：

```tsx
<ScatterChart data={rows} encodings={{ x: 'billLength', y: 'flipperLength', color: 'species' }}>
  <ChartFacet id="species" column={{ field: 'species' }} />
  <PlotTransform kind="jitter" axis="x" xField="billLength" amount={0.2} seed={42} />
  <PlotAxis dimension="x" title="Bill length" grid />
  <PlotAxis dimension="y" title="Flipper length" grid />
</ScatterChart>
```

其中：

- `ChartFacet` 进入 `recipe.facet`
- `PlotTransform` 与 `PlotAxis` 经 Plot authoring 主链进入 `plotExtension`
- presentation marker 继续进入固定 Chart presentation slots
- Chart mark 继续进入 `recipe.marks`，其命名与 override 语义不由本 ADR 改写

手写 JSON、Vanilla 与 React 必须能表达同一个 `recipe.facet`，并得到等价的 resolved Plot。Plot declaration component 是 React sugar；Vanilla 继续使用 Plot Vanilla 的 typed declaration input，不增加 React-shaped component 模型。

## 行为、失败语义与兼容性

- 默认行为：未声明 `recipe.facet` 时，Chart recipe、`plotExtension` 与 resolved Plot 行为保持不变；`ChartFacet` 省略的 header、empty、resolve 与 spacing 沿用 Plot 的正式默认
- 声明顺序：presentation 使用固定 slot 顺序；Chart mark 与 Plot declaration 各自保留 authored order；`plotExtension.transform` 先于 `PlotTransform` children，并继续沿用独立 Plot authoring 的有序 append 语义
- 来源冲突：同一 Chart 最多一个 `ChartFacet`；`ChartFacet` 与 `plotExtension.coordinate`、`plotExtension.composition`、`PlotFacet` 或 `PlotScaffold` 同时声明时 fail-loud，不设置隐式优先级
- Plot fragment 冲突：除 transform 的有序 append 外，`plotExtension` prop 与 `PlotXxx` children 对同一单值或集合提供第二来源时沿用 Plot `chart-extension` 的 source-aware 冲突诊断；互不冲突的 member 可以组合
- 非法分面：缺少 `id`、同时缺少 `row` / `column`、chartType 不支持 facet 或 recipe spatial 无法被 Chart facet 包裹时，在 Chart owner 边界报告稳定 Source path
- 非法 children：未知 React element、普通 DOM、字符串、number 或错误嵌套继续 fail-loud；Chart 不把任意 ReactNode 当作 Plot extension
- breaking：`Facet`、`Scaffold`、`Track`、`Axis`、`Legend`、`Scale`、`Transform` 及对应旧 Props 从 `@retikz/plot-react` 删除，使用者必须迁移到 `PlotXxx`；不提供兼容导出
- React / Vanilla 等价性：React `ChartFacet` 与 Vanilla facet input 归一为同一精确 Chart Source；直接 Plot children 与 Vanilla Plot fragment 经过同一 Plot normalize，并保持 runtime sidecar 不进入 JSON IR

## 实现结果

Plot facet 原子配置与 composition resolver 已成为 Plot / Chart 共用的唯一主链；Plot React 公开面只保留 `PlotXxx` 非 Mark 声明，Chart React / Vanilla / JSON 则通过 `ChartFacet` 收敛到同一 `recipe.facet`。Chart 与 Plot 声明可以在同一 children tree 中组合，同时保持各自 Source owner、顺序、冲突诊断和 runtime sidecar 边界。

当前只有精确 recipe schema 明确包含 `facet` 的 chartType 支持 `ChartFacet`，现阶段为 Scatter。低层 coordinate、track、nested composition 与 panel identity 控制仍属于 `Plot` / `plotExtension`，不扩展为 Chart props；旧 Plot React 声明名不提供兼容路径。

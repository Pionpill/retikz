# ADR-03：Chart authoring、canonical result 与有序 presentation

- 状态：Proposed（替代本 ADR 先前的开放 presentation 草案；公开运行时仍受 Standard ADR-01 Surface、Core ADR-18 provider graph 与 Core ADR-19 spatial handles 门控）
- 决策日期：2026-08-11
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Core ADR-18](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md) · [Core ADR-19](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md) · [Standard Surface ADR-01](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-arbitrary-child-surface.md)
- 替代：本 ADR 先前的六 preset / 任意 child 草案，以及 ADR-02 中 caption / credit 作为首版公开 presentation token 的承诺；ADR-02 继续拥有四类保留 preset 的 token、merge 与 Plot theme 转发边界

## 背景与目标

Chart 需要同时服务两类作者：需要完整 Grammar-of-Graphics 表达的作者，希望在 Plot 外直接增加标题、说明与来源；需要传统图表类型的作者，希望通过 `ScatterChart`、`BubbleChart` 等 typed component 获得完整 recipe。两者最终都应形成同一个可序列化、可检查、可由 SVG / Canvas 等 renderer 执行的 Chart 结果。

现有长期设计已经把 Chart-level presentation 与 Plot guide / label 分开，并确定用 Layout `layout.flexLayout` 组合 Plot、再由 Standard `standard.surface` 包装完整内容。本 ADR 进一步冻结首个公开 authoring surface、完整 canonical Chart 结果、React / Vanilla 归一规则和 presentation 顺序语义，避免 adapter 用 DOM 外壳补标题，也避免把 typed ChartSpec、完整 PlotSpec 和 presentation 分散成互不等价的执行入口。

## 核心决策：基础 Chart 与 typed Chart 同构

公开 React authoring 提供两层同构组件：

```tsx
<Chart>{/* 完整 Plot authoring surface */}</Chart>

<ScatterChart />
<BubbleChart />
```

基础 `Chart` 直接承载完整 Plot authoring surface，再增加 Chart-owned presentation。它不接受 `type`，也不嵌套一个显式 `Plot` child；它的 Plot props 与 Plot authoring children 经过 Plot adapter 的正式构造链形成完整 PlotSpec。

每个 `XxxChart` 先把稀疏、type-first 输入解析为完整 PlotSpec，再进入与基础 `Chart` 相同的 canonical Chart、presentation、inspection 和 runtime 主链。typed Chart 的核心 recipe 继续不可撤销；需要脱离该 recipe 自由组合时使用基础 `Chart`。

不提供 `<Chart type="scatter">`，也不让基础 `Chart` 成为第二个 recipe dispatcher。`Chart` 与 `XxxChart` 的差异只发生在完整 PlotSpec 生成之前。

## Canonical `IRChart`

typed ChartSpec 保存稀疏高层意图；`IRChart` 保存已经完成 Plot recipe resolution 和 presentation authoring normalization 的完整执行输入。两者职责不同，不进入同一个 `type` 判别 union：

```ts
type IRChart = {
  namespace: 'chart';
  type: 'chart';
  id?: string;
  chartThemeTokens?: IRChartThemeTokenOverrides;
  plot: IRPlotSpec;
  presentation?: IRChartPresentation;
};

type IRChartPresentation = {
  children: Array<IRChartPresentationItem>;
};

type ChartPresentationPreset = 'title' | 'subtitle' | 'note' | 'source';

type IRChartPresentationItem =
  | (ChartPresentationFlexItem & {
      kind: 'plot';
      key: 'chart.plot';
    })
  | {
      [P in ChartPresentationPreset]: ChartPresentationFlexItem & {
        kind: 'preset';
        key: `chart.presentation.${P}`;
        preset: P;
        text: IRTextBlock;
        font?: IRFont;
        textColor?: IRNode['textColor'];
        align?: IRNode['align'];
        lineHeight?: IRNode['lineHeight'];
        maxTextWidth?: IRNode['maxTextWidth'];
      };
    }[ChartPresentationPreset];
```

`ChartPresentationFlexItem` 只复用 Layout Flex item 的 `margin`、`basis`、`grow`、`shrink`、`min`、`max` 与 `alignSelf`。Chart 不复制 Flex solver，也不公开近似的 container layout 配置。presentation 使用 `direction=column`、`wrap=nowrap`、`justifyContent=start`、`alignContent=start`，并以 Chart theme 的 gap 作为默认 row gap；`alignItems` 与其余行为沿用 Layout 默认值。

`presentation.children` 必须恰好包含一个 Plot item，每个 preset 最多出现一次，key 由 kind / preset 固定。数组顺序是 canonical 顺序和唯一真源。IR resolver 必须按数组出现顺序逐项映射为 Layout Flex children，禁止根据 preset、语义名称或默认位置二次排序。

缺少 `presentation` 时直接使用裸 Plot，不生成空 FlexLayout。显式 `presentation` 即使只含 Plot item 也形成 FlexLayout，使手写 JSON 对“是否存在 presentation container”的选择保持可观察。

`IRChart.id` 是包含 presentation 与 Plot body 的整图 identity；`chartThemeTokens` 保留 Chart canvas、padding、gap 与四类 preset 的 Chart-owned 稀疏覆盖。Plot-owned theme、intrinsic size、data、model、transform、scale、coordinate / composition、mark、guide 与 meta 全部保留在完整 `IRChart.plot` 中，不在 Chart 根重复。

`IRChart`、`IRChartPresentation` 和各 item 类型全部由 strict Zod schema 推导；IR 不接受函数、ReactNode、class、renderer object 或显式 `undefined`。`IRChart.plot` 必须通过 PlotSpec schema。

`IRChart` 是 Chart 唯一进入 Core composite dispatch 的根，完整 key 固定为 `chart.chart`，并由单一 `ChartDefinition` 下沉到 Standard Surface。`scatter`、`bubble` 等 typed ChartSpec 是 `@retikz/chart` 的封闭 authoring recipe 输入，不是 `IRChild`、CompositeDefinition 或 dependency provider；它们必须在 Core compile 前由共享 Chart resolver 归一为 `IRChart`。基础 Chart 则从完整 Plot authoring 直接构造同一 `IRChart`。两条入口在形成 `IRChart` 后不再保留逐类型 compile 分支。

### 基础 Chart 根与 Plot body

基础 Chart 的“完整 Plot authoring surface”指形成 PlotSpec 所需的 data、model、transform、scale、coordinate / composition、mark、guide、Plot theme 与 intrinsic size 不被裁剪，Plot runtime options 也由 adapter contribution 原样转交正式 Plot runtime；它不表示把宿主字段或 runtime callback 写入 JSON-safe `IRChart.plot`。

Chart root 的 renderer host、外层 placement / transform / clip / theme 与 `id` 作用于包含 presentation 的整图。spec 模式保留传入 `PlotSpec.id`，并只允许 presentation marker 作为额外 children；DSL 模式把直接 children 分为 presentation marker 与 Plot declaration，再将全部 Plot declaration 交给 Plot adapter 的正式 builder。DSL 模式存在 Chart `id` 时，内部 Plot body 使用 `${chartId}/plot`；没有 Chart `id` 时不生成全局、计数或其它隐式 id。

## Presentation shorthand 与默认位置

基础 `Chart` 和所有 `XxxChart` 共同提供：

```ts
type ChartPresentationShorthandProps = {
  title?: string;
  subtitle?: string;
  note?: string;
  source?: string;
};
```

shorthand 不自动添加 `Source:`、`Note:` 或其它语言前缀。只有作者提供内容时才生成对应 presentation item。

shorthand 没有排序配置，使用固定默认位置：

```text
title
subtitle
Plot
note
source
```

这些默认位置只属于 authoring normalization，不进入 canonical IR 的 `position` 字段。

## React headless marker

React 包级扁平导出四个 headless marker：

```tsx
<ChartTitle />
<ChartSubtitle />
<ChartNote />
<ChartSource />
```

标准拼写是 `ChartSubtitle`。不提供 `Chart.Subtitle` namespace、兼容别名、`ChartCaption`、`ChartCredit`、`ChartPlot` 或 `ChartItem`。

共享 marker props 为：

```ts
type ChartPresentationMarkerProps = ChartPresentationFlexItem & {
  children: ChartTextAuthoring;
  position?: 'top' | 'bottom';
  font?: IRFont;
  textColor?: IRNode['textColor'];
  align?: IRNode['align'];
  lineHeight?: IRNode['lineHeight'];
  maxTextWidth?: IRNode['maxTextWidth'];
};
```

`ChartTitle` / `ChartSubtitle` 的 `position` 默认是 `top`；`ChartNote` / `ChartSource` 默认是 `bottom`。`position` 只决定 authoring normalization 时放到 Plot placeholder 前还是后，不进入 canonical `IRChart`。

marker 必须是 `Chart` / `XxxChart` 展平透明 Fragment 后的直接 child。每类 marker 最多一个；重复 marker fail-loud。无法识别为 marker 的直接 child 继续由基础 Chart 的 Plot authoring 或 typed Chart 的正式 Plot-extension normalizer 消费；无法进入任一正式链路的 child fail-loud。

同名 marker 完整覆盖同名 shorthand，不做字段级合并。归一顺序固定为：

```text
显式 top markers（JSX authored order）
剩余 top shorthand（title -> subtitle）
Plot
显式 bottom markers（JSX authored order）
剩余 bottom shorthand（note -> source）
```

例如显式 `ChartSubtitle`、`ChartTitle`、`ChartSource`、`ChartNote` 会形成 `subtitle -> title -> Plot -> source -> note`，resolver 不得再次按 preset 排序。

## Text authoring 与样式

marker children 首版只接受字符串、透明 Fragment 和现有 Core React `Text` marker。`Text` 保持现有整行语义；多个 `Text` 形成多行 TextBlock。普通 DOM element、数字、函数、事件 callback、任意 React component 和零个有效文本结果均 fail-loud。

React adapter 只负责把该 authoring 归一为 JSON-safe Core `TextBlock`。首版不增加 inline `TextRun`，也不改变现有 `Text` 的整行语义。空字符串、空 TextBlock 和所有 text / TeX leaf 都为空的内容非法；普通空白仍按 Core 文本内容处理。

文本样式优先级为：

```text
Chart theme preset defaults
< marker block-level text props
< Text line-level authored leaves
```

Chart 只把 preset 与 block-level text leaves 映射为 Core text Node 输入；文字测量、换行、line / run 继承与 renderer 输出继续由 Core 拥有。marker 不公开 Node 的 shape、position、label、边框、事件或 renderer surface。

## Vanilla authoring parity

Vanilla 提供基础与 typed convenience helper：

```ts
type ChartPresentationAuthoringRecord = ChartPresentationFlexItem & {
  preset: ChartPresentationPreset;
  position?: 'top' | 'bottom';
  text: string | IRTextBlock;
  font?: IRFont;
  textColor?: IRNode['textColor'];
  align?: IRNode['align'];
  lineHeight?: IRNode['lineHeight'];
  maxTextWidth?: IRNode['maxTextWidth'];
};
```

Vanilla 不接受 React Fragment / `Text` element；多行或逐行样式直接使用 JSON-safe `IRTextBlock`。

```ts
createChart({
  plot: plotSpec,
  title: '属性标题',
  presentation: [
    { preset: 'subtitle', position: 'top', text: '副标题' },
    { preset: 'source', position: 'bottom', text: 'UCI Auto MPG' },
  ],
});

createScatterChart({
  data: 'auto-mpg',
  encoding: {
    x: { field: 'weight' },
    y: { field: 'mpg' },
  },
  title: '车辆重量与燃油效率',
  presentation: [{ preset: 'source', position: 'bottom', text: 'UCI Auto MPG' }],
});
```

Vanilla `presentation` 是 marker 的 plain-data 对等输入，保持数组 authored order，preset 同样唯一，并与 shorthand 使用相同覆盖和剩余项规则。Vanilla convenience input 中的 `position` 也只属于 authoring sugar。

React adapter 先把 marker 转为 framework-neutral presentation authoring records；React 与 Vanilla 随后调用 `@retikz/chart` 拥有的同一个纯 normalizer，生成等价 `IRChart`。任何入口都不得拥有其它入口无法序列化的顺序、文本或样式语义。手写 canonical JSON 直接以 Plot placeholder 前后的数组位置表达顺序，不消费 `position`。

## Inspection、identity 与空间语义

Chart inspection 至少区分裸 Plot 与 Flex presentation，并按 canonical children 顺序提供 item records：

```ts
type IRChartPresentationItemInspection = {
  key: string;
  kind: 'plot' | 'preset';
  preset?: 'title' | 'subtitle' | 'note' | 'source';
  sourcePath: string;
};
```

显式 presentation 的 `sourcePath` 指向 canonical `presentation.children/<index>`；inspection 不重排、不复制 TextBlock 或 PlotSpec。裸 Plot inspection 只记录主 Plot。

Chart 拥有整个 Chart、主 Plot item 和四类实际存在的 presentation item 的外层 identity。固定 item key 不替换 PlotSpec 自己的 id、namespace、inspection、locator 或 provenance。Layout 布局可以改变最终 geometry，但不得改变 canonical item 顺序、key 或吞掉 Plot 内部 handle。

完整公开运行时仍依赖 Core qualified selector 与 Kernel cross-namespace dependency aggregation。缺失依赖、selector target 不存在或 namespace 越界必须 fail-loud，Chart 不复制 Plot handle registry 或建立 adapter 私有 identity。

唯一 `chart.chart` dependency provider 必须直接、按序声明 `standard.surface`、`layout.flexLayout`、`plot.plot` 三个完整 key。最终 IR 仍按实际结构嵌套为 `chart.chart -> standard.surface -> layout.flexLayout? -> plot.plot`；provider dependency graph 表达 definition 闭包，不替代 IR 的父子结构。Chart package 不发布 `chart.scatter`、`chart.bubble` 等逐类型 Core providers。

## 行为与失败语义

- 基础 `Chart` 接受完整 Plot authoring，但拒绝 `type` prop 和显式嵌套 `Plot`
- Chart root 的 identity 与宿主外壳作用于整图；spec 模式保留 PlotSpec identity，DSL 模式只在显式 Chart id 存在时派生稳定 Plot body id
- typed `XxxChart` 必须先产生通过 PlotSpec schema 的完整 PlotSpec，并保持 type 核心 recipe
- 同名 marker 完整覆盖 shorthand；未覆盖 shorthand 进入其固定默认位置
- marker 同类重复、非直接 child、空内容、非法 element 或非法 Text authoring 均 fail-loud
- Vanilla explicit presentation 中重复 preset、空内容和非法 position 均 fail-loud
- canonical presentation 恰好一个 Plot、每种 preset 最多一次、固定 key 且 authored order 保持不变
- 无 presentation 产生裸 Plot content；显式 presentation 产生 Layout FlexLayout content；两者最终都进入 Standard Surface
- adapter 不提供 DOM-only title、CSS-only layout、renderer-only text 或静默忽略路径
- Chart 包裹前后，主 Plot 的 semantic identity、domain payload、provenance、locator 与 lineage 保持连续

该契约在 `0.x` 直接替代先前开放六 preset、重复 preset、任意 `IRChild`、`ChartPlot` 与 `ChartItem` 的草案，并把 caption / credit token 从首版公开 Chart theme contract 移除；不提供兼容别名、migration、fallback 或新旧双轨。

## 功能与包边界

- `@retikz/chart` 拥有 typed ChartSpec、包含整图 identity / Chart token handoff 的完整 `IRChart` schema、四类 preset、共享 authoring normalizer、Chart inspection、单一 `ChartDefinition` 与到 Layout Flex / Standard Surface 输入的确定性转换
- `@retikz/chart-react` 拥有基础 / typed JSX component、direct-child marker 识别、Core `Text` authoring 转换和 React runtime 接线
- `@retikz/chart-vanilla` 拥有基础 / typed plain helper、SSR convenience 和 Vanilla runtime 接线
- Plot 拥有完整 Plot authoring、PlotSpec、Axis、Legend、Mark、Scale、Coordinate、Annotation、definition / registry 与 lowering
- Layout 拥有 `layout.flexLayout` schema、默认、测量、排列与 solver
- Standard 只拥有 `standard.surface` 的背景、padding、border / corner radius、overflow 与任意 child 包装，不拥有或转发 FlexLayout
- Core 拥有 Node、TextBlock、文字测量、Scene、identity 与 renderer-neutral spatial 基础
- Kernel adapter owner 拥有 Chart、Plot 与 Standard contribution、dataset、definition、inspection 和 runtime sidecar 的通用聚合

adapter 不得复制 Chart normalizer、Plot builder、Layout solver、Standard Surface lowering、Core Text/Node schema 或 renderer 行为。

Chart 三包使用独立 `chart` release group 并保持 `0.1.0-alpha.1` lockstep。该组是 `viz` feature，但其 Tier 3 包边界要求直接消费 `plot` feature group；因此 release-group 真源必须用显式 `dependsOn: ['plot']` 声明这条有向组依赖。`dependsOn` 表达直接、非传递的跨 feature 发布组依赖：目标组必须存在且在数组中唯一，禁止 self-edge，完整发布组图必须无环；每条声明必须由源组至少一个包到目标组包的真实 workspace dependency 支撑，反之任一真实跨 feature 依赖也必须有源组的直接声明。校验器不按 Chart 名称开白名单，不全局放宽同领域或跨领域 feature 互依；未知、重复、自环、循环、未消费声明和未声明真实边全部 fail-loud。同组依赖使用 `workspace:*`，Chart 到 Plot 及其它组的依赖使用 `workspace:^`。机器真源、可读 package-topology 与发布流程规则必须同步。

## 能力完备性与架构验证

- 所属能力与问题：Chart authoring / presentation 属于 Visualization 上层封装；Plot 表达由 Visualization Complete 拥有；Flex 复用 Layout，Surface 复用 Standard，Text / Scene 复用 Core
- 归属结论：基础与 typed Chart 只在 PlotSpec 生成前分流，之后共用唯一 `chart.chart` canonical `IRChart`、`ChartDefinition` 和执行主链
- 内部表达：完整 PlotSpec、固定 Plot placeholder 与四类 TextBlock preset 可确定性转换为现有 Layout FlexLayout，再进入 Standard Surface；不新增 layout solver、文字模型或 renderer 语义
- 外部扩展：Chart type 仍是封闭目录，不适用 Chart registry；基础 Chart 与 typed Chart 的扩展全部复用 Plot 的正式 authoring 和 definition / registry
- adapter 等价：React marker 与 Vanilla plain records 共享 framework-neutral normalizer；canonical JSON 不携带宿主对象或 authoring-only position
- 下游闭环：`IRChart -> standard.surface<layout.flexLayout?<plot.plot>> -> Standard / Layout / Plot lowering -> Core IR / Scene + spatial sidecar -> renderer / tooling`；无 presentation 时 Surface 直接包含 Plot
- 不支持边界：任意 presentation child、DOM content、宿主 UI、renderer object 与 inline TextRun 不进入首版契约
- 依赖结论：本 ADR 组合现有 Chart / Plot / Layout / Standard / Core 能力；通用 contribution、surface 与 spatial gaps 继续由其 owner 先行闭环，不能用 adapter 特判绕过
- 发布拓扑：Chart 保持独立 feature release group，通过真源中的显式有向 `dependsOn` 消费 Plot；不并入 Plot 组、不把 Plot 改称 foundation，也不允许未声明的 feature 互依

## 被否决方案

- 只提供 typed `XxxChart`：无法让完整 Plot 作者复用 Chart-native presentation，迫使其回到外部 DOM 外壳
- `<Chart type="scatter">`：把基础 Plot wrapper 与封闭 recipe dispatcher 混为一个宽 union，削弱 typed component 的可发现性和类型约束
- 固定语义排序：无法表达 `subtitle -> title` 或 `source -> note`，并会让 JSX / Vanilla authored order 在 canonical IR 中丢失
- 在 canonical IR 保留 `position`：会同时存在 position 和数组顺序两个真源，并迫使 resolver 决定冲突优先级
- 开放六 preset、重复 preset 与任意 `IRChild`：首版扩大 identity、依赖聚合和文档表面，却没有当前已确认消费者
- 暴露 `ChartPlot` / `ChartItem`：让用户手工维护本可由完整 Chart 结果保证的唯一 Plot placeholder 和通用 item wrapper
- 允许普通 ReactNode 或 DOM / CSS 外壳：破坏 Vanilla、SSR、SVG、Canvas 和 JSON parity
- 把 title / subtitle / note / source 写入 PlotSpec：扩张 Plot 的长期职责并混淆 Plot label 边界

## 测试策略摘要

需要 schema / parser 证明 `IRChart`、唯一 Plot、preset 唯一、固定 key、TextBlock、JSON-safe 和 strict unknown-field；shared normalizer 证明 shorthand 默认顺序、marker 覆盖、top / bottom authored order 与 React / Vanilla 等价；presentation resolution 证明 canonical 数组顺序与 Layout Flex children 完全一致且不改写 Plot；compile / renderer 证明 Standard Surface 下 SVG 与 Canvas 的上下布局一致；inspection / spatial evidence 证明 Chart 外层 identity 与 Plot 内部 provenance / locator / lineage 连续；release topology 验证合法的显式 Chart→Plot 直接边，拒绝未知、重复、self、cycle、未消费声明与未声明真实跨 feature 边，并保持组内 `workspace:*`、跨组 `workspace:^`；文档和 browser evidence 证明真实数据示例由 Chart 自身渲染 title、subtitle 与 source。

关键反例包括重复 marker / preset、非直接 child、空文本、非法 React element、零个或多个 Plot placeholder、resolver 根据 preset 重排、DOM-only title、adapter-only 默认值与 Chart 包裹后 Plot identity 丢失。详细 case、文件、命令和证据映射进入 ignored test contract，不写入本 ADR。

## 不在本 ADR 范围

- caption、credit、任意 presentation child、重复 preset、inline TextRun 与完整 Node authoring
- toolbar、export、fullscreen、loading、responsive state 与 dashboard linked state
- accessibility description 到宿主 DOM / renderer 的具体映射
- Standard surface、Kernel contribution aggregation 或 Core qualified selector 的具体 API 与实现
- 具体 Scatter / Bubble recipe 字段和其它 Canonical Type

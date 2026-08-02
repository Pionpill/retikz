# ADR-03：Chart presentation 与 Standard FlexLayout

- 状态：Proposed（等待 ADR-02 Accept；完整公开入口仍受 Standard surface、Kernel 嵌套 contribution 聚合与 Core spatial transparency 门控）
- 决策日期：2026-08-01
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [Chart 总设计 §9](../../../../../architecture/chart-design.md)

## 背景与目标

Plot 负责图本体及 axis、legend、datum / mark label 等可视化语义。一个可独立绘制的 Chart 还需要标题、说明、来源、徽记或其它 renderer-neutral 内容，而且作者需要决定这些内容相对 Plot 的顺序、伸缩和对齐方式。

Chart 不应把这类需求冻结成固定槽位树，也不应复制通用布局系统。Chart 只拥有 Plot body 的占位语义和一组可选文本 preset；有序组合、item 约束、测量与排列全部复用 Standard FlexLayout，任意自定义内容复用 Core `IRChild`。最终结果必须在 JSON、React、Vanilla、SSR、SVG 与 Canvas 中保持等价，普通 DOM `ReactNode` 不进入 Chart IR。

## 核心决策：开放的 Flex children 与唯一 Plot 占位

`presentation` 是一个按 authored order 排列的 Standard Flex authoring surface：

```ts
type ChartPresentation = {
  layout?: Omit<FlexLayoutInput, 'children'>;
  children: Array<ChartPresentationItem>;
};

type ChartPresentationFlexItem = Omit<FlexLayoutItemInput, 'kind' | 'key' | 'child'>;

type ChartPresentationTextBlock = IRTextBlock; // additionally constrained by the non-empty contract below

type ChartPresentationText =
  | ChartPresentationTextBlock
  | {
      text: ChartPresentationTextBlock;
      font?: IRFont;
      textColor?: IRNode['textColor'];
      align?: IRNode['align'];
      lineHeight?: IRNode['lineHeight'];
      maxTextWidth?: IRNode['maxTextWidth'];
    };

type ChartPresentationItem =
  | (ChartPresentationFlexItem & {
      key?: 'chart.plot';
      content: { kind: 'plot' };
    })
  | (ChartPresentationFlexItem & {
      key?: string;
      content: {
        kind: 'preset';
        preset: 'title' | 'subtitle' | 'caption' | 'note' | 'source' | 'credit';
        text: ChartPresentationText;
      };
    })
  | (ChartPresentationFlexItem & {
      key: string;
      content: { kind: 'child'; child: IRChild };
    });
```

`layout` 与 item 的 margin、basis、grow、shrink、min、max、alignSelf 等字段沿用 Standard 的公开 Flex 契约；Chart 不建立近似字段或私有 solver。`kind: 'plot'` 表示当前 Chart recipe 解析出的完整 PlotSpec，必须在 `children` 中恰好出现一次。`kind: 'child'` 接受任意 JSON-safe Core child，包括已注册的 Tier 2 composite；它不受“恰好一个主 Plot 占位”的限制。

`children` 的顺序就是最终 Flex paint 与排列顺序，Chart 不做 canonical 重排。作者可以把 preset 或自定义 child 放在 Plot 前后任意位置，也可以完全不用文本 preset。存在 `presentation` 时，即使只有 Plot 占位也生成 FlexLayout；没有 `presentation` 时直接保留裸 PlotSpec，不生成空容器。

`ChartPresentationTextBlock` 是 Core `IRTextBlock` 的 non-empty refinement：至少包含一个长度大于零的 plain text、styled-line text、mixed-run text 或 TeX leaf；空字符串、空 block 和所有 leaf 都为空的 block 非法。styled wrapper 只开放上方列出的 Core Node text-style leaves，不接受布局、形状、事件或 renderer 字段。

## Preset、identity 与默认布局

`title`、`subtitle`、`caption`、`note`、`source`、`credit` 是便捷内容 preset，不是保留槽位。preset 把 `ChartPresentationText` 映射为 renderer-neutral Core text child，并消费 ADR-02 对应 token；作者可以重复使用同一 preset、改用自定义 child，或为任意 item 设置独立 Flex 参数。

Plot item 的 container-local key 固定为 `chart.plot`；省略时自动补齐，显式写入其它值 fail-loud。preset item 缺省 key 为 `chart.presentation.<preset>`，也可以显式改成其它 non-empty key；因此重复使用同一 preset 时必须为重复项提供不同 key。custom child 必须显式提供 key。所有默认补齐完成后，item key 在当前 presentation 内必须唯一。

Chart 的默认 Flex preset 是 column、no-wrap、start distribution，并把 ADR-02 `chart.gap` 用作默认 `rowGap`；其余缺省值沿用 Standard。`presentation.layout` 按字段覆盖该 preset，并开放 Standard 的完整 container 配置，包括 direction、wrap、physical gaps、distribution、alignment、size、padding 与 overflow。`chart.padding` 仍属于完整 Chart surface，不与 Flex container padding 混为一谈。

文本 cascade 复用 Core 的继承语义，不新增 Chart 文本模型：`chart.font.family` 与 preset 对应的 foreground、font size / weight、line height、align token 形成 wrapper defaults；preset-local styled text 只覆盖明确写入的 leaf，TextBlock 内 line / run 已写入的 leaf 最终优先。custom child 完全保留自身样式，不消费 preset token。

## Headless authoring 契约

React 入口采用包级扁平导出的 headless components，组件只声明 Chart IR，不渲染 DOM。公开组件是 `Chart`、`ChartPlot`、`ChartItem`、`ChartTitle`、`ChartSubtitle`、`ChartCaption`、`ChartNote`、`ChartSource` 与 `ChartCredit`；不提供 `Chart.Xxx` namespace 或兼容别名：

```tsx
<Chart spec={chartSpec} layout={{ direction: 'column', rowGap: 8 }}>
  <ChartTitle>Revenue</ChartTitle>
  <ChartItem itemKey="badge" grow={0}>
    <Node position={[0, 0]}>Draft</Node>
  </ChartItem>
  <ChartPlot />
  <ChartCaption>Quarterly revenue</ChartCaption>
</Chart>
```

三类 presentation marker 共享 Standard Flex item 的 `margin`、`basis`、`grow`、`shrink`、`min`、`max` 与 `alignSelf` 字段，并统一使用非 React-special 的 `itemKey` 映射 canonical JSON `key`：

```ts
type ChartPresentationFlexProps = ChartPresentationFlexItem & {
  itemKey?: string;
};

type ChartPlotProps = ChartPresentationFlexProps & {
  itemKey?: 'chart.plot';
};

type ChartPresetProps = ChartPresentationFlexProps &
  ({ text: ChartPresentationText; children?: never } | { text?: never; children: ChartTextAuthoring });

type ChartItemProps = Omit<ChartPresentationFlexProps, 'itemKey'> & {
  itemKey: string;
} & ({ ir: IRChild; children?: never } | { ir?: never; children: ReactDrawableAuthoring });
```

`ChartPlot` 声明唯一主 Plot 占位；其 `itemKey` 省略时补为 `chart.plot`，显式值只能是 `chart.plot`。六个 `Chart<Preset>` 文本组件声明对应 preset，均接受完整 Flex item props；`text` 直接接受 JSON-safe `ChartPresentationText`，JSX `children` 则只接受与 Core Node text authoring 等价的字符串、数字、Text line 与透明组织节点，并归一化为同一 non-empty `ChartPresentationTextBlock`，两种输入互斥。重复 preset 使用各自的 `itemKey`，不能依赖 React `key` 形成 Chart identity。

`ChartItem` 接受完整 Flex item props、必需的 `itemKey`，以及一个 renderer-neutral drawable child或等价的显式 `ir: IRChild`；两种 child 输入互斥。Fragment、数组等只可透明组织 `Chart` 的直接 presentation child 或单个 item 内的 drawable authoring；DOM element、函数、事件回调、零个或多个 `IRChild` 结果均 fail-loud。

`Chart` 展平透明 Fragment / array 后，只把 `ChartPlot`、六个 `Chart<Preset>` component 与 `ChartItem` 识别为 presentation child；其它已支持的 Plot authoring child 继续进入 ChartCommon 的 Plot extension normalizer，不参与 presentation 顺序或 item key 校验。无法归入这两条正式语义链的 child fail-loud，不做 DOM 渲染或启发式分类。

`Chart` 只允许一个 presentation authoring 真源。若 `spec` 已包含 `presentation`，`Chart` 不得再声明 `layout` 或任何 headless presentation child；若 `Chart` 声明了 `layout` 或 headless presentation child，则 `spec` 必须省略 `presentation`。两套输入同时出现时 fail-loud，不做覆盖、合并或隐式排序。React authoring 最终先归一化为同一个 canonical `ChartPresentation`，再进入与 Vanilla builder、手写 JSON 相同的 schema 与 resolution 主链。

嵌套的 Plot、Standard 或自定义 Tier 2 JSX 必须通过 Kernel adapter 的通用 contribution / dependency 聚合进入宿主，保留自己的 datasets、definitions、inspection roots 与适用的 runtime sidecar。Chart React 不得丢弃 foreign contribution、提前 lower child、复制 definition，或为本组件私造旁路。Vanilla authoring 直接接受 JSON-safe `ChartPresentation`，或使用只返回上述三类 canonical item 的 typed constructor；最终输入与输出都必须通过同一 Chart schema，helper 不得增加 callback、runtime object、隐式顺序或 React 独有语义。某一入口不得拥有其它入口无法序列化的 presentation 语义。

该聚合能力必须由独立、已 Accepted 的 Kernel adapter owner ADR 先行冻结并实现。Chart 依赖的长期结果包括：显式声明 composite dependencies；Chart dataset 进入 Plot 的正式 dataset group；等价 definition 确定性去重、冲突 definition fail-loud；nested inspection 与适用的 handler / runtime sidecar 保真转交；compile 前完成 owner-qualified dependency preflight；React 与 Vanilla 同构。该 gate 解除前，Chart schema 与 framework-neutral presentation mapping 可以实现，但 Chart headless component runtime 入口保持关闭。

## Inspection 与空间语义

ADR-03 扩展 Chart inspection，最小公开形态为：

```ts
type ChartPresentationItemInspection = {
  key: string;
  contentKind: 'plot' | 'preset' | 'child';
  preset?: 'title' | 'subtitle' | 'caption' | 'note' | 'source' | 'credit';
  sourcePath: string;
};

type ChartPresentationInspection = {
  contentKind: 'plot' | 'flex-layout';
  items: Array<ChartPresentationItemInspection>;
};
```

`items` 始终按最终直接内容的 authored order 排列并包含主 Plot。没有 `presentation` 时，inspection 是 bare `plot`，且只含 `{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }`；显式 presentation 时为 `flex-layout`，每条 `sourcePath` 固定指向 canonical `$spec/presentation/children/<index>`。JSON、React 与 Vanilla 都先归一化为同一 children 数组，因此产生相同 source path。preset record 必须写 `preset`；Plot 与 custom child record 不写。inspection 不复制 custom child、PlotSpec、Flex geometry、surface geometry或子能力已有的 provenance / lineage。

Chart 只拥有整个 Chart、唯一主 Plot item及其 presentation item 的外层 identity。item key 是当前 Chart occurrence 内的 container-local identity，不替换、重命名或遮蔽 PlotSpec / custom child 自己的 id、namespace、inspection 或 locator。Chart 有显式 id 时，未来 qualified selector 以 Chart id 与 item key 组成稳定外层定位；Chart 无 id 时，item key 只在当前 compile occurrence 内稳定，不承诺跨 sibling Chart 或跨重新排列的全局选择。Standard probe / replay 可以改变最终 geometry，但不能改变 item 顺序与 key，也不能丢失 Plot body 或 nested Tier 2 child 已有的 identity、inspection、provenance、locator 与 lineage。公开空间访问继续等待 Core qualified selector；Chart 不复制 Plot 或 Core 的 handle registry。

## 行为、失败语义与兼容性

- `presentation.children` 必须非空，并且恰好包含一个主 Plot 占位
- authored order、显式 Flex 参数和自定义 child 必须原样进入 Standard Flex 输入
- 默认 key 补齐后重复 key、非法 Plot key、空 custom key、未知字段或非法 Standard Flex 值 fail-loud
- preset text 必须包含至少一个非空 plain / styled line 或 mixed run；custom child 的有效性沿用 Core / 对应 composite schema
- 缺省 presentation 产生裸 Plot；显式 presentation 产生 FlexLayout，不因只有 Plot item而被省略
- style token 只作用于 preset child；preset-local style 只覆盖 authored leaf；custom child 样式不被 Chart 改写
- React、Vanilla 与手写 JSON 使用同一 schema 与 resolution 主链；adapter 不提供 DOM-only title、CSS-only layout 或 renderer-only child
- `Chart` 的 `spec.presentation` 与 headless presentation children 互斥；同时存在时 fail-loud
- Chart 包裹前后，主 Plot 的 semantic identity、domain payload、provenance、locator 与 lineage 保持连续

该契约在 `0.x` 阶段替换此前固定六槽位草案，不提供兼容别名或 canonical 重排桥接。

## 功能与包边界

- Chart 拥有主 Plot 占位、文本 preset 语义、style token 映射、item source inspection 与到 Standard 输入的确定性转换
- Standard 拥有 FlexLayout schema、item 行为、测量、排列以及可包装任意 child 的 renderer-neutral surface / background / padding
- Core 拥有 `IRChild`、TextBlock、文本测量、layout replay 与 spatial handle / selector 基础
- Kernel React / Vanilla adapter owner 通过独立 ADR 拥有跨 namespace contribution、dataset、definition、inspection 与 runtime sidecar 聚合
- Plot body 始终是完整 PlotSpec；Chart 不接管 Plot guide、label、composition、trace 或 nested Plot 的依赖
- Chart React / Vanilla 只把 authoring 归一化为同一 Chart IR 并接入宿主 runtime，不拥有 presentation 默认与布局算法

完整 host 必须正式组装 Chart、Plot、FlexLayout、surface 及所有 nested child 声明的 definitions。缺少已 Accepted 的 Kernel contribution dependency ADR、surface 或 spatial selector capability 时必须 fail-loud 或保持对应公开入口关闭，不允许用 DOM / renderer 特判补洞。

## 能力完备性与架构验证

- 所属能力域与问题：Chart-level presentation 属于 Visualization 上层封装；通用组合属于 Drawing Complete 的 Standard 能力
- 归属结论：主 Plot 占位和文本 preset 归 Chart；任意 child、Flex 布局、surface、adapter 聚合与空间底座分别复用其 owner
- 内部表达：Chart presentation 可确定性转换为现有 Standard FlexLayout，不新增 layout IR、solver、文字测量或 renderer 语义
- 外部扩展：开放点是现有 `IRChild` 与 Tier 2 definition / registry 链路；preset 是闭合语义，不新增 Chart registry
- 下游闭环：Chart presentation -> Standard Flex composition -> Plot / nested composite lowering -> Core IR / Scene -> renderer
- adapter 等价：React flat components、Vanilla builder 与 JSON 共享 Chart schema；foreign Tier 2 contribution 等待独立 Kernel owner ADR 提供通用保真聚合
- 不支持边界：DOM ReactNode、宿主 UI 状态、renderer object 与缺少 definition 的 composite 不进入或不绕过正式主链
- 依赖结论：Chart 组合现有 Core / Standard 能力并允许 owner-local mapping；通用嵌套 contribution 先下沉到独立 Kernel owner ADR，完成前保持 headless component runtime gate

## 被否决方案

- 固定 title -> subtitle -> Plot -> caption -> note -> source -> credit：无法表达任意顺序、重复 preset 和自定义内容
- 把 presentation 写入 PlotSpec：会扩张 Plot 的长期职责
- 让用户直接传任意 ReactNode 或用 DOM / CSS 外壳布局：会破坏 JSON、Vanilla、SSR、SVG 与 Canvas parity
- Chart 自建 layout IR、box solver、文字测量或 surface composite：会复制 Standard / Core 能力
- Chart React 丢弃或私自合并 nested Tier 2 contribution：会让自定义 child 只能视觉嵌入而无法携带正式依赖和 inspection

## 测试策略摘要

需要 schema、Flex 契约复用、默认与 authored order、唯一 Plot / key 不变量、preset cascade、custom IRChild、inspection、递归 composite 以及 trace / lineage 连续性证据。关键不变量是 Chart 不重排 children、不改写 custom child、只用 Standard 执行布局。

公开入口启用前仍需补齐 nested contribution、spatial transparency、React / Vanilla / JSON parity 与 renderer parity 证据，证明三种 authoring 入口生成等价 canonical tree，并且任意 nested Tier 2 child 沿正式 definition 与 dataset 主链执行。

## 不在本 ADR 范围

- toolbar、export、fullscreen、loading 与 dashboard linked state
- 普通 DOM content、事件 callback 与宿主交互组件
- accessibility description 到宿主 DOM / renderer 的具体映射
- Standard surface 或 Core qualified selector 的具体 API 与实现

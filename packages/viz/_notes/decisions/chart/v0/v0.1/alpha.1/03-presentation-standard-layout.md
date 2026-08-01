# ADR-03：Chart presentation 与 Standard FlexLayout

- 状态：Proposed（公开入口仍受 Standard surface、Kernel dependency assembly 与 Core spatial transparency gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [Chart 总设计 §8](../../../../../architecture/chart-design.md)

## 背景与目标

Plot 负责图本体及 axis、legend、datum / mark label 等可视化语义。一个可独立绘制的 Chart 还需要标题、说明、来源与署名；这些内容不能进入 PlotSpec，也不能由 React DOM 外壳独占。

Chart 只声明 presentation 语义和固定排列，Standard 负责领域无关的组合、测量、布局与 surface，Core 负责文本与 renderer-neutral 图形底座。最终结果必须在 JSON、React、Vanilla、SVG 与 Canvas 中保持等价。

## 决策：六个可选槽位组成固定 column presentation

```ts
type ChartPresentation = {
  title?: ChartPresentationText;
  subtitle?: ChartPresentationText;
  caption?: ChartPresentationText;
  note?: ChartPresentationText;
  source?: ChartPresentationText;
  credit?: ChartPresentationText;
  layout?: ChartPresentationLayout;
};

type ChartPresentationText =
  | IRTextBlock
  | {
      text: IRTextBlock;
      font?: IRFont;
      textColor?: string;
      align?: IRNode['align'];
      lineHeight?: number;
      maxTextWidth?: number;
    };
```

每个 slot 接受 non-empty Core TextBlock shorthand 或严格 styled object。`presentation` 至少包含一个 text slot；只有 `layout` 的空外壳无效。

存在 presentation 时，canonical child 顺序固定为：

```text
title -> subtitle -> plot -> caption -> note -> source -> credit
```

每个 slot 映射为 renderer-neutral Core text child，Plot body 保持完整 PlotSpec。整体使用 Standard 的 column FlexLayout；纵向 gap 来自 `presentation.layout.gap` 或 ADR-02 `chart.gap` token，横轴对齐来自 `presentation.layout.align`，slot-local style 覆盖对应 resolved token，但未覆盖的 font sibling 必须保留。

没有 presentation 时 content 直接是 PlotSpec，不生成空 FlexLayout。无论 content 是 PlotSpec 还是 FlexLayout，最终都进入同一个 Standard surface phase；surface 即使视觉值为透明、零 padding 也不省略，以保持 canonical tree、inspection 与 adapter parity。

## 基础数据结构与公开契约

`presentation.layout` 只开放：

| 字段      | Contract                               | 语义                                           |
| --------- | -------------------------------------- | ---------------------------------------------- |
| `padding` | Standard padding number / box spacing  | 覆盖 `chart.padding`，作为 outer surface inset |
| `gap`     | finite non-negative number             | 覆盖 `chart.gap`，作为 slot 与 Plot 的纵向 gap |
| `align`   | `start` / `center` / `end` / `stretch` | Standard Flex cross-axis alignment             |

Chart 不开放 wrap、reverse、grow、任意 graphic、slot renderer 或 ReactNode。复杂外部排列由用户直接使用 Standard。

ADR-03 扩展 ADR-01 的唯一 inspection：记录 content 是裸 Plot 还是 FlexLayout，并按 canonical 顺序列出实际存在的 slot 及其用户输入来源。inspection 不复制 PlotSpec、surface geometry、Plot provenance 或 lineage。

## 行为、失败语义与兼容性

- slot 文本必须包含至少一个非空 plain / styled line 或 mixed run
- object key 顺序不影响 canonical child 顺序与稳定 slot identity
- slot-local style 高于 ADR-02 token，但只覆盖 authored leaf
- 缺省 presentation 不产生可见内容；显式空 presentation fail-loud
- 非法 padding、gap、align、空文本或未知字段在 Chart schema 阶段 fail-loud
- Chart 有 id 时，Chart 外层、Plot body 与已存在 slot 获得稳定关联 identity；无 id 时由 occurrence 区分实例
- Standard probe / replay 可以改变最终 geometry，但不能改变 Plot semantic identity、domain payload、provenance、locator 或 lineage
- React、Vanilla 与手写 JSON 使用同一 presentation schema；adapter 不提供 DOM-only title 或 CSS-only surface

## 功能与包边界

- Chart 拥有六个 slot 的语义、可选性、canonical 顺序、layout override 与到 Standard 输入的映射
- Standard 拥有 FlexLayout 与可包装任意 child 的 renderer-neutral surface / background / padding
- Core 拥有 TextBlock、文本测量、通用 layout replay 与 spatial handle / selector 基础
- Plot body 始终是完整 PlotSpec；Chart 不接管 Plot guide、label、composition 或 trace
- adapter / host 只负责 authoring、definition / dataset 注入和 runtime，不拥有 presentation defaults

完整 host 必须正式组装 Chart、Plot、FlexLayout 与 surface definitions。自动 React / Vanilla 混合嵌入等待 ADR-01 的 Kernel dependency assembly；完整 canvas 等待 ADR-02 的 Standard surface；公开空间访问等待 Core qualified selector。缺少任一 gate 时可以验证 owner-private content mapping，但不得公开最终 Chart composition。

## 架构验证

- 归属结论：title、caption、source 等语义归 Chart；通用布局 / surface 归 Standard；文本与空间底座归 Core
- 内部表达：现有 Core TextBlock + Standard FlexLayout 足以表达 content phase，不需要新 Chart layout IR
- 外部扩展：presentation 是闭合 ChartSpec 数据，不新增 registry；复杂组合继续沿 Standard 正式能力扩展
- 下游闭环：Chart presentation -> Standard composition -> Core IR / Scene -> renderer
- 空间透明：外层 slot identity 由 Chart 声明，Plot 内部 handle 继续由 Plot / Core 拥有并通过 qualified selector 委托访问
- capability 结论：content 组合现有能力；surface、自动 assembly 与 spatial delegation 分别下沉所属 owner 并作为公开 gate

## 被否决方案

- 把 presentation slots 写入 PlotSpec：会扩张 Plot 的长期职责
- adapter 用 DOM / CSS 外壳实现 title 或 canvas：会破坏 Vanilla、SSR、导出与 renderer parity
- Chart 自建 box solver、文字测量或 surface composite：会复制 Standard / Core 能力
- 开放任意 slot renderer / graphic：会建立第二套通用组合系统并破坏 JSON-safe IR

## 测试策略摘要

需要 schema、canonical mapping、Standard content integration、surface、inspection / spatial、trace 与 adapter parity 证据。关键不变量是六槽位顺序和 identity 稳定，slot token 与 local override 的 cascade 正确，缺省 presentation 不生成空 Flex，所有 content 进入同一 surface，Chart 包裹前后 Plot trace 连续，并在上游 gates 到位后三入口产生等价 canonical tree。

## 不在本 ADR 范围

- 任意 ReactNode、graphic 与 slot renderer
- toolbar、export、fullscreen、loading 与 dashboard linked state
- accessibility description 到宿主 DOM / renderer 的映射
- Kernel dependency assembly、Standard surface 或 Core selector 的具体 API 与实现

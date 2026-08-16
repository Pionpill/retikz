# ADR-10：Plot decoration 空间布局与 placement 策略

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-05 到 ADR-09 已经补齐 axis line、ticks、tick labels、title 和 grid 的局部 placement / layout 能力。当前 `axis.title.placement` 可以沿 axis baseline 使用 core `GeometryLabelPosition` 关键字或 `0..1` 比例，`title.layout` 也预留了 `reserveSpace`、`avoidTickLabels` 和 `overflow` 等策略。但这些能力仍停留在 axis 内部：它们无法统一解决图表总标题、subtitle、caption、source note、legend、facet header、track header、annotation text 与 axis guide 之间的空间竞争。

早期布局使用 margin convention 估算 plot area：按 axis、tick label 和 legend reserve 推导四边 margin。这个模型足够早期简单图，但长期风险明显：它只知道少数内置对象，把“占位”和“摆放”揉进 margin 估算，并容易让不同坐标系的局部规则漂移。

同类开源项目大多将 placement 与空间占位分层处理。Vega / Vega-Lite 让 axis、legend、title 通过 orient、anchor、offset、padding、minExtent / maxExtent 等字段参与布局；Chart.js 有全局 `layout.autoPadding`，可为可见元素自动留白；Highcharts 的 axis title 区分 `align`、`offset`、`margin` 和 `reserveSpace`；ECharts 的 grid / legend / title 多数通过 top/right/bottom/left 与 containLabel 协作，但复杂场景仍常需要用户手动调 grid；Matplotlib `constrained_layout` 会为 tick labels、axis labels、titles、legends、colorbars 等 decoration 自动预留空间。

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Vega-Lite title](https://vega.github.io/vega-lite/docs/title.html)、[Chart.js layout](https://www.chartjs.org/docs/latest/configuration/layout.html)、[Chart.js scale title](https://www.chartjs.org/docs/latest/axes/labelling.html)、[Highcharts axis title](https://api.highcharts.com/highcharts/xAxis.title)、[ECharts axis](https://apache.github.io/echarts-handbook/en/concepts/axis/)、[Matplotlib constrained layout](https://matplotlib.org/stable/users/explain/axes/constrainedlayout_guide.html)。

## 决策：统一 decoration 占位与定位

Plot 新增全局 decoration layout 模型。公开 IRPlot 只暴露 JSON-safe 的 `layout` 和 `labels`；guide、legend、axis title、facet / track header 等已有槽位不搬家，但统一参与确定性的测量、占位、定位与避让。布局不负责决定 axis tick source、scale domain、legend 数据项或 mark 几何。

```ts
type PlotLayout = {
  mode?: 'auto' | 'fixed';
  autoPadding?: boolean;
  padding?: BoxPadding;
  maxIterations?: number;
  collision?: {
    strategy?: 'none' | 'shift' | 'hide';
    padding?: number;
  };
};

type PlotLabel = {
  type: 'text';
  id?: string;
  role?: 'title' | 'caption' | 'note' | 'source' | 'custom';
  text: TextBlock;
  placement?: LayoutPlacement;
  reserveSpace?: boolean;
  priority?: number;
  overflow?: 'allow' | 'hide' | 'flush' | 'shift' | 'ellipsis';
} & GuideTextStyle;

type LayoutPlacement =
  | {
      kind: 'side';
      target?: 'frame' | 'plotArea' | 'view';
      view?: string;
      side: 'top' | 'right' | 'bottom' | 'left';
      placement?: GeometryLabelPositionValue | number;
      padding?: number;
      shift?: { along?: number; normal?: number };
      anchor?: 'auto' | 'start' | 'center' | 'end';
    }
  | {
      kind: 'point';
      target?: 'frame' | 'plotArea' | 'view';
      view?: string;
      x: number;
      y: number;
      anchor?: 'auto' | 'start' | 'center' | 'end';
    };
```

语义固定如下：

- `IRPlot.layout` 是全局空间布局策略。`mode:'auto'` 表示 decoration 参与自动占位与避让；`mode:'fixed'` 表示只使用显式 `padding` / `margin` 类输入，不根据 decoration 反向收缩 plot area。省略时默认 `auto`。
- `layout.autoPadding` 控制 visible decoration 是否能自动扩大外侧 padding。省略为 `true`；设为 `false` 时仍会定位 decoration，但不会因为 decoration 自动改变 plot area。
- `layout.padding` 替代零散 margin override，作为 frame 到可用布局区域的外层留白。已有 `composition.spacing.padding` 保留为 composition 内部 spacing，不能承担整图 title / caption 的外层占位。
- `layout.maxIterations` 限制 layout solver 的稳定迭代次数，默认 `3`。实现必须确定性运行，不能依赖 renderer 回调、DOM 测量或随机数。
- `layout.collision` 只处理 decoration 之间的剩余冲突。默认先 shift，失败后按低优先级 hide；精确出版用户可以设为 `{ strategy:'none' }`。
- `labels` 放静态整图文案：title、caption、note、source。它们不绑定 scale 或 datum。axis title / tick label 继续放 guide；legend title 继续放 legend；数据标签继续放 mark；带数据锚点、leader line、callout 的注释后续放 annotation，不塞进 `labels`。
- `LayoutPlacement.kind:'side'` 表示沿某个矩形边放置，`placement` 复用 core `GeometryLabelPosition` 或 `0..1` 比例。这个模型覆盖 plot title、caption、source note、legend side band 和普通外侧文案。
- `LayoutPlacement.kind:'point'` 表示不参与边带栈排的绝对比例定位。`x/y` 是目标 frame 内的归一化比例，适合水印、角标或用户精确摆放的说明文字；默认 `reserveSpace:false`。
- axis title 不新增另一套 placement 关键字。它继续使用 ADR-08 的 `title.placement`，并与 plot title、legend、caption 一起参与空间求解。

布局按 target 与 side 稳定栈排，先预留 side band，再在不超过 `maxIterations` 的范围内更新 plot area 与 decoration。剩余 overlay 冲突按 `priority` 应用 shift / hide / overflow；默认优先级从 plot title、subtitle、caption/source、legend、axis title、tick labels 到 custom note 与 watermark 递减。

理由：

1. 所有可见 decoration 共享位置、占位与优先级语义，避免各模块继续手写 margin。
2. 公开 schema 保持 JSON-safe；测量和 placement 都在 plot lowering 内部完成，不把函数、DOM、renderer 对象放进 IR。
3. `side + placement` 复用 core path label 的关键字心智模型，同时比单纯 `top/right/bottom/left` 更能表达沿边的起点、终点和比例位置。
4. 文案按所有权放置：scale-bound 归 guide，datum-bound 归 mark / annotation，plot-level static text 归 labels，避免 `guide` 成为所有文本的垃圾桶。
5. 分阶段边带布局比通用 constraint solver 更可测、更确定，也更适合当前 alpha 阶段的实现复杂度。

## 不在本 ADR 范围

- renderer 真实文本测量。当前仍用 deterministic estimate；未来可加 compile option measurement hook，但不能进入 IR。
- 文本 ellipsis / wrap 的完整排版算法；当前只承诺 `hide` / `flush` / `shift` 子集。
- 数据绑定 annotation、leader line、pin、callout、connector。
- legend item 的自动换行、分栏、滚动。
- 通用 layer / z-index / draw order。本 ADR 只处理空间布局；绘制顺序仍按现有 guide / mark 规则或后续 layer ADR 处理。
- HTML / DOM overlay 文案。
- chart preset 默认规则。preset 可消费本 IRPlot 能力，但不在本 ADR 实现。

---

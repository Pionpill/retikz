# ADR-08：Axis title 布局与锚点策略

- 状态：Accepted（已实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 axis title 放进独立 `title` 槽位。ADR-05 又补充了 `title.placement` 与 `title.orientation`，让数学坐标系可以把 x / y 标题放到轴线正方向端点，并允许 y 标题保持正向水平显示。

当前 `AxisTitleSchema` 仍有几处长期风险。第一，`AxisTitlePlacementSchema` 在 plot 内复制了一套 `at-start`、`near-start`、`midway`、`near-end`、`at-end` 等关键字，而 core path label 已有同一套 `GeometryLabelPosition` 关键字和比例心智模型。重复维护会让 axis title 与 path label 的位置语义漂移。第二，`title.gap` 表达的是标题相对 tick label band / axis label band 的外侧留白，和 Vega `titlePadding`、Chart.js scale title `padding` 更接近；继续叫 `gap` 容易和 guide 内部组件之间的 gap、legend entry gap 混淆。第三，端点标题、旋转标题和多行标题需要更明确的锚点与偏移能力，仅靠 `anchor: string` 不足以稳定表达。

同类图表库通常把轴标题拆成位置、旋转、间距、锚点和布局策略。Vega axis 提供 `titleAnchor`、`titleAlign`、`titleBaseline`、`titleAngle`、`titlePadding`、`titleLimit`、`titleX`、`titleY`；Highcharts axis title 提供 `align`、`rotation`、`margin`、`offset`、`reserveSpace`、`x`、`y`；Chart.js scale title 提供 `align`、`padding`、`font`；Observable Plot axis label 提供 `labelAnchor`、`labelArrow`、`labelOffset`。retikz 不应照搬这些命名，但需要覆盖同一类能力。

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Highcharts axis title](https://api.highcharts.com/highcharts/xAxis.title)、[Chart.js labelling axes](https://www.chartjs.org/docs/latest/axes/labelling.html)、[Observable Plot axes](https://observablehq.com/plot/features/axes)。

## 决策：title 采用 core position、padding、shift、anchor 与 layout 分层

`AxisTitleSchema` 调整为五类字段：文本内容、外侧留白、沿轴位置、方向/旋转、锚点/偏移/布局。`placement` 字段名保留，但关键字来源改为复用 core 的 `GeometryLabelPosition`；`gap` 破坏性改名为 `padding`；新增 `shift`、结构化 `anchor` 和 `layout`。

```ts
import { GeometryLabelPosition } from '@retikz/core';
import type { GeometryLabelPositionValue } from '@retikz/core';

type AxisTitlePlacement = GeometryLabelPositionValue | number;

type AxisTitleAnchor =
  | 'auto'
  | 'center'
  | 'start'
  | 'end'
  | {
      align?: 'start' | 'center' | 'end';
      baseline?: 'top' | 'middle' | 'bottom';
    };

type AxisTitleShift = {
  along?: number;
  normal?: number;
};

type AxisTitleLayout =
  | false
  | {
      reserveSpace?: boolean;
      avoidTickLabels?: boolean;
      avoidLineMarks?: boolean;
      overflow?: 'allow' | 'hide' | 'flush';
    };

type AxisTitle = {
  text: TextBlock;
  padding?: number;
  placement?: AxisTitlePlacement;
  orientation?: 'auto' | 'horizontal' | 'axis';
  rotate?: number;
  anchor?: AxisTitleAnchor;
  shift?: AxisTitleShift;
  layout?: AxisTitleLayout;
} & GuideTextStyle;
```

语义固定如下：

- `placement`：沿 axis baseline 从 negative 到 positive 方向采样。关键字直接复用 core `GeometryLabelPosition`，数值继续表示 `0..1` 比例。字段仍叫 `placement`，因为它描述 axis title 放在轴线上的位置；不改成 `position`，避免破坏现有 axis guide 语义层次。
- `padding`：标题中心相对 tick label band 外缘的法线距离。默认值沿用现有内置常量；`0` 表示贴近 tick label band，不表示 title 文本内部 padding。
- `orientation`：语义旋转策略，继续支持 `auto`、`horizontal`、`axis`。显式 `rotate` 仍是低层 escape hatch，优先级高于 `orientation`。
- `anchor`：结构化文本锚点。`auto` 由 lowering 按 side、placement、orientation 推导；`start/end/center` 是沿轴方向的快捷锚点；对象形态允许明确文本水平对齐和基线。
- `shift`：相对最终锚点的微调。`along` 沿轴切向，正方向为 axis positive；`normal` 沿标题所在侧外法线，正方向远离轴线。它比裸 `x/y` 更适合 cartesian、polar、ternary 和 custom axis 复用。
- `layout`：标题自动布局策略。`false` 关闭自动预留和避让；省略时使用内置默认，至少保留现有 padding 估算，并允许后续实现避让 tick labels 与 line arrow / endpoint marks。

理由：

1. 复用 core `GeometryLabelPosition` 能让 path label、mark label 和 axis title 使用同一套位置关键字，减少重复常量和映射表。
2. `padding` 更贴近主流图表库对 axis title 外侧留白的命名，也能和 legend entry gap、swatch gap 区分。
3. `shift.along/normal` 比 `x/y` 更符合坐标轴语义，非笛卡尔坐标也能沿局部切向和法向解释。
4. 结构化 `anchor` 让端点标题、旋转标题和多行标题的对齐方式可预测，不再依赖自由字符串。
5. `layout` 把自动避让做成显式策略，chart preset 可以组合默认规则，底层 guide 不需要写死某个截图场景。

## 实现记录

- `title.gap` 已破坏性替换为 `title.padding`，guide local 与 theme axis title 都不再接收 `gap`。
- `title.placement` 的 schema 直接复用 core `GeometryLabelPosition`，plot 导出的 `AxisTitlePlacementKeyword` 也改为 core 常量别名。
- `title.shift.along/normal` 已在 cartesian、polar angular、polar radial、ternary 和 custom axis lowering 中按局部切向 / 外法线解释。
- `title.anchor.align` 已下沉为 core Node 现有的 `align`；`anchor.baseline` 先作为 schema 级契约保留，等待 core Node 暴露文本基线能力后再完整下沉。
- `title.layout` 已进入 schema，当前 lowering 仍沿用既有 padding / label band 估算，后续避让 arrow endpoint、旋转 tick label band 和 title overflow 时复用该字段。

## 不在本 ADR 范围

- Observable Plot 风格的 `labelArrow` / 方向箭头。
- axis title ellipsis、wrap、text truncation。
- renderer 真实文本测量。
- title 背景、边框、leader line、pin。
- chart preset 默认规则；后续 chart 可以消费本 PlotSpec 能力。
- 修改 core `GeometryLabelPosition` 的关键字集合。

---

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/08-axis-title-layout.md`。

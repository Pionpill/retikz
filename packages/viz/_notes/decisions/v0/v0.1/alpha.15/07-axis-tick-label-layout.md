# ADR-07：Axis tick label 自适应布局

- 状态：Accepted（已实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 axis label 放进 `tickLabels` 槽位，当前 `AxisTickLabelsSchema` 支持 `format`、`gap`、`rotate`、`anchor` 与文本样式。它能表达固定旋转和基础样式，但没有自适应布局：x 轴类目过多或时间标签较长时，label 会重叠；y 轴 tick 过密时，label 也可能互相覆盖。

ADR-06 处理的是 ticks 本身：候选 tick source、visible tick density、tick mark 形态。tick label 的避让不能回头改写 tick set，否则 grid、tick mark 和 label 会失去同源关系。因此本 ADR 只处理 label node 的布局与可见性，不改变 ticks、grid 或 tick mark。

同类库大多把 axis label 视为独立能力。Vega / Vega-Lite 提供固定角度、label bound、flush、overlap 策略和 label limit；Observable Plot 提供 `tickRotate`，并把 axis label 看作 text mark 组合；ECharts 的 FAQ 推荐通过 `axisLabel.interval` 和 `axisLabel.rotate` 处理空间不足；Highcharts 有 `autoRotation`，会先旋转再移除部分 label；Chart.js 有 `autoSkip`、`minRotation`、`maxRotation`、`sampleSize` 和 `maxTicksLimit`；G2 提供 transform / `labelAutoRotate` / `labelAutoHide` / `labelAutoEllipsis` / `labelAutoWrap` 等能力。

| 能力 | Vega / Vega-Lite | Observable Plot | ECharts | Highcharts | Chart.js | G2 | retikz 处理 |
|---|---:|---:|---:|---:|---:|---:|---|
| 固定旋转 | `labelAngle` | `tickRotate` | `axisLabel.rotate` | labels rotation | `minRotation/maxRotation` | `labelTransform` / rotate transform | 已有 `rotate`，保留 |
| 自动旋转 | 间接通过配置 / 编译默认 | 无显式自动 | FAQ 倾向手动 rotate | `autoRotation` | 自动旋转到 `maxRotation` | `labelAutoRotate` | 新增 |
| 自动省略 / 隐藏 | `labelOverlap` parity / greedy | 主要靠 ticks / spacing | `axisLabel.interval` | autoRotation 后会删部分 label | `autoSkip` | `labelAutoHide` | 新增 |
| 首尾保留 | `labelFlush` / bound 相关 | 手动 | `showMinLabel/showMaxLabel` | 自动 | `includeBounds` | keepHeader / keepTail | 新增 |
| 边界溢出 | `labelBound` / `labelFlush` | margins / text mark | overflow 类配置 | overflow justify/remove | labelOffset 注明会裁剪风险 | transform | 新增简化版 |
| 省略号 / 换行 | `labelLimit` | text `lineWidth` 可 wrap | overflow / width 类配置 | wrap by disabling autoRotation | 无通用自动换行 | autoEllipsis / autoWrap | 延后，不在本 ADR |
| 函数 formatter / 表达式 | `labelExpr` | `tickFormat` 可函数 | formatter 可函数 | formatter | callback | labelFormatter 可函数 | 不进 PlotSpec IR |

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Vega-Lite axis](https://vega.github.io/vega-lite/docs/axis.html)、[Observable Plot axis mark](https://observablehq.com/plot/marks/axis)、[ECharts axisLabel changelog](https://echarts.apache.org/zh/changelog.html)、[Highcharts axis labels autoRotation](https://api.highcharts.com/highcharts/xAxis.labels.autoRotation)、[Chart.js common tick options](https://www.chartjs.org/docs/latest/axes/cartesian/_common_ticks.html)、[G2 axis](https://g2.antv.antgroup.com/en/manual/component/axis)。

## 决策：tickLabels 增加 layout 策略

`AxisTickLabelsSchema` 新增 `layout` 字段，专门描述 tick label 的自适应旋转、重叠省略和边界处理。已有 `rotate` 保留为固定旋转 shorthand，并且优先级高于 `layout.rotate`。

```ts
type AxisTickLabelLayout =
  | false
  | {
      rotate?: false | AxisTickLabelAutoRotate;
      hide?: false | AxisTickLabelAutoHide;
      bounds?: false | AxisTickLabelBounds;
      sampleSize?: number;
    };

type AxisTickLabelAutoRotate = {
  angles?: Array<number>;
  recoverWhenFailed?: boolean;
};

type AxisTickLabelAutoHide = {
  strategy?: 'greedy' | 'parity';
  preserveEnds?: boolean;
  separation?: number;
};

type AxisTickLabelBounds = {
  overflow?: 'allow' | 'hide' | 'flush';
  tolerance?: number;
};
```

默认策略：

- `tickLabels: false` 仍表示不渲染 tick labels。
- `tickLabels.layout: false` 表示不做自适应旋转、不做重叠省略、不做边界处理；所有 label 按固定 `rotate` 或 0 渲染。
- `tickLabels.layout` 省略时，使用内置默认：
  - top / bottom x axis：先尝试 `[0, -30, -45, -60, -90]`，再按 greedy 省略。
  - left / right y axis：不自动旋转，必要时按 greedy 省略。
  - polar / ternary / custom axis：本 ADR 只要求支持 `hide`；自动旋转可先 fail-soft 为 0，后续 coordinate-specific ADR 再细化。
- 用户显式写 `rotate` 时，认为用户要固定角度，自动旋转跳过；`layout.hide` 与 `layout.bounds` 仍可继续生效。
- 用户要“始终不旋转、不省略”时写：

```ts
tickLabels: {
  rotate: 0,
  layout: false,
}
```

`layout.rotate`：

- `false` 表示禁用自动旋转。
- 省略 `angles` 时使用当前 axis side 的内置候选角度。
- `recoverWhenFailed: true` 表示候选角度都无法避免重叠时回退到原始角度，再交给 `hide`；省略为 `true`。

`layout.hide`：

- `false` 表示禁用自动省略，所有 label 都保留。
- `strategy: 'greedy'` 表示沿 axis tick 顺序线性扫描，保留不与上一个可见 label 重叠的 label。
- `strategy: 'parity'` 表示优先隔一个隐藏一个，仍不够时继续按 2 的幂扩大步长。
- `preserveEnds` 省略为 `true`，优先保留首尾 label；首尾和邻近 label 冲突时，保留首尾并隐藏邻近 label。
- `separation` 是 label bounding box 之间的最小间隔，单位为 plot user units，省略为 0。

`layout.bounds`：

- `overflow: 'allow'` 不处理轴范围外溢出。
- `overflow: 'hide'` 隐藏超出 axis baseline 可见范围超过 `tolerance` 的 label。
- `overflow: 'flush'` 对首尾附近 label 做边缘对齐，减少被裁剪概率。
- `tolerance` 省略为 1。

自适应布局使用 plot 现有文本估算能力，例如 `estimateLabelWidth` 与 font size。它不是 renderer 真实测量，不承诺像浏览器排版一样精确；但它必须确定性、JSON-safe、与 SVG / Canvas renderer 无关。未来如果 core 提供稳定 text measurement，可在不改 PlotSpec 的前提下替换内部测量。

Theme 可以给 `tickLabels.layout` 提供视觉默认，但不能把 `tickLabels.format`、label 文本内容或 tick source 放进 theme。局部 guide 的 `tickLabels.layout` 覆盖 theme。

理由：

1. `rotate`、`hide`、`bounds` 是三个独立策略，分开放能表达“只旋转不省略”“只省略不旋转”“完全不避让”等常见需求。
2. label 避让只影响 label nodes，不改变 visible tick set，保持 ADR-06 的 tick mark / grid 同源语义。
3. `layout: false` 给用户一个清晰总开关，避免默认智能行为在精确排版场景里产生意外。
4. 固定 `rotate` 继续保留，兼容现有 schema，并让用户能强制 0 / 45 / 90 等角度。
5. 暂不做 ellipsis / wrap，避免在没有真实文本测量和文本截断契约时把问题扩大。

## 实现补充：旋转标签端点对齐

实现后补充一个布局细节：cartesian tick label 发生旋转时，不能只改变 bbox 估算，还需要把文字节点沿 tick 外侧法线外移到旋转后端点对齐的位置，否则竖排长标签的中心仍靠近轴线，视觉上会压到或穿过 baseline。

最终顺序固定为：

1. 生成原始 tick label node。
2. 计算固定 rotate 或 auto rotate。
3. 在 cartesian axis 上按 tick 外侧法线执行旋转标签端点对齐。
4. 再执行 `layout.hide` 的重叠隐藏。
5. 最后执行 `layout.bounds` 的边界 flush / hide。

`layout:false` 仍表示关闭自动旋转、隐藏和边界处理，但如果用户显式写了 `tickLabels.rotate`，固定旋转会继续生效，并同样使用端点对齐。非 cartesian axis 没有传入 `sideNormal`，因此端点对齐保持 no-op；单个 tick label 也不能因为无需避让而跳过 fixed rotate。

## 待决策点

无。ellipsis、wrap、真实 renderer text measurement 和 label event / interaction 不在本 ADR 内。

## DSL 表面

默认自适应：

```tsx
<Axis
  dimension="x"
  ticks={{ interval: { kind: 'category', step: 1 } }}
  tickLabels={{
    layout: {
      rotate: { angles: [0, -30, -45, -60, -90] },
      hide: { strategy: 'greedy', preserveEnds: true, separation: 4 },
      bounds: { overflow: 'flush' },
    },
  }}
/>
```

始终不旋转、不省略：

```tsx
<Axis
  dimension="x"
  tickLabels={{
    rotate: 0,
    layout: false,
  }}
/>
```

只允许旋转，不允许省略：

```tsx
<Axis
  dimension="x"
  tickLabels={{
    layout: {
      rotate: { angles: [0, -45, -90] },
      hide: false,
      bounds: { overflow: 'allow' },
    },
  }}
/>
```

只省略，不旋转：

```tsx
<Axis
  dimension="x"
  tickLabels={{
    layout: {
      rotate: false,
      hide: { strategy: 'parity', preserveEnds: true },
    },
  }}
/>
```

Vanilla builder 暴露同名 plain object；所有字段必须 JSON-safe，不接受函数、ReactNode、DOM 节点或 renderer 对象。

## 测试设计

`packages/viz/plot/tests/ir/guide.schema.test.ts` 覆盖 schema accept / reject。

`packages/viz/plot/tests/features/guide/guide.test.ts` 覆盖 cartesian lowering 中 label rotate / hide / bounds 的 IR 输出。

`packages/viz/plot/tests/theme/theme.test.ts` 覆盖 theme tick label layout 默认与 local override 优先级。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `AxisTickLabelsSchema` 增加 `layout`。
- `tickLabels.rotate` 继续保留；存在时禁用 auto rotate，但不禁用 auto hide / bounds。
- guide lowering 需要在生成 label nodes 前先计算 label layout plan：候选 rotation、label box、可见性、flush 对齐。
- `tickLabels.layout.hide` 只隐藏 label nodes，不改变 ticks、grid 或 tick mark。
- theme schema / resolver 允许 `theme.axis.tickLabels.layout`，但不允许 theme 提供 `format` 或 tick source。
- docs 需要补充默认自适应、关闭自适应、只旋转、只省略的 demo。
- 不触碰 core IR；仍 lowering 到 core Node 的 `rotate`、`position`、文本样式字段。

## 不在本 ADR 范围

- ellipsis / wrap / text truncation。
- renderer 真实文本测量。
- tick source / tick density / tick mark；由 ADR-06 处理。
- label formatter 函数或表达式。
- interaction state，例如 hover / selected label。
- label 背景、描边、pin / leader line。
- chart preset；后续 chart 可消费本 PlotSpec 能力。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot guide schema、theme schema 边界和 guide lowering；不改 core IR、不改 package 公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisTickLabelHideStrategy` | `{ Greedy:'greedy', Parity:'parity' }` | `greedy` | tick label 重叠省略策略 |
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisTickLabelOverflow` | `{ Allow:'allow', Hide:'hide', Flush:'flush' }` | `flush` | tick label 超出轴范围时的处理 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickLabelAutoRotateSchema` | `{ angles?: number[]; recoverWhenFailed?: boolean }` | side-aware 内置角度；true | 自动旋转候选角度 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickLabelAutoHideSchema` | `{ strategy?: enum; preserveEnds?: boolean; separation?: number }` | greedy；true；0 | 自动隐藏重叠 label |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickLabelBoundsSchema` | `{ overflow?: enum; tolerance?: number }` | flush；1 | 边界外溢处理 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTickLabelLayoutSchema` | `z.union([z.literal(false), z.object({ rotate?, hide?, bounds?, sampleSize? })])` | side-aware auto | tick label 自适应布局策略 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTickLabelsSchema.layout` | `AxisTickLabelLayoutSchema.optional()` | 内置默认自适应 | label 自适应旋转、省略、边界处理 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 改 | `ThemeAxisTickLabelsSchema.layout` | `AxisTickLabelLayoutSchema.optional()` | 内置默认自适应 | theme 级 tick label layout 默认；不接收 format |

refinement：

- `angles` 非空时每个角度必须 finite。
- `separation` / `tolerance` / `sampleSize` 必须非负；`sampleSize` 若出现必须为正整数。
- `layout: false` 合法，表示关闭所有自动布局策略。
- `rotate: false` / `hide: false` / `bounds: false` 合法，分别关闭对应策略。
- `tickLabels.rotate` 与 `layout.rotate` 同时出现时 schema 不拒绝，但 lowering 必须以 `tickLabels.rotate` 为准，并忽略 `layout.rotate`。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/guide/constants.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/theme/schema.ts`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/src/shared/layout.ts`
- `packages/viz/plot/tests/ir/guide.schema.test.ts`
- `packages/viz/plot/tests/features/guide/**`
- `packages/viz/plot/tests/theme/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/grammar/guide/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `auto rotate chooses first non-overlapping angle`：x axis label 初始重叠，候选角度中 `-45` 可避让 → label nodes 带 `rotate: -45`。
- `fixed rotate overrides auto rotate`：`tickLabels.rotate: 0` + `layout.rotate.angles: [-45]` → label nodes 使用 0。
- `greedy hide removes overlapping labels`：禁用 rotate、启用 greedy hide → 只保留不重叠 label。
- `parity hide removes every other label first`：启用 parity → 第一轮按奇偶省略。
- `flush aligns edge labels`：`bounds.overflow: 'flush'` → 首尾 label anchor / position 调整到轴范围内。
- `layout false preserves all labels`：`layout:false` + `rotate:0` → 所有 label nodes 都输出，不自动隐藏。

**边界**：

- `hide false keeps labels after rotation failure`：旋转失败且 `hide:false` → label 全部保留。
- `preserveEnds keeps first and last labels`：省略时首尾 label 保留，邻近冲突 label 被隐藏。
- `bounds hide removes out-of-range labels`：`overflow:'hide'` → 超出 tolerance 的首尾 label 被隐藏。
- `y axis default does not auto rotate`：y axis 省略 layout → 不自动旋转，只按 hide 处理重叠。
- `sampleSize limits measurement scan`：`sampleSize` 小于 label 数时，只按样本估算角度，输出仍确定。

**错误路径**：

- `empty auto rotate angles rejected`：`angles: []` schema 拒绝。
- `negative separation rejected`：`separation < 0` schema 拒绝。
- `negative tolerance rejected`：`tolerance < 0` schema 拒绝。
- `invalid hide strategy rejected`：非 `greedy/parity` schema 拒绝。
- `theme tickLabels format rejected`：theme 仍不接受 `tickLabels.format`。

**交互**：

- `tick label hiding does not change grid or tick mark count`：label hide 后 grid / tick mark 仍按 ADR-06 visible tick set 输出。
- `theme layout is overridden by local layout`：theme 开 auto hide，local `layout:false` → local 生效。
- `origin axis respects tickSide before label layout`：ADR-05 origin axis 的 `tickSide` 决定 label 基础方向，再应用 layout。
- `custom coordinate supports hide but not auto rotate`：custom axis 启用 hide 可工作；auto rotate 暂 fail-soft 为 0。

### 依赖的现有元素

- `AxisTickLabelsSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——新增 layout 策略。
- `GuideTextStyleSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——继续提供 font、textColor、lineHeight、maxTextWidth 等文本样式。
- `PlotAxisThemeSchema`（`packages/viz/plot/src/schemas/theme/schema.ts`）——允许 tick label layout 默认，继续拒绝 format。
- `estimateLabelWidth` / `AXIS_LABEL_GAP`（`packages/viz/plot/src/shared/layout.ts`）——作为 label box 估算基础。
- `lowerGuide` / `lowerCartesianGuide` / polar / ternary / custom guide lowering（`packages/viz/plot/src/pipeline/guide/guide.ts`）——生成 label layout plan 并输出 core Node。
- `IRNode.rotate` / `IRNode.position` / text style fields（`@retikz/core`）——layout 的 lowering 目标。

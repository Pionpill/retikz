# ADR-07：Axis tick label 自适应布局

- 状态：Accepted（已实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

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

## 不在本 ADR 范围

- ellipsis / wrap / text truncation。
- renderer 真实文本测量。
- tick source / tick density / tick mark；由 ADR-06 处理。
- label formatter 函数或表达式。
- interaction state，例如 hover / selected label。
- label 背景、描边、pin / leader line。
- chart preset；后续 chart 可消费本 PlotSpec 能力。

---

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/07-axis-tick-label-layout.md`。

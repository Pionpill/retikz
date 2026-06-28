# ADR-05：stat-geom structural surface + docs

状态：Proposed
决策日期：2026-06-28
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [alpha.13 ADR-02 quantile-band statistics + boxplot composition](./02-quantile-band-boxplot.md) · [alpha.13 ADR-03 density transform](./03-density-transform.md) · [alpha.13 ADR-04 smooth transform](./04-smooth-regression.md) · [alpha.12 ADR-16 Statistical transform algebra](../alpha.12/16-statistical-transform-algebra.md) · [plot-design.md §13.1](../../../../../architecture/plot-design.md)

## 背景

alpha.13 已经把三条高级统计薄片分别落到 transform / reducer / selector 层：

1. ADR-02 让 `quantile-band` reducer 与 `outside-quantile-band` selector 能表达 boxplot 所需的 summary rows 与 outside source rows。
2. ADR-03 让 `density` transform 生成 KDE 采样 rows，再由 `PathMark` curve / baseline closure 消费。
3. ADR-04 让 `smooth` transform 生成 linear regression 预测 rows，再由 `PathMark` 消费。

这三条能力的共同点是：统计先产生 plain rows，几何只由抽象 mark 消费 rows。它们不需要 `BoxPlotMark`、`DensityMark`、`RegressionMark`，也不需要 v0.1 阶段的 chart preset。现在缺的是收束面：用户和后续维护者需要在 React / Vanilla / docs 三处看到同一条结构，而不是每条统计能力各自散在不同页面、不同 demo 名和不同测试习惯里。

如果本 ADR 趁机新增 `<BoxPlot>`、`<DensityPlot>`、`<RegressionPlot>` 或 named data view，会把 alpha.13 从底层 grammar 验收扩成 chart API 设计。chart preset 的职责是减少用户样板；本 milestone 的职责是证明底层语法足够表达真实图表，并且 React / Vanilla 都只是薄适配同一份 PlotSpec。

因此 ADR-05 不新增统计字段、不改 transform schema、不引入 chart-level helper。它只把已有能力整理成结构性 surface：文档把“stat 是 transform，geom 是 abstract mark”讲清楚；demo 命名和示例代码保持三条薄片一致；测试用同一组组合验收防止后续有人把统计重新塞进 mark lowering。

## 决策：用 docs + equivalence tests 收束 stat-geom 结构，不新增 chart preset

ADR-05 将 alpha.13 的统计主线收束为一组结构性约定：

1. **React surface** 继续使用 `<Transform>`、mark-local `transform` 与现有 abstract marks。不得新增 `<BoxPlot>`、`<DensityPlot>`、`<RegressionPlot>`、`<SmoothLine>` 之类 chart component；也不得在 `PointMark` / `PathMark` / `IntervalMark` 中新增统计快捷 props。
2. **Vanilla surface** 继续使用 `renderPlot(spec, datasets, options)` 消费同一 PlotSpec。不得新增 vanilla-only builder 或 helper；docs 可展示 PlotSpec 片段，但示例语义必须能与 React demo 一一对应。
3. **Docs information architecture** 以 transform 心智模型组织：`graph/grammar/transform` 讲数据视图管线，`summary` 讲会改变粒度的统计 rows，`statistics` 作为 reducer / selector / full transform 的字段参考。boxplot / density / smooth 都要明确写成“统计 transform + 抽象 mark 组合”。
4. **Demo 命名** 使用 `transform-boxplot`、`transform-density`、`transform-smooth`。boxplot demo 放在 `summary` 章节；density / smooth demo 保持在 `statistics` 章节，并在 `summary` / `transform` 首页互链到同一 mental model。
5. **测试收束** 新增或补强一组 composition/equivalence 测试，覆盖三条薄片都没有新增专用 mark，React 产物与手写 PlotSpec 等价，Vanilla SSR 能消费同一 spec。

推荐的三个底层组合如下：

```tsx
// boxplot：summary rows + outside source rows
<Plot data={samples}>
  <IntervalMark
    x="boxX"
    y="boxHigh"
    bounds={{ y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' } }}
    transform={[boxSummary]}
  />
  <ReferenceMark y="median" extentField="boxX0" extentToField="boxX1" transform={[boxSummary]} />
  <ReferenceMark x="boxX" extentField="whiskerMin" extentToField="whiskerMax" transform={[boxSummary]} />
  <PointMark x="boxX" y="value" transform={[outsideBoxRows]} />
</Plot>

// density area：KDE rows + PathMark baseline closure
<PathMark
  x="densityX"
  y="density"
  series="group"
  order="densityX"
  closure={{ kind: 'baseline', baseline: 0 }}
  transform={[densityTransform]}
/>

// regression path：smooth rows + PathMark
<PathMark
  x="trendX"
  y="trendY"
  series="series"
  order="trendX"
  transform={[smoothTransform]}
/>
```

这里的示例是结构种子，不是最终 chart preset 设计。boxplot 的 exact geometry 可以按现有 `IntervalMark` / `ReferenceMark` public surface 调整，但下游实现不得引入新的 boxplot-specific schema 字段来绕开 abstract mark。

理由：

1. 这能把 alpha.13 的主要架构承诺落成可阅读、可测试、可回归的结构，而不是只停在三个 isolated transform。
2. 不新增 chart preset，可以保持 v0.1-alpha 的底层 grammar 边界；v0.2 若要 chart package，可在已验证的 PlotSpec 组合上包便利 API。
3. React / Vanilla 都围绕同一份 PlotSpec 验收，能防止一套 authoring surface 比另一套多出隐藏语义。
4. Docs 直接展示 transform rows 被 mark 消费，符合 AI 友好设计：LLM 看到字段名、transform 输出和 mark encoding 后，可以稳定生成 / 修改同类 spec。

## 待决策点

- **是否新增独立 stat-geom 概念页**：倾向不新增页面，先在 `transform/index`、`transform/summary`、`transform/statistics` 三处串起 mental model。若文档写作时发现 summary 页面过长，可回本 ADR 增加 `transform/stat-geom` 子页，但仍不新增 API。
- **boxplot demo 的 reference 表达**：倾向用现有 `ReferenceMark` 表达 median / whisker / cap；如果当前 `ReferenceMark` public surface 无法优雅表达须帽，允许先做最小 whisker line，不为了 demo 新增 boxplot-only 字段。
- **density / smooth 是否搬到 summary 页**：倾向保留完整字段表在 `statistics`，`summary` 只给短解释与链接。这样 `statistics` 继续是统计子算子的 reference，`summary` 继续是“输出 row 粒度”的教学页。
- **React 示例是否使用 `<Transform>` 子组件还是 mark-local `transform` prop**：三条薄片都应至少出现一次 mark-local transform，强调不同 mark 可消费不同 data view；root `<Transform>` 只作为补充说明。

## DSL 表面

React 侧保持薄适配，示例表达的是 composition：

```tsx
const boxSummary = {
  kind: 'summarize',
  groupBy: ['group', 'boxX', 'boxX0', 'boxX1'],
  metrics: [
    {
      op: 'quantile-band',
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      outputs: {
        lower: 'boxLow',
        upper: 'boxHigh',
        points: [{ p: 0.5, as: 'median' }],
        whiskerMin: 'whiskerMin',
        whiskerMax: 'whiskerMax',
      },
      whisker: { kind: 'spread', factor: 1.5 },
    },
  ],
} as const;

const boxOutside = {
  kind: 'select',
  groupBy: ['group'],
  selector: {
    op: 'outside-quantile-band',
    field: 'value',
    lowerP: 0.25,
    upperP: 0.75,
    boundary: { kind: 'spread', factor: 1.5 },
  },
} as const;

<Plot data={samples}>
  <IntervalMark
    x="boxX"
    y="boxHigh"
    bounds={{ y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' } }}
    transform={[boxSummary]}
  />
  <ReferenceMark y="median" extentField="boxX0" extentToField="boxX1" transform={[boxSummary]} />
  <ReferenceMark x="boxX" extentField="whiskerMin" extentToField="whiskerMax" transform={[boxSummary]} />
  <PointMark x="boxX" y="value" transform={[boxOutside]} />
</Plot>;
```

Vanilla / PlotSpec 使用同一 operations：

```ts
renderPlot(
  {
    namespace: 'retikz.plot',
    type: 'plot',
    data: { reference: 'samples' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'interval',
        transform: [boxSummary],
        encoding: {
          x: { field: 'boxX', scale: 'x' },
          y: { field: 'boxHigh', scale: 'y' },
        },
        bounds: { y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' } },
      },
      {
        type: 'reference',
        transform: [boxSummary],
        encoding: {
          y: { field: 'median', scale: 'y' },
        },
        extentField: 'boxX0',
        extentToField: 'boxX1',
      },
      {
        type: 'point',
        transform: [boxOutside],
        encoding: {
          x: { field: 'boxX', scale: 'x' },
          y: { field: 'value', scale: 'y' },
        },
      },
    ],
  },
  { samples },
);
```

Docs 应在同一叙述里给出 density / smooth 的并列关系：它们不是 `PathMark` 的“曲线拟合模式”，而是先改 rows，再由 `PathMark` 连线或闭合填充。

## 测试设计

`packages/graph/plot/tests/lower/stat-geom-composition.test.ts` 覆盖 boxplot / density / smooth 三条组合 lowering，断言没有专用 mark 类型，统计 rows 由 transform 产生。

`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx` 补充 React composition tests，断言 `<Transform>` / mark-local `transform` 产物与手写 PlotSpec 等价，不新增 chart component。

`packages/graph/plot-vanilla/tests/render-plot.test.ts` 补充 vanilla SSR smoke，断言同一 PlotSpec 能渲染 boxplot / density area / regression path。

docs 验收放在 `apps/docs/src/contents/graph/grammar/transform/**`：新增 boxplot demo，补齐 transform index / summary / statistics 的双语叙述与链接。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- 对 `@retikz/plot` schema 无新增字段；本 ADR 只是验证 ADR-02/03/04 已有 schema 能组合成真实 stat-geom 图。
- 对 React / Vanilla public API 无新增能力；仅允许补测试、文档示例和必要注释。
- docs 会新增 boxplot demo，并调整 transform overview / summary / statistics 三处文字，让 density 与 smooth 同时进入“改变行粒度”的说明。
- 如果实现期发现某个组合无法用现有 abstract mark 表达，不得在本 ADR 下新增 chart preset；应回到对应 mark / reference ADR 重新设计，或在本 ADR 中明确该 demo 降级。

## 不在本 ADR 范围

- 不新增 `BoxPlotMark`、`DensityMark`、`RegressionMark`、`BoxPlot`、`DensityPlot`、`RegressionPlot`、`SmoothLine` 或任何 chart preset。
- 不新增 named data view、layer data binding、facet scoped dataset 或 transform result reuse cache。
- 不改 `quantile-band`、`density`、`smooth` 的 schema、默认值或算法。
- 不做 violin plot、ridgeline density、LOESS、多项式回归、confidence band。
- 不做 tooltip、hover highlight、自动 legend narration、自动 chart title。

---

## 实现契约（必填）

### Level

`green`

判级理由：本 ADR 不改 public schema、IR、lowering provider 或 adapter source；只允许新增 / 调整 docs 与测试，验证 ADR-02/03/04 已实现能力的结构性组合。若实现期需要修改 `packages/graph/plot/src/**` 或 `packages/graph/plot-react/src/**` 源码，必须回本 ADR 升级 level 并补 schema / scope / 测试契约。

### Schema 改动

无。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/tests/lower/stat-geom-composition.test.ts`
- `packages/graph/plot/tests/lower/boxplot-composition.test.ts`
- `packages/graph/plot/tests/lower/density-area-composition.test.ts`
- `packages/graph/plot/tests/lower/smooth-path-composition.test.ts`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`
- `apps/docs/src/contents/graph/grammar/transform/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/transform/summary/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/summary/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/transform/summary/transform-boxplot.demo.tsx`
- `apps/docs/src/contents/graph/grammar/transform/summary/transform-boxplot.data.ts`
- `apps/docs/src/contents/graph/grammar/transform/statistics/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-density.demo.tsx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-density.data.ts`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-smooth.demo.tsx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-smooth.data.ts`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。不得在本 ADR 下新增 runtime source 文件或 chart-level API。

### 测试象限

**Happy path（按 plot alpha.13 放宽口径，不硬凑 9，但要覆盖三条薄片）**：

- `stat-geom-boxplot-composition`：`quantile-band` summary rows + outside selector rows 被 `IntervalMark` / `ReferenceMark` / `PointMark` 消费，lowering 不新增 BoxPlotMark。
- `stat-geom-density-area-composition`：`density` rows 被 `PathMark closure={baseline}` 消费，输出闭合 area path。
- `stat-geom-smooth-path-composition`：`smooth` rows 被 `PathMark` 消费，输出 open trend path。
- `react-stat-geom-mark-local-transform`：React mark-local transform 可分别表达 boxplot summary layer、density layer、smooth layer。
- `vanilla-stat-geom-ssr`：Vanilla `renderPlot` 消费三条 stat-geom PlotSpec，均输出 SVG 几何元素。

**边界**：

- `stat-geom-raw-and-derived-layers`：同一 Plot 中原始 `PointMark` 与 mark-local density / smooth layer 共存，派生 rows 不污染原始 rows。
- `stat-geom-summary-and-outside-layers`：boxplot summary rows 与 outside source rows 分属不同 mark-local transform，不要求 named data view。
- `stat-geom-demo-imports`：新增 docs demo 的 data 文件与 demo 文件可被 docs 构建 / typecheck 引用。

**错误路径**：

- `stat-geom-no-chart-preset-imports`：docs / tests 不引入不存在的 `BoxPlot` / `DensityPlot` / `RegressionPlot` 组件。
- `stat-geom-no-special-mark-type`：composition lowering 结果中不出现 `boxplot` / `density` / `regression` 专用 mark type。
- `stat-geom-doc-links`：新增或修改的 transform docs 链接指向已存在页面，不产生断链。

**交互**：

- `react-plot-spec-equivalence`：React composition 产物与等价手写 PlotSpec 在 transform / mark 结构上相同。
- `vanilla-react-shared-spec`：Vanilla SSR 使用的 spec 与 React docs demo 的 transform / mark 字段命名一致。
- `strict-model-derived-fields`：boxplot / density / smooth 的派生字段继续不要求写入 model，输入字段仍由已有 transform field collection 校验。

### 依赖的现有元素

- `quantile-band` reducer（alpha.13 ADR-02，`packages/graph/plot/src/providers/statistics/**`）——引用；boxplot summary rows 的统计来源。
- `outside-quantile-band` selector（alpha.13 ADR-02，`packages/graph/plot/src/providers/statistics/**`）——引用；boxplot outside source rows 的选择来源。
- `density` transform（alpha.13 ADR-03，`packages/graph/plot/src/providers/transform/density.ts`）——引用；density area rows 的统计来源。
- `smooth` transform（alpha.13 ADR-04，`packages/graph/plot/src/providers/transform/smooth.ts`）——引用；regression path rows 的统计来源。
- `IntervalMark` / `ReferenceMark` / `PointMark` / `PathMark`（`packages/graph/plot/src/schemas/mark/**`）——引用；stat rows 的几何消费层。
- React `<Transform>` 与 mark-local `transform` prop（`packages/graph/plot-react/src/components/**`）——引用；结构性 authoring surface。
- Vanilla `renderPlot`（`packages/graph/plot-vanilla/src/render-plot.ts`）——引用；同一 PlotSpec 的 SSR surface。
- docs `ComponentPreview`（`apps/docs/src/components/**`）——引用；展示底层 composition demo。

### 多 LLM 设计评估

本 ADR 自评为 `green`，只收束 docs 与测试，不新增 public schema / runtime 行为；按 `develop-design` 规则可跳过多 LLM 设计评估。若后续实现期需要升级为 yellow / red，必须补独立设计评估并把采纳 / 拒绝结论并回本 ADR。

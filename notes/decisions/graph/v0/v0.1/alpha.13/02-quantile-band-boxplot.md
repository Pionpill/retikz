# ADR-02：quantile-band statistics + boxplot composition

状态：Proposed
决策日期：2026-06-27
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [alpha.12 ADR-16 Statistical transform algebra](../alpha.12/16-statistical-transform-algebra.md) · [alpha.12 ADR-06 transform registry](../alpha.12/06-transform-registry.md) · [plot transform docs](../../../../../../apps/docs/src/contents/graph/grammar/transform/index.zh.mdx) · [plot-design.md §13.1](../../../../../architecture/plot-design.md)

## 背景

alpha.12 已把 Statistics 层收敛成 transform 代数：`summarize` 规约成统计行，`select` 选择代表原始行，`annotate` 回填组统计，`bin` 产箱行，统计子语义由 reducer / selector registry 承载。现有 `quantile` reducer 已能输出任意单点分位数，例如 `p=0.25`、`p=0.5`、`p=0.75`。

箱线图只是更一般问题的一个实例：底层需要表达“按某个连续字段取一段分位区间，并可选按这段区间派生 spread / fence / whisker / outside rows”。如果把内置能力命名为 `quartiles`，并固定 `q1` / `median` / `q3` 字段，语义会过早贴到 boxplot 这个 chart type 上：

1. **分位区间不总是四分位**：central 80% 可以是 `lowerP=0.1` / `upperP=0.9`，central 90% 可以是 `0.05` / `0.95`。这些不应该靠重复手写多个单点 `quantile` reducer 拼装。
2. **boxplot 的 q1 / q3 是参数实例，不是底层模型**：在 plot 层，字段应表达 lower / upper quantile band boundary，调用方或上层 chart 再决定它们叫 `q1`、`q3`、`p10`、`p90` 还是其它名字。
3. **outside rows 是 selector 问题**：离群点或两端尾部样本仍然是原始 rows 子集，不应塞进 summarize row 的数组字段；应由 selector 基于同一 quantile-band boundary 选择。

本 ADR 不新增 `BoxPlotMark`，也不设计 chart preset。Plot 层只补底层统计子算子，使 boxplot 能被表达为 `quantile-band(lowerP=0.25, upperP=0.75, point p=0.5)` 的一个组合案例。

## 决策：新增 `quantile-band` reducer 与 `outside-quantile-band` selector

新增一个内置 reducer operation：`{ op: 'quantile-band', ... }`。它在每个 group 内读取一个连续数值字段，一次排序后输出一段可配置分位区间的 lower / upper boundary，并可选输出任意分位点、spread、fence、whisker、min / max、count。

```ts
type QuantileBandPointOutput = {
  p: number; // [0, 1]
  as: string;
};

type QuantileBandWhiskerSpec =
  | { kind: 'minMax' }
  | { kind: 'spread'; factor?: number }; // factor default 1.5 when kind is spread

type QuantileBandReducerOperation = {
  op: 'quantile-band';
  field: string;
  lowerP: number; // [0, 1], must be < upperP
  upperP: number; // [0, 1], must be > lowerP
  outputs: {
    lower: string;
    upper: string;
    points?: Array<QuantileBandPointOutput>;
    spread?: string;
    lowerFence?: string;
    upperFence?: string;
    whiskerMin?: string;
    whiskerMax?: string;
    min?: string;
    max?: string;
    count?: string;
  };
  whisker?: QuantileBandWhiskerSpec;
};
```

`outputs.lower` / `outputs.upper` 是结构角色，不是字段名约定；实现只把结果写到调用者声明的字段。`outputs.points` 用于同一排序结果下的额外分位点，例如 boxplot 的 median 线可写 `{ p: 0.5, as: 'median' }`，但 plot schema 不把 `median` 设成特殊字段。

`whisker` 的含义：

- 省略 `whisker`：只输出 quantile band 本身，适合 central 80% / central 90% 这类底层区间统计。
- `{ kind: 'minMax' }`：`whiskerMin` / `whiskerMax` 取 finite min / max。
- `{ kind: 'spread', factor }`：先计算 `spread = upper - lower`，再计算 `lowerFence = lower - factor * spread`、`upperFence = upper + factor * spread`；`whiskerMin` / `whiskerMax` 取 fence 内的最小 / 最大原始值。`factor` 省略时为 1.5，但只有显式选择 `kind:'spread'` 时才启用。

新增一个内置 selector operation：`{ op: 'outside-quantile-band', ... }`。它在每个 group 内按同一字段与分位区间选择区间外原始 rows。

```ts
type OutsideQuantileBandBoundarySpec =
  | { kind: 'band' }
  | { kind: 'spread'; factor?: number }; // factor default 1.5 when kind is spread

type OutsideQuantileBandSelectorOperation = {
  op: 'outside-quantile-band';
  field: string;
  lowerP: number;
  upperP: number;
  boundary?: OutsideQuantileBandBoundarySpec; // default { kind: 'band' }
};
```

`boundary.kind='band'` 表示选择 `< lowerQuantile` 或 `> upperQuantile` 的两端样本，直接支持“前后百分之多少”的底层表达。`boundary.kind='spread'` 表示选择 spread fence 外的 rows，对应传统 boxplot outlier，但仍不把 op 命名为 `outlier`。

boxplot 组合不进入新 IR mark。推荐底层组合是：

- `IntervalMark` 消费 summarize row 的 lower / upper 字段，画箱体。
- `ReferenceMark` 消费 `{ p: 0.5, as: 'median' }` 和 whisker 字段，画中位数线和须线 / 须帽。
- `PointMark` 使用 mark-local `select` + `outside-quantile-band` selector，画 fence 外原始点。

理由：

1. `quantile-band` 是 Statistics 层的可复用原语，不绑定 boxplot；percentile band、robust interval、distribution annotation、尾部样本标注都能复用。
2. 一次排序输出 band / points / fence / whisker，能保证同一组统计使用同一 quantile 算法，避免多个单点 reducer 临时拼装时产生细微不一致。
3. selector 保留原始 rows，符合 transform 表中“规约与选择”的边界：summary rows 和 source rows 是两类输出，不把数组塞进 JSON 字段里。

## 待决策点

- **quantile 算法命名**：倾向复用现有 `quantile` reducer 的线性插值算法，不在本 ADR 暴露 `method` 字段。若实现期发现需要与 d3 / R / Tukey hinges 对齐，应回本 ADR 加 `method`，不能暗改算法。
- **空组 / 全非 finite 值语义**：现有 reducer 对空 finite 值多返回 0。本 ADR 倾向继续对齐现状，`count=0` 且数值输出为 0；若要 fail-loud，需要同步调整既有 reducer 行为，超出本 ADR。
- **重复输出字段校验**：`outputs.lower` / `outputs.upper` / `outputs.points[].as` / 其它可选输出之间不得重复；schema 应在本 op 内 fail-loud。
- **outside row 顺序**：`select.rankAs` 对 outside rows 倾向保留原始行顺序，避免 selector 自己偷偷重排行；如需按偏离程度排序，后续先接 `sort`。

## DSL 表面

React 薄适配示例：组件只映射到 PlotSpec；这里展示的是底层组合，不是 chart 级 `<BoxPlot>` preset。

```tsx
const boxSummary = [
  {
    kind: 'summarize',
    groupBy: ['group'],
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
  },
] as const;

<Plot data={samples}>
  <IntervalMark
    x="group"
    y="boxHigh"
    bounds={{ y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' } }}
    transform={boxSummary}
  />
  <ReferenceMark
    x="group"
    y="median"
    extentField="whiskerMin"
    extentToField="whiskerMax"
    transform={boxSummary}
  />
  <PointMark
    x="group"
    y="value"
    transform={[
      {
        kind: 'select',
        groupBy: ['group'],
        selector: {
          op: 'outside-quantile-band',
          field: 'value',
          lowerP: 0.25,
          upperP: 0.75,
          boundary: { kind: 'spread', factor: 1.5 },
        },
      },
    ]}
  />
</Plot>
```

同一个底层 op 可以表达 central 80% interval，不需要新增 chart type：

```ts
{
  kind: 'summarize',
  groupBy: ['group'],
  metrics: [
    {
      op: 'quantile-band',
      field: 'value',
      lowerP: 0.1,
      upperP: 0.9,
      outputs: {
        lower: 'p10',
        upper: 'p90',
        points: [{ p: 0.5, as: 'p50' }],
        spread: 'p80Spread',
      },
    },
  ],
}
```

PlotSpec / vanilla SSR 使用同一 transform operations。

> 实现期可选择把 summary layer 放在 root transform，outside rows layer 放在 mark-local transform；如果同一张图既需要 summary rows 又需要原始 outside rows，必须用 mark-local transform 保持各 mark 的 data view 独立，不能引入 named data view。

## 测试设计

`packages/graph/plot/tests/transform/quantile-band.test.ts` 覆盖 reducer / selector 的数据行为、field collection、provenance 与错误路径。

`packages/graph/plot/tests/lower/boxplot-composition.test.ts` 覆盖 `IntervalMark` / `ReferenceMark` / `PointMark` 消费 quantile-band / outside rows 的 lowering 形状。

`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx` 覆盖 React 薄适配能透传 `quantile-band` reducer 与 `outside-quantile-band` selector，不引入 `<BoxPlot>`。

`packages/graph/plot-vanilla/tests/render-plot.test.ts` 覆盖 SSR 消费含 quantile-band statistics 的 PlotSpec。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `ReducerOperationSchema` 新增内置 `quantile-band` reducer operation。
- `SelectorOperationSchema` 新增内置 `outside-quantile-band` selector operation。
- `providers/statistics` 新增 quantile-band 计算与 outside row selection，复用现有 reducer / selector registry。
- `collectTransformFields` 经 reducer / selector definition 自动识别新 input / output fields，不新增 transform 分支。
- docs 的 transform summary / mark examples 可新增 boxplot composition demo 与 central percentile band demo，但不得新增 chart preset 文档入口。

## 不在本 ADR 范围

- 不新增 `BoxPlotMark`、`BoxPlot` React 组件或 chart preset。
- 不新增 named data view、join、facet scoped dataset；同图 summary rows 与 raw outside rows 通过 mark-local transform 解决。
- 不做 violin plot、notched boxplot、bootstrap confidence interval。
- 不设计 dodged / grouped boxplot 的 chart 级便利封装；底层可通过现有 groupBy、band、extent 与 mark 组合表达。
- 不改变现有 `quantile` reducer 算法，除非在待决策点中显式回改。

---

## 实现契约（必填）

### Level

`red`

判级理由：本 ADR 改 `@retikz/plot` public transform schema、统计子算子 registry、React / Vanilla 可透传的 PlotSpec 形态，并新增用户可见 docs demo。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `QuantileBandPointOutputSchema` | `z.object({ p, as })` | - | quantile-band 额外输出的任意分位点 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `QuantileBandWhiskerSpecSchema` | `z.discriminatedUnion('kind', [...])` | 省略表示不算 whisker | quantile band 可选须线策略：minMax 或 spread fence |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `QuantileBandOutputsSchema` | `z.object({ lower, upper, points?, spread?, lowerFence?, upperFence?, whiskerMin?, whiskerMax?, min?, max?, count? })` | - | quantile-band 显式输出字段名，lower / upper 必填 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `QuantileBandReducerOperationSchema` | `z.object({ op:'quantile-band', field, lowerP, upperP, outputs, whisker? })` | - | 一次性计算参数化分位区间及可选分位点 / fence / whisker |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinReducerOps` | 加 `'quantile-band'` | - | 防止 external reducer 与内置 quantile-band 撞名 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinReducerOperationSchema` | union 加 `QuantileBandReducerOperationSchema` | - | 让 summarize / annotate / bin metrics 可使用 quantile-band reducer |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `ReducerMetricsSchema` duplicate check | 支持单个 metric 返回多个 output fields | - | 检查 quantile-band 内部输出重复，以及它与其它 reducer `as` 的重复 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `OutsideQuantileBandBoundarySpecSchema` | `z.discriminatedUnion('kind', [...])` | `{ kind:'band' }` | outside selector 的边界策略：quantile band 或 spread fence |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `OutsideQuantileBandSelectorOperationSchema` | `z.object({ op:'outside-quantile-band', field, lowerP, upperP, boundary? })` | `boundary:{ kind:'band' }` | 选择分位区间或 spread fence 外的原始 rows |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinSelectorOps` | 加 `'outside-quantile-band'` | - | 防止 external selector 与内置 outside-quantile-band 撞名 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinSelectorOperationSchema` | union 加 `OutsideQuantileBandSelectorOperationSchema` | - | 让 select / annotate / relate 可解析 outside-quantile-band selector |
| `packages/graph/plot/src/schemas/transform/types.ts` | 改 | `QuantileBandReducerOperation` / `OutsideQuantileBandSelectorOperation` | `z.infer<...>` | - | 导出新统计子算子类型 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/schemas/transform/schema.ts`
- `packages/graph/plot/src/schemas/transform/types.ts`
- `packages/graph/plot/src/schemas/transform/index.ts`
- `packages/graph/plot/src/providers/statistics/index.ts`
- `packages/graph/plot/src/providers/transform/definitions.ts`
- `packages/graph/plot/tests/ir/transform.schema.test.ts`
- `packages/graph/plot/tests/transform/quantile-band.test.ts`
- `packages/graph/plot/tests/lower/boxplot-composition.test.ts`
- `packages/graph/plot-react/src/components/transform.tsx`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`
- `apps/docs/src/contents/graph/grammar/transform/summary/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/summary/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/transform/summary/transform-boxplot.demo.tsx`
- `apps/docs/src/contents/graph/grammar/transform/summary/transform-boxplot.data.ts`
- `apps/docs/src/contents/graph/grammar/mark/interval/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/mark/interval/index.en.mdx`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `quantile-band-boxplot-default-shape`：`lowerP=0.25` / `upperP=0.75` / point `p=0.5` / spread whisker → 输出 boxLow / median / boxHigh / whiskerMin / whiskerMax。
- `quantile-band-central-80`：`lowerP=0.1` / `upperP=0.9` → 输出 p10 / p90 / p50 / spread，证明不绑定 q1 / q3。
- `quantile-band-minmax-whisker`：`whisker.kind='minMax'` → whiskerMin / whiskerMax 等于 finite min / max，不输出 fence 除非显式请求。
- `quantile-band-grouped`：`summarize groupBy=['group']` → 每组独立计算 quantile band fields，并保留 group field。
- `outside-quantile-band-band-boundary`：`select groupBy=['group'] selector={op:'outside-quantile-band', lowerP:0.1, upperP:0.9}` → 返回两端 10% 原始 rows。
- `outside-quantile-band-spread-boundary`：`boundary.kind='spread'` → 返回 spread fence 外原始 rows，可用于 boxplot outlier。
- `boxplot-composition-lowers`：summary rows 被 `IntervalMark` / `ReferenceMark` 消费，outside rows 被 `PointMark` 消费，lowering 不新增 BoxPlotMark。

**边界（≥ 2）**：

- `quantile-band-single-value`：单个 finite value → lower / upper / points / whisker 都等于该值，count=1。
- `quantile-band-empty-finite-values`：全非 finite 或空组 → 按既有 reducer 口径输出 0 / count=0，不抛错。
- `outside-quantile-band-no-outside`：所有值在 boundary 内 → `select` 输出空数组。
- `outside-quantile-band-preserves-source-order`：多个 outside rows → 输出顺序保持原始行顺序。

**错误路径（≥ 2）**：

- `quantile-band-requires-lower-upper-outputs`：缺 `outputs.lower` / `outputs.upper` 任一项 → schema reject。
- `quantile-band-probability-order`：`lowerP >= upperP` 或任一概率不在 `[0,1]` → schema reject。
- `quantile-band-duplicate-output-fields`：outputs 内两个键写同一字段名，或 points[].as 与其它输出重复 → schema reject。
- `quantile-band-cross-metric-output-collision`：quantile-band 某个 output 与同一 metrics 数组中其它 reducer `as` 重复 → schema reject。
- `quantile-band-negative-factor`：`whisker.kind='spread'` 且 factor < 0 → schema reject。
- `outside-quantile-band-probability-order`：selector 的 `lowerP >= upperP` → schema reject。

**交互（≥ 2）**：

- `quantile-band-strict-model-output-fields`：strict model 下 quantile-band output fields 不要求预声明，input `field` 仍要存在。
- `quantile-band-custom-reducer-collision`：外部 reducer 注册 `op:'quantile-band'` → duplicate / built-in collision fail-loud。
- `outside-quantile-band-mark-local-transform`：PointMark mark-local `select outside-quantile-band` 不影响同图 summary layer 的 rows。
- `react-transform-props-pass-through`：React `<Transform>` 或 `dataTransforms` 能透传 quantile-band / outside-quantile-band operation，与手写 PlotSpec 等价。
- `vanilla-ssr-boxplot-spec`：`renderPlot` 消费 boxplot composition PlotSpec，不需要 vanilla 新 API。

### 依赖的现有元素

- `ReducerOperationSchema`（`packages/graph/plot/src/schemas/transform/schema.ts`）——扩展；新增内置 `quantile-band` reducer。
- `SelectorOperationSchema`（`packages/graph/plot/src/schemas/transform/schema.ts`）——扩展；新增内置 `outside-quantile-band` selector。
- `quantileOf` / `quantileReducerDefinition`（`packages/graph/plot/src/providers/statistics/index.ts`）——引用；共享现有 quantile 算法。
- `defineStatReducer` / `defineRowSelector`（`packages/graph/plot/src/contract/statistics.ts`）——引用；新能力作为内置 definition 注册，不绕过 registry。
- `applySummarize` / `applySelect`（`packages/graph/plot/src/providers/transform/group.ts`）——引用；无需新增 transform kind。
- `IntervalMark`（`packages/graph/plot/src/schemas/mark/schema.ts`）——引用；band body 由 `bounds.y=extent(lower,upper)` 表达。
- `ReferenceMark`（`packages/graph/plot/src/schemas/mark/schema.ts`）——引用；分位点、whisker 与 cap 由参考约束表达。
- `PointMark`（`packages/graph/plot/src/schemas/mark/schema.ts`）——引用；outside 原始 rows 以 point 表达。
- `mark-local transform`（alpha.12 ADR-15）——引用；同图 summary layer 与 raw outside layer 通过 mark-local transform 保持 data view 独立。

### 多 LLM 设计评估

尚未执行。当前对话未显式授权使用 subagent / parallel agent；进入实现前需要按 `develop-design` 流程补至少一轮独立设计评估，并把采纳 / 拒绝结论并回本 ADR。

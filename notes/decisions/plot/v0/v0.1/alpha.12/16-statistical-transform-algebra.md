# ADR-16: Statistical transform algebra for reducers, selectors, annotations, and relations

- 状态: Proposed
- 决策日期: 2026-06-27
- 关联: [plot v0.1-alpha.12 roadmap](./roadmap.md) · [alpha.12 ADR-01 bin + aggregate](./01-bin-aggregate.md) · [alpha.12 ADR-06 transform registry](./06-transform-registry.md) · [alpha.12 ADR-14 relation derived data and routing](./14-relation-derived-data-routing.md) · [alpha.12 ADR-15 mark-local transform](./15-mark-local-transform.md)

## 背景

ADR-15 已经把 `transform` 提升为所有 mark 的公共数据视图能力，解决了“只有 relation mark 能局部变换”的入口问题。但当前内置统计语义仍然是碎片化的：`aggregate` 只有 sum / mean / count / min / max，`bin` 自带一套私有 reduce 字段，`derive-relation` 又内置了一套 relation endpoint selector 与 difference measure。它们都在表达同一类统计问题，却各自定义小语法。

后续 plot 必然会继续出现极值、平均值、中位数、分组极值、分位数、分组代表点、组内排名、均值线、最大值标注、最低点到最高点连线等需求。这些逻辑不属于某个 mark；它们是 grammar-of-graphics 的 Statistics 层。RelationMark 对这些需求更敏感，是因为 relation 需要从统计结果里选 source / target，但同一份派生数据也应该能被 PointMark、ReferenceMark、IntervalMark、自定义 mark 使用。

如果继续为每个场景新增独立 transform，例如 `derive-relation`、`derive-max-point`、`derive-mean-line`、`derive-group-extreme`，transform 列表会变成业务动词堆栈，内置实现与自定义实现也会重复 selector / reducer / provenance / field contract。长期正确方向是先抽象统计子语义：**规约 reducer、代表行 selector、组统计 annotation、关系配对 relate**，再让所有 transform 与 mark 复用这些能力。

本 ADR 按 0.x 最优设计处理，不为现有 `aggregate` / `derive-relation` 兼容旧 schema。旧名字可以在文档迁移说明里解释，但实现不保留别名。

## 决策：以 transform 作为唯一统计层，新增统计代数并重构内置 transform

所有统计派生都继续通过 `TransformOperation` 表达；mark 只消费 transform 之后的 rows，不拥有私有统计语义。内置 transform 重构为四个通用统计家族：

1. `summarize`: 按组规约，输出一行一组的统计结果。替代旧 `aggregate`，支持多个 metrics。
2. `select`: 按组选择代表原始行，输出被选中的原始行。用于极值点、top-N、组内第 N 个点、标注点等。
3. `annotate`: 按组计算统计量并回填到每个原始行，保持行数不变。用于“每个点带上组均值 / 组中位数 / 组内排名”的后续表达。
4. `relate`: 按组选择 source / target 行并投影为 relation rows。替代旧 `derive-relation`，但它只是普通 transform，输出字段可被任何 mark 使用。

```ts
type GroupBySpec = Array<string>; // omitted or [] means one global group

type OrderBySpec = {
  field: string;
  order?: 'ascending' | 'descending';
};

type ReducerOperation =
  | { op: 'count'; as: string }
  | { op: 'sum' | 'mean' | 'median' | 'min' | 'max'; field: string; as: string }
  | { op: 'extent'; field: string; as: string }
  | { op: 'quantile'; field: string; p: number; as: string };

type SelectorOperation =
  | { op: 'min' | 'max'; by: string; tie?: 'first' | 'last' | 'all' }
  | { op: 'first' | 'last'; orderBy?: Array<OrderBySpec> }
  | { op: 'top' | 'bottom'; by: string; n: number; tie?: 'first' | 'last' | 'all' }
  | { op: 'nth'; orderBy: Array<OrderBySpec>; index: number };

type SummarizeTransform = {
  kind: 'summarize';
  groupBy?: GroupBySpec;
  metrics: Array<ReducerOperation>;
};

type SelectTransform = {
  kind: 'select';
  groupBy?: GroupBySpec;
  selector: SelectorOperation;
  rankAs?: string;
};

type AnnotateTransform = {
  kind: 'annotate';
  groupBy?: GroupBySpec;
  metrics?: Array<ReducerOperation>;
  selectors?: Array<{ selector: SelectorOperation; as: string }>;
};

type RelateTransform = {
  kind: 'relate';
  groupBy?: GroupBySpec;
  source: EndpointProjectionSpec;
  target: EndpointProjectionSpec;
  measures?: Array<PairMeasureOperation>;
};
```

`ReducerOperation` 与 `SelectorOperation` 是可复用的统计子算子。内置 `summarize` / `annotate` / `bin` 复用 reducer；内置 `select` / `relate` 复用 selector。长尾统计不通过新增 mark 字段解决，而通过以下两级扩展解决：

- 完整新数据语义：继续用 ADR-06 的 `defineTransform` / `transformDefinitions` 注册自定义 transform。
- 可嵌入通用 transform 的统计子语义：新增 `defineStatReducer` / `defineRowSelector`，分别通过 `options.statReducerDefinitions` / `options.rowSelectorDefinitions` 注入。内置 reducer / selector 与自定义 reducer / selector 共用同一 registry，不给内置私有白名单。

理由：

1. `transform` 已经是 Statistics 层唯一入口。把极值、均值、中位数、分组代表点都放在 transform 内，能保证 root transform、mark-local transform、自定义 mark、locator、strict field model 使用同一条数据管线。
2. reducer 与 selector 是不同语义。`mean` / `median` 产统计值，`max by value` 产原始代表行；RelationMark 需要的是 selector，不应把 argmax 伪装成 aggregate。
3. `relate` 只做“从 rows 派生 source-target rows”，不做几何 routing。它的输出字段是普通数据字段，因此 PointMark 可以画 target 点，ReferenceMark 可以画 delta 线，自定义 mark 也可以消费 relation rows。
4. `annotate` 补齐“保留原始行同时带上组统计”的常见需求，避免用户为了给每行拿均值而手写 join transform。
5. 子算子 registry 让 weighted mean、mode、domain-specific rank、nearest row 等长尾能力进入通用 `summarize` / `select` / `relate`，不要求用户复制整段 transform。

## 待决策点

本 ADR 不保留需要下游猜测的开放项。以下为实现期必须遵守的细化决策：

- **旧 transform kind 直接删除**：`aggregate` 被 `summarize` 替代，`derive-relation` 被 `relate` 替代；实现不保留 alias，不做兼容解析。
- **`groupBy` 允许省略或空数组**：省略和 `[]` 都表示全局单组。旧 `aggregate.groupBy.min(1)` 语义删除。
- **selector 默认输出原始行**：`select` 保留被选 row 的所有原始字段与 provenance；`top` / `bottom` / `tie: 'all'` 可让每组输出多行。
- **reducer 输出字段必须显式 `as`**：不再根据 `reduce + field` 自动生成字段名，避免 AI / 文档 / 用户在字段命名上猜测。
- **pair measure 不混入 reducer**：`difference` / `ratio` 这类 source-target 二元计算属于 `PairMeasureOperation`，不属于 group reducer。
- **bin 的 reduce 字段收敛到 reducer**：`BinTransformSchema.reduce` / `reduceField` / `valueField` 删除，改为 `metrics?: Array<ReducerOperation>`；未写 metrics 时默认 `{ op: 'count', as: 'binCount' }`。

## DSL 表面

分组平均值与中位数：

```tsx
<Plot data={rows}>
  <Transform
    kind="summarize"
    groupBy={['category']}
    metrics={[
      { op: 'mean', field: 'value', as: 'avgValue' },
      { op: 'median', field: 'value', as: 'medianValue' },
    ]}
  />
  <IntervalMark x="category" y="avgValue" />
  <PointMark x="category" y="medianValue" />
</Plot>
```

每个系列只画最高点：

```tsx
<PointMark
  x="month"
  y="value"
  color="series"
  transform={[
    {
      kind: 'select',
      groupBy: ['series'],
      selector: { op: 'max', by: 'value', tie: 'first' },
    },
  ]}
/>
```

每个系列从最低点连到最高点；同一份 `relate` 输出仍可被其它 mark 消费：

```tsx
const extremaRelation = [
  {
    kind: 'relate',
    groupBy: ['series'],
    source: {
      selector: { op: 'min', by: 'value' },
      fields: { x: 'month', y: 'value', id: 'id' },
    },
    target: {
      selector: { op: 'max', by: 'value' },
      fields: { x: 'month', y: 'value', id: 'id' },
    },
    measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel' }],
  },
] satisfies Array<TransformOperation>;

<RelationMark
  transform={extremaRelation}
  source={{ project: { x: 'sourceX', y: 'sourceY' } }}
  target={{ project: { x: 'targetX', y: 'targetY' } }}
  label={{ text: { field: 'deltaLabel' } }}
/>

<PointMark
  transform={extremaRelation}
  x="targetX"
  y="targetY"
  label={{ text: { field: 'deltaLabel' } }}
/>
```

自定义 weighted mean reducer：

```ts
const weightedMean = defineStatReducer({
  schema: z.object({
    op: z.literal('weighted-mean'),
    field: z.string().min(1),
    weight: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field, operation.weight],
  outputFields: operation => [operation.as],
  reduce: (rows, operation) => ({
    [operation.as]: weightedMeanOf(rows, operation.field, operation.weight),
  }),
});

renderPlot(spec, data, { statReducerDefinitions: [weightedMean] });
```

## 测试设计

新增测试集中覆盖统计子算子 registry、四类通用 transform、RelationMark 复用 `relate`、mark-local transform 与 locator parity。

- `packages/graph/plot/tests/transform/statistics.test.ts`: reducer / selector / summarize / select / annotate / relate 行为。
- `packages/graph/plot/tests/lower/mark-local-transform.test.ts`: 任意 mark 使用这些 transform 后的 scale / channel / lowering 数据视图。
- `packages/graph/plot/tests/interaction/statistical-transform.test.ts`: provenance 与 locator parity。
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`: React `<Transform>` 与 mark `transform` surface。

具体 case 拆分见下方“实现契约 / 测试象限”。

## 影响

- ⚠️ BREAKING: 删除 `aggregate` operation，新增 `summarize`。旧 `groupBy + reduce + field + as?` 改为 `groupBy + metrics[]`，`as` 必填。
- ⚠️ BREAKING: 删除 `derive-relation` operation，新增 `relate`。旧 `RelationEndpointSelectorSchema` 与 `RelationMeasureSchema` 不再是 relation 私有 schema，改为共享 selector + pair measure。
- ⚠️ BREAKING: `bin` 的 `reduce` / `reduceField` / `valueField` 删除，改用 `metrics`；默认输出字段从 `binValue` 改为 `binCount`。
- Plot transform registry：新增统计子算子 registry，内置 transform definition 在执行 `summarize` / `select` / `annotate` / `relate` / `bin` 时解析 reducer / selector。
- Field collection：`collectTransformFields` 必须能递归读取 reducer / selector / pair measure 的 input / output 字段，strict model 仍 fail-loud。
- Provenance：`summarize` / `bin` 输出组级 source indices；`select` 输出保留被选 row 的 source index；`annotate` 保留原 row provenance；`relate` 输出 source / target row provenance 与组级 source indices。
- Mark：所有 mark 继续只读取自己的 `MarkDataView.rows`。RelationMark 不再拥有私有 selector，只消费 `relate` 输出字段。
- React / Vanilla：React `<Transform>`、`dataTransforms`、mark `transform` 均接受新 operation；`<Plot>` 透传 `statReducerDefinitions` / `rowSelectorDefinitions`。
- Docs：`/plot/grammar/transform` 需要重写为统计代数视角；mark 文档需要展示 `select` / `summarize` / `relate` 在 mark-local transform 中的用法。
- Core：不修改 core IR，不新增 renderer 语义。

## 不在本 ADR 范围

- 不引入任意表达式语言或函数进入 PlotSpec；IR 继续 100% JSON-safe。
- 不做跨 dataset join、named data view、facet scoped dataset。这些是数据源层问题，不混入 transform 统计代数。
- 不设计 rolling window / time-series moving average / lag-lead。它们后续可作为 `window` transform 或 selector/reducer 扩展另开 ADR。
- 不做几何 routing / obstacle avoidance。`relate` 只产 relation rows；RelationMark 的 `routing` 仍归 ADR-14。
- 不实现 chart preset 层的新快捷组件。后续 chart preset 可以把均值线、极值标注等编译为本 ADR 的 transform。

---

## 实现契约

### Level

`red`

理由：本 ADR 删除 / 重命名 public transform kind，修改 Plot IR schema、transform registry、field collection、mark-local data view、React authoring surface 与 docs。它也会影响用户按旧 transform 文档写出的 spec。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.Summarize` | `'summarize'` | - | Group rows and compute one or more reducer metrics |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.Select` | `'select'` | - | Select representative source rows per group |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.Annotate` | `'annotate'` | - | Broadcast group statistics or selector metadata back to original rows |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.Relate` | `'relate'` | - | Derive source-target relation rows from selected source rows |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 删 | `PlotTransform.Aggregate` | `'aggregate'` | - | Replaced by `summarize` |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 删 | `PlotTransform.DeriveRelation` | `'derive-relation'` | - | Replaced by `relate` |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `GroupBySchema` | `z.array(z.string().min(1)).optional()` | omitted / `[]` means global group | Shared group key list |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `OrderBySchema` | object / array helper | ascending | Shared stable ordering spec for selectors |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `ReducerOperationSchema` | built-in reducer union + external passthrough | - | Shared statistic reducer operation |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SelectorOperationSchema` | built-in selector union + external passthrough | - | Shared row selector operation |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SummarizeTransformSchema` | `{ kind, groupBy?, metrics }` | - | Emits one row per group with reducer metrics |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SelectTransformSchema` | `{ kind, groupBy?, selector, rankAs? }` | - | Emits selected original rows per group |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `AnnotateTransformSchema` | `{ kind, groupBy?, metrics?, selectors? }` | - | Preserves input rows and appends group statistics |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `EndpointProjectionSchema` | `{ selector, fields }` | - | Selects an endpoint row and maps source fields to prefixed output fields |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `PairMeasureOperationSchema` | pair measure union | - | Computes source-target pair measures such as difference |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `RelateTransformSchema` | `{ kind, groupBy?, source, target, measures? }` | - | Emits relation rows from source/target endpoint projections |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BinTransformSchema.metrics` | `Array<ReducerOperationSchema>.optional()` | `[{ op:'count', as:'binCount' }]` | Per-bin reducer metrics using shared reducer operations |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 删 | `AggregateTransformSchema` | object | - | Superseded by `SummarizeTransformSchema` |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 删 | `RelationEndpointSelectorSchema` | object | - | Superseded by `SelectorOperationSchema` + `EndpointProjectionSchema` |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 删 | `DeriveRelationTransformSchema` | object | - | Superseded by `RelateTransformSchema` |
| `packages/graph/plot/src/schemas/transform/types.ts` | 改 | exported transform types | `z.infer` types for new schemas | - | Public TypeScript types follow the new statistical algebra |
| `packages/graph/plot/src/contract/statistics.ts` | 加 | `StatReducerDefinition` / `RowSelectorDefinition` | runtime definition objects | - | Runtime extension contracts for reducer and selector sub-operations |
| `packages/graph/plot-react/src/Plot.tsx` | 加 | `statReducerDefinitions` / `rowSelectorDefinitions` | definition arrays | omitted | React pass-through for statistic sub-operator registries |

### 文件 scope

本 ADR 实现允许触碰：

- `notes/decisions/plot/v0/v0.1/alpha.12/16-statistical-transform-algebra.md`
- `notes/decisions/plot/v0/v0.1/alpha.12/roadmap.md`
- `packages/graph/plot/src/schemas/transform/{constants,schema,types,index}.ts`
- `packages/graph/plot/src/contract/{index,statistics,transform}.ts`
- `packages/graph/plot/src/providers/statistics/**`
- `packages/graph/plot/src/providers/transform/{definitions,orchestrate,group,row,index}.ts`
- `packages/graph/plot/src/providers/transform/{summarize,select,annotate,relate}.ts`
- `packages/graph/plot/src/providers/transform/derive-relation.ts` only for deletion or replacement
- `packages/graph/plot/src/pipeline/{expand,source-fields,provenance}.ts`
- `packages/graph/plot/src/features/interaction/locate.ts`
- `packages/graph/plot/src/providers/mark/**` only where mark data view or RelationMark field examples depend on transform output names
- `packages/graph/plot/src/index.ts`
- `packages/graph/plot-react/src/{Plot,index}.tsx`
- `packages/graph/plot-react/src/components/{transform,build-plot-spec,index}.ts`
- `packages/graph/plot-react/tests/**`
- `packages/graph/plot/tests/transform/**`
- `packages/graph/plot/tests/lower/**`
- `packages/graph/plot/tests/interaction/**`
- `packages/graph/plot-vanilla/tests/**`
- `apps/docs/src/contents/plot/grammar/transform/**`
- `apps/docs/src/contents/plot/grammar/mark/**`

Scope 外改动需要回本 ADR 加条目或另开 ADR。

### 测试象限

**Happy path**

- `summarize_multiple_metrics`: `summarize` 按 `groupBy` 同时输出 mean / median / count，字段名完全来自 `as`。
- `summarize_global_group`: 省略 `groupBy` 时输出全局单组统计。
- `select_group_max_preserves_row`: `select` 每组选最大值行，原始字段与 source index 保留。
- `select_top_n`: `top` 每组输出 N 行，顺序稳定，`rankAs` 写入排名。
- `annotate_group_mean`: `annotate` 保持输入行数，并给每行写入组均值。
- `relate_min_to_max`: `relate` 每组从 min 连接到 max，输出 `sourceX` / `targetX` / `delta` / `deltaLabel`。
- `bin_metrics`: `bin` 用共享 reducer metrics 输出 `binStart` / `binEnd` / `binCount` / `binMean`。
- `custom_stat_reducer_in_summarize`: 自定义 reducer 可被 `summarize` 使用。
- `custom_row_selector_in_relate`: 自定义 selector 可被 `relate` source / target 使用。

**边界**

- `group_by_empty_equals_global`: `groupBy: []` 与省略 `groupBy` 产物等价。
- `median_even_count`: 偶数个 numeric value 的 median 取两中位数平均，行为确定。
- `quantile_bounds`: `p=0` 等价 min，`p=1` 等价 max。
- `selector_tie_first_last_all`: 极值相同按 `tie` 输出 first / last / all。
- `selector_group_without_candidate_skips`: 组内没有 finite numeric value 时，`select` / `relate` 跳过该组。
- `annotate_empty_rows`: 空输入返回空输出，不报错。

**错误路径**

- `reducer_field_required`: sum / mean / median / min / max / extent / quantile 缺 `field` 时 schema reject。
- `reducer_as_required`: reducer 缺 `as` 时 schema reject。
- `quantile_p_range`: `p < 0` 或 `p > 1` schema reject。
- `selector_by_required`: min / max / top / bottom 缺 `by` schema reject。
- `top_n_positive`: top / bottom 的 `n <= 0` schema reject。
- `duplicate_metric_output_rejected`: 同一 transform 内两个 metric 输出相同 `as` 时 schema 或 lowering reject。
- `relate_endpoint_fields_empty_rejected`: endpoint `fields` 为空 schema reject。
- `old_aggregate_rejected`: `kind: 'aggregate'` 不再被内置或 external passthrough 接住，静态或 lowering fail-loud。
- `old_derive_relation_rejected`: `kind: 'derive-relation'` 不再被内置或 external passthrough 接住，静态或 lowering fail-loud。
- `custom_reducer_duplicate_op_rejected`: 自定义 reducer 与内置或其它自定义 reducer `op` 冲突时 throw。

**交互**

- `root_then_mark_stat_transform`: root `summarize` 后 mark-local `select` 可读取 root 派生字段。
- `mark_local_relate_relation_and_point`: 同一 `relate` transform 可分别喂 RelationMark 与 PointMark。
- `scale_domain_from_select`: mark-local `select` 后 position scale domain 只看被选 rows。
- `channel_domain_from_annotate`: `annotate` 派生字段可驱动 color / opacity domain。
- `strict_model_outputs`: reducer / selector / relate 输出字段登记后不要求写入 data.model。
- `strict_model_missing_inputs`: reducer / selector 读取未知源字段时 strict model fail-loud。
- `provenance_summarize_select_annotate_relate`: 四类 transform 的 datumMeta sourceIndex / sourceIndices 符合各自语义。
- `locator_parity_statistics`: locator 与 lowering 对 summarize / select / annotate / relate 使用同一数据视图。
- `react_transform_surface`: React `<Transform kind="summarize">` 与 mark `transform={[{ kind:'select' }]}` 装配成正确 PlotSpec。
- `vanilla_spec_parity`: vanilla `renderPlot` 消费同一 spec 与 React builder 结果等价。

### 依赖的现有元素

- ADR-06 `TransformDefinition` / `defineTransform` / `resolveTransformRegistry` / `applyTransforms`: 扩展，统计 transform 仍通过同一 registry 执行。
- ADR-15 `MarkDataView` / mark-local transform: 引用，所有统计 transform 可在 root 或任意 mark-local transform 中运行。
- ADR-14 RelationMark routing: 保留，`relate` 只替换 derived data，不替代 routing。
- `collectTransformFields` / `collectSourceFields`: 修改，递归统计 reducer / selector / pair measure 的 input / output fields。
- `withGroupProvenance` / `readSourceIndex` / `readSourceIndices`: 扩展，给 summarize / bin / relate 等改行数输出提供统一 provenance。
- `TransformContext`: 扩展或旁路注入 statistic registries，让内置和自定义 transform 都能复用 reducer / selector definitions。
- `ExternalTransformSchema`: 修改，删除的旧内置 kind 不应被 external passthrough 静默接收，错误信息要提示使用 `summarize` / `relate`。
- React `buildPlotSpec`: 修改，透传新的 transform operation 与 statistics definition options。

# ADR-15: Mark-local transform for all marks

- 状态: Proposed
- 决策日期: 2026-06-26
- 关联: [plot v0.1-alpha.12 roadmap](./roadmap.md) · [alpha.12 ADR-06 transform registry](./06-transform-registry.md) · [alpha.12 ADR-08 custom mark registry](./08-mark-custom-registry.md) · [alpha.12 ADR-14 relation derived data and routing](./14-relation-derived-data-routing.md)

## 背景

ADR-14 为 `RelationMark` 引入了 mark-local `transform`，使 relation 可以从 plot root transform 后的 rows 继续派生只服务当前 relation 的数据视图。当前实现已经落成了这个能力，但它被硬编码为 relation 特例：`RelationMarkSchema` 独占 `transform` 字段，`resolveMarkRows` 只在 `mark.type === PlotMark.Relation` 时调用 `applyTransforms`，`collectSourceFields` 也只扫描 relation 的局部 transform。

这个特例不符合 plot alpha.12 已经建立的抽象方向。`transform` 是 grammar-of-graphics 的 Statistics 层能力，不是 relation 的私有能力；point / path / interval / reference 同样会遇到“只对当前图层筛选、排序、聚合、派生字段”的需求。例如：一个散点层只画 top-N，一个 path 层先对该层做平滑或回归，一个 interval 层只对该层 aggregate，一个 reference 层从当前数据派生阈值线。要求用户把这些操作都提升到 root `spec.transform` 会污染所有 mark 的数据视图，也会让多层图必须提前手工拆 dataset。

本仓库的设计原则要求内置能力与扩展能力复用同一套 definition / registry / pipeline。既然 transform registry 已经通过 ADR-06 支持内置和自定义 `TransformDefinition`，mark-local transform 不应另开 relation 专属入口，也不应要求自定义 mark 自己重复实现局部 transform。

本 ADR 将 `transform` 提升为所有 mark operation 的公共字段：它是 root `spec.transform` 的 mark-scoped shortcut，复用同一份 transform registry，支持内置 transform 与用户自定义 transform。

## 决策

所有 mark operation 共享可选字段 `transform?: Array<TransformOperation>`。root `spec.transform` 先执行，随后每个 mark 基于 root transform 后的 rows 独立执行自己的 `mark.transform`，产物只喂给该 mark 的 scale domain、channel domain、lowering、locator 与 field collection。

```ts
type MarkLocalTransform = Array<TransformOperation>;

type MarkBase = {
  id?: string;
  transform?: MarkLocalTransform;
};

type PointMark = MarkBase & {
  type: 'point';
  encoding: PointEncoding;
};

type CustomMarkOperation = {
  type: string;
  transform?: MarkLocalTransform;
  encoding?: Encoding;
  [key: string]: JsonValue;
};

type MarkDataView = {
  mark: MarkOperation;
  rows: Array<ExternalRow>;
};
```

执行顺序固定为：

1. ingest / fieldMaps / format / resolveField / normalize 得到 canonical rows。
2. `rootRows = applyTransforms(normalized, spec.transform, transformRegistry)`。
3. 对每个 mark 构造 `MarkDataView`：
   - `mark.transform` 省略时，`rows = rootRows`。
   - `mark.transform` 存在时，`rows = applyTransforms(rootRows, mark.transform, transformRegistry)`。
4. scale domain、channel resolver、guide 派生、mark lowering 和 locator 均读取对应 mark 的 `MarkDataView.rows`，而不是重新读取全局 rows。

理由：

1. `transform` 是数据视图能力，不是 relation 几何能力。把它放进 mark base 能让所有 mark 与自定义 mark 按同一语义消费数据。
2. 字段名沿用单数 `transform`，与 root `spec.transform` 对齐；不使用 `transforms`，避免和 core `Scope.transforms` 几何变换混名。
3. 内置 transform 与自定义 transform 继续走 ADR-06 的 `TransformDefinition` / `options.transformDefinitions`，IR 仍然只保存 `{ kind, ...config }`，不引入函数、ReactNode 或 class 实例。
4. `MarkDataView` 作为单一数据视图产物，能同时服务 render 与 locator，避免 relation 特例继续扩散成多个并行路径。

## 待决策点

本 ADR 无需要下游猜测的开放项；以下为实现期必须遵守的细化决策：

- **`mark.transform` 对自定义 mark 通用生效**：pipeline 在 dispatch 到 `MarkDefinition.lower` 前统一应用 transform，自定义 mark definition 只接收已经变换后的 rows。这样自定义 mark 和内置 mark 对等。
- **mark-local transform 参与全局 scale / guide domain**：某个 mark 真实绘制的 rows 应贡献它绑定的 scale domain；否则局部 aggregate/bin/filter 后的派生字段无法驱动轴与图例。
- **React DSL 给所有 mark 暴露 `transform` prop**：`transform` 是高级 escape hatch，不取代 `<Transform>`，但允许 `<PointMark transform={[...]} />` 这种图层局部写法。
- **删除 relation 专属 `RelationTransformSchema` 命名或改为公共 `MarkTransformSchema`**：Relation 仍可使用同名字段，但 schema 描述不再写 relation-local。

## DSL 表面

React:

```tsx
<Plot data={rows} transformDefinitions={[topN]}>
  <PointMark
    x="month"
    y="value"
    color="category"
    transform={[
      { kind: 'aggregate', groupBy: ['category'], field: 'value', reduce: 'sum', as: 'total' },
      { kind: 'top-n', field: 'total', n: 5 },
    ]}
  />

  <PathMark
    x="month"
    y="value"
    transform={[{ kind: 'sort', by: 'month' }]}
  />
</Plot>
```

Vanilla / PlotSpec:

```ts
const spec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  marks: [
    {
      type: 'point',
      transform: [
        { kind: 'aggregate', groupBy: ['category'], field: 'value', reduce: 'sum', as: 'total' },
        { kind: 'top-n', field: 'total', n: 5 },
      ],
      encoding: {
        x: { field: 'category' },
        y: { field: 'total' },
      },
    },
  ],
};
```

Relation existing surface remains valid:

```ts
{
  type: 'relation',
  transform: [{ kind: 'derive-relation', source, target }],
  source: { project: { x: 'sourceX', y: 'sourceY' } },
  target: { project: { x: 'targetX', y: 'targetY' } },
}
```

## 测试设计

`packages/graph/plot/tests/lower/mark-local-transform.test.ts` 覆盖 mark-local data view、domain、field collection 与 lowering 产物；`packages/graph/plot/tests/interaction/mark-local-transform.test.ts` 覆盖 locator parity；`packages/graph/plot-react/tests` 或现有 React spec builder 测试覆盖 JSX surface。

具体 case 拆分见下方“实现契约 / 测试象限”。

## 影响

- Plot IR schema：所有内置 mark 与 custom mark operation 都接受 `transform` 字段；RelationMark 的现有 `transform` 字段语义不变，但从 relation 特例升级为公共 contract。
- Pipeline：`resolveMarkRows` 从 relation 特例改为通用 `mark.transform` 读取；`MarkDataView` 成为 scale / channel / lowering / locator 共享输入。
- Field collection：所有 mark-local transforms 的 `inputFields` / `outputFields` 都参与 strict model 计算，派生字段从 source field set 删除。
- React surface：`PointMarkProps` / `PathMarkProps` / `IntervalMarkProps` / `ReferenceMarkProps` / `RelationMarkProps` 统一接受 `transform?: Array<TransformOperation>`。
- Vanilla surface：`renderPlot` 无新增入口；同构 PlotSpec 直接使用 `mark.transform`。
- Docs：plot transform 或 mark 文档需补充“root transform vs mark-local transform”的区别与使用示例。
- Core：无新依赖，不修改 core IR。

## 不在本 ADR 范围

- 不新增新的 transform kind。top-N / smooth / regression / KDE 等后续统计能力应作为 `TransformDefinition` 单独落地。
- 不新增 per-mark independent dataset / named data view / join。mark-local transform 的输入固定为 root transform 后的 rows。
- 不改变 root `spec.transform` 的语义，也不把 `<Transform>` 子组件变成某个 mark 的子节点。
- 不引入 runtime callback 字段到 PlotSpec；自定义逻辑仍通过 `options.transformDefinitions` 注入。
- 不重构 mark lowering 的具体几何算法，除非为接入 `MarkDataView` 必须调整入参。

---

## 实现契约

### Level

`red`

理由：本 ADR 修改 public Plot IR schema、mark lowering pipeline、scale / channel domain 数据源、locator parity 与 React authoring surface。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `MarkTransformSchema` | `z.array(TransformSchema)` | - | Mark-local data transform pipeline applied after the plot root transform and consumed only by this mark |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `markBase.transform` | `MarkTransformSchema.optional()` | omitted means use root rows | Optional mark-local transform pipeline shared by all mark types |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `RelationMarkSchema.transform` | inherited from `markBase` | unchanged | Relation keeps the same field through the shared mark base |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `CustomMarkSchema.transform` | `MarkTransformSchema.optional()` | omitted means use root rows | Custom marks receive transformed rows through the common pipeline |
| `packages/graph/plot/src/schemas/mark/types.ts` | 改 | `MarkTransform` | `z.infer<typeof MarkTransformSchema>` | - | Public type for mark-local transform arrays |
| `packages/graph/plot-react/src/components/marks.tsx` | 改 | `transform` | `Array<TransformOperation>` | omitted | React mark-local transform prop on all mark components |

> 字段名固定为 `transform`。下游实现不得改为 `transforms` 或 `data.transform`，如需改名必须回本 ADR 追加决策或新开 ADR。

### 文件 scope

本 ADR 实现允许触碰：

- `notes/decisions/graph/v0/v0.1/alpha.12/15-mark-local-transform.md`
- `notes/decisions/graph/v0/v0.1/alpha.12/roadmap.md`
- `packages/graph/plot/src/schemas/mark/{schema,types,index}.ts`
- `packages/graph/plot/src/pipeline/{expand,source-fields}.ts`
- `packages/graph/plot/src/features/interaction/locate.ts`
- `packages/graph/plot/src/providers/mark/**`
- `packages/graph/plot/src/providers/channel/**`
- `packages/graph/plot/src/providers/transform/**` only if `TransformOperationSchema` exposure requires type plumbing
- `packages/graph/plot/src/contract/mark.ts` only if `MarkDefinition` comments or row contract need clarification
- `packages/graph/plot-react/src/components/{marks,build-plot-spec}.tsx`
- `packages/graph/plot-react/src/Plot.tsx` only if prop type exports require plumbing
- `packages/graph/plot/tests/**`
- `packages/graph/plot-react/tests/**`
- `packages/graph/plot-vanilla/tests/**`
- `apps/docs/src/contents/graph/**` for documentation stage only

Scope 外改动需要回本 ADR 加条目或另开 ADR。

### 测试象限

**Happy path**

- `point_mark_local_sort`: `PointMark.transform=[sort]` 只改变该 point layer 的 lowering row order。
- `interval_mark_local_aggregate`: `IntervalMark.transform=[aggregate]` 产出派生字段，并用派生字段成功绘制 interval。
- `path_mark_local_derive_interval_or_sort`: `PathMark.transform` 产物只影响 path layer，不影响同图其他 point layer。
- `relation_transform_existing_surface`: 现有 `RelationMark.transform` 行为保持不变。
- `custom_mark_local_transform`: custom mark 带 `transform` 时，`MarkDefinition.lower` 收到局部 transform 后的 rows。
- `custom_transform_mark_local`: 用户 `defineTransform` 注册的 custom kind 可在任意 mark 的 `transform` 中使用。

**边界**

- `mark_transform_omitted_uses_root_rows`: 省略 `mark.transform` 时所有 mark 行为与现状一致。
- `mark_transform_empty_array_uses_root_rows_equivalent`: `transform: []` 与省略字段产物等价。
- `mark_transform_empty_result_skips_only_that_mark`: 某 mark 局部 transform 产出空 rows 时只跳过该 mark，不影响其他 marks / guides。
- `root_then_mark_transform_order`: root transform 先执行，mark-local transform 后执行，后者可读取 root transform 派生字段。

**错误路径**

- `mark_transform_unknown_kind_fails`: mark-local transform 使用未注册 kind 时 lowering fail-loud，错误信息与 root transform 同源。
- `mark_transform_builtin_bad_config_static_or_lowering_rejects`: 内置 kind 配置非法时按现有 transform schema / registry 规则拒绝。
- `mark_transform_missing_input_field_strict_fails`: strict model 下 mark-local transform 读取未知源字段时失败。
- `mark_transform_unregistered_output_field_strict_fails`: custom transform 产出字段但未声明 `outputFields`，后续 mark 消费该字段时 strict model 失败。

**交互**

- `scale_domain_from_mark_view`: mark-local aggregate/bin 派生字段参与该 mark 的 position scale domain。
- `channel_domain_from_mark_view`: mark-local transform 派生字段参与 color / custom visual channel domain。
- `guide_domain_merges_mark_views`: guide domain 汇总各 mark 的实际 data view，而不是只看 root rows。
- `locator_parity_mark_view`: locator 与 lowering 使用同一 mark data view，`transformedIndex` 与 datum meta 一致。
- `react_all_marks_transform_to_spec`: React 五类内置 mark 的 `transform` prop 都能装配进 PlotSpec。
- `vanilla_mark_transform_parity`: vanilla `renderPlot` 消费同一 PlotSpec，与 React builder 产物等价。

### 依赖的现有元素

- `TransformDefinition` / `defineTransform` / `resolveTransformRegistry` / `applyTransforms`：引用并扩展使用范围，mark-local transform 复用同一 registry。
- `collectTransformFields`：修改，所有 `mark.transform` 都要参与 input/output 字段收集。
- `MarkDataView`（`packages/graph/plot/src/pipeline/expand.ts`）：修改，从 relation 专用数据视图升级为所有 mark 的共享数据视图。
- `resolveFrame` / scale domain collection：修改，按 mark data view 汇总 domain。
- `resolveMarkChannels` / channel descriptors：修改或确认，按 mark data view rows 解析 visual channel domain。
- `lowerMark` / `MarkDefinition.lower`：引用，definition 接收的 rows 已经是 mark-local transformed rows。
- `createPlotLocator`：修改，与 lowering 共用 mark data view 规则。
- `CustomMarkSchema` / `MarkDefinition`：扩展，custom mark 的 `transform` 由公共 pipeline 处理。
- React `buildPlotSpec`：修改，把所有 mark props 的 `transform` 写入对应 mark operation。

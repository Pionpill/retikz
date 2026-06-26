# ADR-14: RelationMark derived data and routing strategy

- 状态: Proposed
- 决策日期: 2026-06-26
- 关联: [plot v0.1-alpha.12 roadmap](./roadmap.md) · [alpha.12 ADR-06 transform registry](./06-transform-registry.md) · [alpha.12 ADR-13 RelationMark + anchor id](./13-relation-mark-anchor.md) · [core Path target schema](../../../../../../packages/kernel/core/src/schemas/path/target.ts) · [core Path step schema](../../../../../../packages/kernel/core/src/schemas/path/step.ts)

## 背景

ADR-13 已经把 `RelationMark` 定位为 source-target 图元：用户给出每一行 relation 数据，plot 把 `source` / `target` / `via` 解析成 core target，再降低为 core `Path`。这解决了“已有边数据如何画出来”的问题，但没有解决“边数据如何从图表主数据动态计算出来”。

真实使用中，关系往往是可计算的，而不是恰好已经存在为一张 edge table：

- 趋势图里从最低点指向最高点，并标注增量。
- 气泡图里按业务规则选出 A/B 两个点并连线。
- 区间图里比较两个 interval 图元的差值。
- 未来 region/area 数据出现后，需要从区域统计结果、极值、中心点、边界点动态生成注释关系。

如果要求用户总是预先整理 relation rows，就会削弱 `RelationMark` 的价值；但如果把“最低点到最高点”这类逻辑硬塞进 `RelationMark.source` / `target`，又会让 mark 下沉承担统计计算，破坏 plot 当前的 grammar-of-graphics 分层。

本 ADR 采用方案 1：**mark-scoped derived relation data + geometry-stage routing strategy**。数据域负责生成 relation rows，target 域负责把字段解析成 anchor / projected coordinate，几何域负责把 source-target 降低成 core Path steps。

## 决策

新增两组能力：

1. `RelationMark.data.transform`: relation mark 局部数据视图。它从全图 transform 后的 canonical rows 出发，再运行一段只服务该 relation mark 的 transform pipeline，产出 relation rows。
2. `RelationMark.routing`: relation lowering 后的路径算法声明。它在 source / target / via 已经解析成 plot-space target 后运行，生成 core Path steps。

普通数据 transform 只处理数据行，不接触 scale、坐标投影、Node bbox 或 path step；`routing` 只处理几何 route，不读取原始数据字段做统计。

```ts
type RelationDataSpec = {
  transform?: Array<TransformOperation>;
};

type RelationEndpointSelector = {
  select: 'min' | 'max' | 'first' | 'last';
  by?: string;
  groupBy?: Array<string>;
  tie?: 'first' | 'last';
  fields: Record<string, string>;
};

type DeriveRelationTransform = {
  kind: 'derive-relation';
  source: RelationEndpointSelector;
  target: RelationEndpointSelector;
  groupBy?: Array<string>;
  measure?: RelationMeasureSpec;
};

type RelationRoutingSpec =
  | { kind: 'line' }
  | { kind: 'bend'; bendDirection?: 'left' | 'right'; bendAngle?: number; outAngle?: number; inAngle?: number; looseness?: number }
  | { kind: 'orthogonal'; via: '-|' | '|-'; labelStep?: 'main' | 'last' };

type RelationMark = {
  type: 'relation';
  data?: RelationDataSpec;
  source: PlotTargetRef;
  target: PlotTargetRef;
  via?: Array<PlotTargetRef>;
  route?: Array<RelationRouteStep>;
  routing?: RelationRoutingSpec;
  label?: RelationStepLabel;
  path?: RelationPathOptions;
};
```

`route` 与 `routing` 互斥。`route` 是完全显式的 core step 结构；`routing` 是快捷算法。两者同时出现时 schema reject，避免“显式 route 又被算法改写”的歧义。`via` 仍可与 `routing` 组合：`line` / `bend` / `orthogonal` 按 source -> via... -> target 顺序生成 steps。

## Relation data view

`RelationMark.data` 第一批只支持 `transform`，不引入 named dataset 或跨数据源 join。其输入固定为：

1. plot root `data.reference` 读到的 rows。
2. 经 `fieldMaps` / `formatDefinitions` / `resolveField` 归一化后的 canonical rows。
3. 经 plot root `transform` 后的 rows。

然后 `RelationMark.data.transform` 在该 mark 内继续执行。产物只喂当前 relation mark 的 `source` / `target` / `via` / `label` / channel，不改变其他 mark 的 rows。若 relation 使用 projected target 或字段通道，它的派生字段会通过 mark data view 参与对应 scale / guide 的 domain 汇总。

这样可以表达：

```ts
{
  type: 'relation',
  data: {
    transform: [
      {
        kind: 'derive-relation',
        source: { select: 'min', by: 'value', fields: { x: 'month', y: 'value', id: 'id' } },
        target: { select: 'max', by: 'value', fields: { x: 'month', y: 'value', id: 'id' } },
        measure: { kind: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' },
      },
    ],
  },
  source: { project: { x: 'sourceX', y: 'sourceY' } },
  target: { project: { x: 'targetX', y: 'targetY' } },
  routing: { kind: 'bend', bendDirection: 'left', bendAngle: 24 },
  label: { text: { field: 'deltaLabel' }, position: 0.5 },
  path: { arrow: '->' },
}
```

`RelationMark.data.transform` 复用 ADR-06 的 transform registry。内置 `derive-relation` 只是一个普通 transform definition；用户未来可以通过 `defineTransform` 注入 `derive-top-n-relation`、`derive-nearest-relation`、`derive-region-centroid-relation` 等运行时 definition，IR 仍然只保存 `{ kind, ...config }`。

## Built-in derive-relation transform

新增内置 transform `derive-relation`，用于从当前 rows 选择 source row 与 target row，并输出一行或多行 relation rows。

### Endpoint selector

`RelationEndpointSelector` 使用 JSON-safe selector，不接受函数：

```ts
type RelationEndpointSelector = {
  select: 'min' | 'max' | 'first' | 'last';
  by?: string;
  groupBy?: Array<string>;
  tie?: 'first' | 'last';
  fields: Record<string, string>;
};
```

- `select: 'min' | 'max'` 必须给 `by`。只比较 finite number；组内没有 finite value 时不产 relation row。
- `select: 'first' | 'last'` 可以给 `by` 表示先按该字段稳定排序再取首尾；不写 `by` 时使用当前 row order。
- `groupBy` 可写在 transform 顶层，也可写在 endpoint selector 上；endpoint selector 未写时继承 transform 顶层 `groupBy`。
- `tie` 默认 `'first'`，保证相同极值时确定性。
- `fields` 映射输出字段。key 是输出字段后缀，value 是从被选中 row 读取的字段。

输出字段命名规则：

- source selector 的 `fields: { x: 'month', y: 'value', id: 'id' }` 输出 `sourceX` / `sourceY` / `sourceId`。
- target selector 输出 `targetX` / `targetY` / `targetId`。
- key 使用 lower camel source key，前缀使用固定 `source` / `target`。首批不允许自定义前缀，减少 schema 面。

### Measure

第一批内置一个差值 measure：

```ts
type RelationMeasureSpec = {
  kind: 'difference';
  field: string;
  as?: string;
  labelAs?: string;
  labelPrefix?: string;
};
```

- `as` 默认 `delta`，输出 target selected row 的 `field` 减 source selected row 的 `field`。
- `labelAs` 可选。写入时把数值转成字符串，正数默认不自动加 `+`；需要正号时用 `labelPrefix: '+'`。
- 更复杂格式化不放在 transform 内；后续应复用 field format / label formatter，而不是在 transform 里新增 locale 逻辑。

### Field contract

`derive-relation` 作为内置 `TransformDefinition` 必须声明字段契约：

- `inputFields`: 顶层 `groupBy`、endpoint `groupBy`、endpoint `by`、endpoint `fields` 的所有源字段，以及 `measure.field`。
- `outputFields`: endpoint `fields` 映射出的 `sourceX` / `sourceY` / `sourceId` / `targetX` / `targetY` / `targetId` 等字段，以及 `measure.as ?? 'delta'`、`measure.labelAs`。

这让 `RelationMark.data.transform` 与 root `transform` 遵守同一 strict model 规则：读取原始数据的字段必须存在，产出的 relation 字段不要求用户写进 `data.model`。

## Mark data flow

当前 pipeline 是一套全图 `rows` 传给 scale、guide 与所有 mark。新增 mark-scoped data 后，需要显式引入 `MarkDataView`：

```ts
type MarkDataView = {
  mark: MarkOperation;
  rows: Array<ExternalRow>;
  fieldTypes: PlotFieldTypeMap;
};
```

lowering 编排改为：

1. `prepareRows` 仍然处理 plot root data、field maps、format、field resolver、strict model。
2. `globalRows = applyTransforms(normalized, spec.transform, transformRegistry)`。
3. 对每个 mark 调 `resolveMarkRows(mark, globalRows, transformRegistry)`：
   - 普通 mark: `rows = globalRows`。
   - `RelationMark.data.transform` 存在: `rows = applyTransforms(globalRows, mark.data.transform, transformRegistry)`。
4. scale domain 推断按 mark data view 收集：
   - point/path/interval/reference 用自己的 view rows。
   - relation projected target 的 `project` 字段用 relation view rows。
   - relation anchor/node target 不贡献 position scale domain。
5. channel resolver 也按 mark view rows 构建 domain；否则 relation 派生字段绑定 color/opacity 时无法得到正确 domain。
6. guide 仍从所有参与对应 scale 的 mark data view 汇总域；不是只看 global rows。

`fieldTypes` 初始仍来自 root data model 与 source-field collector。mark-scoped transform 的 `outputFields` 必须登记派生字段，和 ADR-06 全图 transform 契约一致。`collectSourceFields` 需要扩展为：

- 先收集所有 mark 直接消费的字段。
- 对 root `transform` 收集 input/output。
- 对每个 `RelationMark.data.transform` 收集 input/output。
- 对 mark-scoped transform 的 output，从 source field set 中删除，避免 strict model 把 `sourceX` / `deltaLabel` 当成原始字段要求用户声明。

## Routing

`routing` 运行在 source / target / via 已解析之后。它不做统计、不读 data model、不生成 anchor id，只生成 `IRStep[]`。

内置三种：

### line

默认值。等价于 ADR-13 当前默认 route：

```ts
move(source) -> line(via[0]) -> ... -> line(target)
```

### bend

对每个 segment 生成 core `bend` step，字段直接透传 core bend 参数：

```ts
{ kind: 'bend', bendDirection: 'left', bendAngle: 24, looseness: 1.1 }
```

适合路径极值、点到点趋势说明。

### orthogonal

对每个 segment 生成正交折线路径：

```ts
{ kind: 'orthogonal', via: '-|', labelStep: 'main' }
```

`via: '-|'` 表示先水平后垂直，`'|-'` 表示先垂直后水平。`labelStep` 默认 `'main'`，label 挂到最长的可绘制正交段；`'last'` 按 ADR-13 shorthand 语义挂最后一个 drawable step。

注意：core `fold` 当前 label 居中存在缺陷时，plot 的 orthogonal routing 可以先降低为显式 `line` steps，避免文档 demo 依赖错误的 fold label 行为。core 修复后可切换为 `fold`，但行为契约仍是“label 居中于主正交段”。

## React / Vanilla surface

React:

```tsx
<Plot data={rows}>
  <PathMark x="month" y="value" anchorId={{ prefix: 'trend', field: 'id' }} />
  <RelationMark
    data={{
      transform: [
        {
          kind: 'derive-relation',
          source: { select: 'min', by: 'value', fields: { id: 'id' } },
          target: { select: 'max', by: 'value', fields: { id: 'id' } },
          measure: { kind: 'difference', field: 'value', labelAs: 'deltaLabel', labelPrefix: '+' },
        },
      ],
    }}
    source={{ anchorId: { prefix: 'trend', field: 'sourceId' }, boundary: true }}
    target={{ anchorId: { prefix: 'trend', field: 'targetId' }, boundary: true }}
    routing={{ kind: 'bend', bendDirection: 'left', bendAngle: 20 }}
    label={{ text: { field: 'deltaLabel' }, position: 0.5 }}
    path={{ arrow: '->' }}
  />
</Plot>
```

Vanilla / PlotSpec 使用同构字段：

```ts
const spec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'trend' },
  marks: [
    { type: 'path', encoding: { x: { field: 'month' }, y: { field: 'value' } }, anchorId: { prefix: 'trend', field: 'id' } },
    {
      type: 'relation',
      data: {
        transform: [
          {
            kind: 'derive-relation',
            source: { select: 'min', by: 'value', fields: { id: 'id' } },
            target: { select: 'max', by: 'value', fields: { id: 'id' } },
            measure: { kind: 'difference', field: 'value', labelAs: 'deltaLabel', labelPrefix: '+' },
          },
        ],
      },
      source: { anchorId: { prefix: 'trend', field: 'sourceId' }, boundary: true },
      target: { anchorId: { prefix: 'trend', field: 'targetId' }, boundary: true },
      routing: { kind: 'bend', bendDirection: 'left', bendAngle: 20 },
      label: { text: { field: 'deltaLabel' }, position: 0.5 },
      path: { arrow: '->' },
    },
  ],
};
```

## 错误处理

- `RelationMark.data.transform` 含未注册 transform kind: 复用 ADR-06，lowering fail-loud。
- `derive-relation` 的 `min/max` selector 缺 `by`: schema reject。
- endpoint `fields` 为空: schema reject。
- 组内没有可选 source 或 target: 该组不产 relation row，不报错。
- `route` 与 `routing` 同时存在: schema reject。
- `routing.kind='orthogonal'` 缺 `via`: schema reject。
- relation 派生字段被后续 target/label 消费但 transform definition 没有登记 `outputFields`: strict model 按 ADR-06 失败，错误指向未知字段。
- anchor target 最终生成 id 但未注册: 沿用 ADR-13 `AnchorRegistry.assertResolved()`，错误包含 target role 与生成 id。

## 扩展性

- 自定义 relation 派生逻辑走 `defineTransform`，而不是 `RelationMark` 私有 callback。IR 保持 100% JSON-safe。
- 未来 region/area/contour mark 只需注册 anchors 或扩展 `PlotTargetRef` 的 target variant；`derive-relation` 可以输出 `sourceRegionId` / `targetRegionId` 等字段，不需要知道屏幕几何。
- 未来自动避让、障碍物感知、多段路由应作为 `RoutingDefinition` registry 另立 ADR。本 ADR 的 `routing` 是固定内置枚举，不开放 runtime routing function。
- 未来单个 mark 使用完全独立 dataset 需要 `MarkDataSpec.reference` 或 named data view，这是更大的数据流设计，不纳入本 ADR。

## 不在本 ADR 范围

- 不新增 named dataset / relation table join。
- 不做 obstacle avoidance、force edge bundling、graph layout。
- 不修 core `fold` label 居中 bug；只允许 plot orthogonal routing 在实现上避开该 bug。
- 不把 `RelationMark.source` / `target` 扩展成任意 selector。selector 属于 transform，target ref 只解析已有 relation row。
- 不把函数写进 PlotSpec；自定义逻辑仍走 runtime definition key。

---

## 实现契约

### Level

`red`

理由：新增 public IR schema、内置 transform schema、mark lowering pipeline 行为、React authoring surface，并影响 docs demo 与 strict field collection。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.DeriveRelation` | `'derive-relation'` | - | Derive source-target relation rows from selected data rows |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `RelationEndpointSelectorSchema` | object | - | Selects one endpoint row per group and maps source fields to endpoint output fields |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `RelationMeasureSchema` | discriminated union, first member `difference` | - | Computes derived relation measure fields such as delta and label text |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DeriveRelationTransformSchema` | object with `kind`, `source`, `target`, `groupBy?`, `measure?` | - | Emits relation rows from source and target endpoint selectors |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinTransformSchema` | add `DeriveRelationTransformSchema` to union | - | Built-in transform operation union includes relation derivation |
| `packages/graph/plot/src/schemas/transform/types.ts` | 加 | `RelationEndpointSelector`, `RelationMeasure`, `DeriveRelationTransform` | `z.infer` types | - | Public TypeScript types for relation derivation |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationDataSpecSchema` | `{ transform?: Array<TransformSchema> }`（类型导出可别名为 `Array<TransformOperation>`） | none | Mark-scoped data transform pipeline for relation rows |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationRoutingSpecSchema` | discriminated union `line` / `bend` / `orthogonal` | `{ kind:'line' }` behavior when omitted | Algorithmic route generation for relation paths |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `RelationMarkSchema.data` | `RelationDataSpecSchema.optional()` | omitted | Optional relation-local data view derived from plot rows |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `RelationMarkSchema.routing` | `RelationRoutingSpecSchema.optional()` | omitted means line | Optional route strategy; mutually exclusive with explicit route |
| `packages/graph/plot-react/src/components/marks.tsx` | 改 | `RelationMarkProps.data` / `routing` | schema-aligned props | omitted | React authoring surface mirrors PlotSpec |

### 文件 scope

- `notes/decisions/plot/v0/v0.1/alpha.12/14-relation-derived-data-routing.md`
- `notes/decisions/plot/v0/v0.1/alpha.12/roadmap.md`
- `packages/graph/plot/src/schemas/transform/{constants,schema,types,index}.ts`
- `packages/graph/plot/src/providers/transform/{definitions,orchestrate}.ts`
- `packages/graph/plot/src/providers/transform/features/derive-relation.ts` 或同等新文件
- `packages/graph/plot/src/schemas/mark/{schema,types,index}.ts`
- `packages/graph/plot/src/providers/mark/features/relation.ts`
- `packages/graph/plot/src/providers/mark/shared/**`
- `packages/graph/plot/src/pipeline/{expand,source-fields}.ts`
- `packages/graph/plot/src/interaction/locate.ts`
- `packages/graph/plot-react/src/components/marks.tsx`
- `packages/graph/plot-react/src/components/build-plot-spec.ts`
- `packages/graph/plot-react/src/components/index.ts`
- `packages/graph/plot-react/src/index.ts`
- `packages/graph/plot-vanilla/tests/**`
- `packages/graph/plot/tests/**`
- `apps/docs/src/contents/plot/grammar/mark/relation/**`
- `apps/docs/src/contents/plot/grammar/transform/**` only if transform reference needs a `derive-relation` entry

Scope 外改动需要回本 ADR 加条目或另开 ADR。

### 测试象限

**Happy path**

- `derive_relation_min_to_max_global`: 全局最低点到最高点产一行 relation row。
- `derive_relation_grouped`: `groupBy` 每组产一行 relation row。
- `relation_data_transform_label`: `RelationMark.data.transform` 产 `deltaLabel`，`label.text.field` 正确降低到 step label。
- `relation_data_transform_anchor_targets`: derived `sourceId` / `targetId` 正确引用 point/path/interval anchors。
- `routing_bend`: `routing.kind='bend'` 生成 core bend steps，并保留 path arrow/style。
- `routing_orthogonal`: `routing.kind='orthogonal'` 生成正交 route，label 挂在主段。

**边界**

- `derive_relation_tie_first_last`: 极值相同按 `tie` 确定性选择。
- `derive_relation_empty_group_skips`: 组内没有 finite `by` 值时不产 relation row。
- `relation_data_transform_empty_result`: relation data view 为空时 lowering 返回空层而不影响其他 marks。
- `relation_projected_domain_from_mark_view`: projected source/target 字段来自 relation view rows，并参与 position scale domain。

**错误路径**

- `derive_relation_min_without_by_rejected`: `min/max` selector 缺 `by` schema reject。
- `derive_relation_empty_fields_rejected`: endpoint `fields` 为空 schema reject。
- `relation_route_and_routing_rejected`: `route` 与 `routing` 同写 schema reject。
- `orthogonal_without_via_rejected`: `routing.kind='orthogonal'` 缺 `via` schema reject。
- `relation_data_unknown_transform_fails`: mark-scoped transform 未注册 kind 时 lowering 抛清晰错误。
- `relation_data_unregistered_output_strict_fails`: 自定义 mark-scoped transform 未登记 outputFields，被 target/label 消费时 strict model 抛错。

**交互**

- `root_transform_then_relation_transform_order`: plot root transform 先执行，relation data transform 后执行。
- `custom_transform_mark_scoped`: 用户 `defineTransform` 注入的 relation derivation 只影响该 relation mark，不影响 point/path/interval rows。
- `channel_domain_from_relation_view`: relation color/opacity channel 绑定 derived 字段时，domain 来自 relation view rows。
- `locator_parity_relation_view`: locator 与 lowering 使用同一 mark data view，命中 provenance 一致。
- `react_relation_data_routing_to_spec`: React `<RelationMark data routing>` 产出的 PlotSpec 与手写 spec 字段一致。
- `vanilla_relation_data_routing_parity`: vanilla `renderPlot` 消费同一 spec，产物与 React spec 路径一致。

### 依赖现有元素

- ADR-06 `TransformDefinition` / `defineTransform` / `TransformSchema`: 扩展，用内置 transform definition 实现 `derive-relation`，mark-scoped transform 复用同一 registry。
- ADR-13 `RelationMark` / `AnchorIdSpec` / `PlotTargetRef` / `AnchorRegistry`: 扩展，derived relation rows 仍通过既有 target contract 定位。
- core `Path` / `StepSchema` / `StepLabelSchema`: 扩展消费，`routing` 最终只生成 core steps。
- plot `collectSourceFields`: 修改，纳入 mark-scoped transform 的 input/output 字段契约。
- plot `resolveFrame` / scale domain collection: 修改，从单一 global rows 改为按 `MarkDataView` 汇总 mark domain。
- plot `lowerMark`: 修改，给每个 mark 传自己的 data view rows。
- plot locator: 修改，复用 mark data view，保证 render / locate parity。

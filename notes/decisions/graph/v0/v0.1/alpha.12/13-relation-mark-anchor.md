# ADR-13: RelationMark + anchor id contract, replacing the old LinkMark direction

- 状态: Proposed
- 决策日期: 2026-06-26
- 关联: [plot v0.1-alpha.12 roadmap](./roadmap.md) · [alpha.12 ADR-03 mark abstraction](./03-mark-abstraction-registry.md) · [alpha.12 ADR-04 mark surface convergence](./04-mark-surface-convergence.md) · [alpha.3 ADR-05 relation](../alpha.3/05-relation.md) · [core Path target schema](../../../../../../packages/kernel/core/src/schemas/path/target.ts) · [core Coordinate schema](../../../../../../packages/kernel/core/src/schemas/coordinate.ts)

## 背景

当前 plot 的实际实现已经收敛为 `point` / `path` / `interval` / `reference` 四类内置 mark，加上 `CustomMarkSchema` 与 `MarkDefinition` registry。alpha.12 ADR-03/04 早期草稿曾规划 `LinkMark` / `link` 作为 `ribbon` 的替代，用于 source-to-target 关系几何；但该方向没有落地到当前代码，且语义偏向 Sankey / alluvial 的流带几何，不适合承担“任意两个 plot 生成节点之间画一条 core Path”的通用关系能力。

新的需求不是“新增一个图表形态 mark”，而是把 plot 生成的 datum geometry 暴露为可引用 anchor，再用 core `Path` 的完整 target / anchor / boundary / arrow / label 能力表达关系。例如两点之间的箭头、两个 interval cell 之间的连接、path 上某个采样点指向某个 node、未来 annotation/callout 指向某个 anchor 后放一段文字。这些能力的底座已经在 core：`NodeTarget` 可以引用 node / coordinate id，`Path` step 可以挂 label，`Coordinate` 是 0x0 无视觉可引用实体。

alpha.3 ADR-05 里的“relation”是 series / group / dodge / stack 这类多记录组合关系，它是 mark 构造输入，不是本 ADR 的 source-target 图元。本 ADR 采用 `RelationMark` 这个公开名称，但在文档中明确区分：alpha.3 relation 是数据组合关系；`RelationMark` 是可绘制的 edge/path relation。

本 ADR 因此 supersede alpha.12 ADR-03/04 中关于 `LinkMark` / `link` 的方向：不新增 `PlotMark.Link`、不新增 `<LinkMark>`、不再把 `ribbon` 迁移成 `link`。若未来需要 Sankey / alluvial 流带，应另立 `FlowMark` / `RibbonMark` 类 ADR，复用本 ADR 的 anchor/target contract，而不是占用 `RelationMark`。

## 决策: 用 AnchorRegistry 暴露可引用锚点，用 RelationMark 降低为 core Path

新增一套 plot 层 anchor contract：维度 mark 负责声明并注册可引用 anchor，`RelationMark` 只解析 target 并降低为 core `Path`。关系绘制完全消费 core `Path` 能力，不在 plot 内重写箭头、边界裁剪、曲线或 label 布局。

```ts
type AnchorIdSpec = {
  /** id namespace segment. Default: mark.id, otherwise mark.<index>. */
  prefix?: string;
  /** Read one row field and slug it into the generated id. */
  field?: string;
  /** JSON-safe template. Supports {plotId}, {markId}, {markIndex}, {index}, {field:name}. */
  template?: string;
  /** Runtime generator key. The function is supplied through LowerPlotsOptions.anchorIdGenerators. */
  generator?: string;
};

type PlotTargetRef =
  | { kind: 'node'; id: string; anchor?: string; offset?: [number, number]; boundary?: boolean }
  | { kind: 'anchor'; anchorId: AnchorIdSpec; anchor?: string; offset?: [number, number]; boundary?: boolean }
  | { kind: 'projected'; roles: Record<string, string>; anchorId?: AnchorIdSpec };

type RelationMark = {
  type: 'relation';
  id?: string;
  source: PlotTargetRef;
  target: PlotTargetRef;
  via?: Array<PlotTargetRef>;
  route?: Array<RelationRouteStep>;
  label?: StepLabelLike;
  path?: RelationPathOptions;
  encoding?: { color?: Channel; channels?: Record<string, Channel> };
};
```

`AnchorIdSpec` 必须恰好使用 `field` / `template` / `generator` 三种来源之一；`prefix` 只负责命名空间。`prefix` 缺省时使用 `mark.id`，再缺省使用 `mark.<markIndex>`，避免同一数据行在 point / interval / path 等不同 mark 中生成同一个 id。生成 id 时默认挂在 plot local namespace 下：`<plotId>.<prefix>.<slug(value)>`；`template` 中显式写 `{plotId}` 时按模板产出完整 id。所有 id 都经过同一 registry 查重，重复时 fail loud，错误包含 mark id/index、row index、生成 id 与原始值。

维度 mark 新增 `anchorId?: AnchorIdSpec`：

- `PointMark.anchorId` / `IntervalMark.anchorId`: 每个成功渲染的 datum `Node` 写入生成 id。
- `PathMark.anchorId`: 路径本体仍降低为 core `Path`，同时为每个有效路径顶点生成 core `Coordinate`，id 来自该行 anchor 规则。
- `CustomMark` 可在 `MarkDefinition.lower` 中通过 lowering context 注册 anchors，与内置 mark 使用同一个 `AnchorRegistry`。

`RelationMark` 的 lowering：

1. 对每行数据解析 `source` / `target` / `via` / `route` 中的 `PlotTargetRef`。
2. `kind:'node'` 直接转 core `NodeTarget`。
3. `kind:'anchor'` 用当前行和 `AnchorIdSpec` 生成 id，再转 core `NodeTarget`。
4. `kind:'projected'` 通过当前 coordinate frame 投影 roles；如果带 `anchorId`，先生成 core `Coordinate`，再用 id target；否则直接用坐标字面量。
5. 生成 `IRPath`：默认 `move(source) -> line(via...) -> line(target)`；显式 `route` 时从 `source` 自动生成首个 `move`，其余 step 由 `route` 指定，最后一个 route step 可省略 `to`，省略时指向 `target`。

`route` 使用 core step 的 JSON-safe 子集并把 step 的 `to` 扩展为 `PlotTargetRef`。`line` / `fold` / `curve` / `cubic` / `bend` / `smooth` / `generator` 等 core 已支持的 path 表达不在 plot 里重写，只做 target 解析与 schema 对齐。每个 drawable step 可带 `label`，字段对齐 core `StepLabelSchema`。`RelationMark.label` 是 shorthand：降低到默认 route 或最后一个 drawable step 的 `label`；显式 `route[].label` 优先。

`RelationMark.path` 是 core `Path` 顶层能力的 passthrough，排除 `type` / `id` / `children`，保留 `color`、`animations`、`stroke`、`strokeWidth`、`dashPattern`、`lineCap`、`lineJoin`、`roundedCorners`、`arrow`、`arrowDetail`、`marks`、`fill`、`fillRule`、`opacity`、`fillOpacity`、`drawOpacity`、`zIndex`、`rotate`、`scale`、`shadow`、`blendMode` 等字段。已有 field-bound path style 继续通过 channel registry 处理；`path` 内对象字段第一批只做常量 passthrough。

理由:

1. **正确分层**: anchor id 与 target 解析是 plot contract，不属于某一个 mark 的私有逻辑；RelationMark 只是消费这个 contract 并产出 core `Path`。
2. **复用 core 能力**: 箭头、anchor、boundary、path label、step 几何都由 core 负责，plot 只处理数据行到 target 的映射。
3. **扩展友好**: 未来 AnnotationMark / CalloutMark / FlowMark 可以复用 `PlotTargetRef` 和 `AnchorRegistry`，不会再为“指向某个 Node/Coordinate”另造机制。

## 设计细节

### AnchorRegistry 与 lowering context

`MarkDefinition.lower` 需要从 `markProvenance?: MarkProvenance` 升级为接收完整 lowering context:

```ts
type AnchorIdGenerator = (row: ExternalRow, ctx: AnchorIdGeneratorContext) => string;

type MarkLoweringContext = {
  provenance?: MarkProvenance;
  anchors: AnchorRegistry;
  anchorIdGenerators?: Record<string, AnchorIdGenerator>;
};

type AnchorRegistry = {
  makeId(spec: AnchorIdSpec, row: ExternalRow, owner: AnchorOwner): string;
  register(id: string, owner: AnchorOwner): void;
  resolve(ref: PlotTargetRef, row: ExternalRow, owner: AnchorOwner): TargetResolution | null;
  coordinates(): Array<IRCoordinate>;
};
```

`expand.ts` 在 lower all marks 前创建一个 plot-local registry，并把同一个 registry 传给每个 mark。内置维度 mark 注册 anchors，`RelationMark` 解析 refs，custom mark 可按需注册 anchors。最终 mark layer 的 children 需要包含 registry 产出的 `Coordinate`；relation 自己生成的 projected/via coordinate 与 path 放在同一 relation layer，dimension mark 顶点 coordinate 放在对应 mark layer。

`AnchorRegistry` 只管 id 生成、查重和坐标占位，不管交互 locate。现有 `datumIdField` / locator provenance 保持不变；`anchorId` 是新的关系定位主机制，优先写实际 core element id。

### Relation route

默认形式覆盖大多数关系:

```ts
{
  type: 'relation',
  source: { kind: 'anchor', anchorId: { prefix: 'point', field: 'from' }, boundary: true },
  target: { kind: 'anchor', anchorId: { prefix: 'point', field: 'to' }, boundary: true },
  label: { text: 'depends on', position: 'midway', side: 'above' },
  path: { arrow: '->', roundedCorners: 6 }
}
```

高级 route 显式写 step:

```ts
{
  type: 'relation',
  source: { kind: 'anchor', anchorId: { prefix: 'task', field: 'from' }, boundary: true },
  target: { kind: 'anchor', anchorId: { prefix: 'task', field: 'to' }, boundary: true },
  route: [
    { kind: 'fold', via: '-|', to: { kind: 'projected', roles: { x: 'midX', y: 'midY' }, anchorId: { prefix: 'route', field: 'id' } } },
    { kind: 'bend', bendDirection: 'left', bendAngle: 20, label: { text: { field: 'label' }, position: 'midway' } }
  ],
  path: { arrow: '->', marks: [{ pos: 0.5, mark: { kind: 'arrow' } }] }
}
```

若 `route` 存在，`via` 不允许同时存在，避免两套路径来源冲突。`route` 的最后一个 step 省略 `to` 时自动使用 `target`；非最后 step 必须显式 `to`。

### React / Vanilla surface

React 新增 `<RelationMark>`，props 与 spec 同构为主，少量扁平糖只用于常见 path style:

```tsx
<Plot id="deps" data={rows}>
  <PointMark x="x" y="y" id="task" anchorId={{ prefix: 'task', field: 'id' }} />
  <RelationMark
    source={{ kind: 'anchor', anchorId: { prefix: 'task', field: 'from' }, boundary: true }}
    target={{ kind: 'anchor', anchorId: { prefix: 'task', field: 'to' }, boundary: true }}
    path={{ arrow: '->', stroke: '#64748b' }}
    label={{ text: { field: 'label' }, position: 'midway' }}
  />
</Plot>
```

Vanilla 不新增单独 builder；`renderPlot(spec, data, { anchorIdGenerators })` 直接消费同一 PlotSpec。文档需要同时展示 React DSL 与纯 spec 写法。

## 待决策点

- **generator 返回值语义**: 本 ADR 固定为返回 id body；registry 负责套 plot local namespace 与 prefix。若用户要完全自定义完整 id，可用 `template` 显式包含 `{plotId}`，暂不加 `absolute` 字段。
- **route 支持范围**: 首批 schema 对齐 core `StepSchema` 的 target-bearing drawable steps；如果某个 core step 的参数无法从 plot data JSON-safe 表达，应延后而不是特判实现。
- **RelationMark 是否参与 scale 推断**: `source` / `target` 为 `kind:'projected'` 时收集其 roles 字段参与位置 scale domain；纯 `anchor` / `node` 引用不贡献 domain。

## 测试设计

`packages/graph/plot/tests` 覆盖 schema、lowering、registry、React/Vanilla surface:

**Happy path**
- `anchor_id_point_field_prefix`: `PointMark.anchorId={prefix,field}` 为每个可渲染 node 生成稳定 id。
- `anchor_id_interval_field_prefix`: `IntervalMark.anchorId` 写入 cell node id，relation 能用 boundary target 连接 cell。
- `relation_anchor_to_anchor_arrow_label`: `RelationMark` 从两个 anchor refs 生成 core `Path`，带 `arrow` 与 step label。
- `path_mark_anchor_coordinates`: `PathMark.anchorId` 为有效顶点生成 core `Coordinate`，relation 可指向某个顶点。

**边界**
- `relation_projected_target_without_anchor`: projected target 不带 anchorId 时直接使用坐标字面量，不注册 coordinate。
- `relation_projected_target_with_anchor`: projected target 带 anchorId 时生成 coordinate 并通过 id target 连接。
- `relation_route_last_step_defaults_to_target`: route 最后 step 省略 `to` 时指向 target。

**错误路径**
- `anchor_id_requires_one_source`: `field/template/generator` 缺失或多选时 schema reject。
- `anchor_id_duplicate_fails_loud`: 两行生成同一 id 时抛错，错误包含 mark id/index、row index、id。
- `relation_missing_generator_fails_loud`: IR 写 generator key 但 options 未提供函数时抛错。
- `relation_missing_anchor_target_fails_loud`: relation 引用未注册 anchor 时抛错，错误包含 source/target 与生成 id。
- `relation_route_via_conflict_rejected`: 同时写 `via` 与 `route` 时 schema reject。

**交互**
- `relation_uses_core_path_marks`: `path.marks` 中段 arrow mark passthrough 到 core path。
- `relation_core_boundary_target`: source/target `boundary:true` 下沉为 core NodeTarget boundary，端点裁剪交给 core。
- `react_relation_mark_to_spec`: `<RelationMark>` 产出的 spec 与手写 spec 等价。
- `vanilla_relation_spec_parity`: 同一 spec 在 vanilla `renderPlot` 与 React `<Plot spec>` 下走同一 lowering。

## 影响

- `@retikz/plot` schema: 新增 `PlotMark.Relation`、`RelationMarkSchema`、`AnchorIdSpecSchema`、`PlotTargetRefSchema`、`RelationRouteStepSchema`；给 `PointMarkSchema` / `PathMarkSchema` / `IntervalMarkSchema` 加 `anchorId`。
- `@retikz/plot` contract/provider: 新增 `AnchorRegistry`、`MarkLoweringContext`；调整 `MarkDefinition.lower` 与内置 mark lowering 入参；新增 relation mark provider。
- `@retikz/plot-react`: 新增 `<RelationMark>` 与 props 类型；给 Point/Path/Interval props 加 `anchorId`；`buildPlotSpec` 装配 relation。
- `@retikz/plot-vanilla`: 不新增 builder；导出类型随 `@retikz/plot` 更新，测试覆盖 spec 入口。
- docs: 新增 `/graph/grammar/mark/relation`，更新 mark index、point/path/interval/custom 页面说明 anchorId；明确 `LinkMark` 方向被本 ADR 取代。
- core: 不改 core，仅消费 `Path`、`NodeTarget`、`StepLabel`、`Coordinate`。

## 不在本 ADR 范围

- 不实现 `LinkMark` / `link` / `RibbonMark`，不做 Sankey / alluvial 流带宽度布局。
- 不实现 AnnotationMark / CalloutMark；只预留 `PlotTargetRef` 让后续复用。
- 不做 graph layout / force layout / automatic edge routing。
- 不删除 `datumIdField`，也不改变 locator provenance；`anchorId` 只是关系定位主机制。
- 不修改 core Path / Coordinate schema。

---

## 实现契约

### Level

`red`

理由: 新增 public IR schema、mark lowering contract、React public component，并影响 docs 与测试。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/mark/constants.ts` | 加 | `PlotMark.Relation` | `'relation'` | - | source-target relation mark lowered to core Path |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `AnchorIdSpecSchema` | object with `prefix?`, exactly one of `field/template/generator` | - | Generates stable plot-local ids for anchors |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PlotTargetRefSchema` | discriminated union `node` / `anchor` / `projected` | - | Resolves relation endpoints to core targets or coordinates |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationRouteStepSchema` | core step-like object with plot target refs and `label?` | - | Per-row route steps lowered to core Path steps |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationMarkSchema` | object | - | Per-row relation edge/path between source and target |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PointMarkSchema.anchorId` | `AnchorIdSpecSchema.optional()` | - | Stable id generator for point datum nodes |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PathMarkSchema.anchorId` | `AnchorIdSpecSchema.optional()` | - | Stable id generator for path vertex coordinates |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `IntervalMarkSchema.anchorId` | `AnchorIdSpecSchema.optional()` | - | Stable id generator for interval datum nodes |
| `packages/graph/plot/src/schemas/mark/types.ts` | 加 | `AnchorIdSpec`, `PlotTargetRef`, `RelationMark`, `RelationRouteStep` | `z.infer` types | - | Public TypeScript types |
| `packages/graph/plot/src/pipeline/expand.ts` | 加 | `LowerPlotsOptions.anchorIdGenerators` | `Record<string, AnchorIdGenerator>` optional | - | Runtime custom id generators, not stored in IR |

### 文件 scope

- `notes/decisions/graph/v0/v0.1/alpha.12/13-relation-mark-anchor.md`
- `notes/decisions/graph/v0/v0.1/alpha.12/roadmap.md`
- `notes/decisions/graph/v0/v0.1/alpha.12/03-mark-abstraction-registry.md` / `04-mark-surface-convergence.md` only for superseded LinkMark notes
- `packages/graph/plot/src/schemas/mark/{constants,schema,types,index}.ts`
- `packages/graph/plot/src/contract/{mark,provenance,index}.ts` and new `contract/anchor.ts`
- `packages/graph/plot/src/providers/mark/{registry.ts,features/*,shared/*}`
- `packages/graph/plot/src/pipeline/{expand,provenance,source-fields}.ts`
- `packages/graph/plot-react/src/components/{marks,build-plot-spec,index}.tsx?`
- `packages/graph/plot-react/src/index.ts`
- `packages/graph/plot-vanilla/tests/**`
- `packages/graph/plot/tests/**`
- `apps/docs/src/contents/graph/grammar/mark/**`

Scope 外改动需要回本 ADR 加条目或另开 ADR。

### 测试象限

见“测试设计”。实现阶段至少覆盖 4 happy / 3 edge / 5 error / 4 interaction case；plot alpha 可按真实实现合并 case，但不得少于 anchor generation、relation lowering、error diagnostics、React/Vanilla parity 四类断言。

### 依赖现有元素

- core `Coordinate`: 扩展消费，用作 path 顶点和 projected/via target 的无视觉 anchor。
- core `Path` / `StepSchema` / `StepLabelSchema`: 扩展消费，RelationMark lowering 目标。
- core `NodeTarget`: 扩展消费，node/anchor target 下沉目标。
- plot `MarkDefinition`: 修改，增加 lowering context。
- plot `datumAnchor` / `roleAnchor` / `cellAnchor`: 引用，维度 mark anchor 的几何来源。
- plot `CustomMarkSchema` / `markDefinitions`: 扩展，custom mark 可注册 anchors。

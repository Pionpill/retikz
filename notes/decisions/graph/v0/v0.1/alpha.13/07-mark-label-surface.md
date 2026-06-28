# ADR-07：mark label surface follows core label hosts

状态：Proposed
决策日期：2026-06-28
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [kernel v0.4-alpha.6 ADR-04 Node label inside placement](../../../../kernel/v0/v0.4/alpha.6/04-node-label-inside-placement.md) · [kernel v0.4-alpha.6 ADR-05 Ribbon host label](../../../../kernel/v0/v0.4/alpha.6/05-ribbon-label.md) · [plot-design.md §13](../../../../../architecture/plot-design.md) · [core-design.md §7](../../../../../architecture/core-design.md)

## 背景

core 当前已经把两类 label 宿主补齐：`Node.label` 支持 inside / outside placement、边界方位与 `{ boundary, t }` 位置；path-like `GeometryLabelSchema` 也被 `Path.label` 与 `Path kind="ribbon"` 共享，用于沿路径 / ribbon centerline 放置文字。这些能力解决的是“文字属于哪个图元”的问题，而不是单纯把一个 text primitive 画在某个坐标上。

plot 现有 label 表面仍停在旧的 datum node label 模型：`MarkLabelSchema` 只表达 `PointMark` / `IntervalMark` 这类节点状图元的外侧标签，且 `PathMark` 虽有 schema 字段但 lowering 没有稳定投递到 path host；`RelationMark` 的 path label 另用 `RelationStepLabelSchema`，ribbon 没有同构字段；`ReferenceMark` 完全没有 label 字段。结果是 docs demo 为了写说明文字经常额外新增一个 `PointMark` 或 `encoding.text` 层。

这会把 label 从宿主图元上拆出去：文字不再跟随 node / path / ribbon 的 provenance、locator、后续 interaction / policy，也迫使 demo 预先计算一个并行点位。plot 是底层能力层，不需要把 API 打磨成 chart preset，但它必须把 core 已经有的宿主 label 能力完整暴露出来，并让所有内置 mark 复用同一套 schema / resolver。

本 ADR 的目标是统一 plot mark label 的数据绑定、schema 与 lowering 契约，让 label 成为现有图元的附件，而不是用额外 `PointMark` 模拟文字层。

## 决策：新增 host-inferred mark label schema，按 mark 宿主投递

重写 mark label 输入为 host-inferred schema：公共 DSL / PlotSpec 的 `label` 不要求用户写 `kind`，而是由 mark definition 选择该 label 应投递到 core `Node.label` 还是 path-like `GeometryLabelSchema`。`content` 保留 plot 的 field / value / displayFormat 数据绑定能力，但常量 `value` 对齐 core label text，允许 string 或 mixed text；placement / position / side 等几何字段必须直接从 core `NodeLabelSchema` 与 `GeometryLabelSchema` 派生，不在 plot 里重写一份 union。plot 只替换 `text` 为数据绑定 `content`，并在知道宿主后选择 node 或 geometry schema 校验，因此不会把两套 `position` 语义混在一个无判别字段里。

```ts
import { GeometryLabelSchema, NodeLabelSchema } from '@retikz/core';

const MarkLabelContentSchema = z
  .object({
    field: z.string().min(1).optional(),
    value: NodeLabelSchema.shape.text.optional(),
    displayFormat: z.string().min(1).optional(),
  })
  .strict();

const MarkNodeLabelSchema = NodeLabelSchema.omit({ text: true })
  .extend({
    content: MarkLabelContentSchema,
  })
  .strict();

const MarkGeometryLabelSchema = GeometryLabelSchema.omit({ text: true })
  .extend({
    content: MarkLabelContentSchema,
  })
  .strict();

const createMarkLabelListSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1)]);

const MarkNodeLabelListSchema = createMarkLabelListSchema(MarkNodeLabelSchema);
const MarkGeometryLabelListSchema = createMarkLabelListSchema(MarkGeometryLabelSchema);

const MarkLabelSchemaByHost = {
  node: MarkNodeLabelListSchema,
  geometry: MarkGeometryLabelListSchema,
} as const;
```

投递规则：

1. `PointMark` 与 `IntervalMark` 的 `label` 投递到每个生成的 core `Node.label`，按 `MarkNodeLabelSchema` 校验。
2. `PathMark` 的 `label` 投递到生成的 core `Path.label`，按 `MarkGeometryLabelSchema` 校验。它不再把 path label 理解为 per-vertex datum label；若后续需要顶点级标签，应另起字段或 ADR。
3. `ReferenceMark` 增加 `label`。line 形态投递到 core `Path.label` 并按 geometry schema 校验；band / region 形态投递到生成的 core `Node.label` 并按 node schema 校验。
4. `RelationMark.label` 新增共享 label 输入，按 `MarkGeometryLabelSchema` 校验。无论 `RelationMark.kind` 是 path 还是 ribbon，解析后都投递到最终 core `IRPath.label`；`path` / `ribbon` 子对象只保留几何专属参数。
5. `RelationMark.path.route[].label` 继续表示 step-level label，仍复用 core `StepLabelSchema` / relation field-binding helper；它不和 host label 混用。
6. `label` 字段统一接受单个 label 或 label 数组。数组按输入顺序解析和投递；不做自动避让、不做优先级裁剪。
7. mark lowering 遇到 label 字段不符合实际 host schema 时 fail-loud，不静默忽略。例如 `ReferenceMark` line 使用 node-only 的 `pin` 字段应抛出“line reference expects geometry label”一类诊断。

实现上新增共享 resolver，而不是在各 mark 里重复拼字段：

```ts
const resolveMarkLabels = (
  host: 'node' | 'geometry',
  labels: MarkNodeLabel | MarkGeometryLabel | Array<MarkNodeLabel | MarkGeometryLabel> | undefined,
  row: ExternalRow,
  labelOf: ChannelValueResolver<string> | undefined,
): Array<IRNodeLabel | IRGeometryLabel> => {
  // 1. normalize array
  // 2. resolve content.field / content.value / displayFormat
  // 3. strip plot-only `content`
  // 4. return core-compatible label objects
};
```

各 mark 只负责选择目标 host，并调用 node / geometry 投递 helper。内置 mark 与自定义 mark 仍通过 mark definition 机制工作；本 ADR 只给内置 mark 提供共享 helper，不把 label 变成私有白名单。

理由：

1. 内置 mark 已经能推断 label 宿主，不需要用户重复写 `kind`。node label 的 `position` 是节点边界方位；geometry label 的 `position` 是 path-like centerline 上的归一化位置；实现通过 mark host 选择 schema，仍能保持语义可读、可校验、AI 友好。
2. `content` 是 TextChannel 风格的 plot 绑定层，但不复用现有 string-only `TextChannelSchema` 做常量值；这样 graph 不会把 core 已支持的 mixed text label 能力截断。
3. plot 只做 field/value 数据绑定与 mark host 分派，不重新定义 node / ribbon label 几何；实现必须直接复用 core schema 字段，core 继续是 label 布局语义的唯一来源。
4. host-specific schema + 共享 resolver 能让 Point / Interval / Path / Reference / Relation 按同一字段绑定规则获得 label，同时允许不同宿主拒绝不适用的字段。
5. 数组形式直接消费 core 多 label 能力，避免为了“左右两个标签”“内外两个标签”在 docs demo 里制造多个文本点。
6. path / ribbon host label 解决的是图元附件问题；docs demo 不再为纯说明文字新增 `PointMark`，图例性 anchor 点仍可保留。

## 待决策点

- **React 旧 flat props 的处置**：倾向把 `<PointMark label="name" labelPosition="right" />` 这类旧 sugar 收敛为结构化 `label={{ content:{ field:'name' }, position:'right' }}`。若实现期保留临时兼容 sugar，也必须只作为 buildPlotSpec 的输入转换，不进入 PlotSpec schema。
- **PathMark 顶点级标签**：本 ADR 倾向把 `PathMark.label` 归为 path host label。若确实需要每个采样点 / 顶点的 datum label，应另开 `pointLabel` / `vertexLabel` 之类显式字段，避免和 host label 混淆。
- **ReferenceMark band host 选择**：现有 band / region 下沉为 core `Node`，所以使用 node label schema。若后续 band 改为 path-like geometry，必须同步修改 host 判断和 schema 诊断。
- **自定义 mark label contract**：本 ADR 不给 `CustomMarkSchema` 增加通用 `label` 字段。自定义 mark 可在自己的 definition schema 中复用 `MarkNodeLabelSchema` 或 `MarkGeometryLabelSchema`，并自行选择 host。

## DSL 表面

底层 PlotSpec / Vanilla 使用同一结构：

```ts
{
  type: 'interval',
  encoding: {
    x: { field: 'stage' },
    y: { field: 'value' },
  },
  label: {
    content: { field: 'valueLabel' },
    position: { boundary: 'top', t: 0.5 },
    placement: 'inside',
    distance: 6,
    textColor: '#ffffff',
  },
}
```

React 薄适配示例：

```tsx
<IntervalMark
  x="stage"
  y="value"
  label={{
    content: { field: 'valueLabel' },
    position: { boundary: 'top', t: 0.5 },
    placement: 'inside',
    distance: 6,
    textColor: '#ffffff',
  }}
/>

<RelationMark
  kind="ribbon"
  source={{ anchorId: { field: 'from' } }}
  target={{ anchorId: { field: 'to' } }}
  ribbon={{
    width: { kind: 'field', value: 'amount' },
  }}
  label={{
    content: { field: 'amountLabel' },
    position: 'midway',
    sloped: true,
    placement: 'inside',
  }}
/>
```

Path / reference 使用同一 schema：

```tsx
<PathMark
  x="date"
  y="rate"
  label={{
    content: { value: 'conversion trend' },
    position: 'near-end',
    side: 'above',
  }}
/>

<ReferenceMark
  y={80}
  label={{
    content: { value: 'target' },
    position: 'near-end',
    side: 'above',
  }}
/>
```

## 测试设计

`packages/graph/plot/tests/ir/mark.schema.test.ts` 覆盖 host-specific label schema accept / reject、单个与数组形式、node / geometry 字段边界校验。

`packages/graph/plot/tests/lower/mark-label.test.ts` 覆盖 Point / Interval / Path / Reference / Relation path / Relation ribbon 的 lowering 结果，断言 label 投递到正确 core host。

`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx` 覆盖 React 结构化 label props 与手写 PlotSpec 等价；若实现保留旧 flat props，也只测它被转换为共享 schema。

`packages/graph/plot-vanilla/tests/render-plot.test.ts` 覆盖 vanilla / SSR 消费含 node label 与 geometry label 的 PlotSpec。

docs demo 验收放在 `apps/docs/src/contents/graph/grammar/mark/**`：纯文本说明改用已有 mark 的 `label`，不再新增仅为写字服务的 `PointMark`。

## 影响

- `packages/graph/plot/src/schemas/encoding/schema.ts` 的 `MarkLabelSchema` 从 node-only object 拆为 host-specific `MarkNodeLabelSchema` / `MarkGeometryLabelSchema`，并支持数组字段使用。
- `packages/graph/plot/src/schemas/mark/schema.ts` 需要让 `PointMark`、`IntervalMark`、`PathMark`、`ReferenceMark`、`RelationMark.label` 按各自 host 复用这套 schema。
- `providers/mark/shared` 新增 label 解析 / 投递 helper；各 mark feature 只负责选择 host，避免重复实现。
- `PathMark.label` 语义会从旧的“位置 mark datum label”收敛为 path host label。若用户依赖过旧字段，这是 alpha 期 breaking change。
- `RelationMark.label` 成为 path / ribbon 共享 host label；显式 `path.route[].label` 仍可继续表示 step label，但不再和 host label 共用字段位置。
- docs 的 `graph/grammar/mark` 分组与所有 mark demo 需要更新：文字尽量挂到对应 mark label 上，`PointMark encoding.text` 只用于真正的数据文本点。

## 不在本 ADR 范围

- 不新增 `TextMark`、`LabelMark`、`RibbonMark` 或 chart preset。
- 不做 label collision avoidance、自动隐藏、自动对比色、自动换行、tooltip 或 hover highlight。
- 不改变 core `NodeLabelSchema`、`GeometryLabelSchema`、path / ribbon compile 语义。
- 不给所有自定义 mark 自动注入 label；自定义 mark 通过自身 definition 选择是否复用 `MarkNodeLabelSchema` / `MarkGeometryLabelSchema`。
- 不把 docs demo 改造成 chart 级最短写法；demo 仍展示底层 plot grammar。

---

## 实现契约（必填）

### Level

`red`

判级理由：本 ADR 改 `@retikz/plot` public mark schema、React / Vanilla authoring surface、mark lowering 到 core IR 的契约，并触及用户可见 docs demo。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkLabelContentSchema` | `z.object({ field?, value?, displayFormat? })`，`value` 直接用 `NodeLabelSchema.shape.text` | - | label 的数据绑定内容，field / value 互斥，value 支持 string 或 mixed text |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkNodeLabelSchema.content` | `MarkLabelContentSchema` | - | node label 文本来源 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkNodeLabelSchema.position` | 直接继承 `NodeLabelSchema.omit({ text: true })` 的 `position` | core 默认 | 节点边界方位、数字角度或 `{ boundary, t }` |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkNodeLabelSchema.placement` / `distance` | 直接继承 `NodeLabelSchema.omit({ text: true })` 对应字段 | core 默认 | 节点内外侧 placement 与距离 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkNodeLabelSchema.textColor` / `opacity` / `font` | 直接继承 `NodeLabelSchema.omit({ text: true })` 对应字段 | core 默认 | node label 样式 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkNodeLabelSchema.rotate` / `keepUpright` / `pin` | 直接继承 `NodeLabelSchema.omit({ text: true })` 对应字段 | core 默认 | node label 旋转、正读与 leader line |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkGeometryLabelSchema.content` | `MarkLabelContentSchema` | - | geometry label 文本来源 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkGeometryLabelSchema.position` | 直接继承 `GeometryLabelSchema.omit({ text: true })` 的 `position` | core 默认 | 沿 path-like centerline 的归一化位置 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkGeometryLabelSchema.side` / `sloped` / `placement` / `distance` | 直接继承 `GeometryLabelSchema.omit({ text: true })` 对应字段 | core 默认 | path / ribbon label 侧向、旋转与内外 placement |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkGeometryLabelSchema.textColor` / `opacity` / `font` | 直接继承 `GeometryLabelSchema.omit({ text: true })` 对应字段 | core 默认 | geometry label 样式 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkNodeLabelListSchema` | `MarkNodeLabelSchema \| Array<MarkNodeLabelSchema>` | - | node host 可消费的单个或多个 label |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkGeometryLabelListSchema` | `MarkGeometryLabelSchema \| Array<MarkGeometryLabelSchema>` | - | geometry host 可消费的单个或多个 label |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 改 | `MarkLabelSchemaByHost` | `{ node: MarkNodeLabelListSchema, geometry: MarkGeometryLabelListSchema }` | - | mark definition 按 host 选择的 label schema 表 |
| `packages/graph/plot/src/schemas/encoding/types.ts` | 改 | `MarkLabel` / `MarkNodeLabel` / `MarkGeometryLabel` | `z.infer<...>` | - | 导出共享 label 派生类型 |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `PointMarkSchema.label` | `MarkNodeLabelListSchema` | - | PointMark node host label |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `IntervalMarkSchema.label` | `MarkNodeLabelListSchema` | - | IntervalMark node host label |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `PathMarkSchema.label` | `MarkGeometryLabelListSchema` | - | PathMark geometry host label |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `ReferenceMarkSchema.label` | host-inferred label list | - | ReferenceMark line 用 geometry，band / region 用 node |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationMarkSchema.label` | `MarkGeometryLabelListSchema` | - | Relation path / ribbon 共享 geometry host label |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/schemas/encoding/schema.ts`
- `packages/graph/plot/src/schemas/encoding/types.ts`
- `packages/graph/plot/src/schemas/encoding/index.ts`
- `packages/graph/plot/src/schemas/mark/schema.ts`
- `packages/graph/plot/src/schemas/mark/types.ts`
- `packages/graph/plot/src/providers/mark/shared/common.ts`
- `packages/graph/plot/src/providers/mark/features/point.ts`
- `packages/graph/plot/src/providers/mark/features/interval.ts`
- `packages/graph/plot/src/providers/mark/features/path.ts`
- `packages/graph/plot/src/providers/mark/features/reference.ts`
- `packages/graph/plot/src/providers/mark/features/relation.ts`
- `packages/graph/plot/tests/ir/mark.schema.test.ts`
- `packages/graph/plot/tests/lower/mark-label.test.ts`
- `packages/graph/plot/tests/lower/relation-mark.test.ts`
- `packages/graph/plot-react/src/components/marks.tsx`
- `packages/graph/plot-react/src/components/build-plot-spec.ts`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-react/tests/components/text-mark-assembly.test.tsx`
- `packages/graph/plot-vanilla/src/**`
- `packages/graph/plot-vanilla/tests/**`
- `apps/docs/src/contents/graph/grammar/mark/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/mark/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/mark/**/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/mark/**/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/mark/**/*.demo.tsx`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。不得在本 ADR 下修改 `packages/kernel/core/**` 的 label schema / compile 行为。

### 测试象限

**Happy path（≥ 3）**：

- `point-mark-node-label-boundary-inside`：PointMark label 使用 `{ boundary:'right', t:0.5 }` + inside lowering 到 core Node.label。
- `interval-mark-node-label-array`：IntervalMark 单个 datum 生成多个 Node.label，数组顺序稳定。
- `path-mark-host-geometry-label`：PathMark label lowering 到 core Path.label，内容由 field/value 解析。
- `reference-line-geometry-label`：ReferenceMark line 使用 geometry label，lowering 到 core Path.label。
- `reference-band-node-label`：ReferenceMark band / region 使用 node label，lowering 到 core Node.label。
- `relation-path-host-label`：RelationMark 顶层 label 在 path 形态 lowering 到 core Path.label，不再伪装成 route step label。
- `relation-ribbon-host-label`：RelationMark 顶层 label 在 ribbon 形态 lowering 到 `IRPath.kind='ribbon'` 的顶层 label。

**边界（≥ 2）**：

- `mark-label-empty-array-rejected`：空 label 数组 schema reject。
- `mark-label-display-format`：field + displayFormat 解析成字符串后写入 core label text。
- `mark-label-constant-value`：value label 不依赖 row，也不要求 field collector 收集。
- `mark-label-missing-field`：缺失 field 走现有 channel resolver 语义，保持 fail-loud 或稳定 stringification 口径。

**错误路径（≥ 2）**：

- `point-mark-rejects-geometry-only-field`：PointMark 使用 `side` / `sloped` 这类 geometry-only 字段 fail-loud。
- `path-mark-rejects-node-only-field`：PathMark 使用 `pin` 这类 node-only 字段 fail-loud，提示需要 geometry label。
- `reference-line-rejects-node-only-field`：ReferenceMark line 使用 node-only 字段 fail-loud。
- `reference-band-rejects-geometry-only-field`：ReferenceMark band / region 使用 geometry-only 字段 fail-loud。
- `relation-mark-rejects-node-only-field`：RelationMark 顶层 label 使用 node-only 字段 fail-loud。
- `mark-label-invalid-position-for-host`：node / geometry 各自非法 position 被 schema reject。
- `mark-label-node-inside-pin-rejected`：node label `placement='inside'` + pin 继续被 core-aligned schema reject。

**交互（≥ 2）**：

- `mark-label-field-collection`：所有 label.content.field 被 field collector 收集，value 不收集。
- `mark-label-custom-channel-delivery`：label 与已有 core node/path channel delivery 同时存在时互不覆盖。
- `react-structured-label-equivalence`：React 结构化 label props 与手写 PlotSpec 产物等价。
- `vanilla-structured-label-equivalence`：Vanilla / SSR 消费相同 label schema，与 React 产物等价。
- `docs-mark-demos-no-text-only-point`：mark demo 中纯文本说明不再新增仅用于文字的 PointMark。

### 依赖的现有元素

- `NodeLabelSchema` / `NodeLabelPlacement` / `NodeLabelBoundaryPositionSchema`（`packages/kernel/core/src/schemas/node.ts`）——引用；plot node label 字段对齐 core。
- `GeometryLabelSchema` / `IRGeometryLabel`（`packages/kernel/core/src/schemas/path/step.ts`）——引用；plot geometry label 字段对齐 core。
- `PathBaseSchema.label`（`packages/kernel/core/src/schemas/path/path.ts`）——引用；PathMark / RelationMark.label 的 lowering 目标。
- `TextChannelSchema`（`packages/graph/plot/src/schemas/encoding/schema.ts`）——参考；`MarkLabelContentSchema` 复用其 field / value / displayFormat 绑定模型，但常量值对齐 core label text。
- `attachDatumLabel`（`packages/graph/plot/src/providers/mark/shared/common.ts`）——修改 / 拆分；升级为共享 node label resolver /投递 helper。
- `applyPathChannelDeliveries`（`packages/graph/plot/src/providers/mark/shared/common.ts`）——引用；path / ribbon label 与 channel delivery 共存。
- `PointMark` / `IntervalMark` / `PathMark` / `ReferenceMark` / `RelationMark` definitions（`packages/graph/plot/src/providers/mark/features/**`）——修改；各自选择 node 或 geometry host。
- `buildPlotSpec`（`packages/graph/plot-react/src/components/build-plot-spec.ts`）——修改；React 结构化 label props 装配为共享 PlotSpec label。

### 多 LLM 设计评估

尚未执行。当前对话使用 `superpowers:brainstorming` 先收敛人机共识并落 ADR；进入实现前需要按 `develop-design` 流程补至少一轮独立设计评估，或由人工明确接受本 ADR 作为实现输入。

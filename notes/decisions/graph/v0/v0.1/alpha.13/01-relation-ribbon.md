# ADR-01：RelationMark ribbon geometry kind

状态：Proposed
决策日期：2026-06-27
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [alpha.12 ADR-13 RelationMark](../alpha.12/13-relation-mark-anchor.md) · [alpha.12 ADR-14 relation routing](../alpha.12/14-relation-derived-data-routing.md) · [core Ribbon schema](../../../../../../packages/kernel/core/src/schemas/ribbon.ts) · [plot-design.md §8](../../../../../architecture/plot-design.md)

## 背景

alpha.12 的 `RelationMark` 已经把“source / target 关系行”收敛成一个统一入口：它复用 position mark 生成的 `anchorId`、支持 projected target、mark-local transform、颜色通道和 provenance，最后把每行关系降低为 core `Path`。

但真实的关系图不总是线。Sankey / alluvial / flow map 这类图形把同样的 source-target 关系画成有面积的流带，宽度表达流量。kernel 侧已经有 `<Ribbon>` / `IRRibbon` 能力，plot 层如果让文档 demo 直接绕到 kernel `<Ribbon>`，就会形成一条平行 authoring 路径：source / target、transform、anchorId、颜色通道都无法复用 `RelationMark` 已有契约。

新增独立 `RibbonMark` 也能解决问题，但第一版要表达的并不是完整 Sankey layout，而是“同一批关系 rows 的几何表现从 path 改成 ribbon”。若另起 mark，会复制 `RelationMark` 的 target 解析、field collection、mark-local transform 和 anchor 错误诊断，违背内置能力复用同一套 definition / lowering 机制的原则。

## 决策：RelationMark 增加 `kind="ribbon"`

`RelationMark` 保持顶层 `type: 'relation'` 不变，新增内部几何子类型字段 `kind?: 'path' | 'ribbon'`。省略 `kind` 时等价于 `kind: 'path'`；path lowering 语义保持现有行为，但 path-only props 从顶层收进 `path` 对象。`kind: 'ribbon'` 时，source / target / transform / color / channels 继续复用 relation 契约，但 lowering 输出 core `ribbon` 子节点，而不是 core `path`。

几何专属字段必须进入对应对象：`path` 承载 path-only 的 route / routing / label / arrow 等语义，`ribbon` 承载 ribbon-only 的 width / taper / sampling 等语义。两者共同能消费的 core 视觉字段由 `style` 对象承载。按 core `PathSchema` 与 `RibbonSchema` 当前交集，共享视觉字段是 `color`、`fill`、`fillOpacity`、`stroke`、`strokeWidth`、`drawOpacity`、`opacity`、`shadow`、`blendMode`、`zIndex`。core 交集里也有 `id`、`meta`、`animations`，但 relation 每行会生成一个 primitive，首轮不把这些作为用户共享样式开放，避免多行 relation 产生重复 id 或覆盖 provenance。

```ts
RelationMarkSchema = {
  type: 'relation',
  kind?: 'path' | 'ribbon', // default path
  source: PlotTargetRef,
  target: PlotTargetRef,

  style?: RelationPrimitiveStyle,

  path?: {
    via?: Array<PlotTargetRef>,
    route?: Array<RelationRouteStep>,
    routing?: RelationRoutingSpec,
    label?: RelationStepLabel,
    options?: RelationPathSpecificOptions,
  },

  ribbon?: {
    width: MarkValue<number>,
    endWidth?: MarkValue<number>,
    curvature?: number,
    options?: RelationRibbonSpecificOptions,
  },

  transform?: Array<Transform>,
  encoding?: {
    color?: Channel,
    channels?: Record<string, Channel>,
  },
}
```

`RelationPathSpecificOptions` 只包含 core Path 专属字段：`dashPattern`、`arrow`、`arrowDetail`、`fillRule`、`lineCap`、`lineJoin`、`roundedCorners`、`thickness`、`rotate`、`scale`、`marks`。共享视觉字段不再放在 `path.options` 中，统一走 `style`。

`RelationRibbonSpecificOptions` 只包含 core Ribbon 专属字段：`interpolation`、`align`、`samples`、`sampling`，以及后续若需要可扩展 endpoint `start` / `end` 的 `direction` / `cap`。`width` 与 `endWidth` 由 relation ribbon 几何直接消费，lowering 映射为 core `start.width` / `end.width` 或等价 centerline width。

`kind: 'ribbon'` 第一版只支持 source -> target 的单段流带。lowering 解析 source / target 后生成一条 centerline ribbon：`move(source) -> cubic(target)`。`curvature` 控制 S 形控制点张力，默认 `0.5`；`width` 是必填流量宽度，`endWidth` 缺省等于 `width`。`fill` 缺省优先取 `style.fill`，其次取 relation `encoding.color` 通道并写入 core ribbon `color` / `fill`，最后交给 core 级默认样式。

`kind: 'ribbon'` 不支持 `path` 对象。`path.via`、`path.route`、`path.routing`、`path.label` 和 `path.options` 都是 path 几何语义：中间折点、step label、arrow、line cap / join 与 ribbon 的面积几何并不等价。需要多段流带或自动 routing 时，后续另起 ADR 扩展 ribbon 子语义。

理由：

1. `RelationMark` 的长期抽象是 source-target relation，而不是只能下沉成 Path 的 line mark；ribbon 是同一关系 rows 的另一种几何输出。
2. `source` / `target` / `anchorId` / `project` / `transform` / `color` 的复用度高，独立 `RibbonMark` 会复制一套 relation target contract。
3. 顶层 `type` 已经是 mark 判别字段，内部子变体按仓库规则使用 `kind`，避免 `type: 'relation'` 与 `type: 'ribbon'` 双重含义冲突。

## 待决策点

- **`curvature` 精确范围**：倾向 `0..1`，`0` 为近似直线控制点，`1` 为更松的 S 形；实现时若需要允许更大张力，必须在 schema 表中补充范围理由。
- **`style` 是否支持 field-bound `shadow` / `blendMode` / `zIndex`**：core Path / Ribbon 都支持这些字段，但当前 plot style channel 是否已有稳定 MarkValue sugar 需要实现期核对。若 channel 已有定义则纳入 `RelationPrimitiveStyleSchema`；若没有，首轮只支持常量。
- **字段命名是否使用 `width` 还是 `value`**：倾向 schema 使用 `width`，因为 lowering 直接消费的是 core ribbon 宽度；文档可解释“业务流量字段通常绑定到 width”。

## DSL 表面

React：

```tsx
<Plot data={flows}>
  <PointMark x="sourceX" y="sourceY" anchorId={{ prefix: 'node', field: 'sourceId' }} opacity={0} />
  <PointMark x="targetX" y="targetY" anchorId={{ prefix: 'node', field: 'targetId' }} opacity={0} />
  <RelationMark
    kind="ribbon"
    source={{ anchorId: { prefix: 'node', field: 'sourceId' }, boundary: true }}
    target={{ anchorId: { prefix: 'node', field: 'targetId' }, boundary: true }}
    style={{
      fill: { kind: 'field', value: 'category' },
      fillOpacity: { kind: 'constant', value: 0.52 },
    }}
    ribbon={{
      width: { kind: 'field', value: 'amount' },
      curvature: 0.58,
    }}
  />
</Plot>
```

PlotSpec / vanilla SSR：

```ts
renderPlot(
  {
    namespace: 'retikz.plot',
    type: 'plot',
    data: { reference: 'flows' },
    coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
    scales: [
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y' },
      { type: 'ordinal', name: '__color' },
    ],
    marks: [
      {
        type: 'relation',
        kind: 'ribbon',
        source: { anchorId: { prefix: 'node', field: 'sourceId' }, boundary: true },
        target: { anchorId: { prefix: 'node', field: 'targetId' }, boundary: true },
        style: {
          fillOpacity: { kind: 'constant', value: 0.52 },
        },
        ribbon: {
          width: { kind: 'field', value: 'amount' },
          curvature: 0.58,
        },
        encoding: { color: { field: 'category', scale: '__color' } },
      },
    ],
  },
  { flows },
);
```

## 测试设计

`packages/graph/plot/tests/lower/relation-ribbon.test.ts` 覆盖 schema accept / reject、source-target 解析、field-bound width / shared style 下沉、projected target 和 anchor target 两条路径。

`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx` 覆盖 React DSL 收集 `kind="ribbon"` 与 nested `ribbon` 配置，不影响既有 path relation。

`packages/graph/plot-vanilla/tests/render-plot.test.ts` 覆盖 SSR 渲染含 `kind: 'ribbon'` 的 PlotSpec，确保 vanilla 仍只消费同一份 spec。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `RelationMark` 从“source-target relation path”扩展为“source-target relation geometry”，默认仍是 path。
- `RelationMarkSchema` 新增 `kind`、`style`、`path` 与 `ribbon` 子配置，并对 path-only / ribbon-only 字段做互斥校验。
- lowering 需要把 relation 的公共 target resolving 与 path/ribbon lowering 拆开，避免复制 anchor 解析逻辑。
- docs 的 `graph/grammar/mark/relation` 页面新增 Sankey ribbon demo，说明 layout rows 由数据准备阶段提供，`RelationMark` 只负责关系流带几何。

## 不在本 ADR 范围

- 不实现 Sankey / alluvial 自动布局、节点分层、堆叠 slot 分配或 crossing reduction。
- 不新增独立 `RibbonMark` / `FlowMark`。
- 不支持 `kind="ribbon"` 的 `path` 对象，也不支持 ribbon route / routing / via / step label。
- 不新增 graph layout、edge bundling、obstacle avoidance。
- 不改变 core `IRRibbon` schema；plot 只消费既有 kernel ribbon 能力。
- 不改交互 hit-test、tooltip 或 hover highlight。

---

## 实现契约（必填）

### Level

`red`

判级理由：本 ADR 改 `@retikz/plot` public schema、`@retikz/plot-react` public props、lowering 行为与包出口类型，并新增用户可见 docs demo。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/mark/constants.ts` | 加 | `RelationGeometryKind` | `{ Path: 'path', Ribbon: 'ribbon' } as const` | — | RelationMark 内部几何子类型，顶层 mark type 仍为 relation |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationPrimitiveStyleSchema` | `z.object({...}).strict()` | — | core Path / Ribbon 共同支持的视觉字段：color / fill / fillOpacity / stroke / strokeWidth / drawOpacity / opacity / shadow / blendMode / zIndex |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationPathGeometrySchema` | `z.object({...}).strict()` | — | path 几何配置：via / route / routing / label / path-only core options |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationPathSpecificOptionsSchema` | Path 专属字段 object | — | core Path 专属字段，不含 shared style，也不含 type / children |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationRibbonOptionsSchema` | `z.object({...}).strict()` | — | relation ribbon 几何配置，下沉为 core `IRRibbon` |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationRibbonSpecificOptionsSchema` | Ribbon 专属字段 object | — | core Ribbon 专属字段，不含 shared style，也不含 type / children / width |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationMarkSchema.kind` | `z.enum(RelationGeometryKind).optional()` | `path` | relation 的几何输出：path 或 ribbon |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationMarkSchema.style` | `RelationPrimitiveStyleSchema.optional()` | — | path / ribbon 共同可用的视觉样式 |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationMarkSchema.path` | `RelationPathGeometrySchema.optional()` | — | `kind: 'path'` 时可用的 path 几何配置 |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RelationMarkSchema.ribbon` | `RelationRibbonOptionsSchema.optional()` | — | `kind: 'ribbon'` 时必填的 ribbon 配置 |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `RelationMarkSchema` superRefine | path/ribbon 互斥规则 | — | path-only 字段与 ribbon-only 字段互斥，ribbon kind 必须提供 `ribbon.width` |
| `packages/graph/plot/src/schemas/mark/types.ts` | 改 | `RelationPrimitiveStyle` | `z.infer<typeof RelationPrimitiveStyleSchema>` | — | 导出 relation 共享视觉样式类型 |
| `packages/graph/plot/src/schemas/mark/types.ts` | 改 | `RelationPathGeometry` | `z.infer<typeof RelationPathGeometrySchema>` | — | 导出 relation path 几何配置类型 |
| `packages/graph/plot/src/schemas/mark/types.ts` | 改 | `RelationRibbonOptions` | `z.infer<typeof RelationRibbonOptionsSchema>` | — | 导出 relation ribbon 配置类型 |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `RelationMarkProps.kind` | `'path' \| 'ribbon'` | `path` | React DSL 选择 relation 几何 |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `RelationMarkProps.style` | `RelationPrimitiveStyle` | — | React DSL 传入 path / ribbon 共享视觉样式 |
| `packages/graph/plot-react/src/components/marks.tsx` | 改 | `RelationMarkProps.path` | `RelationPathGeometry` | — | React DSL 传入 path 专属几何配置，取代顶层 via / route / routing / label |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `RelationMarkProps.ribbon` | `RelationRibbonOptions` | — | React DSL 传入 ribbon 配置 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/schemas/mark/constants.ts`
- `packages/graph/plot/src/schemas/mark/schema.ts`
- `packages/graph/plot/src/schemas/mark/types.ts`
- `packages/graph/plot/src/index.ts`
- `packages/graph/plot/src/providers/mark/features/relation.ts`
- `packages/graph/plot/src/providers/mark/shared/common.ts`
- `packages/graph/plot/tests/lower/relation-mark.test.ts`
- `packages/graph/plot/tests/lower/relation-ribbon.test.ts`
- `packages/graph/plot-react/src/components/marks.tsx`
- `packages/graph/plot-react/src/components/build-plot-spec.ts`
- `packages/graph/plot-react/src/components/index.ts`
- `packages/graph/plot-react/src/index.ts`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`
- `apps/docs/src/contents/graph/grammar/mark/relation/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/mark/relation/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/mark/relation/relation-sankey.demo.tsx`
- `apps/docs/src/contents/graph/grammar/mark/relation/relation-sankey.data.ts`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `relation-ribbon-anchor-targets`：两个 `PointMark anchorId` 生成节点，`RelationMark kind="ribbon"` 用 generated anchor source / target + `boundary: true` → lowering 生成 core `ribbon`，并引用正确目标。
- `relation-ribbon-projected-targets`：source / target 都用 `project` 字段 → lowering 生成单条 core `ribbon`，centerline 起止点来自坐标投影。
- `relation-ribbon-field-width-and-color`：`ribbon.width` 与 `encoding.color` 绑定字段 → 每行 ribbon 宽度和 color/fill 按 row 解析。
- `relation-ribbon-shared-style`：`style.fillOpacity` / `style.stroke` / `style.drawOpacity` / `style.opacity` 同时可下沉到 ribbon primitive。
- `relation-path-default-lowering-unchanged`：不写 `kind` 且使用 `path.route` / `path.label` 的 RelationMark → 仍降低为 core `path`，route / label lowering 语义不变。

**边界（≥ 2）**：

- `relation-ribbon-end-width-omitted`：只给 `width` 不给 `endWidth` → start / end 宽度相同。
- `relation-ribbon-zero-width`：`width` 为 0 → schema 接受，lowering 可生成零宽 ribbon 或跳过；实现需固定一种行为并测试。
- `relation-ribbon-empty-rows`：mark-local transform 后无 rows → 返回 null，不产生空 scope。

**错误路径（≥ 2）**：

- `relation-ribbon-requires-width`：`kind="ribbon"` 缺 `ribbon.width` → schema reject。
- `relation-ribbon-rejects-path-object`：`kind="ribbon"` 同时传 `path` 任一项 → schema reject，错误指向冲突字段。
- `relation-path-rejects-ribbon-options`：默认 path 或 `kind="path"` 同时传 `ribbon` → schema reject。
- `relation-ribbon-negative-width`：field 或常量 width 为负数 → schema 或 lowering fail-loud。

**交互（≥ 2）**：

- `relation-ribbon-mark-local-transform`：`transform: [{ kind: 'relate', ... }]` 派生 source / target / amount → ribbon 使用派生字段，且 scale domain / lower rows 一致。
- `relation-ribbon-anchor-errors`：source / target 通过 generated anchorId 指向不存在的 id → 复用 existing anchor registry 错误格式，包含 mark id / row / generated id。
- `relation-ribbon-react-spec-equivalence`：React DSL 产物与手写 PlotSpec 在 `marks[0]` 上结构等价。
- `relation-ribbon-vanilla-ssr`：`renderPlot` 消费含 relation ribbon 的 PlotSpec → 输出 SVG 中包含 ribbon path primitive，且不需要 vanilla 新 API。

### 依赖的现有元素

- `PlotTargetRef`（`packages/graph/plot/src/schemas/mark/schema.ts`）——扩展使用；ribbon source / target 与 path relation 共用同一 target ref。
- `RelationMark` lowering helpers（`packages/graph/plot/src/providers/mark/features/relation.ts`）——修改；拆出公共 target resolving，分派 path / ribbon geometry。
- `AnchorRegistry`（`packages/graph/plot/src/pipeline/anchors.ts`）——引用；ribbon 复用 anchor 生成、引用和错误诊断。
- `IRRibbon` / `RibbonSchema`（`packages/kernel/core/src/schemas/ribbon.ts`）——引用；plot lowering 输出既有 core ribbon，不改 core schema。
- `Path / Step target`（`@retikz/core`）——引用；ribbon centerline 仍由 core step target 解析。
- `MarkValueType` style schema（`packages/graph/plot/src/schemas/mark/schema.ts`）——扩展；ribbon width 与 shared style 使用既有 field-bound / constant 风格值模式。
- `RelationMark` docs 页面（`apps/docs/src/contents/graph/grammar/mark/relation/`）——修改；新增 Sankey ribbon demo，说明 layout 不在本 ADR 范围。

### 多 LLM 设计评估

尚未执行。当前对话未显式授权使用 subagent / parallel agent；进入实现前需要按 `develop-design` 流程补至少一轮独立设计评估，并把采纳 / 拒绝结论并回本 ADR。

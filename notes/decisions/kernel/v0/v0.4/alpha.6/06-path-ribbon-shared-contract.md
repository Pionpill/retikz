# ADR-06: Path / Ribbon 共享 drawable 契约

- Status: 被 ADR-07 收敛（已使用最终 shared drawable 命名落地）
- Decision date: 2026-06-27
- Owner: core
- Related:
  - [alpha.6 roadmap](./roadmap.md)
  - [ADR-01 Ribbon 可变宽度路径](./01-ribbon.md)
  - [ADR-05 Ribbon host label](./05-ribbon-label.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)

## 收尾说明

本 ADR 的 shared drawable 契约已经通过最终的 [ADR-07](./07-path-kind-registry.md) 命名与 relation host 模型落地。已接受的公开命名是 `DrawableStyleSchema` / `DrawableMetaSchema`，共享 label 来源是 `GeometryLabelSchema`。

## 背景

graph 将 `RelationMark` 定位为 source-target relation mark，同一个 mark 的几何可以 lower 为 core `Path` 或 core `Ribbon`。这自然形成一个 graph 层共享配置：

```ts
RelationMarkSchema = {
  type: "relation",
  kind?: "path" | "ribbon",
  style?: RelationPrimitiveStyle,
  path?: RelationPathOptions,
  ribbon?: RelationRibbonOptions,
};
```

graph 不应靠手写猜测维护 Path / Ribbon 字段交集。core 已经事实存在一组重叠字段：`color`、`fill`、`fillOpacity`、`stroke`、`strokeWidth`、`drawOpacity`、`opacity`、`shadow`、`blendMode`、`zIndex`，以及元素级 `id`、`meta`、`animations`。

当前 style resolution 也已经把 ribbon 作为 path-like host 处理：`resolveEffectiveRibbon` 会被 `resetStyle: ["path"]` 切断，并消费 scope cascade 中 `pathDefault` 的一组手写子集。但这个契约仍是隐式的：`PathDefaultSchema` 从 `PathSchema` 派生，ribbon 只在 compile/style 中手写挑字段。这样 graph 很容易误把 `dashPattern`、`lineCap`、`arrow` 等 path-only 字段当成共享样式传给 ribbon。

本 ADR 将共享层命名、导出并测试，让 graph 能从 core 类型中得到稳定的 `RelationPrimitiveStyle`。

## 决策：抽取 shared drawable schema

新增两个公共 schema：

```ts
export const DrawableGeometryStyleSchema = z.object({
  color: z.string().optional(),
  fill: z.union([z.string(), PaintSpecSchema]).optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  stroke: z.union([z.string(), PaintSpecSchema]).optional(),
  strokeWidth: z.number().finite().nonnegative().optional(),
  drawOpacity: z.number().min(0).max(1).optional(),
  opacity: z.number().min(0).max(1).optional(),
  shadow: z.union([z.enum(ShadowPreset), DropShadowSchema]).optional(),
  blendMode: z.enum(BlendMode).optional(),
});

export const DrawableElementMetadataSchema = z.object({
  id: z.string().min(1).optional(),
  meta: JsonObjectSchema.optional(),
  animations: z.array(AnimationTrackSchema).optional(),
  zIndex: z.number().int().finite().optional(),
});
```

派生类型：

```ts
export type IRDrawableGeometryStyle = z.infer<typeof DrawableGeometryStyleSchema>;
export type IRDrawableElementMetadata = z.infer<typeof DrawableElementMetadataSchema>;
export type IRDrawableSharedStyle = IRDrawableGeometryStyle & Pick<IRDrawableElementMetadata, "zIndex">;
```

使用规则：

1. `PathSchema` 由 `DrawableGeometryStyleSchema`、`DrawableElementMetadataSchema` 和 path-only fields 组合而成。
2. `RibbonSchema` 由同一组 shared schemas 和 ribbon-only fields 组合而成。
3. `id`、`meta`、`animations` 是 element metadata，不属于 graph `RelationMark.style` 的普通共享样式。graph 关系行可能生成多个 core children，这三个字段应由 graph provenance / hydration 规则单独处理。
4. `zIndex` 虽是 metadata schema 的一员，但可作为 relation-level draw order 字段暴露给 graph，只要 graph 文档说明其作用于生成的 relation child 或 relation layer。
5. `color` 仍是 host master color，但 fallback 展开由 host 决定：Path 的 `color` 默认 stroke，并传给 arrow / label；Ribbon 的 `color` 默认 fill。core 应文档化差异，不强行改成同义。

Graph 可共享字段为：

```ts
type RelationPrimitiveStyle = Pick<
  IRDrawableGeometryStyle & Pick<IRDrawableElementMetadata, "zIndex">,
  | "color"
  | "fill"
  | "fillOpacity"
  | "stroke"
  | "strokeWidth"
  | "drawOpacity"
  | "opacity"
  | "shadow"
  | "blendMode"
  | "zIndex"
>;
```

## Path-only 与 Ribbon-only 字段

Path-only 字段留在 `PathSchema` 与 graph `RelationMark.path`：

```ts
dashPattern
arrow
arrowDetail
fillRule
lineCap
lineJoin
roundedCorners
thickness
rotate
scale
marks
children
```

这些字段描述 stroked line、path fill winding、path adornment 或整条 path 几何，不属于 filled band 的共享样式。

Ribbon-only 字段留在 `RibbonSchema` 与 graph `RelationMark.ribbon`：

```ts
kind
width
start
end
interpolation
align
samples
sampling
upper
lower
children
label
```

这些字段定义带状面几何、采样、显式边界或 ribbon host label，不属于普通 stroked path。`label` 是 Ribbon 顶层字段，但其内部 label 契约按 ADR-05 与 Path step label 保持一致。

## Scope default contract

首版保留现有 `pathDefault`，但把含义改为“path-like geometry default”：

```ts
pathDefault: PathDefaultSchema
```

规则：

1. 对 `Path`，`pathDefault` 完整生效，包含 path-only fields。
2. 对 `Ribbon`，`pathDefault` 只通过 `DrawableGeometryStyleSchema` 子集生效。
3. `resetStyle: ["path"]` 继续切断 Path 与 Ribbon 的 path-like shared style 通道。
4. `id`、`meta`、`animations`、`zIndex` 不进入 default / cascade。现有 `PathDefaultSchema` 已排除这些实例级字段，保持不变。
5. `labelDefault` 与 `arrowDefault` 继续是独立通道，不受 shared drawable schema 抽取影响。

暂不新增 `ribbonDefault`。未来若需要 ribbon-specific defaults，可另起 ADR，预期优先级为：

```text
scope cascade < pathDefault shared subset < ribbonDefault < ribbon element
```

## Label shared contract

若 ADR-05 实现 `Ribbon.label`，Path step label 与 Ribbon host label 应共享同一份 label schema 和派生类型，而不是只共享 text / position、再各自发明 side。

必须抽取：

```ts
export const GeometryLabelSchema = z.object({
  text: z.union([z.string(), MixedLineSchema]),
  position: z.union([z.enum(StepLabelPosition), z.number().min(0).max(1)]).optional(),
  side: z.enum(StepLabelSide).optional(),
  textColor: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  font: FontSchema.optional(),
}).strict();

export type IRGeometryLabel = z.infer<typeof GeometryLabelSchema>;
```

然后：

- `StepLabelSchema` 作为 Path step label 的语义别名复用 `GeometryLabelSchema`。
- `RibbonLabelSchema` 作为 Ribbon host label 的语义别名复用 `GeometryLabelSchema`。
- `IRStepLabel` 与 `IRRibbonLabel` 都应来自 `IRGeometryLabel`，仅保留语义别名，不能各自 `z.infer` 一份独立 object schema。
- `Ribbon.label` 是 ribbon-only 顶层字段；但 label 内部的 `position`、`side`、`textColor`、`opacity`、`font` 与 Path step label 保持一致。
- 编译层通过共同的 label emission helper 保持 Path / Ribbon 的 side 与 `sloped` 行为一致。

如果实现阶段选择把 `GeometryLabelSchema` 放在 `path/step.ts` 而不是 `drawable.ts`，也必须保持导出命名清晰，让 Path 与 Ribbon 都从同一个定义导入。不能让 `RibbonLabelSchema` 演化出第二套 label API。

## DSL 表面

core 用户可直接复用 shared type：

```ts
import type { IRDrawableGeometryStyle, IRDrawableElementMetadata } from "@retikz/core";

type RelationPrimitiveStyle = Pick<
  IRDrawableGeometryStyle & Pick<IRDrawableElementMetadata, "zIndex">,
  | "color"
  | "fill"
  | "fillOpacity"
  | "stroke"
  | "strokeWidth"
  | "drawOpacity"
  | "opacity"
  | "shadow"
  | "blendMode"
  | "zIndex"
>;
```

Graph lowering 示例：

```ts
const sharedStyle = mark.style satisfies RelationPrimitiveStyle;

const path: IRPath = {
  type: "path",
  ...sharedStyle,
  children: loweredSteps,
  ...(mark.path ?? {}),
};

const ribbon: IRRibbon = {
  type: "ribbon",
  ...sharedStyle,
  children: loweredCenterline,
  ...(mark.ribbon ?? {}),
};
```

## 测试设计

测试重点不是改变 Path / Ribbon 行为，而是锁住契约边界：

- Path / Ribbon 都接受 shared drawable fields。
- path-only 字段仍被 RibbonSchema 拒绝。
- ribbon-only 字段仍被 PathSchema 拒绝。
- `pathDefault` 对 Path 完整生效，对 Ribbon 仅应用 shared subset。
- `color` 的 host-specific fallback 仍不同。
- `Ribbon.label` 内部契约与 Path step label 一致，包括 `position` 与 `side` vocabulary。

## 影响

- `packages/kernel/core/src/schemas/drawable.ts` 新增 shared schemas 与派生类型。
- `PathSchema`、`RibbonSchema` 改为组合 shared schemas，保持最终字段名不变。
- `compile/style.ts` 用 shared helper 选择 ribbon 消费的 `pathDefault` 子集，替代手写字段对象。
- `ScopeSchema.pathDefault` 文档改成 path-like geometry default，并明确 Ribbon 只消费 shared subset。
- `@retikz/core` 顶层导出 shared types，供 graph 直接 Pick。
- docs reference 需要说明 Path / Ribbon shared contract、path-only / ribbon-only 字段边界、`color` fallback 差异与 label 契约一致性。

## 不在本 ADR 范围

- 不让所有 `PathSchema` 字段对 `RibbonSchema` 合法。
- 不让所有 `RibbonSchema` 字段对 `PathSchema` 合法。
- 不给 Ribbon 增加 `arrow`、`dashPattern`、`lineCap` 或 `lineJoin`。
- 不给 Path 增加 `width`、`align` 或 sampling controls。
- 不改变 `color` 在 Path 与 Ribbon 上的 host-specific fallback。
- 不把 `id`、`meta`、`animations` 暴露为 graph relation-row shared style。
- 不新增 `ribbonDefault`。

---

## 实现契约

### Level

`red`

本 ADR 修改 core schema 组合、public type export、scope default 文档与 style resolution helper，属于公开契约级改动。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.color` | `string` | 无 | host master color；Path 默认 stroke，Ribbon 默认 fill |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.fill` | `string \| PaintSpec` | 无 | path / ribbon 共享填充 paint |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.fillOpacity` | `number 0..1` | 无 | 共享 fill opacity |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.stroke` | `string \| PaintSpec` | 无 | 共享 outline / stroke paint |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.strokeWidth` | finite nonnegative number | 无 | 共享 stroke width |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.drawOpacity` | `number 0..1` | 无 | 共享 stroke / outline opacity |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.opacity` | `number 0..1` | 无 | 共享 host opacity |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.shadow` | shadow preset or object | 无 | host primary geometry shadow |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableGeometryStyleSchema.blendMode` | `BlendMode` | 无 | host primary geometry blend mode |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableElementMetadataSchema.id` | nonempty string | 无 | element hydration / reference id |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableElementMetadataSchema.meta` | JSON object | 无 | element provenance metadata |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableElementMetadataSchema.animations` | `Array<AnimationTrack>` | 无 | element animation tracks |
| `packages/kernel/core/src/schemas/drawable.ts` | 新增 | `DrawableElementMetadataSchema.zIndex` | finite int | 无 | sibling draw order |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema` / `IRGeometryLabel` | object / inferred type | 无 | path / ribbon label 共用文本、位置、side 与样式字段 |
| `packages/kernel/core/src/schemas/path/path.ts` | 修改 | shared style / metadata fields | compose shared schemas | 无 | 字段名与行为保持不变 |
| `packages/kernel/core/src/schemas/path/step.ts` | 修改 | `StepLabelSchema` / `IRStepLabel` | alias of `GeometryLabelSchema` / `IRGeometryLabel` | 无 | 字段名与行为保持不变，不维护独立 schema |
| `packages/kernel/core/src/schemas/ribbon.ts` | 修改 | shared style / metadata fields | compose shared schemas | 无 | 字段名与行为保持不变 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonLabelSchema` / `IRRibbonLabel` | alias of `GeometryLabelSchema` / `IRGeometryLabel` | 无 | ribbon host label 的语义别名，不维护独立 schema |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonSchema.label` | `IRGeometryLabel \| Array<IRGeometryLabel>` | 无 | ribbon host label，内部契约与 Path step label 一致 |
| `packages/kernel/core/src/schemas/scope.ts` | 修改 | `pathDefault` description | `PathDefaultSchema` | 无 | Path 完整消费，Ribbon 只消费 shared drawable subset |

### 文件 scope

允许修改：

- `packages/kernel/core/src/schemas/drawable.ts`
- `packages/kernel/core/src/schemas/path/path.ts`
- `packages/kernel/core/src/schemas/path/step.ts`
- `packages/kernel/core/src/schemas/ribbon.ts`
- `packages/kernel/core/src/schemas/scope.ts`
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/src/compile/style.ts`
- `packages/kernel/core/src/compile/path/label.ts`，仅限抽取共享 label helper，不改变现有 Path label 行为
- `packages/kernel/core/src/compile/ribbon.ts`，仅限接入 shared label helper
- `packages/kernel/core/tests/ir/*drawable*.test.ts`
- `packages/kernel/core/tests/ir/*path*.test.ts`
- `packages/kernel/core/tests/ir/*ribbon*.test.ts`
- `packages/kernel/core/tests/compile/scope-style-inheritance.test.ts`
- `packages/kernel/core/tests/compile/ribbon.test.ts`
- `packages/kernel/core/tests/compile/ribbon-label.test.ts`
- `apps/docs/src/contents/core/reference/schema/**`
- `apps/docs/src/contents/core/components/draw/ribbon/**`
- `apps/docs/src/contents/core/components/draw/path/**`

不允许在本 ADR 下修改：

- `packages/graph/**`
- renderer primitive 类型系统
- Path / Ribbon 几何 lowering 语义，除 `Ribbon.label` 使用共享 label helper 外
- 新增 `ribbonDefault`
- 新增 ribbon arrow / dash / lineCap / lineJoin

### 测试象限

Happy path：

- `drawable-shared-path-accepts-style`: PathSchema 接受 shared drawable fields。
- `drawable-shared-ribbon-accepts-style`: RibbonSchema 接受 shared drawable fields。
- `drawable-shared-type-pick`: `IRDrawableGeometryStyle` 可用于构造 relation shared style。
- `geometry-label-contract-shared`: Path step label 与 Ribbon label 接受相同 `position` / `side` / text style vocabulary。
- `geometry-label-schema-single-source`: `StepLabelSchema` 与 `RibbonLabelSchema` 来自同一个 `GeometryLabelSchema` 定义，派生类型来自同一个 `IRGeometryLabel`。

边界：

- `drawable-shared-path-default-ribbon-subset`: `pathDefault` 中 shared subset 影响 Ribbon。
- `drawable-shared-path-default-path-only-ignored-for-ribbon`: `pathDefault` 中 path-only 字段不影响 Ribbon。
- `drawable-shared-z-index-relation-style`: `zIndex` 可进入 graph shared style 类型，但不进入 scope default。
- `drawable-shared-color-fallback`: Path `color` fallback 到 stroke，Ribbon `color` fallback 到 fill。

错误路径：

- `drawable-shared-ribbon-rejects-path-only`: RibbonSchema 拒绝 `arrow` / `dashPattern` / `lineCap`。
- `drawable-shared-path-rejects-ribbon-only`: PathSchema 拒绝 `width` / `align` / `sampling`。
- `drawable-shared-rejects-metadata-in-style-helper`: relation style helper 不包含 `id` / `meta` / `animations`。
- `geometry-label-ribbon-rejects-private-side`: Ribbon label 拒绝 `center` / `upper` / `outside-upper` 等非 Path label side。

交互：

- `drawable-shared-reset-style-path`: `resetStyle: ["path"]` 同时切断 Path 与 Ribbon 的 shared style cascade。
- `drawable-shared-label-default-independent`: `labelDefault` 不被 drawable style extraction 改变。
- `drawable-shared-arrow-default-independent`: `arrowDefault` 不被 drawable style extraction 改变。
- `drawable-shared-doc-schema-export`: shared schemas / types 从 core public entry 可导入。

### 依赖的现有元素

- `PathSchema` / `RibbonSchema`：拆分并重组 shared 与 host-specific 字段。
- `PathDefaultSchema`：保留 public field，调整描述和 ribbon consumption helper。
- `resolveEffectivePath` / `resolveEffectiveRibbon`：把 shared subset 选择集中到 helper。
- `GeometryLabelSchema` / `IRGeometryLabel`：作为 Path step label 与 Ribbon label 的唯一 schema / type 来源。
- `StepLabelSchema` / `StepLabelSide` / `StepLabelPosition`：保留 Path step label 的既有命名与 vocabulary。
- `emitLabelPrimitive` / `tForLabelPosition`：供 Path 与 Ribbon 共用 label emission。
- `PaintSpecSchema`、`DropShadowSchema`、`BlendMode`、`AnimationTrackSchema`、`JsonObjectSchema`：shared schema 的现有组成部分。
- graph 后续 `RelationMark` lowering：消费 core 导出的 shared type，而不是在 graph 内重写字段交集。

### 设计评估记录

按 `develop-design`，red ADR 应做独立多 LLM 设计评估。当前 Codex 工具规则要求只有用户明确要求 sub-agent / 并行 agent 时才能 spawn sub-agent，因此本 ADR 草案尚未执行独立模型评估。进入实现前需由人工确认是否补评估，或明确接受当前草案作为实现输入。

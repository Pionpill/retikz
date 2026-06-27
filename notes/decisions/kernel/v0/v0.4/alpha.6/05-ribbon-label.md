# ADR-05: Ribbon host label

- Status: Proposed
- Decision date: 2026-06-27
- Owner: core
- Related:
  - [alpha.6 roadmap](./roadmap.md)
  - [ADR-01 Ribbon 可变宽度路径](./01-ribbon.md)
  - [ADR-02 Ribbon 边界与对齐增强](./02-ribbon-boundary-and-alignment.md)
  - [ADR-03 Ribbon 自定义圆弧端帽](./03-ribbon-arc-cap.md)
  - [ADR-06 Path / Ribbon 共享 drawable 契约](./06-path-ribbon-shared-contract.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)

## 背景

graph 已经把 `RelationMark kind="ribbon"` lower 为 core `Ribbon`，用于 Sankey / alluvial 等 source-target relation row。下一类标签需求不是 block name。`a1`、`A`、`AA` 这类 block 标签属于矩形节点，应使用 ADR-04 扩展后的 `Node.label`。

本 ADR 处理属于 flow band 自身的文字：

- flow amount，例如 `128`、`42%`、`$2.1M`
- route label，例如 `A -> BB`
- alluvial transition label，语义属于带状流，而不是任一 endpoint block

如果用 sibling text node 表达这些标签，graph 必须预先计算 label coordinate，且该 text 不再属于 ribbon host。这样会丢失 host 关系、provenance、未来 interaction / policy 的自然落点。核心能力应落在 `Ribbon.label`，由 ribbon compiler 使用自身采样几何决定 label 位置。

现有 `Ribbon.children` 是 centerline steps，不是任意 child 容器；编译器也会 strip step label，因此复用 centerline step label 作为公开写法不是合适的 authoring surface。

## 决策：`Ribbon` 增加顶层 `label`

新增 ribbon-level label 字段，但 label 的内部属性与 Path step label 必须共用同一套 schema 和派生类型。Ribbon 不引入自己的 `center` / `upper` / `outside-upper` 等 side vocabulary，也不新增 `rotate`、`offset`、`keepUpright` 等 ribbon 专用属性。

实现方式是在 core schema 中抽取公共几何标签契约：

```ts
export const GeometryLabelSchema = z.object({
  text: z.union([z.string(), MixedLineSchema]),
  position: z.union([z.enum(StepLabelPosition), z.number().min(0).max(1)]).optional(),
  side: z.enum(StepLabelSide).optional(),
  textColor: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  font: FontSchema.optional(),
}).strict();

export const StepLabelSchema = GeometryLabelSchema;
export const RibbonLabelSchema = GeometryLabelSchema;
export type IRGeometryLabel = z.infer<typeof GeometryLabelSchema>;
export type IRStepLabel = IRGeometryLabel;
export type IRRibbonLabel = IRGeometryLabel;

export const RibbonSchema = z.object({
  // existing fields
  label: z.union([RibbonLabelSchema, z.array(RibbonLabelSchema).min(1)]).optional(),
});
```

`StepLabelSchema` 和 `RibbonLabelSchema` 仅作为语义别名导出，不应各自维护一份 object schema。实现层和测试层也应引用同一个 `IRGeometryLabel` 派生类型，避免 Path / Ribbon label 字段后续漂移。

默认语义：

1. `position` 默认 `"midway"`，与 Path step label 一致。
2. `side` 默认 `"above"`，与 Path step label 一致。
3. `side` 合法值为 `"above" | "below" | "left" | "right" | "sloped"`，不为 ribbon 增加另一组 side。
4. `textColor`、`font`、`opacity` 与 Path step label 使用同一解释。
5. label opacity 与 host ribbon opacity 相乘，沿用 path step label 的元素内 opacity 模型。

几何语义：

- centerline ribbon 使用 ribbon lowering 过程中的 centerline sample：point、tangent、normal。
- `position` 沿 ribbon centerline 的归一化长度采样，keyword 到 `t` 的映射复用 Path label helper。
- `above` / `below` / `left` / `right` / `sloped` 的含义与 Path step label 保持一致，基于采样 tangent 解释，而不是基于 ribbon band 的 upper / lower boundary 解释。
- `sloped` 使用 Path step label 的旋转行为。若当前 Path label 没有 `keepUpright`，Ribbon label 也不额外增加。
- 编译实现应优先复用 `compile/path/label.ts` 中的 label emission helper；必要时把 helper 参数抽成 path/ribbon 都能提供的 `SegmentSample`。

boundary ribbon 首版不支持 `label`。若 `kind: "boundary"` 与 `label` 同时出现，compile 应抛出清晰诊断。后续若需要 boundary label，应先把 boundary pair-sampling 抽象成可以得到 center / tangent / normal 的公共 sample，而不是改变 `Ribbon.label` 的 public schema。

理由：

1. label 属于 ribbon host，而不是实现步骤上的 step label；顶层字段更符合 provenance 与 interaction 关系。
2. Ribbon 与 Path 都是 path-like host；label 位置、side、字体和颜色契约应保持一致，减少用户和 LLM 需要学习的概念。
3. band-aware side 容易把 ribbon 几何截面暴露成 public label 语义，和 Path label 分裂；当前 graph 需求只要求 flow label 沿带状流放置，不要求精确贴 upper / lower boundary。
4. 首版拒绝 boundary labels，避免在 ADR-02 的 boundary geometry 上叠加尚未验证的 pair-sampling 语义。

## DSL 表面

React:

```tsx
<Ribbon
  width={18}
  fill="#60a5fa"
  fillOpacity={0.5}
  label={{
    text: "128",
    position: "midway",
    side: "sloped",
    textColor: "#0f172a",
    font: { size: 10, weight: "bold" },
  }}
>
  <Step kind="move" to={[0, 0]} />
  <Step kind="cubic" control1={[40, 0]} control2={[60, 40]} to={[100, 40]} />
</Ribbon>
```

Vanilla / JSON IR 使用同一字段：

```ts
ribbon(
  [
    { type: "step", kind: "move", to: [0, 0] },
    {
      type: "step",
      kind: "cubic",
      control1: [40, 0],
      control2: [60, 40],
      to: [100, 40],
    },
  ],
  {
    width: 18,
    fill: "#60a5fa",
    label: {
      text: "128",
      position: 0.5,
      side: "sloped",
    },
  },
);
```

Graph lowering 后续可将 datum field 解析为 JSON-safe core label：

```tsx
<RelationMark
  kind="ribbon"
  ribbon={{
    width: { kind: "field", value: "width" },
    label: {
      text: { field: "amountLabel" },
      position: 0.5,
      side: "sloped",
    },
  }}
/>
```

上例是 plot / graph follow-up，不在本 ADR 中实现。

## 测试设计

`packages/kernel/core/tests/compile/ribbon-label.test.ts` 覆盖：

- schema accept / reject
- centerline label 采样位置
- side 语义与 Path step label 一致
- style / opacity / multiple labels
- boundary mode 的明确拒绝

## 影响

- `packages/kernel/core/src/schemas/ribbon.ts` 增加 `Ribbon.label`，其内部 schema 复用公共 `GeometryLabelSchema`。
- `packages/kernel/core/src/schemas/path/step.ts` 的 `StepLabelSchema` 改为公共 `GeometryLabelSchema` 的语义别名或 re-export。
- `packages/kernel/core/src/compile/ribbon.ts` 需要为 centerline ribbon label 提供 point / tangent sample，并复用 path label emission helper。
- 输出从单一 ribbon `PathPrim` 变成 ribbon path + label `TextPrim` / sloped label `GroupPrim`。
- ribbon host id / meta / animations 仍只 stamp 在 ribbon path 上，label 不重复 stamp，除非后续 ADR 明确改变 provenance 策略。
- React / Vanilla 的 Ribbon props / field list / builder config 需要透传 `label`。
- 文档需要更新 ribbon component page、schema reference，并新增 label demo。

## 不在本 ADR 范围

- 不用 ribbon label 表达 Sankey block names。
- 不新增 ribbon 专用 label side vocabulary。
- 不新增 ribbon 专用 label `offset`、`rotate`、`keepUpright`。
- 不实现自动碰撞避让、自动隐藏窄 ribbon label、自动对比色、自动换行或 callout。
- 不让 ribbon label 参与 layout 或 viewBox expansion 的新策略；若现有 compile 顶层 bbox 收集附属 primitive points，需要保持一致，不额外做 collision / clipping。
- 不支持 boundary ribbon label 首版。
- 不暴露 sampled boundary points 为公共 Scene primitive。
- 不实现 plot / graph 的 public API 与 field-bound lowering。

---

## 实现契约

### Level

`red`

本 ADR 修改 core IR schema、compile lowering、public authoring surface 与 docs。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema.text` | `string \| MixedLine` | 无 | path / ribbon 共用 label 文本 |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema.position` | step label keyword union 或 `number 0..1` | `"midway"` at compile | 沿 path-like centerline 的归一化位置 |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema.side` | `"above" \| "below" \| "left" \| "right" \| "sloped"` | `"above"` at compile | 相对 path-like tangent 的 label side |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema.textColor` | `string` | inherited / currentColor | label 文字颜色 |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema.opacity` | `number 0..1` | 无 | label 自身 opacity，与 host opacity 相乘 |
| `packages/kernel/core/src/schemas/drawable.ts` 或 `packages/kernel/core/src/schemas/path/step.ts` | 新增 | `GeometryLabelSchema.font` | `FontSchema` | renderer default | label 字体 |
| `packages/kernel/core/src/schemas/path/step.ts` | 修改 | `StepLabelSchema` / `IRStepLabel` | alias of `GeometryLabelSchema` / `IRGeometryLabel` | 无 | path step label 的语义别名，不维护独立 schema |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonLabelSchema` / `IRRibbonLabel` | alias of `GeometryLabelSchema` / `IRGeometryLabel` | 无 | ribbon host label 的语义别名，不维护独立 schema |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonSchema.label` | `RibbonLabel \| Array<RibbonLabel>` | 无 | 附属于 ribbon host 的 flow label，内部契约与 Path label 一致 |
| `packages/kernel/core/src/schemas/index.ts` / `packages/kernel/core/src/index.ts` | 修改 | export | named export | 无 | 暴露 ribbon label schema 与派生类型 |

禁止新增：

- `RibbonLabelSide`
- `RibbonLabelRotate`
- `RibbonLabelSchema.offset`
- `RibbonLabelSchema.rotate`
- `RibbonLabelSchema.keepUpright`

### 文件 scope

允许修改：

- `packages/kernel/core/src/schemas/ribbon.ts`
- `packages/kernel/core/src/schemas/path/step.ts`
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/src/compile/ribbon.ts`
- `packages/kernel/core/src/compile/path/label.ts`，仅限复用、抽取或导出 label position / emission helper，不能改变既有 step label public behavior
- `packages/kernel/core/tests/compile/ribbon-label.test.ts`
- `packages/kernel/core/tests/compile/ribbon.test.ts`
- `packages/kernel/core/tests/ir/*ribbon*.test.ts`
- `packages/kernel/react/src/kernel/Ribbon.tsx`
- `packages/kernel/react/src/kernel/_fields.ts`
- `packages/kernel/react/src/kernel/builder.ts`
- `packages/kernel/react/src/kernel/unbuilder.ts`
- `packages/kernel/react/tests/kernel/*.test.tsx`
- `packages/kernel/vanilla/src/builder/ribbon.ts`
- `packages/kernel/vanilla/src/builder/types.ts`
- `packages/kernel/vanilla/tests/*.test.ts`
- `apps/docs/src/contents/core/components/draw/ribbon/**`
- `apps/docs/src/contents/core/reference/schema/**`

不允许在本 ADR 下修改：

- `packages/graph/**`
- renderer primitive 类型系统
- 与 ribbon label 无关的 Node / Path / Layout 行为
- PaintSpec schema

### 测试象限

Happy path：

- `ribbon-label-midway-sloped`: centerline ribbon emitted path 后，label 位于 centerline midpoint，并使用 Path label 的 `sloped` 行为。
- `ribbon-label-position-keywords`: `near-start` / `midway` / `near-end` 映射到稳定采样位置。
- `ribbon-label-side-above-below`: `above` / `below` 与 Path step label 的偏移方向一致。
- `ribbon-label-side-left-right`: `left` / `right` 与 Path step label 的轴向解释一致。

边界：

- `ribbon-label-zero-width`: zero-width ribbon 的 label 不崩溃。
- `ribbon-label-endpoints`: `position=0` / `position=1` 分别贴在 start / end sample。
- `ribbon-label-multiple`: array label 稳定按输入顺序 emit。
- `ribbon-label-step-label-equivalence`: 相同 centerline 的 Path step label 与 Ribbon label 使用同一 position / side vocabulary。

错误路径：

- `ribbon-label-invalid-position`: numeric position 超出 `[0, 1]` 被 schema 拒绝。
- `ribbon-label-invalid-side`: unknown side literal 被 schema 拒绝。
- `ribbon-label-reject-ribbon-only-side`: `"center"` / `"upper"` / `"outside-upper"` 等 ribbon-only side 不存在且被 schema 拒绝。
- `ribbon-label-reject-ribbon-only-rotation`: `rotate` / `keepUpright` / `offset` 被 strict schema 拒绝。
- `ribbon-label-boundary-kind-first-version`: `kind="boundary"` + `label` 编译失败，诊断说明首版仅支持 centerline ribbon labels。

交互：

- `ribbon-label-opacity`: ribbon opacity 0.5 + label opacity 0.5 -> label opacity 0.25。
- `ribbon-label-style`: font / textColor 保留并落到 `TextPrim`。
- `ribbon-label-animation-host`: ribbon animations 仍只 stamp 在 ribbon path，不意外作用于 label。
- `ribbon-label-sampling`: fixed / adaptive sampling 或 analytic fallback 中 label position 在预期容差内稳定。

### 依赖的现有元素

- `GeometryLabelSchema` / `IRGeometryLabel`：作为 Path step label 与 Ribbon label 的唯一 schema / type 来源。
- `StepLabelSchema` / `StepLabelSide` / `StepLabelPosition`（`packages/kernel/core/src/schemas/path/step.ts`）：保留 Path step label 的既有命名与 vocabulary。
- `tForLabelPosition` 与 label emission helper（`packages/kernel/core/src/compile/path/label.ts`）：复用 label position keyword 到 `t` 的映射以及 side / sloped 行为。
- `RibbonSchema`（`packages/kernel/core/src/schemas/ribbon.ts`）：扩展顶层 label。
- `RibbonCrossSection` / `ribbonCrossSection`（`packages/kernel/core/src/compile/ribbon.ts`）：提供 center / tangent / width；label 只消费 center / tangent。
- `sampleAtDistance` 与 segment sampling pipeline：用于按 normalized position 定位。
- `layoutInlineLine` / `resolveLineRuns`（`packages/kernel/core/src/compile/text-layout.ts`）：复用 mixed text / math label 排版。
- `TextPrim` / `GroupPrim`：继续使用现有 Scene primitive，不新增 `RibbonLabelPrim`。
- React / Vanilla Ribbon builders：只透传 core IR，不新增 adapter 私有语义。

### 设计评估记录

按 `develop-design`，red ADR 应做独立多 LLM 设计评估。当前 Codex 工具规则要求只有用户明确要求 sub-agent / 并行 agent 时才能 spawn sub-agent，因此本 ADR 草案尚未执行独立模型评估。进入实现前需由人工确认是否补评估，或明确接受当前草案作为实现输入。

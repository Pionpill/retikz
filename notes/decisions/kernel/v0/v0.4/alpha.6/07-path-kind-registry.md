# ADR-07: Path kind registry 与 Ribbon 合并

- 状态：已接受
- 决策日期：2026-06-27
- Owner：core
- 关联：
  - [alpha.6 roadmap](./roadmap.md)
  - [ADR-01 Ribbon variable-width path](./01-ribbon.md)
  - [ADR-02 Ribbon boundary and alignment](./02-ribbon-boundary-and-alignment.md)
  - [ADR-03 Ribbon arc cap](./03-ribbon-arc-cap.md)
  - [ADR-05 Ribbon host label](./05-ribbon-label.md)
  - [ADR-06 Path / Ribbon shared drawable contract](./06-path-ribbon-shared-contract.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)

## 收尾备注

本 ADR 已作为 alpha.6 的最终公开契约接受。早期独立 Ribbon ADR 保留为设计历史；实际发布的 relation path 扩展点是 `Path.kind`，内置 ribbon 实现是 `kind: "ribbon"`。

## 背景

ADR-01 到 ADR-06 先把 `Ribbon` 作为独立 path-like IR child 引入，随后又逐步让它和 `Path` 共享 label、样式字段、`pathDefault` 与 relation 语义。现在这个拆分已经更像历史偶然：两者都描述沿一条路径表达关系，两者都 lower 到 renderer-agnostic 的 `PathPrim`，graph 也更需要一个统一 relation primitive surface，而不是继续维护手写的 `Path | Ribbon` 字段交集。

独立的 `type: "ribbon"` 也会削弱未来扩展能力。大型箭头、tapered relation、metro route casing 或自定义宽路径，本质上都不是新的顶层 drawable family，而是“如何把 path host 转换为 scene geometry”的不同策略。如果每一种几何模式都新增一个顶层 `type`，graph 与下游 adapter 会不断重新学习近似相同的 host 契约。

更合适的抽象是：`Path` 是关系路径宿主，`kind` 是可插拔的几何 lowering 策略。内置 `stroke` 与 `ribbon` 也应该只是这个 contract 下的 provider，而不是 extension 无法复用的特权分支。

## 决策：Ribbon 合并进 Path，并让 Path.kind 可扩展

`Path` 成为唯一 path-like relation host。`RibbonSchema` 与 `IRRibbon` 从公开 core IR 中移除。内置 ribbon 能力表示为 `type: "path", kind: "ribbon"`，ribbon 专属参数放在 `ribbon` 对象中。现有 stroked path 表示为 `type: "path", kind: "stroke"`；为了 authoring 便利，省略 `kind` 时等价于 `stroke`。

ADR-06 中新增的 `DrawableGeometryStyleSchema` / `DrawableElementMetadataSchema` 命名过长，本 ADR 一并改名为更短的 `DrawableStyleSchema` / `DrawableMetaSchema`，派生类型改为 `IRDrawableStyle` / `IRDrawableMeta` / `IRDrawableSharedStyle`。字段集合不变，仅调整公开命名。

```ts
export const BuiltinPathKind = {
  Stroke: 'stroke',
  Ribbon: 'ribbon',
} as const;

export const PathSchema = z.object({
  type: z.literal('path'),
  kind: z.string().min(1).optional(),

  ...DrawableMetaSchema.shape,
  ...DrawableStyleSchema.shape,

  // 所有 path kind 共享的 host label；step label 仍留在 Step 上。
  label: z.union([GeometryLabelSchema, z.array(GeometryLabelSchema).min(1)]).optional(),

  // stroke kind 字段。
  dashPattern: z.array(z.number().finite().nonnegative()).min(1).optional(),
  arrow: z.enum(['none', '->', '<-', '<->']).optional(),
  arrowDetail: ArrowDetailSchema.optional(),
  fillRule: z.enum(['nonzero', 'evenodd']).optional(),
  lineCap: z.enum(['butt', 'round', 'square']).optional(),
  lineJoin: z.enum(['miter', 'round', 'bevel']).optional(),
  roundedCorners: z.number().finite().nonnegative().optional(),
  thickness: z.enum([
    'ultraThin',
    'veryThin',
    'thin',
    'semithick',
    'thick',
    'veryThick',
    'ultraThick',
  ]).optional(),
  rotate: z.number().finite().optional(),
  scale: PathScaleSchema.optional(),
  marks: z.array(PathMarkPlacementSchema).optional(),

  // 内置 ribbon kind 参数。
  ribbon: RibbonPathOptionsSchema.optional(),

  // 注册的非内置 kind 使用的 JSON-safe 参数。
  kindOptions: JsonObjectSchema.optional(),

  // stroke / centerline ribbon 的 step 序列。schema 层可选，内置 refinement 或 provider 决定是否必填。
  children: z.array(StepSchema).min(2).optional(),
}).strict().superRefine(validateBuiltinPathKinds);
```

`RibbonPathOptionsSchema` 收纳原 `RibbonSchema` 的参数，但原先用于 ribbon 构造模式的 `Ribbon.kind` 改名为 `ribbon.mode`，避免和新的 `Path.kind` 冲突：

```ts
export const RibbonPathMode = {
  Centerline: 'centerline',
  Boundary: 'boundary',
} as const;

export const RibbonPathOptionsSchema = z.object({
  mode: z.enum(RibbonPathMode).optional(),
  width: RibbonWidthSchema.optional(),
  start: RibbonEndpointSchema.optional(),
  end: RibbonEndpointSchema.optional(),
  interpolation: z.enum(['linear', 'smooth']).optional(),
  align: z.enum(RibbonAlignment).optional(),
  samples: z.union([z.boolean(), z.number().int().min(2).max(512)]).optional(),
  sampling: RibbonSamplingSchema.optional(),
  upper: z.array(StepSchema).min(2).optional(),
  lower: z.array(StepSchema).min(2).optional(),
}).strict();
```

Path kind 实现通过新的 provider contract 注册。内置 `stroke` / `ribbon` 与外部实现走同一套 registry。

```ts
export type PathKindDefinition<TOptions extends IRJsonObject = IRJsonObject> = {
  kind: string;
  optionsSchema: z.ZodType<TOptions>;
  compile: (ctx: PathKindCompileContext<TOptions>) => PathKindCompileResult | null;
};

export const definePathKind = <TOptions extends IRJsonObject>(
  definition: PathKindDefinition<TOptions>,
): PathKindDefinition<TOptions> => definition;
```

`CompileOptions` 增加：

```ts
pathKinds?: Record<string, PathKindDefinition>;
```

有效 registry 为 `{ ...BUILTIN_PATH_KINDS, ...options.pathKinds }`。同名覆盖允许，但通过 `onWarn` 报告，策略与现有 shape / arrow / pattern override 保持一致。

理由：

1. `type: "path"` 是稳定的 relation host；`kind` 是可替换的几何 lowering 策略。
2. 内置 path kind 与外部自定义 path kind 通过同一 provider contract 成为一等公民。
3. 把 ribbon 专属字段收在 `ribbon` 对象里，避免 `width`、`dashPattern`、`arrow`、`upper`、`lineCap` 等互不适用的字段平铺在同一层误导用户和 LLM。
4. 当前仍处于 `0.x`，直接移除 `IRRibbon` 比长期保留重复 IR shape 更便宜。

## 待锁定决策点

- **`kind` 位置**：放在顶层 `Path.kind`，不放在 `geometry.kind`。它和 `node.shape` 类似，是 path host 的主分类字段。
- **默认 kind**：省略 `kind` 等价于 `stroke`。parse 后可以保留省略状态，compile 阶段解析到 `stroke` provider。
- **Ribbon 参数字段**：内置 ribbon 参数放在顶层 `ribbon`。其他自定义 kind 使用 `kindOptions`，除非未来 ADR 把新的内置 kind 提升成独立参数对象。
- **Ribbon 构造模式字段**：旧 `Ribbon.kind` 改为 `ribbon.mode`，取值为 `centerline | boundary`。
- **Host label**：新增顶层 `Path.label`，表示附着在整个 path host 上的标签，所有 path kind 可用；已有 step label 继续留在 `Step.label`。
- **自定义 kind 校验**：schema 层只校验 `kind` 是非空字符串、`kindOptions` 是 JSON-safe 对象；注册 provider 在 compile 阶段用自己的 `optionsSchema` 校验参数。
- **未知 kind**：compile 抛出清晰错误，并列出已注册 path kind。
- **独立 Ribbon API**：移除 `RibbonSchema`、`IRRibbon` 与 `type: "ribbon"`。React `<Ribbon>` 如果保留，只能作为 authoring sugar，构造 `type: "path", kind: "ribbon"`。
- **共享 schema 命名**：ADR-06 的长名 `DrawableGeometryStyleSchema` / `DrawableElementMetadataSchema` 改为 `DrawableStyleSchema` / `DrawableMetaSchema`。不保留旧名导出。
- **文档迁移**：当前 Ribbon 组件页和 demo 移入 Path 文档；Ribbon 成为 Path kind 小节，不再作为同级 draw component 页面。

## DSL 表面

React 直接通过 `<Path>` 表达两个内置 kind：

```tsx
<Path kind="stroke" color="teal" arrow="->">
  <Step kind="move" to="A" />
  <Step kind="line" to="B" label={{ text: 'route', position: 0.5, side: 'above' }} />
</Path>

<Path
  kind="ribbon"
  color="teal"
  label={{ text: '128 items', position: 'middle', placement: 'inside', sloped: true }}
  ribbon={{ width: 18, align: 'center' }}
>
  <Step kind="move" to="source" />
  <Step kind="line" to="target" />
</Path>
```

`<Ribbon>` 可以在实现阶段暂时保留为 sugar，但它必须生成同一个 IR shape：

```tsx
<Ribbon width={18} color="teal" label={{ text: '128 items', placement: 'inside' }}>
  <Step kind="move" to="source" />
  <Step kind="line" to="target" />
</Ribbon>
```

Vanilla / JSON authoring 使用同一份 IR：

```ts
scene([
  path({
    kind: 'ribbon',
    color: 'teal',
    ribbon: { width: 18, align: 'center' },
    label: { text: '128 items', position: 0.75, placement: 'inside', sloped: true },
    children: [
      step.move('source'),
      step.line('target'),
    ],
  }),
]);
```

自定义 kind 示例：

```ts
compileToScene(ir, {
  pathKinds: {
    wideArrow: definePathKind({
      kind: 'wideArrow',
      optionsSchema: WideArrowOptionsSchema,
      compile(ctx) {
        // Lower ctx.path + ctx.options into PathPrim(s).
      },
    }),
  },
});
```

## 测试设计

core 测试覆盖：

- Path schema 接受省略 `kind`，行为等价当前 stroked path。
- Path schema 接受显式 `kind: "stroke"`，行为等价省略 `kind`。
- Path schema 接受 `kind: "ribbon"`、`ribbon` 参数和 centerline `children`。
- boundary ribbon 表示为 `kind: "ribbon", ribbon: { mode: "boundary", upper, lower }`，不再需要独立 `IRRibbon`。
- 顶层 `Path.label` 使用与 step label 相同的 `GeometryLabelSchema`。
- `pathDefault` 通过同一个 path-like 通道作用到 stroke path 与 ribbon path。
- 自定义 `kind` 接受 JSON-safe `kindOptions`，并通过注册 provider 分派。
- 未知自定义 `kind` 在 compile 阶段给出可诊断错误。
- 覆盖内置 provider 时通过 `onWarn` 报告。
- docs 与 public exports 不再暴露 `IRRibbon`。
- docs 与 public exports 使用 `DrawableStyleSchema` / `DrawableMetaSchema`，不再暴露 ADR-06 的长命名。

## 影响

- BREAKING：`type: "ribbon"` 从 core IR 中移除。
- BREAKING：`Ribbon.kind` 改名为 `ribbon.mode`。
- `IRChild` 移除 `IRRibbon`，path-like relation 统一由 `IRPath` 表示。
- `ChildSchema` 从顶层 discriminated union 中移除 `RibbonSchema`。
- `compile/compile.ts` 不再需要 `path` / `ribbon` 两套 pending drawing 分支，而是按 `Path.kind` provider 分派。
- `compile/ribbon.ts` 成为内置 `ribbon` path kind provider，或迁移到 `providers/path-kind/ribbon` 后面。
- `compile/path` 成为内置 `stroke` path kind provider，或被 stroke provider 包装。
- 新增 `contract/path-kind` 与 `providers/path-kind`，用于一等公民的自定义 path kind。
- React `<Path>` 增加 `kind`、`ribbon`、`label`、`kindOptions` props。
- React `<Ribbon>` 从公开组件文档中移除，或仅保留为生成 Path IR 的 sugar；不再暴露 `IRRibbon` 类型。
- 文档把当前 Ribbon 说明和 demo 移入 Path 组件页，并从 sidebar / i18n data 中移除独立 Ribbon draw 页面。
- `DrawableGeometryStyleSchema` / `DrawableElementMetadataSchema` 改名为 `DrawableStyleSchema` / `DrawableMetaSchema`，相关 public export、schema registry 与文档同步改名。

## 不在本 ADR 范围

- 不保留 `type: "ribbon"` 兼容别名。
- 不提供旧 ribbon IR migration helper。
- 不新增 `stroke` / `ribbon` 之外的内置 path kind。
- 不修改 renderer primitive 类型；provider 仍 lower 到现有 `ScenePrimitive`，主要是 `PathPrim`。
- 不实现 graph `RelationMark`；graph 后续通过新的 `IRPath` shape 消费本能力。

---

## 实现契约

### Level

`red`

本 ADR 修改 core public IR schema、公开类型导出、compile 分派、provider contract、React DSL、docs 路由和测试。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/path/path.ts` | 新增 / 修改 | `PathSchema.kind` | non-empty string | compile 阶段省略 = stroke | Path 几何 kind；内置 stroke / ribbon，自定义名称通过 path kind provider 分派。 |
| `packages/kernel/core/src/schemas/path/path.ts` | 新增 | `PathSchema.ribbon` | `RibbonPathOptionsSchema` | 无 | 仅在 `kind` 为 ribbon 时使用的内置 ribbon 参数。 |
| `packages/kernel/core/src/schemas/path/path.ts` | 新增 | `PathSchema.kindOptions` | JSON object | 无 | 注册的非内置 path kind 使用的 JSON-safe 参数。 |
| `packages/kernel/core/src/schemas/path/path.ts` | 新增 | `PathSchema.label` | `GeometryLabel \| Array<GeometryLabel>` | 无 | 附着在整个 path host 上的标签，所有 path kind 共享。 |
| `packages/kernel/core/src/schemas/path/path.ts` | 修改 | `PathSchema.children` | `Array<Step>` schema 层可选 | stroke / centerline ribbon 必填 | 中心线 / stroke step 序列；由内置 refinement 或 provider 判断是否必填。 |
| `packages/kernel/core/src/schemas/path/path.ts` | 新增 | `RibbonPathOptionsSchema.mode` | `"centerline" \| "boundary"` | centerline | Ribbon 构造模式；由独立 `Ribbon.kind` 改名而来。 |
| `packages/kernel/core/src/schemas/path/path.ts` 或 `schemas/ribbon.ts` | 移动 / 改名 | `RibbonPathOptionsSchema.width` | existing `RibbonWidthSchema` | 无 | 内置 ribbon path kind 的宽度规则。 |
| `packages/kernel/core/src/schemas/path/path.ts` 或 `schemas/ribbon.ts` | 移动 / 改名 | `RibbonPathOptionsSchema.start` | existing `RibbonEndpointSchema` | 无 | ribbon path kind 的起点宽度 / 方向 / cap。 |
| `packages/kernel/core/src/schemas/path/path.ts` 或 `schemas/ribbon.ts` | 移动 / 改名 | `RibbonPathOptionsSchema.end` | existing `RibbonEndpointSchema` | 无 | ribbon path kind 的终点宽度 / 方向 / cap。 |
| `packages/kernel/core/src/schemas/path/path.ts` 或 `schemas/ribbon.ts` | 移动 / 改名 | `RibbonPathOptionsSchema.align` | existing `RibbonAlignment` | center | ribbon 相对中心线的对齐方式。 |
| `packages/kernel/core/src/schemas/path/path.ts` 或 `schemas/ribbon.ts` | 移动 / 改名 | `RibbonPathOptionsSchema.samples` / `sampling` | existing sampling types | 无 | ribbon 边界采样控制。 |
| `packages/kernel/core/src/schemas/path/path.ts` 或 `schemas/ribbon.ts` | 移动 / 改名 | `RibbonPathOptionsSchema.upper` / `lower` | `Array<Step>` | boundary mode 必填 | boundary ribbon 的显式上下边界 step。 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 删除 | `RibbonSchema` / `IRRibbon` | removed | n/a | 移除独立 ribbon IR。 |
| `packages/kernel/core/src/schemas/drawable.ts` | 改名 | `DrawableGeometryStyleSchema` -> `DrawableStyleSchema` | same fields | n/a | 缩短 Path / path kind 共享样式 schema 命名，字段集合不变。 |
| `packages/kernel/core/src/schemas/drawable.ts` | 改名 | `DrawableElementMetadataSchema` -> `DrawableMetaSchema` | same fields | n/a | 缩短共享身份 / provenance / 动画 / 栈序 schema 命名，字段集合不变。 |
| `packages/kernel/core/src/schemas/drawable.ts` | 改名 | `IRDrawableGeometryStyle` -> `IRDrawableStyle` | inferred type | n/a | 共享样式派生类型改短名。 |
| `packages/kernel/core/src/schemas/drawable.ts` | 改名 | `IRDrawableElementMetadata` -> `IRDrawableMeta` | inferred type | n/a | 共享元数据派生类型改短名。 |
| `packages/kernel/core/src/schemas/scene.ts` | 修改 | `IRChild` / `ChildSchema` | remove `IRRibbon` arm | n/a | Path 成为唯一 path-like relation child。 |
| `packages/kernel/core/src/contract/path-kind/*` | 新增 | `PathKindDefinition` | definition object | n/a | 内置和自定义 path kind 的运行时 provider contract。 |
| `packages/kernel/core/src/compile/compile.ts` | 新增 | `CompileOptions.pathKinds` | record of path kind definitions | 仅内置 provider | path kind lowering 的运行时 provider registry。 |

### 文件 scope

本 ADR 允许修改：

- `packages/kernel/core/src/schemas/path/path.ts`
- `packages/kernel/core/src/schemas/drawable.ts`
- `packages/kernel/core/src/schemas/ribbon.ts`
- `packages/kernel/core/src/schemas/scene.ts`
- `packages/kernel/core/src/schemas/scope.ts`
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/src/contract/path-kind/**`
- `packages/kernel/core/src/providers/path-kind/**`
- `packages/kernel/core/src/contract/index.ts`
- `packages/kernel/core/src/providers/index.ts`
- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/compile/style.ts`
- `packages/kernel/core/src/compile/path/**`
- `packages/kernel/core/src/compile/ribbon.ts` 或迁移后的 `providers/path-kind/ribbon`
- `packages/kernel/core/tests/ir/*path-kind*.test.ts`
- `packages/kernel/core/tests/ir/*drawable*.test.ts`
- `packages/kernel/core/tests/compile/*path-kind*.test.ts`
- `packages/kernel/core/tests/compile/ribbon*.test.ts`
- `packages/kernel/react/src/kernel/Path.tsx`
- `packages/kernel/react/src/kernel/Ribbon.tsx`
- `packages/kernel/react/src/kernel/_fields.ts`
- `packages/kernel/react/src/kernel/builder.ts`
- `packages/kernel/react/src/kernel/unbuilder.ts`
- `packages/kernel/react/src/index.ts`
- `apps/docs/src/contents/kernel/components/draw/path/**`
- `apps/docs/src/contents/kernel/components/draw/ribbon/**`
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`
- `apps/docs/src/lib/schema-registry.ts`

偏离本 scope 需要先修订本 ADR 或新开 ADR：

- `packages/graph/**`
- renderer primitive 类型定义
- `stroke` / `ribbon` 以外的新内置 path kind
- 旧 `type: "ribbon"` IR 的兼容 parser

### 测试象限

Happy path：

- `path-kind-stroke-default`：省略 `kind` 与当前 stroked path 编译结果一致。
- `path-kind-stroke-explicit`：`kind: "stroke"` 与省略 `kind` 编译结果一致。
- `path-kind-ribbon-centerline`：`type: "path", kind: "ribbon", ribbon: { width }` 编译为 filled `PathPrim`。
- `path-kind-ribbon-boundary`：`ribbon.mode = "boundary"` 搭配 `upper` / `lower` 时不需要 centerline `children`。
- `path-host-label-shared`：顶层 `Path.label` 接受与 step label 相同的 `position`、`placement`、`side`、`sloped` 和文字样式字段。
- `path-kind-custom-provider`：注册的自定义 `kind` 校验 `kindOptions` 并产出 provider primitive。

边界：

- `path-kind-ribbon-zero-width`：ribbon width 0 产生合法退化 filled path，或给出现有 ribbon 行为一致的清晰诊断。
- `path-kind-ribbon-samples-shorthand`：`ribbon.samples` 与 `ribbon.sampling` 保持现有互斥行为。
- `path-kind-custom-empty-options`：自定义 kind 省略 `kindOptions` 时稳定收到 `{}` 或 provider 定义的默认值。
- `path-kind-children-requirements`：stroke 和 centerline ribbon 拒绝缺失 `children`；boundary ribbon 允许缺失 `children`。

错误路径：

- `path-kind-unknown`：未知 `kind` 抛出清晰 compile 错误，并列出已注册 kind。
- `path-kind-ribbon-missing-options`：`kind: "ribbon"` 但缺失 `ribbon` 时被拒绝。
- `path-kind-ribbon-forbidden-stroke-fields`：ribbon path 对 stroke-only 字段按本 ADR 最终 refinement 规则拒绝或忽略。
- `path-kind-stroke-forbidden-ribbon-options`：stroke path 拒绝 `ribbon`。
- `path-kind-custom-non-json-options`：`kindOptions` 拒绝函数、要求对象时传数组，以及非 JSON 值。

交互：

- `path-kind-path-default-stroke-ribbon`：`pathDefault` 通过同一个样式通道作用到 stroke 与 ribbon path kind。
- `path-kind-reset-style-path`：`resetStyle: ["path"]` 同时切断 stroke 与 ribbon path kind。
- `path-kind-arrow-default-independent`：`arrowDefault` 仍影响 stroke arrow，且不会泄漏到 ribbon 或 custom provider，除非 provider 明确消费。
- `path-kind-z-index-order`：stroke 与 ribbon path kind 共享同层 `zIndex` 排序语义。
- `path-kind-react-ribbon-sugar`：若保留 React `<Ribbon>` sugar，它生成的 IR 与 `<Path kind="ribbon" ribbon={...}>` 一致。
- `path-kind-public-export-removal`：不再导出 `IRRibbon`；`IRPath` 暴露 `kind` / `ribbon` / `kindOptions`。
- `drawable-shared-short-names`：公开导出 `DrawableStyleSchema` / `DrawableMetaSchema` / `IRDrawableStyle` / `IRDrawableMeta`，不再导出长命名。

### 依赖的现有元素

- `PathSchema` / `IRPath`（`packages/kernel/core/src/schemas/path/path.ts`）：改造成唯一 path-like relation host。
- `RibbonSchema` / `IRRibbon`（`packages/kernel/core/src/schemas/ribbon.ts`）：移除，或缩减为 ribbon option 子 schema。
- `GeometryLabelSchema` / `IRGeometryLabel`：复用为顶层 path host label 与 step label 的唯一来源。
- `DrawableStyleSchema` / `DrawableMetaSchema`：作为所有 path kind 共享的 style / metadata surface，并替代 ADR-06 中过长的 shared schema 命名。
- `resolveEffectivePath` / `resolveEffectiveRibbon`：收敛成 path-kind-aware 的单一路径样式解析。
- `emitPathPrimitive`：成为内置 `stroke` provider，或由 `stroke` provider 包装。
- `emitRibbonPrimitive`：成为内置 `ribbon` provider，或移到 provider 后面。
- `contract/shape`、`contract/arrow`、`contract/path` 与 `providers/*` 的 provider 模式：复用到 `PathKindDefinition`、registry resolution、override warning 和 runtime injection。
- React `Path` / `Ribbon` 组件：更新为 Path 拥有公开 IR surface；Ribbon 删除或仅作为 sugar。
- docs Ribbon 页面与 demo：移入 Path 文档，作为内置 path kind 示例。

### 设计评估记录

按 `develop-design`，red ADR 应做独立设计评估。当前工具策略要求只有用户明确要求 sub-agent / 并行 agent 时才可 spawn sub-agent，因此本 ADR 尚未执行独立 LLM 评估。进入实现前需要人工确认是否补评估，或明确接受当前 ADR 作为实现输入。

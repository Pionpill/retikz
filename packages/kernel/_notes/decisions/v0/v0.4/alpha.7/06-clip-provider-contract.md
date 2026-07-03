# ADR-06：Clip provider contract

- 状态：Accepted（2026-07-03 收尾确认，已实现）
- 决策日期：2026-06-29
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [ADR-04](./04-adapter-surface-and-docs.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)

## 背景

当前 `Scope.clip` 已经是 renderer-agnostic 能力：IR 中写入裁剪区，compile 阶段把它去重成 `Scene.resources` 里的 `ClipResource`，`GroupPrim.clipRef` 引用该资源，SVG / Canvas adapter 再物化成各自的裁剪机制。这条链路是正确的，但 `clip` 的形状集合仍是封闭的 `rect | circle | ellipse | polygon`，`compile/clip.ts` 与 renderer 都按这四种 `kind` 写 switch。

这和 alpha.7 的 provider contract 收敛目标不一致。`clip` 和 boundary 一样是独立的一等能力：用户应能定义自己的裁剪 kind，并在 IR 里直接写该 kind，而不是被迫包一层 `{ kind: "custom", name, params }`，也不是只能把自定义逻辑塞进内置四形状的参数里。内置 clip 与自定义 clip 应进入同一套 definition / registry / resolve 机制；区别只在于内置 definition 由 `providers/clip` 注册，自定义 definition 由 `CompileOptions.clips` 注入。

同时，完整自定义 clip 不应止步于“自定义 provider 展开成现有四形状”。v0.2 时代已经明确推迟过任意贝塞尔裁剪路径；现在既然 SVG / Canvas 已经能消费结构化 `PathCommand`，应把 Scene 级 clip 能力补齐到 `path` 与 `compound`，让自定义 kind 可以返回真实路径裁剪或复合裁剪区域。

## 决策：`Scope.clip.kind` 成为 clip registry key

`Scope.clip` 保持 JSON-only operation object，`kind` 字段就是 registry key。内置 `rect` / `circle` / `ellipse` / `polygon` / `path` / `compound` 是普通 `ClipDefinition`；用户自定义的 `rounded-rect`、`ticket-stub`、`star-mask` 等 kind 也是普通 `ClipDefinition`。用户自定义 kind 不允许与内置 kind 重名，也不允许在同一 custom 数组内重复。

```ts
export type IRClipSpecObject = IRJsonObject & {
  /** Registry key matched by `ClipDefinition.kind`. */
  kind: string;
};

export type ClipDefinitionInput<TSpec extends IRClipSpecObject> = {
  /** Registry key matched against `Scope.clip.kind`. */
  kind: string;
  /** Schema for the full JSON operation object, including the same `kind` literal. */
  schema: z.ZodType<TSpec>;
  /** Resolve a user-facing clip operation into renderer-agnostic Scene clip geometry. */
  resolve: (spec: TSpec, ctx: ClipResolveContext) => ResolvedClipShape;
};

export type ClipDefinition = ClipDefinitionInput<IRClipSpecObject>;

export type ClipResolveContext = {
  round: (n: number) => number;
  resolve: (clip: IRClipSpec) => ResolvedClipShape;
};

export type ResolvedClipShape =
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: Array<[number, number]> }
  | { kind: 'path'; commands: Array<PathCommand>; fillRule?: 'nonzero' | 'evenodd' }
  | { kind: 'compound'; children: Array<ResolvedClipShape>; fillRule?: 'nonzero' | 'evenodd' };

export type CompileOptions = {
  clips?: ReadonlyArray<ClipDefinition>;
  // ...
};
```

`ClipSpecSchema` 改为“内置精确分支 + custom operation object”模型：

- 内置分支继续精确校验 `rect` / `circle` / `ellipse` / `polygon` / `path` / `compound`。
- custom 分支允许任意 JSON object，只要求 `kind` 是非空字符串，且不属于内置 kind 集合。
- 对于内置 kind，不能被 custom 分支兜底；例如 `{ kind: 'rect', foo: 1 }` 必须被 `rect` schema 拒绝。

compile 阶段不再直接 `switch (clip.kind)`。`createClipRegistry(round, clips)` 会先调用 `resolveClipRegistry(clips)` 得到有效 definition map，然后：

1. 根据 `clip.kind` 找 `ClipDefinition`。
2. 找不到时 fail-loud，错误提示 `CompileOptions.clips`、失败 kind 与已注册 kind。
3. 找到后用 definition schema parse 整个 operation object。
4. 调用 `resolve(spec, ctx)` 得到 `ResolvedClipShape`。
5. 对 resolved shape 做 finite / positive / path command 守卫与 precision round。
6. 用 resolved shape 的 JSON 作为去重 key，分配稳定 `clip-N` id。

内置 `compound` 的 `children` 是 `Array<IRClipSpec>`，compile 时递归走同一个 `ctx.resolve`，因此 compound 可以混合内置与自定义 clip。Scene 中只保存 `ResolvedClipShape`，不会把 runtime definition 或未解析的 custom kind 传给 renderer。

理由：

1. `kind` 是 operation provider 的天然 key。`clip` 不是字符串引用 provider；额外包 `{ kind:'custom', name }` 会制造两套 discriminator，削弱 AI 生成 IR 的直觉。
2. custom kind 与 builtin kind 同为一等公民，符合 alpha.7 “内置与扩展只是在同一机制下注册的不同 definition”的全仓原则。
3. renderer 只能消费纯 JSON Scene。让 provider 在 compile 阶段解析成 `ResolvedClipShape`，可以保持 renderer-agnostic，不引入 SVG-only raw path 或 Canvas callback。
4. 新增 `path` / `compound` 后，custom provider 不再被四种内置几何限制，完整覆盖任意曲线与复合裁剪区域。

## 待决策点

- **内置 kind 清单**：本 ADR 固定为 `rect` / `circle` / `ellipse` / `polygon` / `path` / `compound`。用户 custom kind 与这些重名直接 throw，不提供 `overrideBuiltin`。
- **custom IR 形态**：custom clip 直接写自己的 kind 与字段，例如 `{ kind:'rounded-rect', x, y, width, height, radius }`；不采用 `{ kind:'custom', name, params }`。
- **Scene 是否保留来源 kind**：倾向不保留。`ClipResource.shape` 只保存 resolved geometry；来源 kind 属 compile 诊断信息，renderer 不依赖。
- **`compound` 语义**：多个 child shape 按同一 clip path 中多子路径 / 多子元素处理，默认 union；需要孔洞时使用 `path.fillRule: 'evenodd'` 或 `compound.fillRule: 'evenodd'`。
- **path command schema 归属**：新增 reusable `PathCommandSchema`，避免 `clip.path.commands` 手写一份与 `primitive/path.ts` 漂移的校验逻辑。

## DSL 表面

React：

```tsx
import { defineClip } from '@retikz/core';
import { Layout, Node, Scope } from '@retikz/react';
import { z } from 'zod';

const roundedRectClip = defineClip({
  kind: 'rounded-rect',
  schema: z.object({
    kind: z.literal('rounded-rect'),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    radius: z.number().nonnegative(),
  }),
  resolve: spec => ({
    kind: 'path',
    commands: roundedRectCommands(spec.x, spec.y, spec.width, spec.height, spec.radius),
  }),
});

export const Diagram = () => (
  <Layout clips={[roundedRectClip]}>
    <Scope clip={{ kind: 'rounded-rect', x: -80, y: -40, width: 160, height: 80, radius: 12 }}>
      <Node id="a" position={[-90, 0]} text="clipped" />
      <Node id="b" position={[90, 0]} text="clipped" />
    </Scope>
  </Layout>
);
```

Vanilla / core：

```ts
const scene = compileToScene(ir, {
  clips: [roundedRectClip],
});

figure(
  {
    clips: [roundedRectClip],
  },
  f => {
    f.scope(
      { clip: { kind: 'rounded-rect', x: -80, y: -40, width: 160, height: 80, radius: 12 } },
      s => {
        s.node({ id: 'a', position: [-90, 0], text: 'clipped' });
      },
    );
  },
);
```

内置 path / compound：

```ts
{
  type: 'scope',
  clip: {
    kind: 'path',
    fillRule: 'evenodd',
    commands: [
      { kind: 'move', to: [-80, -40] },
      { kind: 'line', to: [80, -40] },
      { kind: 'line', to: [80, 40] },
      { kind: 'line', to: [-80, 40] },
      { kind: 'close' },
      { kind: 'move', to: [0, -20] },
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 270, endAngle: -90 },
      { kind: 'close' }
    ]
  },
  children: []
}
```

## 测试设计

`packages/kernel/core/tests/clips/`、`packages/kernel/render/tests/**`、`packages/kernel/react/tests/**` 与 `packages/kernel/vanilla/tests/**` 需要覆盖 clip provider、Scene resolved shape、SVG / Canvas / hit-test 物化、adapter 透传与错误诊断。

具体 case 拆分见下方“实现契约 § 测试象限”。

## 影响

- 新增 public provider capability：`ClipDefinition`、`defineClip`、`BUILTIN_CLIPS`、`resolveClipRegistry`、`CompileOptions.clips`。
- `ClipSpecSchema` 从封闭四分支扩展为内置六分支 + custom operation object；`Scope.clip.kind` 成为 operation provider registry key。
- `ClipResource.shape` 从 `IRClipSpec` 改为 `ResolvedClipShape`，renderer 不再看到未解析 custom kind。
- SVG renderer 需要支持 `path` / `compound` clip；Canvas renderer 与 hit-test 需要支持相同 resolved clip shape 与 fill rule。
- React `<Layout>` 与 Vanilla entry 需要透传 `clips` provider 数组。
- docs 需要新增 `clip-registry` 页面，并更新 `Scope.clip`、runtime compile options、Scene primitive resource 参考。
- ⚠️ BREAKING：`ClipShape = IRClipSpec` 不再成立；自定义 kind 与内置 kind 重名不允许；`Scope.clip` 中未知 kind 从 schema 可过渡到 compile fail-loud，而不是静默忽略。

## 不在本 ADR 范围

- 不支持 renderer-specific raw SVG `<clipPath>` / raw `d` 字符串；路径必须使用结构化 `PathCommand`。
- 不把 clip definition 传给 renderer；renderer 只消费 compile 后的 `ResolvedClipShape`。
- 不为 custom clip 提供覆盖内置 kind 的逃生口。
- 不新增 primitive-level `clip` 字段；本 ADR 仍只处理现有 `Scope.clip -> GroupPrim.clipRef` 管线。
- 不修复“transformed scope 内 path hoist 后不受 scope.clip 裁剪”的既有架构限制；该问题属于 path 局部坐标编译重构。

---

## 实现契约（必填）

### Level

`red`

自评 level：`red`。本 ADR 修改 public IR schema、Scene resource shape、core compile、render SVG / Canvas、React / Vanilla public provider surface 与 docs。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/kernel/core/src/schemas/clip/schema.ts` | 改 | `ClipSpecSchema` | 内置 `rect/circle/ellipse/polygon/path/compound` 分支 + custom JSON object（非内置 `kind`） | 无 | `Scope.clip` 裁剪 operation；`kind` 是 clip provider key；内置与自定义均在 compile 阶段解析 |
| `packages/kernel/core/src/schemas/clip/types.ts` | 改 | `IRClipSpec` | `z.infer<typeof ClipSpecSchema>` | 无 | JSON-safe clip operation，可能是内置或 custom provider operation |
| `packages/kernel/core/src/schemas/path-command/**` | 加 | `PathCommandSchema` | `move/line/quad/cubic/arc/ellipseArc/close` discriminated union | 无 | 结构化路径命令，供 `clip.path.commands` 与未来 Scene schema 复用 |
| `packages/kernel/core/src/primitive/clip.ts` | 改 | `ClipShape` | `ResolvedClipShape` | 无 | Scene 级已解析裁剪几何，renderer 可直接物化 |
| `packages/kernel/core/src/compile/compile.ts` | 加 | `CompileOptions.clips` | `ReadonlyArray<ClipDefinition>` | `undefined` | 运行时注入 clip definitions，不进 IR |
| `packages/kernel/react/src/kernel/Layout.tsx` | 加 | `LayoutProps.clips` | `ReadonlyArray<ClipDefinition>` | `undefined` | React authoring surface 注入 clip providers |
| `packages/kernel/vanilla/src/types.ts` | 加 | `clips` | `ReadonlyArray<ClipDefinition>` | `undefined` | Vanilla render / builder 注入 clip providers |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/core/src/contract/clip/**`（新建）
- `packages/kernel/core/src/providers/clip/**`（新建）
- `packages/kernel/core/src/providers/index.ts`
- `packages/kernel/core/src/compile/clip.ts`
- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/schemas/clip/**`
- `packages/kernel/core/src/schemas/path-command/**`（新建）
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/primitive/clip.ts`
- `packages/kernel/core/src/primitive/path.ts`（仅允许为 schema 复用做 type/export 对齐）
- `packages/kernel/core/src/primitive/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/tests/clips/**`（新建）
- `packages/kernel/core/tests/ir/clip.schema.test.ts`
- `packages/kernel/core/tests/compile/**clip**.test.ts`
- `packages/kernel/render/src/svg/builders/clip-defs.ts`
- `packages/kernel/render/src/svg/builders/path-d.ts`（仅允许复用 / 导出 path d builder）
- `packages/kernel/render/src/canvas/path-geometry.ts`
- `packages/kernel/render/src/canvas/draw-scene.ts`
- `packages/kernel/render/src/canvas/hit-test.ts`
- `packages/kernel/render/tests/**clip**.test.ts`
- `packages/kernel/react/src/kernel/Layout.tsx`
- `packages/kernel/react/src/index.ts`
- `packages/kernel/react/tests/kernel/**clip**.test.tsx`
- `packages/kernel/vanilla/src/**`
- `packages/kernel/vanilla/tests/**clip**.test.ts`
- `apps/docs/src/contents/kernel/**`
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`

偏离白名单的改动需要更新本 ADR 或新开 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `clip_builtin_rect_circle_ellipse_polygon_registry`：四个旧内置 clip 经 `BUILTIN_CLIPS` registry 解析，Scene 输出与旧行为一致。
- `clip_builtin_path_resource_svg_canvas`：`Scope.clip.kind='path'` 编译成 `ClipResource.shape.kind='path'`，SVG 生成 `<path>` clip，Canvas `applyClip` 使用同一 commands。
- `clip_builtin_compound_mixes_builtin_and_custom`：compound children 同时包含 `rect` 与 custom `rounded-rect`，递归 resolve 后生成 stable `ClipResource`。
- `clip_custom_kind_first_class`：注册 `rounded-rect` 后 IR 直接写 `kind:'rounded-rect'` 生效，不需要 `custom/name/params` 包装。

**边界（≥ 2）**：

- `clip_path_evenodd_hole`：path clip 使用 `fillRule:'evenodd'` 时 SVG / Canvas / hit-test 对孔洞语义一致。
- `clip_dedup_uses_resolved_shape`：两个不同 custom operation resolve 成相同 `ResolvedClipShape` 时复用同一个 `clip-N`。
- `clip_empty_custom_keeps_builtins`：`clips: []` 仍保留所有 builtin clip。
- `clip_precision_rounds_path_commands`：path / compound 内所有坐标和尺寸按 compile precision round，输出可 JSON round-trip。

**错误路径（≥ 2）**：

- `clip_duplicate_builtin_rejected`：custom `defineClip({ kind:'rect' })` 或 `kind:'path'` 直接 throw，提示不能覆盖 builtin。
- `clip_duplicate_custom_rejected`：同一 `clips` 数组重复 kind throw，错误包含 capability `clip` 与重复 kind。
- `clip_unknown_kind_lists_registered`：IR 写 `kind:'missing-mask'` 时 compile fail-loud，错误列出 registered clips 并提示 `options.clips`。
- `clip_custom_schema_rejects_payload`：custom schema 拒绝非法参数时错误能定位到 clip kind。
- `clip_builtin_kind_not_accepted_by_custom_fallback`：`{ kind:'rect', foo:1 }` 不被 custom fallback 接受，必须按 rect schema 报错。

**交互（≥ 2）**：

- `react_layout_clips_passthrough`：`<Layout clips={[roundedRectClip]}>` 透传到 core compile 并影响 Scene clip。
- `vanilla_clips_passthrough`：vanilla render / builder options `clips` 透传到 core compile。
- `svg_canvas_hit_test_clip_path_equivalence`：同一 path clip 在 SVG defs、Canvas draw 与 Canvas hit-test 中裁剪区域一致。
- `scope_clip_prune_behavior_unchanged`：带 custom clip 的空 scope 仍因 `clip` 存在而发 `GroupPrim`，不被 prune。
- `clip_with_paint_resources_coexists`：同一 Scene 同时有 paint resource 与 clip resource，id 命名与 renderer defs 不冲突。

### 依赖的现有元素

- `Scope.clip`（`packages/kernel/core/src/schemas/scope/**`）——修改其引用的 clip schema，字段名不变。
- `createClipRegistry`（`packages/kernel/core/src/compile/clip.ts`）——改造成消费 clip provider registry，并保留去重 / stable id 职责。
- `Scene.resources` / `GroupPrim.clipRef`（`packages/kernel/core/src/primitive/**`）——继续作为 renderer-agnostic clip 资源链路。
- `PathCommand`（`packages/kernel/core/src/primitive/path.ts`）——复用为 `path` clip 的结构化路径语言。
- `resolveProviderRegistry`（`packages/kernel/core/src/providers/registry.ts`）——复用 alpha.7 provider duplicate / builtin-first 规则。
- SVG `buildClipDef`（`packages/kernel/render/src/svg/builders/clip-defs.ts`）——扩展为消费 `ResolvedClipShape` 的六分支物化。
- Canvas `buildClipPath` / `applyClip`（`packages/kernel/render/src/canvas/path-geometry.ts`）——扩展为消费 `path` / `compound` 与 fill rule。
- Canvas `hitTest`（`packages/kernel/render/src/canvas/hit-test.ts`）——复用 expanded clip path 判断 clipped group 命中。
- React `<Layout>` 与 Vanilla render / builder provider options——扩展 `clips` 透传。

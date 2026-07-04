# ADR-06: Builtin path generator and ribbon width profile

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[alpha.8 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [ADR-05](./05-stroke-dash-offset.md) · [alpha.7 ADR-02](../alpha.7/02-provider-key-contract.md) · [alpha.6 ADR-07](../alpha.6/07-path-kind-registry.md)

## 背景

`PathGeneratorDefinition` 和 `RibbonWidthProfileDefinition` 已经完成 contract、registry、compile 消费和文档示例。它们是 core provider 体系中重要的两个函数型扩展点：前者把 generator step 降成结构化 `PathCommand[]`，后者把 ribbon 的 `{ kind: "profile" }` 宽度规则降成沿中心线采样的宽度函数。

当前两个扩展点的内置集合都是空数组。文档和测试能说明“如何注册”，但 core 自身没有任何真实内置项使用这些入口。结果是外部作者只能从自定义示例推断最佳实践，也无法看到内置项如何命名、如何定义参数、如何和 registry 重名诊断协作。

这不影响机制正确性，但会削弱 API 的可学习性。相比继续只放外部示例，core 应该提供少量低歧义、稳定且能代表扩展点价值的内置 definition：它们既是可直接使用的能力，也是第三方 provider 的参考模板。

## 决策：内置 `parabola` path generator 与 `bulge` ribbon width profile

core 为 `pathGenerators` 增加内置 `parabola`，为 `ribbonWidthProfiles` 增加内置 `bulge`。两者仍通过现有 `definePathGenerator` / `defineRibbonWidthProfile` 创建，并进入对应 `BUILTIN_*` 集合；用户自定义 definition 与内置同名时继续由现有 registry fail-loud。

```ts
// Path generator
{
  name: 'parabola',
  paramsSchema: z.object({ control: TargetSchema }),
  targetParams: ['control'],
  generate: ({ to, resolvedTargets }) => {
    if (to === undefined) {
      throw new Error('parabola requires step.to.');
    }
    return [{ kind: 'quad', control: resolvedTargets.control, to }];
  },
}

// Ribbon width profile
{
  name: 'bulge',
  paramsSchema: z.object({
    base: z.number().nonnegative(),
    peak: z.number().nonnegative(),
  }),
  widthAt: ({ offset, params }) => {
    const t = Math.sin(Math.PI * offset);
    return params.base + (params.peak - params.base) * t;
  },
}
```

`parabola` 的 `to` 必须存在；缺失时 compile 抛错，错误消息包含 `parabola` 和 `to`。`params.control` 是顶层 Target，经 `targetParams` 解析为世界坐标后放入 `resolvedTargets.control`。生成结果为一个 `quad` 命令，不额外插入 `move`。

`bulge` 的 `base` 表示两端宽度，`peak` 表示中点宽度。`peak` 可以小于 `base`，此时它表达“中间收窄”；只要求两者非负且有限。profile 输出继续走现有 `assertFiniteWidth` 守卫。

理由：

1. `parabola` 的 `from -> to + control` 模型稳定，能覆盖绕开节点、函数草图、投射轨迹等常见关系线，也能展示 `paramsSchema`、`targetParams`、`resolvedTargets` 与 `generate` 的完整链路。
2. `bulge` 表达“中间强调、两端收口”的常见 ribbon 视觉，比线性 start/end taper 更能体现函数型 profile 的价值；参数只有 `base` / `peak`，不引入主观命名如 strength、easing 或 periods。
3. 两个内置项都复用现有 schema / registry / compile 机制，不新增 IR 字段，不给内置项开特殊旁路，符合 provider 统一消费模型。

## API / IR 表面

`parabola` 只改变 core IR 和 compile 的可解析 provider 集合，不新增 React `<Step kind="generator">` DSL。当前 generator step 仍通过 `<Layout ir={...}>`、Vanilla 直传 IR，或上层包生成的 IR 使用。

```ts
const ir = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 40] },
        {
          type: 'step',
          kind: 'generator',
          name: 'parabola',
          to: [120, 40],
          params: { control: [60, 0] },
        },
      ],
    },
  ],
};
```

`bulge` 复用已有 React / Vanilla path kind 与 ribbon options 表面，不新增 prop：

```tsx
<Path
  kind="ribbon"
  ribbon={{
    width: { kind: 'profile', name: 'bulge', params: { base: 4, peak: 18 } },
    sampling: { kind: 'fixed', samples: 16 },
  }}
>
  <Step kind="move" to={[0, 0]} />
  <Step kind="line" to={[120, 0]} />
</Path>
```

## 测试设计

`packages/kernel/core/tests/providers/builtin-path-generator-ribbon-profile.test.ts` 覆盖内置注册和重名诊断；`packages/kernel/core/tests/compile/path-generator.test.ts` 与 `packages/kernel/core/tests/compile/ribbon.test.ts` 可按现有结构补编译输出测试。

测试覆盖内置注册、默认可编译、同名自定义冲突、缺失 `to` / 参数校验、Target 解析、scope transform、label 与 ribbon sampling / align 交互。

## 影响

- public IR：无字段变更。已有 `generator` step 和 ribbon `{ kind: "profile" }` width rule 可引用新内置名。
- public provider：`BUILTIN_PATH_GENERATORS` 不再为空，包含 `parabola`；`BUILTIN_RIBBON_WIDTH_PROFILES` 不再为空，包含 `bulge`。
- compile 行为：未传自定义 options 时，`name: "parabola"` 和 `name: "bulge"` 可以直接解析；同名自定义 definition 继续报 duplicate registration。
- docs：runtime compile、path-generator 扩展页、ribbon 相关文档要从“core 不内置”改为“core 内置最小示例，复杂曲线 / profile 仍通过 options 注入”。
- docs demo：`parabola` 需要 React API 可视 demo，因此 React `<Step kind="generator">` 一对一映射既有 IR generator step；不新增 core IR 字段。自定义 provider 教学继续由 React API 版 `path-generator-sin.demo.tsx` 承载；`bulge` demo 继续放在 `<Path>` 页。
- breaking：无。新增内置名只让此前报 unknown provider 的 IR 成为可编译；用户已有同名自定义 definition 会从“可注册”变为与内置冲突并报错，这是 provider key contract 下的预期保护。文档需在迁移说明中点明。

## 不在本 ADR 范围

- 不内置 `sin`、`cos`、`wave`、`arcThrough`、`bezierThrough` 等更主观或参数空间更大的 path generator。
- 不内置 `taper`：现有 `start.width` / `end.width` 已覆盖两端线性 taper，内置 profile 应展示更有区分度的函数型宽度。
- 不增加 provider override 机制；内置 key 不允许被自定义 definition 覆盖。
- Vanilla API 不变；React 仅补 `<Step kind="generator">` 对既有 IR generator step 的一对一 DSL 映射。
- 不改变 `stops`、`sampling`、`samples` 的语义。

---

## 实现契约（必填）🔻

### Level

`red`

本 ADR 自评 level：`red`。它会改 core provider 内置集合、compile 可解析行为、schema 描述和 docs。

### Schema 改动

无新增字段；仅允许更新以下 schema `.describe(...)` 中关于“core 不内置”的过期描述：

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/path/step/schema.ts` | 改描述 | `GeneratorStepSchema` / `name` | 无类型变更 | — | generator step 可引用内置或注册的 path generator。 |
| `packages/kernel/core/src/schemas/path/ribbon/schema.ts` | 改描述 | `RibbonWidthProfileSchema.name` | 无类型变更 | — | profile name 来自内置或 `CompileOptions.ribbonWidthProfiles`。 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/roadmap.md`
- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/06-builtin-path-generator-ribbon-profile.md`
- `packages/kernel/core/src/providers/path-generator/definitions.ts`
- `packages/kernel/core/src/providers/ribbon/definitions.ts`
- `packages/kernel/core/src/schemas/path/step/schema.ts`
- `packages/kernel/core/src/schemas/path/ribbon/schema.ts`
- `packages/kernel/react/src/kernel/Step.tsx`
- `packages/kernel/react/src/kernel/builder.ts`
- `packages/kernel/react/src/kernel/unbuilder.ts`
- `packages/kernel/react/src/index.ts`
- `packages/kernel/core/tests/providers/provider-key-contract.test.ts`
- `packages/kernel/core/tests/providers/builtin-path-generator-ribbon-profile.test.ts`
- `packages/kernel/core/tests/compile/path-generator.test.ts`
- `packages/kernel/core/tests/compile/ribbon.test.ts`
- `packages/kernel/react/tests/kernel/StepProps-named-types.test.ts`
- `packages/kernel/react/tests/kernel/builder.test.tsx`
- `packages/kernel/react/tests/kernel/unbuilder.test.tsx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/schema/path/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/schema/path/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/extend/path-generator/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/extend/path-generator/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/extend/path-generator/path-generator-parabola.demo.tsx`
- `apps/docs/src/modules/docs/contents/kernel/components/extend/path-generator/path-generator-sin.demo.tsx`
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/shapes/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/shapes/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/draw/path/**`
- `apps/docs/src/modules/docs/contents/kernel/components/draw/step/**`
- `apps/docs/src/modules/docs/contents/about/blog/core-philosophy/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/about/blog/core-philosophy/index.en.mdx`
- `apps/docs/src/modules/docs/data/changelog.ts`

偏离白名单的改动需要扩展本 ADR 或另开 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `builtin_parabola_without_options`：不传 `pathGenerators`，IR 使用 `generator name="parabola"` + `params.control` + `to` → 输出包含一个 `quad` 命令。
- `builtin_parabola_control_target_id`：`params.control` 引用 coordinate id → `quad.control` 使用 resolve 后世界坐标。
- `builtin_bulge_without_options`：不传 `ribbonWidthProfiles`，ribbon `width.profile name="bulge"` → 编译成功并生成采样轮廓。
- `builtin_bulge_peak_midpoint`：`base: 4, peak: 12` 且固定采样含中点 → 中点宽度大于两端宽度。

**边界（≥ 2）**：

- `bulge_peak_equals_base`：`base === peak` → 行为等价常量宽度，不抛错。
- `bulge_peak_less_than_base`：`peak < base` → 中点收窄但仍非负，编译成功。
- `parabola_control_as_position`：`params.control` 直接给 `[x, y]` → 正常生成 `quad`。

**错误路径（≥ 2）**：

- `parabola_missing_to`：内置 `parabola` 没有 `to` → throw，消息包含 `parabola` 和 `to`。
- `parabola_missing_control`：`params.control` 缺失或 schema 不匹配 → zod error。
- `bulge_negative_base_or_peak`：`base` 或 `peak` 为负数 → zod error。
- `custom_duplicate_builtin_name`：自定义 `parabola` 或 `bulge` 与内置同名 → duplicate registration error。

**交互（≥ 2）**：

- `parabola_inside_scope_transform`：generator 位于 transformed scope，`from` / `to` / `control` 使用世界坐标且不被二次 transform。
- `parabola_with_label`：generator step 带 label → label 仍沿生成的 `quad` 定位。
- `bulge_with_adaptive_sampling`：`bulge` 配 `sampling: { kind: "adaptive" }` → 采样数按现有规则解析，profile 被调用。
- `bulge_with_align`：`bulge` 配 ribbon `align` → 轮廓相对中心线偏移规则保持不变。

### 依赖的现有元素

- `PathGeneratorDefinition`（`packages/kernel/core/src/contract/path-generator/types.ts`）——复用 `name`、`paramsSchema`、`targetParams` 和 `generate`。
- `definePathGenerator`（`packages/kernel/core/src/contract/path-generator/define.ts`）——创建内置 `parabola`。
- `resolvePathGeneratorRegistry`（`packages/kernel/core/src/providers/path-generator/registry.ts`）——继续合并内置与自定义 definition。
- `RibbonWidthProfileDefinition`（`packages/kernel/core/src/contract/ribbon/types.ts`）——复用 `name`、`paramsSchema` 和 `widthAt`。
- `defineRibbonWidthProfile`（`packages/kernel/core/src/contract/ribbon/define.ts`）——创建内置 `bulge`。
- `resolveRibbonWidthProfileRegistry`（`packages/kernel/core/src/providers/ribbon/registry.ts`）——继续合并内置与自定义 definition。
- `TargetSchema`（`packages/kernel/core/src/schemas/path/target/schema.ts`）——作为 `parabola.params.control` 的 schema。
- `assertFiniteWidth`（`packages/kernel/core/src/compile/path/ribbon/width.ts`）——继续保护 `bulge` 的输出宽度。

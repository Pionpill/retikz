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

## 不在本 ADR 范围

- 不内置 `sin`、`cos`、`wave`、`arcThrough`、`bezierThrough` 等更主观或参数空间更大的 path generator。
- 不内置 `taper`：现有 `start.width` / `end.width` 已覆盖两端线性 taper，内置 profile 应展示更有区分度的函数型宽度。
- 不增加 provider override 机制；内置 key 不允许被自定义 definition 覆盖。
- Vanilla API 不变；React 仅补 `<Step kind="generator">` 对既有 IR generator step 的一对一 DSL 映射。
- 不改变 `stops`、`sampling`、`samples` 的语义。

---

> **实现指针**：本 ADR 已随 kernel v0.4-alpha.8 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show v0.4.0-alpha.8:packages/kernel/_notes/decisions/v0/v0.4/alpha.8/06-builtin-path-generator-ribbon-profile.md`。

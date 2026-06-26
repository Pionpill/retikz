# ADR-02: Ribbon 边界与对齐增强

- Status: Proposed
- Decision date: 2026-06-26
- Owner: core
- Related:
  - [alpha.6 roadmap](./roadmap.md)
  - [ADR-01 Ribbon 可变宽度路径](./01-ribbon.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)

## Context

ADR-01 已经把 `Ribbon` 定义为 core 级可变宽度带状路径：用户给一条开放中心线和 `width` 规则，compile 将它 lower 为闭合 `PathPrim`。这足够表达第一版 Sankey-like link，也能保持 renderer 不新增 primitive。

但只靠 `centerline + symmetric width` 仍有几个 core 级限制：

1. 目前宽度始终围绕中心线对称展开，不能表达“以一侧边界为基准向另一侧扩展”的带状路径。
2. 有些流带的上下边界并不是同一条中心线按法线偏移得到的，例如上下边界曲率不同、局部鼓包、严格贴合已有轮廓，中心线模型无法精确表达。
3. 端面目前等价于 flat butt cap，无法表达 round / square 等常见带状端面。
4. 曲率过大、宽度过大或采样过少时，生成的左右边界可能自交或翻转；第一版只产出确定几何，没有诊断。
5. 固定 `samples` 对简单路径浪费点数，对急弯路径可能不够平滑；core 需要预留自适应采样入口。

这些不是 plot 布局能力。Sankey 的 node 布局、link slot 分配、link 排序和 crossing 优化仍属于 plot。core 只补“给定几何输入后，如何稳定生成带状面”的通用能力。

## Decision

扩展 `Ribbon` 为两个模式：

1. `kind: "centerline"`：沿用 ADR-01 的中心线 + width 模型，并新增对齐、端面和采样控制。
2. `kind: "boundary"`：显式提供 `upper` / `lower` 两条开放边界路径，compile 直接拼成闭合带状面。

`kind` 省略时保持当前语义，等价于 `"centerline"`。该默认值只服务已经落地的 `Ribbon` 直觉，不引入旧版本兼容承诺；v0.x 内部仍可按正确设计继续收敛。

核心 schema 草案：

```ts
export const RibbonAlignment = {
  Center: "center",
  Left: "left",
  Right: "right",
} as const;

export const RibbonCap = {
  Butt: "butt",
  Round: "round",
  Square: "square",
} as const;

export const RibbonSamplingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed"),
    samples: z.number().int().min(2).max(512),
  }),
  z.object({
    kind: z.literal("adaptive"),
    tolerance: z.number().finite().positive(),
    maxSamples: z.number().int().min(2).max(2048).optional(),
  }),
]);

export const CenterlineRibbonSchema = BaseRibbonStyleSchema.extend({
  type: z.literal("ribbon"),
  kind: z.literal("centerline").optional(),
  children: z.array(StepSchema).min(2),
  start: RibbonEndpointSchema.optional(),
  end: RibbonEndpointSchema.optional(),
  interpolation: z.enum(["linear", "smooth"]).optional(),
  width: RibbonWidthSchema.optional(),
  align: z.enum(RibbonAlignment).optional(),
  samples: z.union([z.boolean(), z.number().int().min(2).max(512)]).optional(),
  sampling: RibbonSamplingSchema.optional(),
});

export const BoundaryRibbonSchema = BaseRibbonStyleSchema.extend({
  type: z.literal("ribbon"),
  kind: z.literal("boundary"),
  upper: z.array(StepSchema).min(2),
  lower: z.array(StepSchema).min(2),
  samples: z.union([z.boolean(), z.number().int().min(2).max(512)]).optional(),
  sampling: RibbonSamplingSchema.optional(),
});
```

语义约定：

- `align: "center"`：当前行为，左右各偏移 `width / 2`。
- `align: "left"`：中心线作为一侧边界，ribbon 只向路径左侧展开 `width`。
- `align: "right"`：中心线作为一侧边界，ribbon 只向路径右侧展开 `width`。
- 端点局部配置聚合到 `start` / `end`：`width`、`direction`、`cap` 都放在对应端点对象内。例如线性 taper 写 `start={{ width: 36 }} end={{ width: 12 }}`，端点切线写 `start={{ direction: 0 }}`。
- 顶层 `width` 只表示整条中心线的宽度规则：固定宽度、`stops` 或 `profile`。它不能和 `start.width` / `end.width` 同时出现。
- 中段变宽 / 变窄不新增字段，继续由 ADR-01 的 `width.kind: "stops"` 或 `width.kind: "profile"` 表达。例如两端粗、中间细是 stops `[0 -> large, 0.5 -> small, 1 -> large]`。
- “先平行一段时间后再曲线”不新增 `straightLength` 字段，继续由 `Step` 组合表达：先写一段 `line`，再接 `curve` / `cubic`。这样中心线模式和 boundary 模式都能复用同一套 path 语言。
- `start.cap` / `end.cap` 默认 `"butt"`。`"round"` 用半圆或采样弧连接两侧边界；`"square"` 沿端点切线方向外扩半个端点宽度后再闭合。
- `samples` 是 fixed sampling 的快捷字段。省略时，固定宽度与 `start.width` / `end.width` 端点宽度优先把直线 / 二次贝塞尔 / 三次贝塞尔 lower 为结构化 Path command；`width.kind: "stops"` 与 profile 这类沿途宽度规则自动使用默认 64 个采样截面；`samples: true` 使用 64 个采样截面；`samples: number` 使用指定截面数。`sampling` 是完整采样配置。两者同时出现时 schema 应拒绝，避免两个字段竞争。
- `boundary` 模式下不接受 `children` / `width` / `align` / `start` / `end` / `interpolation`。两条边界各自已经决定形状，compile 只负责按同向路径拼接。
- `boundary.upper` 与 `boundary.lower` 都必须是单条开放路径。它们应从同一个逻辑起点走向同一个逻辑终点；compile 不做路径反向猜测。
- compile 应通过现有 warning hook 或新增 ribbon diagnostics hook 报告明显自交、边界翻转和采样不足风险。诊断不改变 IR 结构。

理由：

1. `align` 是当前中心线模型的最小扩展，可以表达贴边、堆叠、单侧扩展，且不会改变 renderer。
2. `boundary` 模式补齐中心线模型的表达边界，避免把复杂非对称形状强塞进 width profile。
3. `start.cap` / `end.cap` 是端面语义，不应由用户手动伪造额外 path。
4. `sampling` 把“固定点数”和“按误差自适应”放在同一套 JSON-safe schema 内，避免将来新增并行字段。
5. 所有模式仍 lower 为 `PathPrim`，保持 ADR-01 的 renderer-agnostic 决策。

## 待决策点

- **left/right 命名是否足够直观**：实现前需要在文档中明确它是相对路径行进方向的几何侧，而不是屏幕绝对方向。若 review 认为歧义过大，可改为 `positive` / `negative` 或 `normal` / `opposite`，但必须在实现前定稿。
- **adaptive sampling 首版是否落地**：schema 预留 `sampling.kind: "adaptive"`，但实现可以先只接受 fixed，并把 adaptive 放入同 ADR 的后续 step；若这样做，schema 不应提前接受未实现值。
- **boundary 模式是否使用 `upper/lower` 还是 `left/right`**：当前倾向 `upper/lower`，因为用户在带状面中更容易理解两条外边界；文档必须说明它们是命名约定，不保证屏幕方向。

## DSL 表面

中心线单侧展开：

```tsx
<Ribbon width={24} align="left" fill="#60a5fa">
  <Step kind="move" to={[-120, 0]} />
  <Step kind="cubic" control1={[-40, 0]} control2={[40, 80]} to={[120, 80]} />
</Ribbon>
```

端面控制：

```tsx
<Ribbon
  start={{ width: 36, cap: "round", direction: 0 }}
  end={{ width: 12, cap: "square", direction: 0 }}
  fill="#f59e0b"
>
  <Step kind="move" to={[-160, 0]} />
  <Step kind="curve" control={[0, 48]} to={[160, 0]} />
</Ribbon>
```

两端粗、中间细：

```tsx
<Ribbon
  width={{
    kind: "stops",
    stops: [
      { offset: 0, value: 32 },
      { offset: 0.5, value: 10 },
      { offset: 1, value: 32 },
    ],
    interpolation: "smooth",
  }}
  fill="#38bdf8"
>
  <Step kind="move" to={[-180, 0]} />
  <Step kind="cubic" control1={[-80, -72]} control2={[80, 72]} to={[180, 0]} />
</Ribbon>
```

先平行一段再进入曲线：

```tsx
<Ribbon width={18} start={{ direction: 0 }} end={{ direction: 0 }} fill="#c084fc">
  <Step kind="move" to={[-180, 0]} />
  <Step kind="line" to={[-120, 0]} />
  <Step kind="cubic" control1={[-40, 0]} control2={[80, 80]} to={[180, 80]} />
</Ribbon>
```

显式边界模式：

```tsx
<Ribbon kind="boundary" fill="#a78bfa">
  <Ribbon.Upper>
    <Step kind="move" to={[-160, -24]} />
    <Step kind="cubic" control1={[-40, -80]} control2={[40, -10]} to={[160, -18]} />
  </Ribbon.Upper>
  <Ribbon.Lower>
    <Step kind="move" to={[-160, 24]} />
    <Step kind="cubic" control1={[-40, 40]} control2={[40, 70]} to={[160, 18]} />
  </Ribbon.Lower>
</Ribbon>
```

Vanilla DSL 应使用同一 IR 字段：

```ts
ribbon({
  kind: "boundary",
  fill: "#a78bfa",
  upper: [
    { type: "step", kind: "move", to: [-160, -24] },
    { type: "step", kind: "cubic", control1: [-40, -80], control2: [40, -10], to: [160, -18] },
  ],
  lower: [
    { type: "step", kind: "move", to: [-160, 24] },
    { type: "step", kind: "cubic", control1: [-40, 40], control2: [40, 70], to: [160, 18] },
  ],
});
```

## 测试设计

`packages/kernel/core/tests/compile/ribbon.test.ts` 覆盖 schema、lowering、错误路径和交互行为。React / Vanilla adapter 测试各验证 authoring surface 到 IR 的一致性。文档 demo 只验证类型和页面可访问。

具体 case 见下方“实现契约 / 测试象限”。

## 影响

- `packages/kernel/core/src/schemas/ribbon.ts` 会从单一中心线 schema 扩展为 `centerline` / `boundary` 两种模式。
- `packages/kernel/core/src/compile/ribbon.ts` 需要把 offset 生成拆成“中心线模式”和“边界模式”两条入口，但输出仍是一个闭合 `PathPrim`。
- `@retikz/react` 的 `<Ribbon>` 需要支持 boundary 子组件或等价 props；`@retikz/vanilla` 需要接受 `upper` / `lower` arrays。
- 文档需要补充对齐、端面、边界模式和诊断说明。
- renderer 不新增 primitive。

## 不在本 ADR 范围

- Sankey / alluvial 的 node 布局、link slot 分配、link 排序、crossing 优化。
- Plot 层的 link color scale、hover 高亮、legend、tooltip。
- 精确 offset Bezier 输出。首版仍允许 polyline approximation。
- 沿中心线方向的自动渐变 sugar。现阶段继续使用现有 PaintSpec。
- 将 sampled boundary points 暴露为公共 Scene primitive。可以在 compile 内部用于诊断，但不进入 Scene 公共结构。

---

## 实现契约

### Level

`red`

本 ADR 修改 core IR schema、compile lowering、React / Vanilla public authoring surface 和 docs。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/ribbon.ts` | 修改 | `kind` | `"centerline" \| "boundary"` | `"centerline"` | 选择中心线模式或显式边界模式 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `align` | `"center" \| "left" \| "right"` | `"center"` | width 相对中心线如何展开 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `start` | `{ width?, direction?, cap? }` | 无 | 起点端点局部配置 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `end` | `{ width?, direction?, cap? }` | 无 | 终点端点局部配置 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `interpolation` | `"linear" \| "smooth"` | `"linear"` | `start.width` 到 `end.width` 的过渡曲线 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 修改 | `width` | `number \| stops \| profile` | 无 | 固定宽度或中段自定义宽度规则 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `sampling` | `{ kind: "fixed", samples } \| { kind: "adaptive", tolerance, maxSamples? }` | 无 | 显式 ribbon 边界采样策略 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `upper` | `Array<Step>` | 无 | boundary 模式的第一条开放边界路径 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `lower` | `Array<Step>` | 无 | boundary 模式的第二条开放边界路径 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 修改 | `children` | `Array<Step>` | centerline 模式必填 | centerline 模式的开放中心线 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 修改 | `samples` | `boolean \| number` | 自动 | fixed sampling 快捷字段；`true` = 64，数字 = 指定截面数；不得与 `sampling` 同时出现；未传时允许根据宽度规则自动选择结构化 path 或采样 |

### 文件 scope

允许修改：

- `packages/kernel/core/src/schemas/ribbon.ts`
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/compile/ribbon.ts`
- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/contract/ribbon/**`
- `packages/kernel/react/src/kernel/Ribbon.tsx`
- `packages/kernel/react/src/kernel/_fields.ts`
- `packages/kernel/react/src/kernel/builder.ts`
- `packages/kernel/react/src/kernel/unbuilder.ts`
- `packages/kernel/react/tests/kernel/*.test.tsx`
- `packages/kernel/vanilla/src/builder/ribbon.ts`
- `packages/kernel/vanilla/tests/*.test.ts`
- `packages/kernel/core/tests/compile/ribbon.test.ts`
- `apps/docs/src/contents/core/components/draw/ribbon/**`
- `apps/docs/src/components/shared/component-preview/**`，仅限 demo 转换确实需要时
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`

不允许在本 ADR 下修改：

- renderer primitive 类型系统以新增 `RibbonPrim`
- plot / graph 包
- 与 ribbon 无关的 Path / Node / Layout 行为
- 现有 PaintSpec schema，除非实现发现 PaintSpec 无法表达已承诺的 ribbon 样式；这种情况应新开 ADR

### 测试象限

Happy path（至少 3）：

- `centerline align center preserves current symmetric outline`：默认 centerline 输出与 ADR-01 行为一致。
- `centerline align left expands only to one side`：同一中心线和 width 下，一侧边界等于中心线，另一侧按 width 偏移。
- `centerline align right expands to the opposite side`：与 left 输出镜像侧相反。
- `boundary ribbon joins upper and lower paths into one closed PathPrim`：显式两条边界拼成闭合 path。
- `round and square caps generate finite closed outlines`：端面模式输出有限坐标且闭合。
- `stops width can taper inward and expand outward again`：两端粗、中间细的 width stops 输出中段更窄的带状面。
- `straight then cubic centerline keeps an initial parallel band before bending`：`line + cubic` 组合先生成平行段，再进入曲线段。

边界（至少 2）：

- `samples shortcut and sampling fixed produce identical output`：`samples: 16` 与 `sampling: { kind: "fixed", samples: 16 }` 等价；`samples: true` 等价 64 个截面。
- `omitted samples prefers path commands`：未传 `samples` 且宽度规则可结构化表达时，直线 / 二次贝塞尔 / 三次贝塞尔优先输出结构化 path command，而不是默认折线采样。
- `omitted samples auto-samples along-path width rules`：未传 `samples` 但使用 `width.kind: "stops"` 或 profile 时，compile 自动使用默认采样截面，保证 step / profile 这类中途宽度变化可表达。
- `zero width with left/right align still produces deterministic outline`：零宽边界不产生 NaN。
- `boundary mode accepts curves with different upper/lower curvature`：上下边界曲率不同仍能 lower。

错误路径（至少 2）：

- `schema rejects samples and sampling together`：避免双字段竞争。
- `schema rejects centerline-only fields in boundary mode`：`boundary` 模式不能带 `children` / `width` / `align` / `start` / `end`。
- `schema rejects boundary-only fields in centerline mode`：`centerline` 模式不能带 `upper` / `lower`。
- `compile rejects boundary paths with close or multiple subpaths`：边界必须是单条开放路径。

交互（至少 2）：

- `start.direction/end.direction still reshape centerline mode before align is applied`：端点方向与 align 同时工作。
- `fill/stroke/shadow/blendMode survive both centerline and boundary lowering`：样式透传一致。
- `React Ribbon boundary children produce the same IR as raw JSON`：React adapter 对齐 core IR。
- `Vanilla ribbon boundary config produces the same IR as raw JSON`：Vanilla adapter 对齐 core IR。
- `diagnostics warn or error on obvious side flip/self intersection`：诊断 hook 可观测。

### 依赖的现有元素

- `RibbonSchema`（`packages/kernel/core/src/schemas/ribbon.ts`）：扩展为两种模式。
- `StepSchema`（`packages/kernel/core/src/schemas/path/step.ts`）：继续作为 centerline / boundary path 的步骤语言。
- `emitRibbonPrimitive`（`packages/kernel/core/src/compile/ribbon.ts`）：拆分 centerline 与 boundary lowering。
- `PathPrim`（`packages/kernel/core/src/primitive/path.ts`）：仍作为唯一输出 primitive。
- `PaintSpecSchema` / style compile：复用现有 fill、stroke、shadow、blendMode 语义。
- React / Vanilla kernel builders：扩展 authoring surface，不能引入与 core IR 不一致的私有能力。

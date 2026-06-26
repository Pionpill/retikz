# ADR-01：Ribbon 可变宽度路径

- Status: Proposed
- Decision date: 2026-06-25
- Owner: core
- Related:
  - [alpha.6 roadmap](./roadmap.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)

## Context

plot 的桑基图需要绘制一类带状连线：它有一条中心线，可以是直线或曲线，但沿路径方向的宽度会变化。例如源节点一侧宽、目标节点一侧窄，或按分段规则在中间过渡。

现有 `Path` 本质上对应 SVG / Canvas stroke 模型：中心线加稳定 `strokeWidth`。这个模型无法表达“起点宽度和终点宽度不同”的带状面。强行扩展 `Path.strokeWidth` 会把普通线段和带状面积混在一个字段里，也会让 renderer 需要理解可变 stroke 这种并不存在的跨后端 primitive。

现有自定义能力也不能直接解决：

- `PathGeneratorDefinition` 只返回 `Array<PathCommand>`，适合生成中心线，不适合声明中心线两侧的可变偏移面。
- `ShapeDefinition` 绑定在 `Node.shape` 的矩形边界、anchor、edgePoint 和 node emit 语义上，不适合作为 Sankey link 这类跨节点带状边。
- plot 不应该绕过 core 自造平行 IR 或 renderer 语义。Sankey 所需的通用带状路径能力应先进入 core，再由 plot lowering 复用。

## Decision

新增 core 级 `Ribbon` 图元，IR 判别字段为 `type: "ribbon"`。

`Ribbon` 表示“沿一条开放中心线扫出的可变宽度带状面”。它在 compile 阶段 lower 为一个闭合 `PathPrim`：

1. 解析 `Ribbon.children` 中的 path step，得到一条开放中心线。
2. 按 `samples` 对中心线采样，计算每个采样点的切线和法线。
3. 按 `width` 规则得到每个 normalized offset 上的宽度。
4. 生成中心线左右两侧偏移点。
5. 将左侧点和反向右侧点拼成闭合 path，并把 `fill`、outline stroke 等样式复制到 `PathPrim`。

renderer 不新增 ribbon primitive。SVG / Canvas 只接收现有的闭合 `PathPrim`。

## Public Surface

### Core IR

`Ribbon` 是 path-like child，使用 `children` 承载中心线 step，以便 React JSX 与现有 `Path` 心智模型保持一致。

```ts
export const RibbonWidthInterpolation = {
  Linear: "linear",
  Smooth: "smooth",
  Step: "step",
} as const;

export const RibbonSchema = z.object({
  type: z.literal("ribbon"),
  id: z.string().optional(),
  children: z.array(StepSchema).min(1).describe("Open centerline steps used to construct the ribbon body."),
  width: RibbonWidthSchema.describe("Width profile sampled along the centerline."),
  startDirection: RibbonDirectionSchema.optional(),
  endDirection: RibbonDirectionSchema.optional(),
  samples: z.number().int().min(2).max(512).default(48).optional(),
  fill: PaintSpecSchema.optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  stroke: PaintSpecSchema.optional(),
  strokeWidth: z.number().nonnegative().optional(),
  opacity: z.number().min(0).max(1).optional(),
  zIndex: z.number().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
```

`width` 支持四种 JSON 可序列化写法：

```ts
type RibbonWidth =
  | number
  | {
      kind?: "linear";
      start: number;
      end: number;
      interpolation?: "linear" | "smooth";
    }
  | {
      kind: "stops";
      stops: Array<{ offset: number; value: number }>;
      interpolation?: "linear" | "smooth" | "step";
    }
  | {
      kind: "profile";
      name: string;
      params?: Record<string, unknown>;
    };
```

约束：

- 所有 width value 必须是有限非负数。
- `stops.offset` 取值范围为 `[0, 1]`，编译前按 offset 排序。
- `stops` 不要求显式包含 `0` 和 `1`；缺失端点时使用最近 stop 的 value 向外延展。
- `profile` 不把函数写进 IR，只通过 registry name 和 JSON params 引用 host 提供的 definition。
- `children` 必须形成单条开放中心线。`close`、多 subpath、无法解析的 target、零长度中心线应报错。
- `startDirection` / `endDirection` 可用角度（度）、`Vector2` / `Position` tuple 或 `PolarPosition` 覆盖端点切线方向；省略时使用起点到终点的连接方向。

### Width Profile Registry

为支持“自定义变化规则”，新增 ribbon width profile definition。内置 fixed / linear / stops 走同一解析管线，扩展 profile 也走同一 registry。

```ts
export type RibbonWidthProfileContext<
  TParams extends Record<string, unknown> = Record<string, unknown>,
> = {
  offset: number;
  length: number;
  params: TParams;
};

export type RibbonWidthProfileDefinition<
  TParams extends Record<string, unknown> = Record<string, unknown>,
> = {
  name: string;
  paramsSchema?: z.ZodType<TParams>;
  widthAt: (ctx: RibbonWidthProfileContext<TParams>) => number;
};
```

编译器选项增加 profile registry，例如：

```ts
compile(ir, {
  ribbonWidthProfiles: {
    "ease-out": {
      name: "ease-out",
      paramsSchema: z.object({ start: z.number(), end: z.number() }),
      widthAt: ({ offset, params }) => {
        const start = params.start;
        const end = params.end;
        return start + (end - start) * (1 - Math.pow(1 - offset, 2));
      },
    },
  },
});
```

`widthAt` 是 compile-time extension，不能进入 IR。它必须返回有限非负数，否则编译失败并给出 ribbon id / profile name / offset 的诊断信息。

### React DSL

```tsx
<Ribbon
  fill={{ kind: "solid", color: "currentColor" }}
  width={{ start: 32, end: 12, interpolation: "linear" }}
>
  <Step to="source" />
  <Step kind="cubic" control1={[120, 0]} control2={[180, 80]} to="target" />
</Ribbon>
```

Sankey-like 场景可以由 plot lowering 生成同样的 IR：

```tsx
<Ribbon
  fill={{ kind: "linearGradient", angle: 0, stops: [
    { offset: 0, color: "#60a5fa" },
    { offset: 1, color: "#f97316" },
  ] }}
  width={{ kind: "stops", stops: [
    { offset: 0, value: 36 },
    { offset: 0.6, value: 24 },
    { offset: 1, value: 12 },
  ] }}
>
  <Step to="imports" />
  <Step kind="cubic" control1={[120, 0]} control2={[180, 120]} to="exports" />
</Ribbon>
```

### Vanilla DSL

Vanilla 应提供与 core IR 同名的 `ribbon` helper。没有 helper 时也可直接传 JSON IR，但正式文档应使用 helper。

```ts
const chart = figure({}, [
  ribbon({
    fill: "#93c5fd",
    width: { start: 32, end: 12 },
    children: [
      { kind: "line", to: "source" },
      { kind: "cubic", control1: [80, 0], control2: [160, 90], to: "target" },
    ],
  }),
]);
```

## Lowering Semantics

`Ribbon` lower 后只产生一个 `PathPrim`。生成 path 时采用 polyline approximation，而不是尝试生成精确 offset Bezier。原因是 variable-width ribbon 的 offset curve 通常不再是同阶 Bezier，统一采样更适合跨 SVG / Canvas 后端保持一致。

采样规则：

- 默认 `samples = 48`。
- 对 line / quadratic / cubic / arc / path generator 输出的命令统一转为采样点。
- 采样点去除相邻重复点，避免零长度切线。
- 中间点使用中心线采样切线；端点默认使用起点到终点的连接方向，也可由 `startDirection` / `endDirection` 覆盖。覆盖值会先从角度、tuple 或 polar sugar 转成同一套归一化二维向量。
- 生成 path 命令为 `moveTo(left[0]) -> lineTo(left...) -> lineTo(reverse(right...)) -> closePath`。

样式规则：

- `fill` 表示 ribbon body 的填充；默认使用 `currentColor`。
- `stroke` / `strokeWidth` 表示 ribbon 外轮廓描边，不表示中心线 stroke。
- 不支持 arrow、dash、lineCap、marks、path label；这些属于中心线 stroke 语义，不适合第一版 ribbon 面。

## Documentation

文档新增在：

- `apps/docs/src/contents/core/components/draw/ribbon/index.zh.mdx`
- `apps/docs/src/contents/core/components/draw/ribbon/index.en.mdx`

页面归属 `core/components/draw`。内容重点：

- 说明 `Ribbon` 是带状面，不是 variable `strokeWidth`。
- 说明它 lower 为普通 path，因此现有 renderer 能直接显示。
- 提供三个 demo：
  - 固定宽度 ribbon。
  - start/end 线性变化 ribbon。
  - Sankey-like 渐变填充 ribbon。
- API 表列出 `width`、`samples`、`fill`、`stroke`、`strokeWidth` 和 `children`。

## Implementation Contract

Level: red。该改动新增 core IR schema、compile lowering、public React / Vanilla 入口，并改变用户可见文档。

### Schema 改动表

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | 定义 `RibbonSchema`、`RibbonWidthSchema`、profile 引用 schema |
| `packages/kernel/core/src/schemas/children.ts` 或当前 child union 文件 | 修改 | 将 `RibbonSchema` 加入 figure / scope 可接收的 child union |
| `packages/kernel/core/src/schemas/index.ts` | 修改 | 导出 ribbon schema 与派生类型 |
| `packages/kernel/core/src/contract/ribbon/types.ts` | 新增 | 定义 `RibbonWidthProfileDefinition` 等 compile-time extension contract |
| `packages/kernel/core/src/compile/*` | 修改 | 解析 ribbon，lower 为闭合 `PathPrim` |
| `packages/kernel/react/src/*/Ribbon.tsx` | 新增 | React Kernel 组件 |
| `packages/kernel/vanilla/src/*/ribbon.ts` | 新增 | Vanilla builder |
| `apps/docs/src/contents/core/components/draw/ribbon/*` | 新增 | 中英文文档与 demo |
| `apps/docs/src/data/*`、`apps/docs/src/i18n/*` | 修改 | 注册 draw/ribbon 页面 |

### 文件 scope

允许修改：

- `packages/kernel/core/src/schemas/**`
- `packages/kernel/core/src/contract/**`
- `packages/kernel/core/src/compile/**`
- `packages/kernel/core/src/primitive/**`，仅限需要补 helper，不新增 primitive 类型
- `packages/kernel/react/src/**`
- `packages/kernel/vanilla/src/**`
- `apps/docs/src/contents/core/components/draw/**`
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`
- 对应测试文件

不允许在本 ADR 下修改：

- renderer primitive 类型系统以新增 `RibbonPrim`
- plot 桑基图 mark 本身
- `Path.strokeWidth` 的语义
- 与 ribbon 无关的 paint、node、layout 重构

### 依赖现有元素

- 复用 `StepSchema` 与现有 path step resolve 逻辑。
- 复用 `PathPrim`、`PaintSpecSchema`、paint resource 处理与 renderer path 渲染。
- 复用 compile error / diagnostic 风格。
- 复用 math 包中的向量运算；若缺少小 helper，只补纯函数。

## Test Plan

1. Schema accepts numeric width and rejects negative numeric width.
2. Schema accepts `{ start, end }` linear width and rejects negative start / end.
3. Schema accepts stops width, sorts unordered stops during compile, and extends missing endpoint values.
4. Compile lowers a straight fixed-width ribbon to one closed `PathPrim` with fill and no new primitive type.
5. Compile lowers a straight start/end ribbon with visibly different start and end widths.
6. Compile lowers a cubic ribbon to a closed sampled path with stable finite coordinates.
7. Compile defaults endpoint directions to the start-to-end connection direction on curved centerlines.
8. Compile applies `startDirection` / `endDirection` angle, vector tuple, and polar overrides.
9. Compile rejects `close` or multiple subpaths in ribbon children with a ribbon-specific diagnostic.
10. Compile rejects zero-length centerline with a diagnostic instead of producing NaN coordinates.
11. Profile registry validates params, calls `widthAt`, and applies returned widths.
12. Missing profile name fails with ribbon id and profile name in the error.
13. Profile returning `NaN`, `Infinity`, or negative value fails with offset context.
14. Paint integration preserves solid / gradient `fill` on the lowered `PathPrim`.
15. Style integration preserves `opacity`, `zIndex`, `stroke`, and `strokeWidth` on the lowered `PathPrim`.
16. React `<Ribbon>` emits the same IR shape as raw JSON `type: "ribbon"`.
17. Vanilla `ribbon(...)` emits the same IR shape as raw JSON `type: "ribbon"`.
18. Docs demo compiles through docs typecheck and renders a Sankey-like gradient ribbon.

## Consequences

Positive:

- plot Sankey can build on a reusable core capability.
- renderer backends stay simple because ribbon compiles to existing path primitives.
- Width customization remains JSON-safe in IR while still allowing host-provided extension logic through a registry.

Costs:

- Ribbon geometry is approximation-based. Very low `samples` may show faceting on tight curves.
- Offset ribbons can self-intersect on extreme curvature or width changes. The first implementation only produces deterministic geometry; it does not solve topology.
- `Ribbon` introduces a new path-like core child, so docs and DSL surfaces must be updated together.

## Alternatives Considered

### Extend `Path.strokeWidth`

Rejected. `strokeWidth` maps to stable renderer stroke width. Making it accept variable profiles would make ordinary lines and filled bands share one field while requiring renderer-specific custom handling.

### Use custom `ShapeDefinition`

Rejected. Shape definitions describe node-local geometry and anchors. A Sankey link spans between points / nodes and should participate in draw/path semantics, not node shape semantics.

### Add renderer-level `RibbonPrim`

Rejected for the first version. Core can deterministically lower to a closed path, so renderer backends do not need a new primitive contract.

### Let plot emit raw `PathPrim` directly

Rejected. That would solve Sankey locally but would hide a generally useful capability from core users and create a parallel plot-only geometry path.

# ADR-03：density transform + density area composition

状态：Accepted
决策日期：2026-06-28
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [alpha.12 ADR-06 transform registry](../alpha.12/06-transform-registry.md) · [alpha.12 ADR-16 Statistical transform algebra](../alpha.12/16-statistical-transform-algebra.md) · [PathMark area docs](../../../../../../apps/docs/src/contents/graph/grammar/mark/path/index.zh.mdx) · [plot-design.md §13.1](../../../../../architecture/plot-design.md)

## 背景

alpha.12 已经把统计能力收敛到 transform 层：root transform 或 mark-local transform 先把输入 rows 派生成新的 plain rows，mark 只消费这些 rows，不在 lowering 期偷偷计算统计。alpha.13 ADR-02 进一步把 boxplot 拆成 `quantile-band` reducer、outside selector 与 `IntervalMark` / `ReferenceMark` / `PointMark` 的组合，证明“统计是 transform，几何是抽象 mark”这条路能承载更真实的图表。

密度图属于同一类问题。用户手里通常有一维连续样本，例如响应时间、收入、评分、误差值；他们想看这些样本在数轴上集中在哪里，而不是只看 histogram 的硬分箱或 boxplot 的几个摘要点。KDE density 会把原始样本变成一组沿连续轴采样的 `{ x, density }` rows；这些 rows 再由 path / area 几何表达。

如果新增 `DensityMark` 或 chart preset，第一版会把统计计算和几何表达绑在一起：同一个 KDE 输出既不能被 `PathMark` 画成曲线，也不能被填充面积、分组叠加、颜色通道或后续自定义 mark 复用。更糟的是，mark lowering 期临时算 KDE 会绕开 transform registry、strict model 字段收集、locator 与 render 共用数据视图的契约。

本 ADR 因此只新增内置 `density` transform。它从一维字段生成可渲染采样 rows；密度曲线用 `PathMark`，密度面积用 `PathMark closure={{ kind: 'baseline' }}`。当前 plot 没有独立 `RegionMark` public surface；若后续引入区域 mark，也应消费同一批 density rows，而不是新建 parallel density IR。

## 决策：新增内置 `density` transform

新增内置 transform operation：`{ kind: 'density', ... }`。它按可选 `groupBy` 分组，对每组读取一个连续数值字段，使用一维 Gaussian KDE 生成固定数量的采样 rows。输出 rows 只保留 group key、采样位置字段与密度字段，并通过 `groupProvenance` 记录来源 rows。

```ts
type DensityBandwidthSpec =
  | { kind: 'silverman' }
  | { kind: 'value'; value: number };

type DensityTransform = {
  kind: 'density';
  field: string;
  groupBy?: Array<string>;
  bandwidth?: DensityBandwidthSpec; // default { kind: 'silverman' }
  sampleCount?: number; // default 64, minimum 2
  extent?: [number, number];
  xAs: string;
  densityAs: string;
};
```

默认算法固定为 Gaussian kernel + Silverman rule of thumb。对每个 sample `x`，密度值为：

```ts
density(x) = mean(gaussian((x - value) / bandwidth) / bandwidth)
```

`bandwidth` 省略时等价 `{ kind: 'silverman' }`。Silverman 带宽按每组有限数值单独计算；需要至少两个有限值，且标准差或 IQR 能给出正带宽。若分组为空、全非 finite、只有一个有限值或所有值相同导致默认带宽不可解，transform fail-loud，不静默输出 0 密度。若用户显式传 `{ kind: 'value', value }`，`value` 必须为正有限数；此时单点组和全相同值可以生成以该带宽展开的 density bump。

`extent` 省略时由该组有限值和带宽决定：`[min - 3 * bandwidth, max + 3 * bandwidth]`。显式 `extent` 必须满足 `min < max`，采样点均匀覆盖闭区间两端。`sampleCount` 省略时为 64；采样顺序按 x 升序稳定输出。`xAs` 与 `densityAs` 必填且不得重复，也不得覆盖 `groupBy` 字段，避免生成 rows 时悄悄破坏 group key。

`density` 是完整 transform kind，而不是 reducer 或 selector。原因是它会把每个 group 变成多行采样 rows；这既不是“一组一行”的 reducer，也不是“选择原始 rows”的 selector。它仍然通过 `defineTransform` 作为内置 definition 注册，与自定义 transform 共享同一 registry、字段收集与执行路径。

理由：

1. KDE 输出是普通 rows，最自然的消费方是已有 `PathMark`：曲线、面积、系列拆分、颜色通道和 docs demo 都能复用现有 grammar，不需要新增 `DensityMark`。
2. Gaussian + Silverman 是确定性、经典且可测试的最小默认；显式正数带宽给高级用户留出控制点，同时保持 IR 100% JSON-safe。
3. `xAs` / `densityAs` 显式命名让 AI 和 strict model 都能清楚知道 transform 产出字段，避免密度采样位置覆盖原始 `field` 的隐式魔法。

## 待决策点

- **Silverman 的离散公式细节**：倾向使用 `0.9 * min(stdDev, IQR / 1.34) * n^(-1/5)`；若 `IQR` 为 0 但 `stdDev` 为正，则使用 `stdDev`。实现期不得改成 Scott 或其它规则，除非回本 ADR 加字段。
- **density 数值是否归一化为概率密度**：倾向保持标准 KDE 概率密度，即曲线积分约为 1，而不是把峰值归一化到 1。若 docs 想展示相对高度，可由 scale 或后续 transform 处理。
- **输出 rows 是否保留原始字段**：倾向不保留，除 `groupBy` 字段外只输出 `xAs` / `densityAs`。需要原始样本点叠加时，用另一层 `PointMark` 消费原始 rows。

## DSL 表面

React：density transform 先生成采样 rows，`PathMark` 再把它画成填充面积。这里的面积来自 `PathMark` 的 baseline closure，不新增 density mark。

```tsx
<Plot data={samples}>
  <Transform
    kind="density"
    field="value"
    groupBy={['species']}
    xAs="densityX"
    densityAs="density"
    sampleCount={96}
  />
  <PathMark
    x="densityX"
    y="density"
    series="species"
    color="species"
    order="densityX"
    closure={{ kind: 'baseline', baseline: 0 }}
    fill="#60a5fa"
    fillOpacity={0.28}
    strokeWidth={2}
  />
</Plot>
```

同一 transform 的输出也可以只画密度曲线：

```tsx
<PathMark x="densityX" y="density" series="species" color="species" order="densityX" />
```

PlotSpec / vanilla SSR 使用同一 transform operation：

```ts
renderPlot(
  {
    namespace: 'retikz.plot',
    type: 'plot',
    data: { reference: 'samples' },
    transform: [
      {
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        bandwidth: { kind: 'silverman' },
        sampleCount: 96,
        xAs: 'densityX',
        densityAs: 'density',
      },
    ],
    coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
    scales: [
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y' },
      { type: 'ordinal', name: '__color' },
    ],
    marks: [
      {
        type: 'path',
        encoding: {
          x: { field: 'densityX', scale: '__x' },
          y: { field: 'density', scale: '__y' },
          color: { field: 'species', scale: '__color' },
        },
        series: 'species',
        order: 'densityX',
        closure: { kind: 'baseline', baseline: 0 },
        fill: '#60a5fa',
        fillOpacity: 0.28,
      },
    ],
  },
  { samples },
);
```

## 测试设计

`packages/graph/plot/tests/transform/density.test.ts` 覆盖 KDE 数据行为、schema accept / reject、分组、字段收集、provenance 与退化错误。

`packages/graph/plot/tests/lower/density-area-composition.test.ts` 覆盖 density rows 被 `PathMark` curve / area 消费后的 lowering 形状，确保不新增 `DensityMark`。

`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx` 覆盖 React `<Transform kind="density">` 与手写 PlotSpec 等价。

`packages/graph/plot-vanilla/tests/render-plot.test.ts` 覆盖 SSR 消费含 density transform 的 PlotSpec。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `TransformSchema` 新增内置 `density` operation；`PlotTransform` 常量与 `BuiltinTransformSchema` union 同步扩展。
- `providers/transform` 新增 density definition 与 KDE 实现，并纳入 `BUILTIN_TRANSFORMS`，使 root transform、mark-local transform、locator 与 render 共用同一执行结果。
- strict model 的字段收集需要把 `field` / `groupBy` 视为 input，把 `xAs` / `densityAs` 视为 output。
- docs 的 transform statistics 或 summary 章节新增 density-area demo，并说明 density 是 transform 产物，面积只是 `PathMark` 的 baseline closure。
- React / Vanilla 不新增 chart-level `<DensityPlot>` 或 builder helper；两套 authoring surface 都只透传同一份 PlotSpec。

## 不在本 ADR 范围

- 不新增 `DensityMark`、`RegionMark`、`ViolinPlot`、`DensityPlot` 或 chart preset。
- 不做二维 KDE、加权 KDE、自适应带宽、FFT 加速、大数据采样优化。
- 不暴露 kernel type、Scott rule、Epanechnikov kernel 或多算法矩阵；后续若需要，先扩展 `bandwidth` / `kernel` schema。
- 不做 stacked density、ridgeline layout、mirror violin layout 或自动归一化到峰值 1。
- 不改变 `PathMark` closure、fill、series、order 的既有语义。

---

## 实现契约（必填）

### Level

`red`

判级理由：本 ADR 改 `@retikz/plot` public transform schema、内置 transform registry、React / Vanilla 可透传的 PlotSpec 形态、lowering 前数据视图，并新增用户可见 docs demo。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.Density` | `'density'` | - | KDE density 采样 transform 的内置 kind |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityBandwidthSpecSchema` | `z.discriminatedUnion('kind', [...])` | `{ kind:'silverman' }` | density 带宽策略：Silverman 默认或显式正数值 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.kind` | `z.literal(PlotTransform.Density)` | - | density transform 判别字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.field` | `z.string().min(1)` | - | 用于 KDE 的一维连续数值字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.groupBy` | `GroupBySchema` | 省略为全局单组 | 按字段组合分别计算 density |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.bandwidth` | `DensityBandwidthSpecSchema.optional()` | `{ kind:'silverman' }` | KDE 带宽策略 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.sampleCount` | `z.number().int().min(2).optional()` | `64` | 每组输出的等距采样点数量 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.extent` | `z.tuple([z.number().finite(), z.number().finite()]).optional()` + `min < max` | 观测范围按 `3 * bandwidth` 外扩 | density 采样区间 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.xAs` | `z.string().min(1)` | - | 输出采样位置字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema.densityAs` | `z.string().min(1)` | - | 输出 density 值字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `DensityTransformSchema` superRefine | `xAs` / `densityAs` / `groupBy` 输出冲突校验 | - | 禁止 density 输出字段重复或覆盖 group key |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinTransformSchema` | discriminated union 加 `DensityTransformSchema` | - | 让内置 transform union 接受 density |
| `packages/graph/plot/src/schemas/transform/types.ts` | 改 | `DensityBandwidthSpec` / `DensityTransform` | `z.infer<...>` | - | 导出 density transform 派生类型 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/schemas/transform/constants.ts`
- `packages/graph/plot/src/schemas/transform/schema.ts`
- `packages/graph/plot/src/schemas/transform/types.ts`
- `packages/graph/plot/src/schemas/transform/index.ts`
- `packages/graph/plot/src/providers/transform/definitions.ts`
- `packages/graph/plot/src/providers/transform/density.ts`
- `packages/graph/plot/src/providers/transform/index.ts`
- `packages/graph/plot/tests/ir/transform.schema.test.ts`
- `packages/graph/plot/tests/transform/density.test.ts`
- `packages/graph/plot/tests/lower/density-area-composition.test.ts`
- `packages/graph/plot-react/src/components/transform.tsx`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`
- `apps/docs/src/contents/graph/grammar/transform/statistics/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-density.demo.tsx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-density.data.ts`
- `apps/docs/src/contents/graph/grammar/mark/path/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/mark/path/index.en.mdx`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。不得在本 ADR 下新增 `DensityMark`、`RegionMark` 或 chart preset。

### 测试象限

**Happy path（≥ 3）**：

- `density-silverman-default`：多值样本省略 `bandwidth` → 使用 Silverman 带宽输出 64 行，`xAs` 升序，`densityAs` 全为非负有限数。
- `density-explicit-bandwidth`：`bandwidth:{ kind:'value', value:2 }` + `sampleCount=5` + `extent:[0,8]` → 输出 5 个等距采样点，首尾分别等于 0 / 8。
- `density-grouped`：`groupBy=['species']` → 每组独立计算带宽与 extent，输出 rows 保留 species 字段且每组 sampleCount 行。
- `density-path-area-composition`：root `density` transform 后 `PathMark closure={baseline}` 消费 `xAs` / `densityAs` → lowering 生成闭合 core path，不新增 DensityMark。
- `density-curve-only-composition`：同一 density rows 被 stroke-only `PathMark` 消费 → lowering 生成 open path。

**边界（≥ 2）**：

- `density-explicit-bandwidth-single-value`：单点组 + 显式正数 bandwidth → 可输出 density bump，不触发 Silverman 退化错误。
- `density-explicit-bandwidth-identical-values`：全相同值 + 显式正数 bandwidth → 默认 extent 为 `value ± 3 * bandwidth`。
- `density-sample-count-two`：`sampleCount=2` → 只输出 extent 两端采样点。
- `density-mark-local-transform`：density 放在 PathMark mark-local transform 中 → 只影响该 path layer，不改变同图 PointMark 原始 rows。

**错误路径（≥ 2）**：

- `density-requires-output-fields`：缺 `xAs` 或 `densityAs` → schema reject。
- `density-rejects-output-collision`：`xAs === densityAs` 或输出字段覆盖 `groupBy` 字段 → schema reject。
- `density-rejects-invalid-extent`：`extent[0] >= extent[1]` → schema reject。
- `density-rejects-invalid-bandwidth`：`bandwidth.value <= 0` 或非 finite → schema reject。
- `density-silverman-single-value-fails`：默认 bandwidth + 单点组 → fail-loud，错误说明需要更多样本或显式 bandwidth。
- `density-silverman-identical-values-fails`：默认 bandwidth + 全相同值 → fail-loud，错误说明 Silverman 带宽不可解。
- `density-no-finite-values-fails`：全非 finite / 空组 → fail-loud，不输出误导性 0 密度。

**交互（≥ 2）**：

- `density-field-collection`：strict model 下 `field` / `groupBy` 被收集为 input，`xAs` / `densityAs` 被收集为 output。
- `density-custom-transform-collision`：外部 transform 注册 `kind:'density'` → duplicate / built-in collision fail-loud。
- `density-render-locate-shared-transform`：locator 与 render 对同一含 density 的 spec 使用同一 transform registry，density rows 数量与字段一致。
- `react-density-transform-equivalence`：React `<Transform kind="density">` 产物与手写 PlotSpec transform 结构等价。
- `vanilla-ssr-density-area`：`renderPlot` 消费含 density transform + PathMark area 的 PlotSpec，输出 SVG 中包含闭合 path。

### 依赖的现有元素

- `TransformSchema` / `PlotTransform`（`packages/graph/plot/src/schemas/transform/**`）——扩展；新增内置 density transform kind。
- `defineTransform` / `TransformDefinition`（`packages/graph/plot/src/contract/transform.ts`）——引用；density 作为内置 definition 注册，不绕过 transform registry。
- `applyTransforms` / `collectTransformFields`（`packages/graph/plot/src/providers/transform/orchestrate.ts`）——引用；density 与其它 transform 共用执行和字段收集路径。
- `TransformContext.groupProvenance`（`packages/graph/plot/src/contract/transform.ts`）——引用；每个 density sample row 挂载组级 provenance。
- `resolveFieldPath`（`packages/graph/plot/src/providers/data`）——引用；读取输入字段和 group key。
- `isFiniteNumber`（`packages/kernel/math`）——引用；过滤非 finite 样本并校验输出数值。
- `PathMark` / `PathClosureKind.Baseline`（`packages/graph/plot/src/schemas/mark/**`）——引用；density-area 由既有 path closure 表达。
- React `<Transform>`（`packages/graph/plot-react/src/components/transform.tsx`）——引用；props 已是 `TransformOperation`，新增内置 schema 后可直接透传。
- Vanilla `renderPlot`（`packages/graph/plot-vanilla/src/**`）——引用；消费同一 PlotSpec，不新增 vanilla-only helper。

### 多 LLM 设计评估

尚未执行。当前对话使用 `superpowers:brainstorming` 先收敛人机共识并落 ADR；进入实现前需要按 `develop-design` 流程补至少一轮独立设计评估，或由人工明确接受本 ADR 作为实现输入。

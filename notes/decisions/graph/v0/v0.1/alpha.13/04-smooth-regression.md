# ADR-04：smooth transform + linear regression path

状态：Accepted
决策日期：2026-06-28
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [alpha.12 ADR-06 transform registry](../alpha.12/06-transform-registry.md) · [alpha.12 ADR-16 Statistical transform algebra](../alpha.12/16-statistical-transform-algebra.md) · [alpha.13 ADR-03 density transform](./03-density-transform.md) · [PathMark docs](../../../../../../apps/docs/src/contents/graph/grammar/mark/path/index.zh.mdx) · [plot-design.md §13.1](../../../../../architecture/plot-design.md)

## 背景

alpha.13 已经把 boxplot 与 density-area 收敛成同一条路线：统计步骤先在 transform 层生成 plain rows，几何层只用抽象 mark 消费这些 rows。`quantile-band` 证明 summary rows 可以组合成箱线图，`density` 证明一维样本可以被采样成曲线 / 面积 rows。

散点图和时间序列还缺一类常见统计薄片：趋势线。用户通常有一组 `(x, y)` 观测，希望看整体上升 / 下降趋势，而不是手写派生字段或在 docs demo 中预先准备趋势数据。这个能力应该进入 transform registry，而不是进入 `PathMark` lowering：趋势线的点是统计计算结果，不是 path 几何本身；同一组趋势 rows 也应能被 `PathMark`、后续 confidence band 或自定义 mark 复用。

“smooth” 是比 “regression” 更合适的 transform kind：从用户心智看，它表达“为原始点添加平滑 / 趋势层”；从 schema 演进看，它能容纳后续 `loess`、`polynomial`、`movingAverage` 等方法。alpha.13 首轮只实现 deterministic linear regression，不暴露多算法矩阵，也不承诺置信区间。

## 决策：新增内置 `smooth` transform，首轮只支持 linear method

新增内置 transform operation：`{ kind: 'smooth', ... }`。它按可选 `groupBy` 分组，读取有限 `(x, y)` 数值对，用普通最小二乘线性回归拟合 `y = intercept + slope * x`，再沿 x 轴输出固定数量的预测采样 rows。输出 rows 只保留 group key、采样位置字段与预测值字段，并通过 `groupProvenance` 记录来源 rows。

```ts
type SmoothMethodSpec = { kind: 'linear' };

type SmoothTransform = {
  kind: 'smooth';
  x: string;
  y: string;
  groupBy?: Array<string>;
  method?: SmoothMethodSpec; // default { kind: 'linear' }
  sampleCount?: number; // default 64, minimum 2
  extent?: [number, number];
  xAs: string;
  yAs: string;
};
```

`method` 省略时等价 `{ kind: 'linear' }`。使用 object discriminant 而不是裸字符串，是为了给后续方法保留 JSON-safe 参数空间，例如 `{ kind: 'polynomial', degree: 2 }` 或 `{ kind: 'movingAverage', window: 7 }`，但这些方法都不在本 ADR 范围。

每个 group 只使用 `x` 与 `y` 都是 finite number 的 rows。默认 `extent` 是该组 finite x 的观测范围 `[minX, maxX]`，不做自动外推；显式 `extent` 必须满足 `min < max`。`sampleCount` 省略时为 64；采样点均匀覆盖闭区间两端，并按 x 升序输出。

默认 linear regression 必须 fail-loud 处理退化情况：finite pair 少于 2 个、所有 x 相同导致斜率不可解、输入没有任何 finite pair，均抛出诊断错误，不静默输出水平线或空 rows。若用户需要常量趋势线，应后续由 `derive` / `annotate` 类能力显式表达，而不是把回归退化规则藏在 smooth 内部。

`xAs` 与 `yAs` 必填且不得重复，也不得覆盖 `groupBy` 字段。允许 `xAs` 与输入 `x` 同名、`yAs` 与输入 `y` 同名，因为 smooth 输出的是新的采样 rows，不保留原始 source row 字段；这能让用户在趋势线 layer 中继续写 `PathMark x="x" y="y"`。若需要叠加原始点，则另一层 `PointMark` 继续消费原始 rows 或使用 mark-local transform 保持 data view 分离。

理由：

1. `smooth` 是完整 transform kind：它把 N 个原始 rows 转成 M 个预测 rows，既不是 reducer 的一组一行，也不是 selector 的原始行子集。
2. `PathMark` 只负责把预测 rows 连成趋势线，不在 lowering 期计算回归；render、locator、strict model 字段收集都复用 transform registry。
3. 首轮只做 linear regression，可以 deterministic、JSON-safe、易测，并能满足 alpha.13 “regression path” 的闭环验收。
4. 不做 confidence band，避免把本 ADR 扩成统计推断设计；后续若要置信区间，可扩展输出 `yLowerAs` / `yUpperAs` 并由 `PathMark closure` 或后续 region mark 消费。

## 待决策点

- **linear regression 公式细节**：使用普通最小二乘，`slope = cov(x,y) / var(x)`，`intercept = meanY - slope * meanX`。实现期不得改成 robust regression 或按 x 排序的 moving average。
- **默认 extent 是否外推**：倾向不外推，只覆盖 observed x domain。显式外推由用户传 `extent`，这样趋势线不会默认画到数据之外。
- **输出 rows 是否保留原始字段**：倾向不保留，除 `groupBy` 字段外只输出 `xAs` / `yAs`。这与 density 保持一致，避免把“采样行”误解成“原始行的增强版”。
- **未来 confidence 字段命名**：若后续加入置信区间，倾向 `yLowerAs` / `yUpperAs`，并以 `confidence` object 开关控制；本 ADR 不预留 nullable 字段。

## DSL 表面

React：smooth transform 先生成趋势线采样 rows，`PathMark` 再消费这些 rows。原始点与趋势线可以使用不同 data view：点层消费原始 rows，线层使用 mark-local smooth transform。

```tsx
<Plot data={samples}>
  <PointMark x="time" y="value" color="group" />
  <PathMark
    x="trendX"
    y="trendY"
    series="group"
    color="group"
    order="trendX"
    transform={[
      {
        kind: 'smooth',
        x: 'time',
        y: 'value',
        groupBy: ['group'],
        method: { kind: 'linear' },
        sampleCount: 64,
        xAs: 'trendX',
        yAs: 'trendY',
      },
    ]}
  />
</Plot>
```

也可以把 smooth 放在 root transform 中，让整张图后续 mark 都消费趋势 rows：

```tsx
<Plot data={samples}>
  <Transform kind="smooth" x="time" y="value" groupBy={['group']} xAs="x" yAs="y" />
  <PathMark x="x" y="y" series="group" color="group" order="x" />
</Plot>
```

PlotSpec / vanilla SSR 使用同一 transform operation：

```ts
renderPlot(
  {
    namespace: 'retikz.plot',
    type: 'plot',
    data: { reference: 'samples' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'ordinal', name: 'color' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'path',
        transform: [
          {
            kind: 'smooth',
            x: 'time',
            y: 'value',
            groupBy: ['group'],
            method: { kind: 'linear' },
            sampleCount: 64,
            xAs: 'trendX',
            yAs: 'trendY',
          },
        ],
        series: 'group',
        order: 'trendX',
        encoding: {
          x: { field: 'trendX', scale: 'x' },
          y: { field: 'trendY', scale: 'y' },
          color: { field: 'group', scale: 'color' },
        },
      },
    ],
  },
  { samples },
);
```

## 测试设计

`packages/graph/plot/tests/transform/smooth.test.ts` 覆盖 linear regression 数据行为、schema accept / reject、分组、字段收集、provenance 与退化错误。

`packages/graph/plot/tests/lower/smooth-path-composition.test.ts` 覆盖 smooth rows 被 `PathMark` 消费后的 lowering 形状，确保不新增 `RegressionMark` / `SmoothMark`。

`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx` 覆盖 React `<Transform kind="smooth">` 与 mark-local transform 透传到 PlotSpec。

`packages/graph/plot-vanilla/tests/render-plot.test.ts` 覆盖 SSR 消费含 smooth transform 的 PlotSpec。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `TransformSchema` 新增内置 `smooth` operation；`PlotTransform` 常量与 `BuiltinTransformSchema` union 同步扩展。
- `providers/transform` 新增 smooth definition 与 linear regression 实现，并纳入 `BUILTIN_TRANSFORMS`。
- strict model 的字段收集需要把 `x` / `y` / `groupBy` 视为 input，把 `xAs` / `yAs` 视为 output。
- docs 的 transform statistics 或 summary 章节新增 regression path demo，并说明趋势线是 transform 产物，不是 `PathMark` 的曲线拟合能力。
- React / Vanilla 不新增 chart-level `<RegressionPlot>`、`<SmoothLine>` 或 builder helper；两套 authoring surface 都只透传同一份 PlotSpec。

## 不在本 ADR 范围

- 不新增 `RegressionMark`、`SmoothMark`、`TrendMark` 或 chart preset。
- 不实现 LOESS、多项式回归、移动平均、加权回归、robust regression、时间窗口平滑或预测模型。
- 不输出置信区间、预测区间、R²、残差、斜率 / 截距统计行或模型诊断信息。
- 不做自动外推；默认趋势线只覆盖 observed x extent。
- 不改变 `PathMark` order、series、stroke、closure 的既有语义。

---

## 实现契约（必填）

### Level

`red`

判级理由：本 ADR 改 `@retikz/plot` public transform schema、内置 transform registry、React / Vanilla 可透传的 PlotSpec 形态、lowering 前数据视图，并新增用户可见 docs demo。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/transform/constants.ts` | 加 | `PlotTransform.Smooth` | `'smooth'` | - | 趋势 / 平滑采样 transform 的内置 kind |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothMethodSpecSchema` | `z.discriminatedUnion('kind', [linear])` | `{ kind:'linear' }` | smooth 算法策略；首轮只支持 linear regression |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.kind` | `z.literal(PlotTransform.Smooth)` | - | smooth transform 判别字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.x` | `z.string().min(1)` | - | 回归输入 x 字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.y` | `z.string().min(1)` | - | 回归输入 y 字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.groupBy` | `GroupBySchema` | 省略为全局单组 | 按字段组合分别拟合趋势线 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.method` | `SmoothMethodSpecSchema.optional()` | `{ kind:'linear' }` | 平滑 / 回归方法，当前仅 linear |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.sampleCount` | `z.number().int().min(2).optional()` | `64` | 每组输出的等距预测采样点数量 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.extent` | `z.tuple([z.number().finite(), z.number().finite()]).optional()` + `min < max` | finite x 观测范围 | 趋势线采样区间 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.xAs` | `z.string().min(1)` | - | 输出采样位置字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema.yAs` | `z.string().min(1)` | - | 输出预测 y 字段 |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 加 | `SmoothTransformSchema` superRefine | `xAs` / `yAs` / `groupBy` 输出冲突校验 | - | 禁止 smooth 输出字段重复或覆盖 group key |
| `packages/graph/plot/src/schemas/transform/schema.ts` | 改 | `BuiltinTransformSchema` | discriminated union 加 `SmoothTransformSchema` | - | 让内置 transform union 接受 smooth |
| `packages/graph/plot/src/schemas/transform/types.ts` | 改 | `SmoothMethodSpec` / `SmoothTransform` | `z.infer<...>` | - | 导出 smooth transform 派生类型 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/schemas/transform/constants.ts`
- `packages/graph/plot/src/schemas/transform/schema.ts`
- `packages/graph/plot/src/schemas/transform/types.ts`
- `packages/graph/plot/src/schemas/transform/index.ts`
- `packages/graph/plot/src/providers/transform/definitions.ts`
- `packages/graph/plot/src/providers/transform/smooth.ts`
- `packages/graph/plot/src/providers/transform/index.ts`
- `packages/graph/plot/tests/ir/transform.schema.test.ts`
- `packages/graph/plot/tests/transform/smooth.test.ts`
- `packages/graph/plot/tests/lower/smooth-path-composition.test.ts`
- `packages/graph/plot-react/src/components/transform.tsx`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`
- `apps/docs/src/contents/graph/grammar/transform/statistics/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-smooth.demo.tsx`
- `apps/docs/src/contents/graph/grammar/transform/statistics/transform-smooth.data.ts`
- `apps/docs/src/contents/graph/grammar/transform/summary/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/transform/summary/index.en.mdx`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。不得在本 ADR 下新增 `RegressionMark`、`SmoothMark` 或 chart preset。

### 测试象限

**Happy path（≥ 3）**：

- `smooth-linear-default`：多组 finite `(x,y)` 样本省略 `method` / `sampleCount` / `extent` → 使用 linear regression 输出 64 行，`xAs` 升序，`yAs` 全为有限数。
- `smooth-explicit-extent`：`sampleCount=5` + `extent:[0,8]` → 输出 5 个等距采样点，首尾分别等于 0 / 8。
- `smooth-known-line`：输入点完全位于 `y = 2x + 1` → 输出预测值精确匹配该直线。
- `smooth-grouped`：`groupBy=['series']` → 每组独立拟合，输出 rows 保留 series 字段且每组 sampleCount 行。
- `smooth-path-composition`：PathMark mark-local smooth transform 后消费 `xAs` / `yAs` → lowering 生成 open core path，不新增 SmoothMark。

**边界（≥ 2）**：

- `smooth-sample-count-two`：`sampleCount=2` → 只输出 extent 两端预测点。
- `smooth-filters-non-finite-pairs`：只有 x / y 都 finite 的 rows 参与拟合，非 finite pair 被忽略。
- `smooth-horizontal-line`：y 全相同但 x 有方差 → 输出水平趋势线，允许斜率为 0。
- `smooth-mark-local-transform`：smooth 放在 PathMark mark-local transform 中 → 只影响该 path layer，不改变同图 PointMark 原始 rows。

**错误路径（≥ 2）**：

- `smooth-requires-output-fields`：缺 `xAs` 或 `yAs` → schema reject。
- `smooth-rejects-output-collision`：`xAs === yAs` 或输出字段覆盖 `groupBy` 字段 → schema reject。
- `smooth-rejects-invalid-extent`：`extent[0] >= extent[1]` → schema reject。
- `smooth-fails-too-few-finite-pairs`：finite pair 少于 2 个 → fail-loud，错误说明需要至少两个有限点。
- `smooth-fails-vertical-line`：所有 finite x 相同 → fail-loud，错误说明 linear regression x variance is zero。
- `smooth-rejects-unknown-method`：`method.kind` 不是 `linear` → schema reject。

**交互（≥ 2）**：

- `smooth-field-collection`：strict model 下 `x` / `y` / `groupBy` 被收集为 input，`xAs` / `yAs` 被收集为 output。
- `smooth-custom-transform-collision`：外部 transform 注册 `kind:'smooth'` → duplicate / built-in collision fail-loud。
- `smooth-render-locate-shared-transform`：locator 与 render 对同一含 smooth 的 spec 使用同一 transform registry，smooth rows 数量与字段一致。
- `react-smooth-transform-equivalence`：React `<Transform kind="smooth">` 或 mark-local transform 产物与手写 PlotSpec transform 结构等价。
- `vanilla-ssr-smooth-path`：`renderPlot` 消费含 smooth transform + PathMark 的 PlotSpec，输出 SVG 中包含趋势 path。

### 依赖的现有元素

- `TransformSchema` / `PlotTransform`（`packages/graph/plot/src/schemas/transform/**`）——扩展；新增内置 smooth transform kind。
- `defineTransform` / `TransformDefinition`（`packages/graph/plot/src/contract/transform.ts`）——引用；smooth 作为内置 definition 注册，不绕过 transform registry。
- `applyTransforms` / `collectTransformFields`（`packages/graph/plot/src/providers/transform/orchestrate.ts`）——引用；smooth 与其它 transform 共用执行和字段收集路径。
- `TransformContext.groupProvenance`（`packages/graph/plot/src/contract/transform.ts`）——引用；每个 smooth sample row 挂载组级 provenance。
- `resolveFieldPath`（`packages/graph/plot/src/providers/data`）——引用；读取输入字段和 group key。
- `isFiniteNumber`（`packages/kernel/math`）——引用；过滤非 finite `(x,y)` 样本并校验输出数值。
- `PathMark`（`packages/graph/plot/src/schemas/mark/**`）——引用；regression path 由既有 path mark 表达。
- React `<Transform>`（`packages/graph/plot-react/src/components/transform.tsx`）——引用；props 已是 `TransformOperation`，新增内置 schema 后可直接透传。
- Vanilla `renderPlot`（`packages/graph/plot-vanilla/src/**`）——引用；消费同一 PlotSpec，不新增 vanilla-only helper。

### 多 LLM 设计评估

尚未执行。当前对话使用 `superpowers:brainstorming` 先按 roadmap 收敛推荐方案并落 ADR；进入实现前需要按 `develop-design` 流程补至少一轮独立设计评估，或由人工明确接受本 ADR 作为实现输入。

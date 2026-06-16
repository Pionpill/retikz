# ADR-02：normalize + derive-interval + jitter——保行数的逐行派生 / 调整 transform，jitter 用可序列化 seed + 确定性 PRNG（v1 仅连续数值数据空间偏移）

- 状态：Proposed
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md)「Statistics 基础」行 · [alpha.12 roadmap](./roadmap.md) · [alpha.12 ADR-01 bin + aggregate](./01-bin-aggregate.md) · [plot-design.md §3.3 Transform / §3.1 数据不进 IR / §10 流水线顺序](../../../../../architecture/plot-design.md) · [alpha.11 ADR-01 区间几何投影](../alpha.11/01-cell-geometry-projection.md)

## 背景

`transform` 是 grammar of graphics 的 Statistics 组件，发生在 scale / coordinate / mark 之前（plot-design §3.3）。现状 `PlotTransform` 只有两个成员：`sort`（稳定重排）与 `stack`（每个 x 分组内按系列累加，派生 `[y0, y1]` 累积界，喂 interval `y0Field/y1Field` 与 sector `startField/endField`）。alpha.12 ADR-01 补的 bin / aggregate 是**改行数**的规约 transform（N 行 → M 箱 / 组）。本 ADR 补 Statistics 的另一半：**保行数的逐行派生 / 调整**——三个 op 都不增删行，只在每行上加 / 改字段或调整位置：

- **normalize**：组内百分比归一化。同组内各行的某数值字段除以组总和 → 比例。现状要做百分比堆叠只能让用户在数据里手算占比；plot-design §3.3 把 `normalize` 与 `stack` 并列为常见 transform，二者本应正交组合（先归一化、再堆叠 = 百分比堆叠）。
- **derive-interval**：从一个值字段算出 `[start, end]` 区间边界，喂 interval / rect / sector / gantt 的区间消费方。现状这类区间边界只有 stack 一条来源——但 stack 是**跨行累积**（同组各行首尾相接成一条链），而甘特图 / baseline→value 柱 / 显式两字段区间是**单行独立**算出的 `[start, end]`，与累积语义不同，硬塞进 stack 会让「累积」与「单行派生」纠缠。Observable Plot 的 `stackY` / `intervalY`、Vega-Lite 的 `stack` vs `bin`-derived `x2` 也把累积与单行区间分开建模。
- **jitter**：给位置加随机偏移，散点防重叠。**v1 明确把坐标空间契约定为「连续数值数据空间的 pre-scale 偏移」**——只作用于**连续数值字段**，在该字段值上加 ±amount（数据单位），再进 scale。它**不能**给字符串 / 分类字段加偏移（数值运算无意义），而散点最常见的「落在分类带（band）内抖开」场景属于 **post-scale 屏幕空间偏移**（在数据 / scale 之后，按 band 宽度在像素空间散开），那是 lowering / mark 层的跨层机制、不是数据 transform，故**移到「不在本 ADR 范围」**，待后续独立机制。两个难点：其一是 retikz 硬约束「IR 必须 100% JSON 可序列化，禁止函数」（AGENTS.md / plot-design §3.1）——不能像 D3 / Observable Plot 那样塞一个 `() => Math.random()`；随机性必须靠一个**可序列化的 seed（数字）+ 运行时确定性 PRNG** 重建，否则同一份 spec 在 SSR（vanilla `renderPlot`）与浏览器 hydration 会抖出两套坐标，破坏 locator parity 与确定性快照。其二就是上面的坐标空间边界：v1 锁定数值数据空间，分类带内抖动后置。

三个 op 都保行数、都纯函数、都不进数据值进 IR（只在 spec 里声明 op 参数，数据派生发生在 `applyTransforms` 运行时）。它们补齐 Statistics 层「逐行」这一半，与 ADR-01 的「规约」一半合起来覆盖 grammar of graphics 的 Statistics 基础。

## 决策：给 `PlotTransform` 加 `Normalize` / `DeriveInterval` / `Jitter` 三个保行数成员；jitter v1 = 连续数值数据空间 pre-scale 偏移（分类带内抖动后置、不在本 ADR），用 `seed`(数字) + mulberry32 确定性 PRNG；normalize 独立、与 stack 正交组合、`groupBy` 用数组；derive-interval 只做单行 baseline→value / 两字段，跨行累积仍归 stack；React 表面复用 ADR-01 的 `<Transform>` + `<Plot transforms>`，本 ADR 不引入新组件

三个 op 都是 `applyTransforms` reduce 链里的一步，行进→行出、只追加 / 改字段，不增删行。判别字段 `kind`，schema 单一真源、TS 类型 `z.infer`。

```ts
// ir/transform.ts —— 加三个成员（现有 Sort / Stack 不动）
export const PlotTransform = {
  Sort: 'sort',
  Stack: 'stack',
  /** 组内百分比归一化：同组各行 value / 组总和 → 比例（保行数） */
  Normalize: 'normalize',
  /** 单行派生区间：from 字段 → [start, end]（baseline→value 或两字段；保行数） */
  DeriveInterval: 'derive-interval',
  /** 位置抖动：可序列化 seed + 确定性 PRNG 加随机偏移（v1 仅连续数值数据空间，保行数） */
  Jitter: 'jitter',
} as const;

export const NormalizeTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Normalize).describe('Discriminator: within-group percentage normalization'),
    field: z.string().min(1).describe('Numeric field whose within-group share is computed'),
    groupBy: z
      .array(z.string().min(1))
      .min(1)
      .optional()
      .describe('Grouping key fields: rows sharing all these values form one normalization group (composite key, aligned with aggregate.groupBy); omit to normalize all rows against the global sum'),
    basis: z
      .enum(['fraction', 'percent'])
      .optional()
      .describe("Output scale: 'fraction' → share in [0,1], 'percent' → share in [0,100]; default 'fraction'"),
    as: z
      .string()
      .min(1)
      .optional()
      .describe('Output field for the normalized share; omit to overwrite the input field in place'),
  })
  .describe('Normalize transform: divide each row value by its group sum, yielding a within-group share; row-preserving. Compose before a stack transform for percentage stacking');

export const DeriveIntervalTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.DeriveInterval).describe('Discriminator: per-row interval [start, end] derivation'),
    from: z
      .string()
      .min(1)
      .optional()
      .describe('Value field driving a baseline→value interval (start = baseline, end = field value); omit only when using explicit startFrom / endFrom'),
    baseline: z
      .number()
      .finite()
      .optional()
      .describe('Baseline the from-value interval starts at; default 0. Finite-only to keep the IR JSON round-trippable'),
    startFrom: z
      .string()
      .min(1)
      .optional()
      .describe('Explicit two-field mode: field giving the interval start (pairs with endFrom; takes precedence over from / baseline)'),
    endFrom: z
      .string()
      .min(1)
      .optional()
      .describe('Explicit two-field mode: field giving the interval end (pairs with startFrom)'),
    startField: z.string().min(1).optional().describe('Output field for the interval start; default "y0" (matches interval/sector consumers)'),
    endField: z.string().min(1).optional().describe('Output field for the interval end; default "y1"'),
  })
  .describe('Derive-interval transform: per-row [start, end] from one value field (baseline→value) or two explicit fields; row-preserving. Distinct from stack (which accumulates ACROSS rows into a cumulative chain). Feeds interval / rect / sector / gantt bound fields');

export const JitterTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Jitter).describe('Discriminator: deterministic positional jitter'),
    axis: z
      .enum(['x', 'y', 'both'])
      .optional()
      .describe("Which positional field(s) to perturb; default 'x'. The jittered field MUST be a continuous numeric field (v1 jitter is a pre-scale offset in data units)"),
    xField: z
      .string()
      .min(1)
      .optional()
      .describe('Continuous numeric field jittered on the x axis; default "x". Read when axis is "x" or "both"'),
    yField: z
      .string()
      .min(1)
      .optional()
      .describe('Continuous numeric field jittered on the y axis; default "y". Read when axis is "y" or "both"'),
    amount: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe('Maximum absolute offset in DATA units added to each value pre-scale; offsets are drawn uniformly from [-amount, +amount]. Default 1. Data-space only: categorical band-internal (screen-space) jitter is out of scope'),
    seed: z
      .number()
      .int()
      .optional()
      .describe('Integer seed for the deterministic PRNG (mulberry32); the SAME seed reproduces identical offsets across SSR and hydration. Default 0. No function is ever stored (IR stays JSON-serializable)'),
  })
  .describe('Jitter transform: add a deterministic pseudo-random offset (in DATA units, pre-scale) to a CONTINUOUS numeric positional field to de-overlap scatter; row-preserving. Operates purely in the numeric data space — it cannot offset categorical/string fields, and categorical band-internal spreading (a post-scale screen-space mechanism) is out of scope. Randomness is rebuilt at runtime from a serializable integer seed + a fixed PRNG, never a stored function — preserving SSR / locator parity');

export const TransformSchema = z
  .discriminatedUnion('kind', [
    SortTransformSchema,
    StackTransformSchema,
    NormalizeTransformSchema,
    DeriveIntervalTransformSchema,
    JitterTransformSchema,
    // ADR-01 的 Bin / Aggregate 同表追加（两 ADR 同 milestone 落地，最终 union 含全部成员）
  ])
  .describe('Data transform op applied before scale / mark; ordered pipeline');
```

`lower/transform.ts` 加三个纯函数 + 一个确定性 PRNG，挂进 `applyTransforms` 的 switch（行进→行出，纯函数）：

```ts
// 确定性 PRNG：mulberry32（32-bit、无依赖、可序列化 seed 完全决定输出序列）
const mulberry32 = (seed: number) => () => {
  let t = (seed = (seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// jitter：仅连续数值字段；每行按「行序 index 折进 seed」推进 PRNG（行序确定 → 同 spec 同结果），offset = (rand*2-1)*amount 加在数据值上（pre-scale）；非有限值跳过偏移
// normalize：groupBy（数组，复合键）分组求和 → 每行 value / sum（*100 if percent）；组和为 0 → 该组输出 0（不产 NaN）
// derive-interval：startFrom/endFrom 两字段优先；否则 [baseline, from值]；非有限按 baseline / 跳过同 stack 口径
```

理由：

1. **jitter v1 坐标空间 = 连续数值数据空间 pre-scale 偏移**——jitter 只在**连续数值字段**的值上加 ±amount（数据单位），再喂 scale。它对字符串 / 分类字段无意义（数值加法不成立），故 `xField`/`yField` 必须指向连续数值字段。散点「落在分类带内抖开」的常见场景需要 **post-scale 屏幕空间偏移**（按 band 宽度在像素空间散开），跨数据 / scale 层、属 lowering / mark 机制，不是数据 transform——明确**不在本 ADR 范围**，后续以独立机制承接。如此 jitter 语义单一（纯数据空间逐行偏移），与 normalize / derive-interval 同构。
2. **jitter 用 `seed`(整数) + mulberry32 守 JSON-safe 与确定性**——IR 禁函数，随机性必须可从 spec 完整重建。mulberry32 是 32 位、零依赖、一个整数 seed 完全决定输出序列；offset 推进与**行序 index** 绑定（不依赖运行时随机源），故 vanilla SSR 与浏览器 hydration 抖出逐字节相同坐标，locator parity / 确定性快照不破。暴露函数 PRNG（如 `rng` prop）或读 `Math.random()` 一律否决——前者违反 §3.1、后者毁确定性。
3. **normalize 独立、与 stack 正交组合，`groupBy` 用数组**：百分比堆叠 = `[normalize, stack]` 两步链，而非给 stack 加 `normalize: true` 选项。理由——normalize 本身就有独立用途（占比柱 / 占比散点，不堆叠也要归一化），塞进 stack 会把两个正交概念耦合、且无法表达「只归一化不堆叠」。组合靠 transform 链顺序（先 normalize 改值、再 stack 累积归一化后的值）天然得到百分比堆叠，零额外耦合。`normalize.groupBy` 取 `Array<string>`（复合键），对齐 ADR-01 `aggregate.groupBy`，避免 percent-stack / facet 等多键分组场景后续马上再扩 schema。
4. **derive-interval 与 stack 语义边界划清**：stack = **跨行累积**（同组各行首尾相接成累积链，`y0[i] = y1[i-1]`）；derive-interval = **单行独立**（每行 `[baseline, value]` 或 `[startFrom, endFrom]`，行间无依赖）。两者都产 `startField/endField`（默认 `y0/y1`，对齐 interval/sector 消费方），但来源语义正交：甘特条、误差棒底座、baseline≠0 的柱走 derive-interval；堆叠柱 / 饼图累积角界走 stack。同名输出字段让下游 mark 无需区分来源（消费方只读 `y0/y1`），但 transform 侧严禁混用一个 op 兼做两事。
5. **三者皆保行数 + 纯函数**：与 sort / stack 同构（行进→行出、只改字段值），与 ADR-01 的改行数 op 形成 Statistics 的「逐行」「规约」两半；reduce 链顺序由用户在 `transform: [...]` 显式排定，无隐式重排。

## 待决策点 🔻

- **jitter 坐标空间（已定）**：**v1 = 连续数值数据空间的 pre-scale 偏移**——只作用于连续数值字段，在字段值上加 ±amount（数据单位）再进 scale；不支持字符串 / 分类字段。**分类轴 band 内抖动**（散点落在类别带内散开，散点最常见场景）需 **post-scale 屏幕空间偏移**（按 band 宽度在像素空间散开），跨数据 / scale 层、属 lowering / mark 机制，**不在本 ADR 范围**，后续独立机制承接。倾向：v1 锁定数值数据空间逐行偏移，分类带内抖动后置。
- **jitter seed / PRNG 形态（已定）**：`seed` 是 `z.number().int()`，默认 `0`；PRNG 固定为 mulberry32（不暴露选择）。offset 推进绑定**行在当前 transform 输入中的 index**（`seed` 折进每行 → 第 i 行用 `mulberry32(seed)` 推进到第 i 次 `next()`），保证同 spec + 同数据 → 同抖动序列。倾向：定为 seed=number + mulberry32，行序驱动。不暴露 `distribution`（uniform 起步），不暴露函数 PRNG。
- **normalize 与 stack 的关系（已定）**：百分比堆叠 = **独立 normalize transform + stack transform 组合**（`transform: [{kind:'normalize',...}, {kind:'stack',...}]`），不在 stack 上加 `normalize` 选项。`normalize.groupBy` 取 `Array<string>`（复合键，对齐 `aggregate.groupBy`）。倾向：独立 normalize、靠链顺序组合、groupBy 数组化。
- **derive-interval vs stack 边界（已定）**：derive-interval = 单行 `[baseline,value]` / `[startFrom,endFrom]`；stack = 跨行累积链。同产 `y0/y1` 但语义不混用。倾向：两个独立 op，文档明确「累积用 stack、单行区间用 derive-interval」。
- **transform 的 React authoring 表面（已定，gate 于 ADR-01）**：**复用 ADR-01 落地的通用 `<Transform kind="...">` 声明组件 + `<Plot transforms={[...]}>` 直传**——5 个 transform（sort 之外的 bin / aggregate / normalize / derive-interval / jitter）共用这同一个 surface。本 ADR **不引入任何新 React 组件**，normalize / derive-interval / jitter 经 ADR-01 定义的同一 `<Transform>`（`kind="normalize" | "derive-interval" | "jitter"`）或 `<Plot transforms>` 使用；组件本体、`collectInto`、`build-plot-spec` 透传逻辑都在 ADR-01 落地，本 ADR gate 于它（ADR-01 先合）。`build-plot-spec` 只需识别本 ADR 新增的三个 `kind`（schema / 类型层自动覆盖，无需新代码路径）。删除「本 ADR 先 spec 纯驱动、React 表面待定」的旧表述——表面已由 ADR-01 统一拍定，不再悬而未决。

## DSL 表面

两套表面别混：**IR 形态**是 JSON 可序列化的 transform op（进 `spec.transform` 数组）；**React 表面**复用 ADR-01 定义的通用 `<Transform kind="...">` 声明组件 + `<Plot transforms={[...]}>` 直传（本 ADR 不引入新组件）。

### IR 形态（进 IR，JSON 可序列化）

```ts
// 百分比堆叠：normalize（组内占比）→ stack（累积归一化后的值），靠链顺序组合
[
  { kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
  { kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' },
]

// 甘特区间：derive-interval 单行两字段 → y0/y1
{ kind: 'derive-interval', startFrom: 'start', endFrom: 'end' }

// jitter：连续数值 x 字段的 pre-scale 数据空间偏移（确定性 seed）
{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 42 }
```

### React 表面（复用 ADR-01 的 `<Transform>` + `<Plot transforms>`）

```tsx
// 1) 百分比堆叠柱：显式 [normalize, stack] 两步链经 <Transform>。
//    显式 stack transform 已抑制 mark auto-stack（ADR-01 约定），故 BarMark 不带 stack，避免二次堆叠。
<Plot data={revenue} model={model}>
  <Transform kind="normalize" field="amount" groupBy={['quarter']} basis="percent" as="share" />
  <Transform kind="stack" x="quarter" y="share" groupBy="product" />
  <BarMark x="quarter" y="share" series="product" />
</Plot>

// 2) 甘特区间：derive-interval 单行两字段 → y0/y1，喂 interval 区间边界
<Plot data={tasks} model={model}>
  <Transform kind="derive-interval" startFrom="start" endFrom="end" />
  <BarMark x="task" y="end" />   {/* interval 读 y0/y1 作区间；非 baseline→value 的甘特条 */}
</Plot>

// 3) jitter 散点：连续数值 x 字段抖开去重叠（数据空间 pre-scale 偏移、确定性 seed、SSR / hydration 同坐标）
<Plot data={samples} model={model}>
  <Transform kind="jitter" axis="x" xField="dose" amount={0.3} seed={42} />
  <PointMark x="dose" y="response" />
</Plot>

// 直传形态（完全掌控顺序）：与上方 <Transform> 等价
<Plot data={revenue} transforms={[
  { kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
  { kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' },
]}>
  <BarMark x="quarter" y="share" series="product" />
</Plot>
```

> jitter demo 用**连续数值 x 字段**（`dose`，非分类 `group`）——v1 jitter 是数值数据空间偏移，对字符串分类字段无意义；分类带内抖动属 post-scale 屏幕空间机制，不在本 ADR。百分比堆叠 demo **只用显式 `[normalize, stack]`、不带 `<BarMark stack>`**，与 ADR-01「显式 stack 抑制 mark auto-stack」一致，避免二次堆叠。`<Transform>` 组件与 `<Plot transforms>` 透传逻辑均在 ADR-01 落地，本 ADR 复用、不新增组件——见「待决策点」。

## 测试设计

`packages/plot/plot/tests/ir/transform.schema.test.ts`（扩展）+ `packages/plot/plot/tests/lower/transform.test.ts`（扩展）+ `packages/plot/vanilla/tests/`（SSR 确定性快照）覆盖：

- normalize：组内求和归一化、fraction / percent、`as` 新字段 vs 原位覆盖、组和为 0 不产 NaN
- derive-interval：baseline→value 单行、两字段 `startFrom/endFrom`、自定义 `startField/endField`、与 stack 语义对照（同数据两 op 产不同 y0/y1）
- jitter：连续数值字段同 seed 两次运行逐字段相等（确定性）、不同 seed 不同、保行数、SSR vs hydration 坐标一致、amount=0 退化为恒等、非有限值跳过偏移
- 链组合：`[normalize, stack]` = 百分比堆叠（每组 y1 上界 = 1 或 100），**不叠加 mark auto-stack**（显式 stack 抑制，避免二次堆叠）
- schema 拒绝：jitter `seed` 非整数 / derive-interval 既无 `from` 又无 `startFrom/endFrom` / normalize 缺 `field` / normalize `groupBy` 传非数组

具体见下「实现契约 § 测试象限」。

## 影响

- **Plot IR**：`ir/transform.ts` 加 `PlotTransform.Normalize` / `.DeriveInterval` / `.Jitter` 三成员 + 三个 schema，并入 `TransformSchema` discriminated union（与 ADR-01 的 Bin/Aggregate 同表追加，最终 union 含全部新成员）。
- **lowering**：`lower/transform.ts` 加 `applyNormalize` / `applyDeriveInterval` / `applyJitter` 三纯函数 + `mulberry32` PRNG，挂进 `applyTransforms` switch。复用 `resolveFieldPath` / `isFiniteNumber` / `inferCategoryDomain`（分组）。
- **mark 消费方**：derive-interval 产 `y0/y1`（默认）→ interval `y0Field/y1Field`、sector `startField/endField` 直接读，**无需改 mark schema**。jitter / normalize 改的是位置 / 值字段，mark 经 encoding 字段引用读到派生值，无需感知 transform。
- **依赖 core**：无——transform 全在 plot domain，纯数据派生，不下沉 core IR、不依赖 core 新能力。
- **React authoring**：复用 ADR-01 落地的通用 `<Transform kind="...">` 声明组件 + `<Plot transforms>` 直传——本 ADR **不引入任何新 React 组件**，三个新 kind（normalize / derive-interval / jitter）经同一 `<Transform>` / `<Plot transforms>` 使用。组件本体、`collectInto`、`build-plot-spec` 透传都在 ADR-01；本 ADR gate 于 ADR-01（先合）。`build-plot-spec` 仅需透传本 ADR 新增 kind（schema / 类型层自动覆盖，无新代码路径）。不走 mark-prop 自动装配（与 ADR-01 一致）。百分比堆叠用显式 `[normalize, stack]`，显式 stack 抑制 mark auto-stack，不二次堆叠。
- **文档站**：`apps/docs` transform 章节补 normalize / derive-interval / jitter 三节双语 mdx + 三 demo（百分比堆叠、甘特区间、jitter 散点），强调 jitter 确定性 seed 与 normalize/derive vs stack 边界。
- **对外 API**：纯增量（加 transform 成员）；非 breaking。

## 不在本 ADR 范围

- **bin / aggregate（改行数 transform）**：alpha.12 ADR-01。
- **dodge transform 化**：现状 dodge 由 interval `arrangement` 在 lowering 期算（非数据 transform），本 ADR 不动。
- **`<Transform>` React 组件本体 / `build-plot-spec` 透传 / mark-prop 自动装配取舍**：组件与收集 / 透传逻辑在 ADR-01 落地，本 ADR 复用、不新增；本 ADR 只新增三个 transform kind 让该 surface 透传。
- **分类轴 band 内抖动（post-scale 屏幕空间偏移）**：散点落在类别带内散开（散点最常见场景）需要在数据 / scale 之后、按 band 宽度在像素空间散开——这是跨数据 / scale 层的 lowering / mark 机制，不是数据 transform，**不在本 ADR 范围**；v1 jitter 只做连续数值数据空间的 pre-scale 偏移。分类带内抖动后续需独立机制（lowering / mark 层）承接。
- **非 uniform jitter 分布（normal / beeswarm 力导）**：beeswarm 是布局算法（改位置且行间有依赖），不在「简单逐行抖动」范围；后续按需。
- **boxplot / density / smooth(回归) / quartile**：alpha.13。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（transform IR schema 改动）。虽不下沉 core IR，但触 Plot IR schema 契约边界 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/transform.ts` | 加 | `PlotTransform.Normalize` | `'normalize'`（const 成员） | — | 组内百分比归一化判别值 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `PlotTransform.DeriveInterval` | `'derive-interval'`（const 成员） | — | 单行派生区间判别值 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `PlotTransform.Jitter` | `'jitter'`（const 成员） | — | 位置抖动判别值 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `NormalizeTransformSchema.kind` | `z.literal('normalize')` | — | 判别字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `NormalizeTransformSchema.field` | `z.string().min(1)` | — | 求组内占比的数值字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `NormalizeTransformSchema.groupBy` | `z.array(z.string().min(1)).min(1).optional()` | 全行单组 | 归一化分组键（数组，复合键，对齐 aggregate.groupBy）；缺省按全局总和 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `NormalizeTransformSchema.basis` | `z.enum(['fraction','percent']).optional()` | `'fraction'` | 输出比例尺度（[0,1] / [0,100]） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `NormalizeTransformSchema.as` | `z.string().min(1).optional()` | 原位覆盖 | 归一化输出字段；缺省覆盖输入字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.kind` | `z.literal('derive-interval')` | — | 判别字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.from` | `z.string().min(1).optional()` | — | baseline→value 模式的值字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.baseline` | `z.number().finite().optional()` | `0` | from 模式区间起点 baseline |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.startFrom` | `z.string().min(1).optional()` | — | 两字段模式的起点字段（配 endFrom，优先 from） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.endFrom` | `z.string().min(1).optional()` | — | 两字段模式的终点字段（配 startFrom） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.startField` | `z.string().min(1).optional()` | `'y0'` | 区间起点输出字段（对齐 interval/sector 消费） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `DeriveIntervalTransformSchema.endField` | `z.string().min(1).optional()` | `'y1'` | 区间终点输出字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `JitterTransformSchema.kind` | `z.literal('jitter')` | — | 判别字段 |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `JitterTransformSchema.axis` | `z.enum(['x','y','both']).optional()` | `'x'` | 抖动作用轴（被抖字段须为连续数值） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `JitterTransformSchema.xField` | `z.string().min(1).optional()` | `'x'` | x 轴被抖动的连续数值字段（axis x/both 时读） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `JitterTransformSchema.yField` | `z.string().min(1).optional()` | `'y'` | y 轴被抖动的连续数值字段（axis y/both 时读） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `JitterTransformSchema.amount` | `z.number().finite().nonnegative().optional()` | `1` | 最大绝对偏移（数据单位，pre-scale，均匀 [-amount,+amount]；仅数值数据空间） |
| `packages/plot/plot/src/ir/transform.ts` | 加 | `JitterTransformSchema.seed` | `z.number().int().optional()` | `0` | 确定性 PRNG（mulberry32）整数 seed；同 seed 复现同偏移 |
| `packages/plot/plot/src/ir/transform.ts` | 改 | `TransformSchema` | 并入三新 schema 到 discriminatedUnion（与 ADR-01 Bin/Aggregate 同表追加） | — | transform op union 扩成 5+ 成员 |

字段名一旦写死，下游 Spec / 实现 Agent 不允许改——需改 → 回本 ADR 加条 / 开新 ADR。

### 文件 scope

- `packages/plot/plot/src/ir/transform.ts`（修改：加三成员 + 三 schema + 三 `z.infer` 类型 + 并入 union）
- `packages/plot/plot/src/lower/transform.ts`（修改：加 `applyNormalize` / `applyDeriveInterval` / `applyJitter` + `mulberry32` PRNG + 接进 `applyTransforms` switch）
- `packages/plot/plot/tests/ir/transform.schema.test.ts`（修改：三 schema accept/reject）
- `packages/plot/plot/tests/lower/transform.test.ts`（修改：三 op 行为 + 链组合）
- `packages/plot/vanilla/tests/`（新建 / 修改：jitter SSR 确定性快照——同 seed 同坐标）
- `packages/plot/react/tests/`（修改：`<Transform kind="normalize|derive-interval|jitter"/>` 经 ADR-01 surface 透传出等价 transform IR；本 ADR **不新增 React 组件 / 不改 `components/src`**，复用 ADR-01 的 `<Transform>`，仅验证三新 kind 透传。gate 于 ADR-01）
- `apps/docs/src/contents/plot/.../transform`（修改：normalize / derive-interval / jitter 双语 mdx 章节——经 ADR-01 `<Transform>` / `<Plot transforms>` 编写，jitter demo 用连续数值字段，百分比堆叠不带 `<BarMark stack>`）
- `apps/docs/src/contents/plot/.../*.demo.tsx`（新建：百分比堆叠（显式 `[normalize, stack]`，无 mark auto-stack）/ 甘特区间 / jitter 连续数值散点 demo）

偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha milestone 放宽口径：覆盖真实有意义的 accept/reject 与数据断言即可。

**Happy path（≥3）**：
- `normalize-group-share`：`{kind:'normalize',field:'amount',groupBy:['quarter'],basis:'percent',as:'share'}` → 每组 share 之和 = 100，原 amount 保留（groupBy 数组）
- `derive-interval-two-field`：`{kind:'derive-interval',startFrom:'start',endFrom:'end'}` → 每行 `y0=start,y1=end`，保行数
- `jitter-deterministic`：`{kind:'jitter',axis:'x',xField:'dose',amount:0.3,seed:42}`（连续数值字段）跑两次 → 每行 dose 偏移逐字段相等

**边界（≥2）**：
- `normalize-zero-group-sum`：某组所有 value 为 0 → 该组 share 输出 0（不产 NaN / Infinity）
- `jitter-amount-zero`：`amount:0` → 输出与输入逐字段相等（恒等退化）

**错误路径（≥2）**：
- `jitter-seed-non-integer`：`seed: 1.5` → schema 拒绝（`z.number().int()`）
- `derive-interval-no-source`：既无 `from` 又无 `startFrom/endFrom` → lowering fail-loud（无区间来源，错误信息指明须给 from 或 startFrom+endFrom）
- `normalize-groupby-non-array`：`groupBy: 'quarter'`（裸串）→ schema 拒绝（须为 `Array<string>`）

**交互（≥2）**：
- `normalize-then-stack`：链 `[normalize(basis:percent), stack]` → 百分比堆叠，每组最终 y1 上界 = 100；React `<Transform kind="normalize"/> + <Transform kind="stack"/>` 不带 `<BarMark stack>`，**显式 stack 抑制 mark auto-stack、不二次堆叠**
- `derive-interval-vs-stack`：同一数据分别过 derive-interval（单行 baseline→value）与 stack（跨行累积）→ 产不同 y0/y1（守语义边界）

### 依赖的现有元素

- `lower/transform.ts` 的 `applyTransforms` / `applySort` / `applyStack`（`packages/plot/plot/src/lower/transform.ts`）—— 扩展：新增三 apply 函数挂进 reduce switch；复用 `DEFAULT_START_FIELD/END_FIELD` 常量对齐默认输出字段。
- `lower/field.ts` 的 `resolveFieldPath` / `isFiniteNumber`（`packages/plot/plot/src/lower/field.ts`）—— 仅引用：取字段值 / 有限数守卫（非有限按 0 或 baseline 计，同 stack 口径）。
- `lower/scale.ts` 的 `inferCategoryDomain`（`packages/plot/plot/src/lower/scale.ts`）—— 仅引用：normalize groupBy 保序去重分组（同 stack 的系列序逻辑）。
- `ir/transform.ts` 的 `PlotTransform` / `SortTransformSchema` / `StackTransformSchema` / `TransformSchema`（`packages/plot/plot/src/ir/transform.ts`）—— 扩展：加成员、并入 union。
- interval `y0Field/y1Field`、sector `startField/endField`（`packages/plot/plot/src/ir/mark.ts`）—— 仅作消费方：derive-interval 默认产 `y0/y1` 与之对接，不改 mark schema。
- ADR-01 的 `<Transform>` 组件 / `<Plot transforms>` / `build-plot-spec` `collectInto`（`packages/plot/react/src/components/transform.tsx` / `build-plot-spec.ts`）—— 复用：本 ADR 三个新 kind 经同一 surface 透传，不新增组件；gate 于 ADR-01 先落地。ADR-01「显式 stack 抑制 mark auto-stack」是本 ADR 百分比堆叠去重的依赖约定。
- core 能力 —— 无（transform 纯 plot domain，不下沉 core IR）。

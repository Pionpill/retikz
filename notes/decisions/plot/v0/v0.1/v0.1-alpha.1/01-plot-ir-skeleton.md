# ADR-01：Plot IR 骨架 + zod schema

- 状态：Proposed
- 决策日期：2026-06-02
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 核心概念 / §8 lowering / §11 模块 / §13.1](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md)

## 背景

`@retikz/plot` 还不存在。要打通 [plot-design §13.1](../../../../../architecture/plot-design.md) 的「最薄纵向闭环」，第一步必须先有一份 **Plot IR**——所有管线模块（transform / encoding / scale / coordinate / mark / guide / lowering）的输入输出契约，且 100% JSON 可序列化、对 AI 友好（[plot-design §11.1](../../../../../architecture/plot-design.md) 把 `ir` / `schema` 列为「常被忽略却必备」的第一模块）。

没有这层，后面什么都开不了工：lowering（ADR-02）要消费它、scale / coordinate / mark 各模块要按它定字段、AI 生成图表要按它的 schema 直生成。

本 ADR **只定 schema 与类型，不含任何编译 / lowering 行为**（lowering 是 ADR-02）。范围锁定在 alpha.1 最薄切片所需的最小字段集：单 mark（point / line）· linear scale · cartesian2D，外加 [plot v0.1 roadmap](../roadmap.md) 贯穿原则要求的 **anchor / scope 预留字段**（零成本埋点，解析留到 alpha.5）。

Plot grammar 属 Tier 2：Plot IR 是 plot 包私有的高层语义，最终 lower 成 core 的 `Scope / Node / Path / Step / Coordinate`（ADR-02）。core 不理解 data / scale / mark。

## 决策：最小 Plot IR——`plot` 根 + 命名 scale + coordinate 持有位置 scale 绑定 + mark 携 encoding

一份 Plot IR 是一个 `type: 'plot'` 根对象，挂四块：内联 `data`、命名 `scales` 数组、单个 `coordinate`、`marks` 图层数组。位置通道的 scale 绑定**由 coordinate 持有**（coordinate 声明哪个 scale 驱动 x / 哪个驱动 y），mark 的 `encoding` 只声明通道绑定到哪个数据字段——避免 scale 引用在 coordinate 与每个 mark 之间重复。anchor / scope 预留为根与 mark 上的可选 `id` + 根上的 `meta` 透传。

### 根

```ts
// packages/plot/plot/src/ir/plot.ts
export const PlotSpecSchema = z
  .object({
    type: z.literal('plot').describe('Discriminator: root of a Plot IR document'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional handle for the whole plot; reserved as the scope reference id / anchor target used by composition & interaction (resolution deferred to alpha.5). Zero-cost reservation: alpha.1 only validates the field, attaches no semantics.',
      ),
    data: PlotDataSchema.describe('Inline dataset consumed by marks; external dataRef reserved (见不在本 ADR 范围)'),
    scales: z.array(ScaleSchema).describe('Named scales; referenced by coordinate (and by non-positional channels in later versions)'),
    coordinate: CoordinateSchema.describe('The coordinate system; owns positional scale bindings (alpha.1: cartesian2D only)'),
    marks: z.array(MarkSchema).min(1).describe('Mark layers, drawn in array order (stable z-order, 复用 core IR 顺序语义)'),
    meta: z
      .record(JSONValueSchema)
      .optional()
      .describe('Free-form JSON-serializable source metadata passthrough; reserved so lowering can preserve provenance into core IR meta (plot-design §8)'),
  })
  .describe('Plot IR root: a JSON-serializable grammar-of-graphics document that lowers to core Scope/Node/Path/Step/Coordinate (ADR-02)');
```

### 数据

数据是扁平表格：行记录的数组，单元格只能是标量（不嵌套对象 / 数组 / 函数）。

```ts
// packages/plot/plot/src/ir/data.ts
export const DatumValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('A single data cell: scalar only (string/number/boolean/null), keeps rows JSON-serializable & LLM-flat');

export const DatumSchema = z.record(DatumValueSchema).describe('One data record: field name → scalar cell');

export const PlotDataSchema = z
  .object({
    values: z.array(DatumSchema).describe('Inline rows; large/dynamic datasets use dataRef in a later version'),
  })
  .describe('Inline dataset (alpha.1). Object wrapper (not bare array) so a `ref` variant can be added non-breakingly later.');
```

### Scale（alpha.1 仅 linear）

```ts
// packages/plot/plot/src/ir/scale.ts
export const LinearScaleSchema = z.object({
  type: z.literal('linear').describe('Discriminator: continuous linear scale'),
  name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('[min, max] input extent; omit → inferred from bound data fields at lowering (ADR-02)'),
  range: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('[start, end] output extent in plot-area units; omit → derived from coordinate extent at lowering (ADR-02)'),
  nice: z.boolean().optional().describe('Round domain to nice human numbers; default false'),
  clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to range ends; default false'),
});

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema])
  .describe('Scale union; extensible to band / time / ordinal·color in alpha.3 (registry-style, plot-design §11.1)');
```

### Coordinate（alpha.1 仅 cartesian2D）

```ts
// packages/plot/plot/src/ir/coordinate.ts
export const Cartesian2DSchema = z.object({
  type: z.literal('cartesian2D').describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
  x: z.string().min(1).describe('Scale name driving the x (horizontal) position channel'),
  y: z.string().min(1).describe('Scale name driving the y (vertical) position channel'),
});

export const CoordinateSchema = z
  .discriminatedUnion('type', [Cartesian2DSchema])
  .describe('Coordinate-system union; extensible to polar2D / linear1D in later alphas (plot-design §3.5)');
```

### Encoding + Mark

通道绑定到数据字段或常量，二选一。位置通道 `x` / `y` 的 scale 由 coordinate 决定，故 channel 本身不带 scale 引用（非位置通道带各自 scale 是 alpha.3 的事）。

```ts
// packages/plot/plot/src/ir/encoding.ts
export const ChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data field name bound to this channel'),
    value: DatumValueSchema.optional().describe('Constant literal for this channel (mutually exclusive with field)'),
  })
  .refine((c) => (c.field === undefined) !== (c.value === undefined), {
    message: 'channel must set exactly one of `field` or `value`',
  })
  .describe('A channel binding: exactly one of field (data-driven) / value (constant)');

export const EncodingSchema = z
  .object({
    x: ChannelSchema.optional().describe('x position channel'),
    y: ChannelSchema.optional().describe('y position channel'),
  })
  .describe('Channel bindings for a mark; non-positional channels (color/size/...) reserved for alpha.3');

// packages/plot/plot/src/ir/mark.ts
const markBase = {
  id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional mark handle; reserved scope/anchor target (resolution deferred to alpha.5)'),
  encoding: EncodingSchema,
};

export const PointMarkSchema = z
  .object({ type: z.literal('point').describe('Discriminator: one glyph per record'), ...markBase })
  .describe('Point mark: scatter / dot');

export const LineMarkSchema = z
  .object({
    type: z.literal('line').describe('Discriminator: ordered points connected by a path'),
    order: z
      .string()
      .min(1)
      .optional()
      .describe('Data field driving connection order; omit → data array order (minimal relation; plot-design §3.8 order)'),
    ...markBase,
  })
  .describe('Line mark: connects records in order');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, LineMarkSchema])
  .describe('Mark union; extensible to interval(bar) / area / sector / rule / text in later alphas (plot-design §3.7)');
```

### 类型导出

```ts
// 与 core 惯例一致：discriminated union / 递归不可用 z.infer 的地方手写类型；本骨架无递归，可直接 z.infer
export type PlotSpec = z.infer<typeof PlotSpecSchema>;
export type Scale = z.infer<typeof ScaleSchema>;
export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Mark = z.infer<typeof MarkSchema>;
export type Encoding = z.infer<typeof EncodingSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type Datum = z.infer<typeof DatumSchema>;
```

理由：

1. **AI 友好优先**（DESIGN.md §1.2）：全字段 JSON 可序列化（无函数 / ReactNode / Map）；用全称不缩写的 grammar 词汇（`scale` / `coordinate` / `encoding` / `mark` / `domain` / `range`）保留 LLM 训练亲和力；每层用清晰 `type` / 显式 `name` 引用，不把语义藏进字符串。
2. **coordinate 持有位置 scale 绑定**，避免「coordinate 声明 x/y scale + 每个 mark 又重复声明 scale」的冗余，也让多 mark 共享同一坐标空间天然成立；非位置通道（自带 scale）留到 alpha.3 再在 channel 上加 `scale` 字段（非破坏）。
3. **schema-only、零行为**：本 ADR 不碰 compile / lowering，红色面仅限 `ir/**` + 包 `index.ts`；测试纯 schema accept/reject，下游 ADR-02 才注入行为。验证「IR 契约先于实现」。
4. **非破坏可扩展**：scale / coordinate / mark 都是 discriminatedUnion，加变体不破坏旧 IR；`data` 用对象包裹 `values` 以便后加 `ref`；`id` / `meta` 预留位让 alpha.5 的 anchor / scope-aware 与 ADR-02 的 provenance 都能非破坏接入。

## 待决策点

> 方案已定，但以下命名 / 结构小决策请人工拍板（develop-design：schema 字段名 / 默认值由人工最终决定）。

- **根类型名**：`PlotSpec`（schema `PlotSpecSchema`，`type: 'plot'`）。备选 `PlotIR` / `Plot`。倾向 `PlotSpec`——「spec」表意「声明式规格」，与 Vega-Lite 习惯一致、对 AI 友好。
- **位置 scale 绑定归属**：coordinate 持有 `x` / `y` scale 名（本方案）vs 每个 channel 自带 `scale` 引用（Vega-Lite 风格）。倾向前者，理由见上「理由 2」。若你预期 alpha.3 非位置通道会让模型割裂，可改为 channel 持有。
- **`data` 形态**：`{ values: Datum[] }` 内联对象。备选直接 `Datum[]`。倾向对象包裹，便于非破坏加 `dataRef`。
- **line 的 `order`**：用「字段名」表示连接顺序（omit = 数据顺序）。备选显式 `{ field, descending? }` 对象。alpha.1 倾向最简字符串，alpha.3 relation 完整化时再升级为对象（非破坏：`string | { field, ... }` union）。
- **anchor / scope 预留形态**：根 + mark 上 `id?: string` + 根 `meta?`。是否需要现在就给 mark 加 `meta?`（datum locator 可能需要）？倾向 alpha.1 只在根放 `meta`，mark 只放 `id`，alpha.5 再按需补。

## DSL 表面

alpha.1 的 `@retikz/plot` **只产出 Plot IR 对象**（schema 校验），不出框架绑定组件——渲染走 ADR-02 的 lowering → core IR → 现有 `@retikz/react` / `@retikz/vanilla`。故本 ADR 的 authoring 表面是 **Plot IR 字面量 / `PlotSpecSchema.parse`**，不是 JSX。框架绑定（`<Plot>` 组件 / vanilla plot builder）按 [plot-design §13.4](../../../../../architecture/plot-design.md) 留到 v0.3，本 ADR 不设计（见「不在本 ADR 范围」）。

```ts
import { PlotSpecSchema, type PlotSpec } from '@retikz/plot';

// 折线图的最小 Plot IR：两条命名 scale + cartesian 绑定 + 单 line mark
const spec: PlotSpec = {
  type: 'plot',
  data: {
    values: [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
      { month: 2, revenue: 9 },
      { month: 3, revenue: 18 },
    ],
  },
  scales: [
    { type: 'linear', name: 'xMonth' },   // domain/range 省略 → ADR-02 lowering 推断
    { type: 'linear', name: 'yRevenue', nice: true },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [
    {
      type: 'line',
      order: 'month',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    },
  ],
};

PlotSpecSchema.parse(spec); // ✅ 通过校验（alpha.1 到此为止；lowering 是 ADR-02）

// 散点图：换成 point mark，同一份 data / scale / coordinate
const scatter: PlotSpec = {
  type: 'plot',
  data: { values: [{ x: 1, y: 2 }, { x: 3, y: 1 }, { x: 2, y: 4 }] },
  scales: [
    { type: 'linear', name: 'xs' },
    { type: 'linear', name: 'ys' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
};

// 常量通道：所有点 y 固定（value 而非 field）
const rugLike: PlotSpec = {
  type: 'plot',
  data: { values: [{ t: 0 }, { t: 5 }, { t: 9 }] },
  scales: [{ type: 'linear', name: 'xt' }, { type: 'linear', name: 'y0' }],
  coordinate: { type: 'cartesian2D', x: 'xt', y: 'y0' },
  marks: [{ type: 'point', encoding: { x: { field: 't' }, y: { value: 0 } } }],
};

// 预留 id：整图与 mark 都可挂 handle（alpha.5 才解析为 scope / anchor）
const withHandles: PlotSpec = {
  type: 'plot',
  id: 'sales-chart',
  data: { values: [{ x: 0, y: 1 }] },
  scales: [{ type: 'linear', name: 'xs' }, { type: 'linear', name: 'ys' }],
  coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
  marks: [{ type: 'line', id: 'trend', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  meta: { source: 'adr-01-example' },
};
```

## 测试设计

`packages/plot/plot/tests/ir/plot-spec.schema.test.ts`（新建，根 + 整体）、`scale.schema.test.ts`、`coordinate.schema.test.ts`、`mark.schema.test.ts`、`encoding.schema.test.ts`、`data.schema.test.ts` 覆盖纯 schema 行为（无 compile）：

- 合法 Plot IR（line / point / 常量通道 / 带 id 与 meta）通过；
- 各 discriminator 缺失 / 错值被拒；
- 必填项缺失（marks 空、scale name 空、coordinate.x/y 缺）被拒；
- channel 的 field/value 互斥 refine；
- 非 JSON 值（function / undefined 单元格）被拒；
- 可选项缺省行为（domain/range/nice/clamp/order/id/meta 省略合法）。

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **新增包 `@retikz/plot`**（`packages/plot/plot`）：前置 setup 步骤建脚手架（见 [alpha.1 待办](./roadmap.md)），本 ADR 在其 `src/ir/**` 落 schema。
- **`packages/plot/plot/src/ir/*.ts`**（全新）：plot / data / scale / coordinate / encoding / mark schema + 类型。
- **`packages/plot/plot/src/ir/index.ts` + `src/index.ts`**：barrel + 公开 API 导出 schema 与类型。
- **对 core 的影响**：无——plot 只 import `@retikz/core` 的类型（lowering 在 ADR-02 才用），本 ADR 不 import core。
- **对文档站的影响**：plot 文档分组尚未建；schema 介绍页随 ADR-02 端到端能出图后再补（本 ADR 是纯契约，无可视 demo）。develop-document 阶段就此说明。
- **对外 API 的影响**：`@retikz/plot` 首次公开 `PlotSpecSchema` 及各子 schema / 类型。

## 不在本 ADR 范围

- **lowering / compile**（Plot IR → core IR）→ ADR-02。本 ADR 无任何运行时行为。
- **scale 的 band / time / ordinal·color**、**mark 的 interval(bar) / area / sector / rule / text**、**非位置通道（color/size/...）** → alpha.3。
- **polar2D / linear1D coordinate** → alpha.4 / 后续。
- **guide（axis / grid / legend）schema** → alpha.2。
- **transform schema（filter/sort/groupBy/stack...）** → 随 alpha.3 relation / transform 落地（alpha.1 数据已是绘制就绪形态）。
- **anchor 命中 / datum locator / scope-aware 解析**：本 ADR 只留 `id` / `meta` 字段位，**不实现**任何解析 → alpha.5。
- **external dataRef / 大数据采样** → 后续；alpha.1 仅内联 `values`。
- **框架绑定 authoring（`<Plot>` JSX / vanilla plot builder）**：plot v0.1 不出框架绑定（[plot-design §13.1 / §13.4](../../../../../architecture/plot-design.md)），authoring 即构造 Plot IR；React/vanilla 双表面留到 v0.3，故本 ADR 不给两套 DSL。

---

## 实现契约（必填）

> 下游 implement / test / document / wrapup 严格按此执行，偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级规则（参 [`flow-alpha`](../../../../../../.agents/skills/flow-alpha/SKILL.md) "自动判级" 表，plot 红线见 [`_template.md`](../../../_template.md)）：

- 动 `packages/plot/plot/src/ir/**`（新建全部 Plot IR schema）→ red
- 动 `packages/plot/plot/src/index.ts`（首次公开 API）→ red

本 ADR 自评 level：`red`，与"文件 scope" 段相符。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/plot.ts` | 新建 schema | `PlotSpecSchema` | `z.object({ type, id?, data, scales, coordinate, marks, meta? })` | — | Plot IR 根；JSON 可序列化，lower 到 core IR（ADR-02） |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.type` | `z.literal('plot')` | — | 根 discriminator |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.id` | `z.string().min(1).optional()` | undefined | 整图 handle；预留 scope 引用 / anchor 目标（解析在 alpha.5），alpha.1 仅校验 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.data` | `PlotDataSchema` | — | 内联数据集 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.scales` | `z.array(ScaleSchema)` | — | 命名 scale 数组 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.coordinate` | `CoordinateSchema` | — | 坐标系；持有位置 scale 绑定 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.marks` | `z.array(MarkSchema).min(1)` | — | mark 图层，数组顺序 = z-order |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.meta` | `z.record(JSONValueSchema).optional()` | undefined | 来源 meta 透传，预留 provenance（ADR-02 lowering 保留） |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `DatumValueSchema` | `z.union([string, number, boolean, null])` | — | 单元格标量 |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `DatumSchema` | `z.record(DatumValueSchema)` | — | 一行记录 |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `PlotDataSchema` | `z.object({ values: z.array(DatumSchema) })` | — | 内联数据集；对象包裹便于后加 dataRef |
| `packages/plot/plot/src/ir/scale.ts` | 新建 schema | `LinearScaleSchema` | `z.object({ type:literal('linear'), name, domain?, range?, nice?, clamp? })` | nice/clamp: false（语义默认） | 线性 scale |
| `packages/plot/plot/src/ir/scale.ts` | 新建 schema | `ScaleSchema` | `z.discriminatedUnion('type', [LinearScaleSchema])` | — | scale union（可扩展） |
| `packages/plot/plot/src/ir/coordinate.ts` | 新建 schema | `Cartesian2DSchema` | `z.object({ type:literal('cartesian2D'), x:string, y:string })` | — | 笛卡尔 2D；x/y = scale 名 |
| `packages/plot/plot/src/ir/coordinate.ts` | 新建 schema | `CoordinateSchema` | `z.discriminatedUnion('type', [Cartesian2DSchema])` | — | coordinate union（可扩展） |
| `packages/plot/plot/src/ir/encoding.ts` | 新建 schema | `ChannelSchema` | `z.object({ field?, value? }).refine(exactly-one)` | — | 通道绑定；field/value 互斥 |
| `packages/plot/plot/src/ir/encoding.ts` | 新建 schema | `EncodingSchema` | `z.object({ x?: ChannelSchema, y?: ChannelSchema })` | — | mark 通道绑定（位置通道） |
| `packages/plot/plot/src/ir/mark.ts` | 新建 schema | `PointMarkSchema` | `z.object({ type:literal('point'), id?, encoding })` | — | 点 mark |
| `packages/plot/plot/src/ir/mark.ts` | 新建 schema | `LineMarkSchema` | `z.object({ type:literal('line'), id?, order?, encoding })` | — | 线 mark |
| `packages/plot/plot/src/ir/mark.ts` | 新建 schema | `MarkSchema` | `z.discriminatedUnion('type', [PointMarkSchema, LineMarkSchema])` | — | mark union（可扩展） |

> `JSONValueSchema`：若 `@retikz/core` 已导出等价的 JSON value zod schema 则复用；否则在 `packages/plot/plot/src/ir/json.ts` 本地定义递归 JSON value schema。实现期确认（见"依赖现有元素"）。

### 文件 scope

- `packages/plot/plot/src/ir/plot.ts`（新建）
- `packages/plot/plot/src/ir/data.ts`（新建）
- `packages/plot/plot/src/ir/scale.ts`（新建）
- `packages/plot/plot/src/ir/coordinate.ts`（新建）
- `packages/plot/plot/src/ir/encoding.ts`（新建）
- `packages/plot/plot/src/ir/mark.ts`（新建）
- `packages/plot/plot/src/ir/json.ts`（新建，**仅当** core 未导出可复用 JSON value schema）
- `packages/plot/plot/src/ir/index.ts`（新建：barrel 导出全部 schema + 类型）
- `packages/plot/plot/src/index.ts`（修改：公开 API 转出 ir barrel）
- `packages/plot/plot/tests/ir/plot-spec.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/coordinate.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/data.schema.test.ts`（新建）

> 包脚手架文件（`package.json` / `tsconfig*` / `vite.config` / `vitest` 配置）由前置 setup 步骤创建，不在本 ADR schema 改动表内，但属本 milestone 的提交。

偏离白名单需加条或开新 ADR。

### 测试象限

每条 ADR ≥ 9 case。本 ADR 纯 schema，case 全为 `parse` 接受 / 拒绝断言。

**Happy path（≥ 3）**：

- `plot_line_minimal_valid`：line mark + 两 linear scale + cartesian + 内联 data → `PlotSpecSchema.parse` 通过
- `plot_point_minimal_valid`：point mark 版本 → 通过
- `plot_constant_channel_valid`：channel 用 `value`（非 field）→ 通过
- `plot_with_id_and_meta_valid`：根 `id` + mark `id` + `meta` 都设 → 通过
- `scale_linear_full_fields_valid`：domain + range + nice + clamp 全给 → 通过
- `scale_linear_omits_optionals_valid`：仅 type + name → 通过

**边界（≥ 2）**：

- `plot_marks_empty_array_rejected`：`marks: []` → 拒（`.min(1)`）
- `plot_single_datum_valid`：`data.values` 仅 1 行 → 通过
- `plot_empty_data_values_valid`：`data.values: []` 空数组 → 通过（schema 不强制非空；空数据是 ADR-02 lowering 的边界，不是 schema 拒绝项）
- `channel_value_null_valid`：`{ value: null }` → 通过（null 是合法 DatumValue）
- `scale_domain_two_tuple_only`：`domain: [0]` / `[0,1,2]` → 拒（tuple 长度固定 2）

**错误路径（≥ 2）**：

- `plot_missing_type_rejected`：根缺 `type` → 拒
- `plot_wrong_type_literal_rejected`：`type: 'chart'` → 拒
- `mark_unknown_type_rejected`：`{ type: 'bar', ... }`（alpha.1 未纳入）→ 拒（discriminatedUnion）
- `channel_both_field_and_value_rejected`：`{ field: 'x', value: 1 }` → 拒（refine 互斥）
- `channel_neither_field_nor_value_rejected`：`{}` → 拒（refine 互斥）
- `scale_empty_name_rejected`：`name: ''` → 拒（`.min(1)`）
- `coordinate_missing_x_rejected`：cartesian 缺 `x` → 拒
- `datum_nested_object_cell_rejected`：单元格是 `{ nested: 1 }` → 拒（DatumValue 仅标量）
- `datum_function_cell_rejected`：单元格是函数 / undefined → 拒（非 JSON 值）

**交互（≥ 2）**：

- `plot_multi_mark_layers_valid`：`marks: [line, point]` 多图层共享同一 coordinate / scales → 通过（验证多 mark 复用坐标空间）
- `plot_two_marks_distinct_encoding_valid`：两 mark 各自 encoding 绑不同 field → 通过
- `mark_id_optional_independent_of_root_id`：根有 id、mark 无 id（或反之）→ 都通过（两处 id 互不依赖）
- `line_order_field_vs_omitted`：line 带 `order` 字段 与 省略 `order` 两版 → 都通过（默认数据顺序）
- `coordinate_references_unknown_scale_name_schema_passes`：coordinate.x 指向不存在的 scale name → **schema 层通过**（引用完整性是 ADR-02 lowering 的校验，非 schema 职责）；本 case 锁定「schema 不做跨字段引用校验」的边界

### 依赖现有元素

- `zod` —— **引用**：全部 schema 基于 zod（catalog 版本，与 core 一致）。
- `@retikz/core` 的 JSON value schema（若有，待实现期在 `packages/core/core/src` 确认导出名）—— **可选复用**：`meta` / `DatumValue` 的 JSON 可序列化约束若 core 已有等价 schema 则复用，否则 plot 本地定义 `json.ts`。**仅复用、不修改 core**。
- `@retikz/core` 的 IR 类型（`Scope` / `Node` / `Path` / `Step` / `Coordinate`）—— **本 ADR 不引用**：lowering 目标在 ADR-02 才 import；此处列明以示边界。

# ADR-01：guide IR（Axis + grid 子属性，Guide union 可扩展，绑 coordinate scope）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.9 guide / §3.6 coordinate scope / §7 多坐标 / §14 anchor](../../../../../architecture/plot-design.md) · 根节点：[alpha.1 ADR-01 PlotSpec](../v0.1-alpha.1/01-plot-spec-root.md) · 坐标系：[alpha.1 ADR-04 coordinate](../v0.1-alpha.1/04-plot-coordinate.md) · 消费方：[ADR-04 guide lowering](./04-guide-lowering.md)

## 背景

alpha.1 打通了 mark（散点 / 折线），但图**无坐标轴、无网格**——读者看不出数值刻度。plot-design §3.9 把 **guide**（坐标轴 / 网格 / 刻度 / 图例 / 参考线）列为与 mark **并列的一等输出**，由 scale + 坐标系**派生**（§4.3 管线第 6 段）。alpha.2 落 guide 的第一类：**axis（坐标轴 + 刻度 + 刻度标签）**；**网格（grid）作为 axis 的子属性**随该轴派生（不是独立 guide——见决策与「网格归属论证」），cartesian2D 下。

本 ADR 只定 guide 的 **IR 声明形态**（画什么轴、是否带网格、绑哪个维度），不含刻度怎么算（[ADR-02 d3-scale](./02-d3-scale.md)）、画在哪（[ADR-03 布局](./03-plot-area-layout.md)）、怎么 lower 成 core 图元（[ADR-04](./04-guide-lowering.md)）。

**关键设计约束——为分面（facet）预留**：plot-design §7 / §3.6 指出分面 = 多个 **coordinate scope**，每个 scope 有自己的 local range / clip / **guide**。因此 guide 不能是「全图全局单份」的语义，必须**归属于某个坐标系**——否则将来做分面时每个子图各自的轴无从表达、被迫重构。

## 决策：guide 是顶层一等节点（与 marks 对称），经 `dimension` 关联坐标系的 x/y 轴；grid 是 axis 的子属性

PlotSpec 顶层加 `guides`（可选数组），与 `marks` 对称——guide 是一等输出，不是 coordinate 的内部属性、也不是 mark 的细节。alpha.2 的 guide 只有一种：`axis`，带 `dimension`（`x` / `y`）声明它装饰坐标系的哪一根轴，并带一个 `grid?` 布尔子属性表示「这根轴是否在 plot area 内画对齐的网格线」。`type` 判别位保留，便于后续把 `GuideSchema` 升成 `z.discriminatedUnion('type', [Axis, Legend, ReferenceLine…])`（非破坏）。alpha.2 只有唯一 coordinate，guide 经 `dimension` **隐式绑定**它；分面时演进为 guide 带可选 `coordinate` 引用（见「待决策点」「不在本 ADR 范围」）。

**网格不是独立对象**：笛卡尔下「网格」只是两根轴各自的刻度线向 plot area 内延伸出的平行线族叠加出的视觉效果——x 轴的网格是一族竖线（在每个 x 刻度处）、y 轴的是一族横线。它天然按轴拆分、刻度与该轴严格同源。故 grid 收为 `AxisGuide.grid`（Vega `axis.grid` 风格），而非独立 `GuideSchema` 成员（论证见下「网格归属」）。

`guides` 省略 / 为空 = 不画任何 guide（IR 显式所得）。**「默认自动出轴」是 [ADR-05](./05-guide-bindings-dsl.md) 的 DSL builder 行为**（无 `<Axis>` 时填默认 guides），不是 IR / lowering 的隐式默认——保证 vanilla 直写 spec 时显式可控、`bare` 易表达。

```ts
// packages/plot/plot/src/ir/guide.ts
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/** guide 类型判别值集（const 对象 + 派生类型；后续加 legend / reference line…） */
export const PlotGuide = { Axis: 'axis' } as const;
export type GuideType = ValueOf<typeof PlotGuide>;

/** guide 装饰的坐标轴维度（暴露给用户；裸 'x' / 'y' 同样可用） */
export const GuideDimension = { X: 'x', Y: 'y' } as const;
export type GuideDimensionType = ValueOf<typeof GuideDimension>;

export const AxisGuideSchema = z
  .object({
    type: z.literal(PlotGuide.Axis).describe('Discriminator: a coordinate axis (axis line + ticks + tick labels, with optional aligned grid lines)'),
    dimension: z.nativeEnum(GuideDimension).describe('Which coordinate axis this guide decorates: x (horizontal) or y (vertical)'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe('Optional guide handle; reserved scope/anchor target (e.g. plot.xAxis / plot.yAxis region), resolution deferred to alpha.5'),
    tickCount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Target number of ticks (a hint to the scale; omit to use the default tick count). Grid lines, when enabled, sit at these same tick positions'),
    tickLabels: z
      .boolean()
      .optional()
      .describe('Whether to render tick labels (the numeric text beside each tick); omit = true. Named tickLabels (not label) to avoid confusion with a future axis title'),
    grid: z
      .boolean()
      .optional()
      .describe('Whether to draw grid lines spanning the plot area at this axis tick positions; omit = false. Grid is an axis sub-property (Vega-style): its lines always align to this axis ticks, so there is no separate grid tick source'),
  })
  .describe('Axis guide: a coordinate axis (ticks + tick labels, with optional aligned grid lines), derived from the bound dimension scale');

/**
 * Guide union（alpha.2 仅 axis；grid 是 axis 子属性、非独立成员）。
 * 预留：legend / reference line 进来时升为 z.discriminatedUnion('type', [AxisGuideSchema, …])——type 判别位已在，升级非破坏。
 */
export const GuideSchema = AxisGuideSchema;

/** guide（alpha.2：axis，含可选 grid 子属性） */
export type Guide = z.infer<typeof GuideSchema>;
export type AxisGuide = z.infer<typeof AxisGuideSchema>;
```

PlotSpec 根加槽位（修改 alpha.1 ADR-01 的 `PlotSpecSchema`，非破坏 optional）：

```ts
// packages/plot/plot/src/ir/plot.ts（在 PlotSpecSchema.extend 内补一行）
guides: z
  .array(GuideSchema)
  .optional()
  .describe('Guide layers (axes, each with optional grid lines), derived from scales + coordinate; omit for no guides. Grid lines draw behind marks; axis lines / ticks / labels around the plot area.'),
```

理由：

1. **guide 一等、与 marks 对称**（§3.9）：顶层 `guides` 数组而非内嵌 coordinate，便于 DSL 子组件 `<Axis>` 直接装配（仿 `<LineMark>`），也契合「guide 与 mark 并列」的概念模型。
2. **绑 coordinate scope（facet 预留）**：guide 经 `dimension` 关联坐标系的轴；分面时坐标系多实例，guide 加可选 `coordinate` 引用即各自归位——结构非破坏。**绑定粒度 = coordinate scope，不是全图单份**，这是为 facet 守住的硬约束。
3. **grid 收为 axis 子属性**：网格几何天然按轴拆成平行线族、刻度与轴同源——做成 `axis.grid` 布尔即单一真源，消除「轴刻度 5、网格 7」的错位与「grid 该复用哪个同维 axis 的 ticks」歧义（详见「网格归属」）。
4. **显式 IR、默认在 DSL**：`guides` 省略 = 无 guide。「默认出轴」交给 [ADR-05](./05-guide-bindings-dsl.md) builder，IR 层保持显式所得——vanilla spec 可控、`bare` 表达为「不填 guides」。
5. **可扩展、JSON 安全**：`type` 判别位为 legend / reference line 预留升 union 的空间，不破坏旧 IR；`dimension` / `tickCount` / `tickLabels` / `grid` 都 100% JSON 可序列化。
6. **anchor 预留**：guide `id` 与 mark / 根 `id` 同构，alpha.5 才解析为 scope/anchor（plot.xAxis / plot.yAxis），alpha.2 仅校验字段位。

## 网格归属：grid 是 axis 子属性，不是独立 guide（本次决策核心）

调研主流库:**绝大多数把 grid 做成轴/scale 的子属性**——Vega/Vega-Lite `axis.grid`、matplotlib `ax.xaxis.grid()`、Chart.js `scales.x.grid`、Plotly `xaxis.showgrid`、pgfplots `grid=major`、ECharts `xAxis.splitLine`、D3 约定 `axis.tickSize(-innerWidth)`（网格 = 拉长的刻度）。只有 Observable Plot 把 `gridX`/`gridY` 做成独立 mark。

收为 axis 子属性的依据:

1. **几何同源**：笛卡尔下一根轴的网格 = 该轴每个刻度处、垂直于轴、横跨另一维度的一族平行线。x 轴 → 竖线族、y 轴 → 横线族；用户看到的「网格」是两族线叠加的视觉效果，库不需要「网格」这个一等概念。
2. **单一刻度真源**：grid 用所在 axis 的刻度位置，天然对齐、不可能错位；不必再为 grid 配 `tickCount`、也不存在「grid 复用哪个同维 axis 的 ticks」的歧义。
3. **独立 guide 也救不了「特殊网格」**：独立 `GridGuide` 仍带 `dimension`（还是平行线族），并不能表达点阵网格（交点型,需 x×y 配对）或六边形 / 斜线网格（非轴向）——这些本就不属于 grid 概念。装饰性底纹走 **core pattern**（Kernel 能力，不是 plot guide）；数据空间的区域强调走未来的 **reference-area 原语**（mark 家族，靠 scale 投影 + pattern fill）。即「用户在数据空间点名某处画特殊东西」= mark/annotation，「轴派生的规则线」= guide，两者不混。
4. **「只要网格不要轴线」** 不是「没有轴」，而是「一根只显示网格的轴」——靠关闭该 axis 的轴线 / 刻度 / 标签子开关表达（归属仍是 axis）。alpha.2 先只给 `grid` 布尔；轴线 / 刻度可见性的细分开关留后续（非破坏加字段）。

**已知代价**：未来若要「网格密度 ≠ 轴刻度密度」（minor grid），需在 axis 内加 major/minor 刻度体系（主流库亦如此），而不是再开独立 grid——方向一致，不算欠债。

## 待决策点

- **guide 归属：顶层数组 (A) vs 内嵌 coordinate (B)** —— 选 **(A) 顶层 `guides` + `dimension`**。理由：一等输出、与 marks 对称、子组件直接装配。(B)「`coordinate.axes` 内嵌」对 facet（coordinate scope 化）更天然（轴随坐标系复制），但与「guide 一等」「子组件 DSL」张力大、且 alpha.2 单坐标系下两者等价。**facet 真正落地时需在 (A) 上加 `guide.coordinate` 引用 + coordinate 具名/多实例**——非破坏。若 review 认为 facet 优先级高到该现在就内嵌，可改投 (B)。
- **grid 归属：axis 子属性 vs 独立 guide（已定，本次决策）** —— 选 **axis 子属性 `AxisGuide.grid`**（Vega 风格，主流路线）。论证见上「网格归属」。曾计划做独立 `GridGuide` union 成员（Observable Plot 风格、强调 grid 是独立视觉层），现**推翻**：独立成员换不来特殊网格能力、却要背刻度同源歧义与去重补丁。`grid` 先做 `boolean`，留升级成样式对象（`grid?: { stroke, dash, opacity }`）的空间——非破坏。
- **`tickLabels` 默认值表达**：用 `optional`（lowering 视 undefined 为 true），与 alpha.1 scale 的 `nice`/`clamp` 一致；备选 `.default(true)`（IR 规范化后显式）。倾向 optional。字段名 `tickLabels`（非 `label`）以免与未来轴标题混（采纳评审 I3）。
- **`grid` 默认值表达**：`optional`（lowering 视 undefined 为 false——IR 显式所得，无网格）。「默认 y 轴带网格」是 [ADR-05](./05-guide-bindings-dsl.md) builder 的 `DEFAULT_GUIDES` 行为，不在 IR 层默认。
- **轴标题（title）**：alpha.2 **不含**（schema 不加 `title`）——标题要额外占 margin + 富排版，聚焦先做轴线/刻度/标签/网格。留后续（非破坏加 `title?`）。
- **`tickCount` 归 axis 还是 scale**：放 **AxisGuide**（更像「这根轴想要几个刻度」的展示配置），而非污染 alpha.1 的 `LinearScale`。grid 是同一根轴的子属性，**直接复用该轴 ticks**（同源，无歧义）。
- **同 dimension 多 axis 重复**：同一 `dimension` 出现多个 axis（如两个 `axis y` 且 `tickCount` 不同）由 lowering **拒绝**（[ADR-04](./04-guide-lowering.md)，承袭评审 P2.5 的「清晰错误」原则）——一根维度一根轴，免得刻度数不确定。

## DSL 表面

> 本 ADR 是 IR schema 层；面向用户的 `<Axis>` 子组件（含 `grid` prop）在 [ADR-05](./05-guide-bindings-dsl.md)。这里给 schema / vanilla spec 视角：

```ts
import { GuideSchema, AxisGuideSchema, PlotGuide, GuideDimension } from '@retikz/plot';

// x 轴（默认出刻度标签、无网格）
GuideSchema.parse({ type: 'axis', dimension: 'x' });
// y 轴：指定目标刻度数、带网格、关掉刻度标签、预留 anchor id
GuideSchema.parse({ type: 'axis', dimension: 'y', tickCount: 5, grid: true, tickLabels: false, id: 'yAxis' });

// 进 PlotSpec：与 marks 并列（默认 y 轴带网格）
// { namespace:'plot', type:'plot', data, scales, coordinate, marks,
//   guides: [{ type:'axis', dimension:'x' }, { type:'axis', dimension:'y', grid:true }] }
```

## 测试设计

`packages/plot/plot/tests/ir/guide.schema.test.ts`（新建）+ `plot.schema.test.ts`（补 guides 槽位）覆盖：合法 axis（带 / 不带 tickCount / tickLabels / grid / id）；未知 guide type、缺 type / dimension 被拒；非法 dimension 被拒；tickCount 非正 / 非整被拒；`grid` 非布尔被拒；PlotSpec 省略 guides 通过、带 guides 数组通过；guides JSON round-trip。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/guide.ts`**（全新）：`PlotGuide` / `GuideDimension` 常量 + `AxisGuideSchema`（含 `grid` 子属性）+ `GuideSchema` 别名 + 类型。
- **`packages/plot/plot/src/ir/plot.ts`**（修改）：`PlotSpecSchema` 加 `guides?` 槽位（import `GuideSchema`）。非破坏——alpha.1 不带 guides 的 spec 仍合法。
- **`packages/plot/plot/src/ir/index.ts`**（修改）：导出 guide schema 与类型。
- **对外 API**：`@retikz/plot` 公开 `GuideSchema` / `AxisGuideSchema` / `PlotGuide` / `GuideDimension` 及类型（**不再有** `GridGuideSchema`）。
- **被消费**：[ADR-04 lowering](./04-guide-lowering.md) 读 `guides`；[ADR-05 DSL](./05-guide-bindings-dsl.md) 装配 `guides`。
- **文档**：plot 文档需展示带轴示例（[ADR-05](./05-guide-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **刻度算法（auto-tick）** → [ADR-02](./02-d3-scale.md)。
- **轴/网格画在哪（plot area 布局、margin）** → [ADR-03](./03-plot-area-layout.md)。
- **guide → core IR 的 lowering** → [ADR-04](./04-guide-lowering.md)。
- **`<Axis>` 子组件（含 `grid` prop）、默认自动出、`bare`** → [ADR-05](./05-guide-bindings-dsl.md)。
- **轴标题、轴线/刻度可见性细分开关、legend、reference line、富排版** → 后续。
- **装饰性网格底纹（core pattern）、数据空间区域强调（reference-area 原语）** → 后续（非 guide，见「网格归属」§3）。
- **`guide.coordinate` 引用 + coordinate 具名/多实例（facet）、guide 的 anchor/scope 解析** → alpha.5 / facet milestone。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**` → red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/guide.ts` | 新建常量 | `PlotGuide` | `{ Axis:'axis' } as const`（派生 `GuideType`） | — | guide 类型判别值集（后续加 legend…） |
| `packages/plot/plot/src/ir/guide.ts` | 新建常量 | `GuideDimension` | `{ X:'x', Y:'y' } as const`（派生 `GuideDimensionType`） | — | guide 装饰的轴维度 |
| `packages/plot/plot/src/ir/guide.ts` | 新建 schema | `AxisGuideSchema` | `z.object({ type:z.literal('axis'), dimension, id?, tickCount?, tickLabels?, grid? })` | — | 坐标轴（轴线+刻度+标签+可选网格） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.dimension` | `z.nativeEnum(GuideDimension)` | — | 装饰哪根轴（x/y） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.id` | `z.string().min(1).optional()` | undefined | guide handle；预留 scope/anchor（解析 alpha.5） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.tickCount` | `z.number().int().positive().optional()` | undefined | 目标刻度数（scale 提示，网格复用同刻度） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.tickLabels` | `z.boolean().optional()` | undefined（lowering 视为 true） | 是否出刻度标签 |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.grid` | `z.boolean().optional()` | undefined（lowering 视为 false） | 是否在 plot area 画对齐本轴刻度的网格线 |
| `packages/plot/plot/src/ir/guide.ts` | 新建别名 | `GuideSchema` | `= AxisGuideSchema`（留升 discriminatedUnion） | — | guide union（alpha.2 仅 axis） |
| `packages/plot/plot/src/ir/plot.ts` | 加字段 | `PlotSpecSchema.guides` | `z.array(GuideSchema).optional()` | undefined | guide 图层（轴 + 可选网格），省略=无 guide |

### 文件 scope

- `packages/plot/plot/src/ir/guide.ts`（新建）
- `packages/plot/plot/src/ir/plot.ts`（修改：加 `guides` 槽位 + import）
- `packages/plot/plot/src/ir/index.ts`（修改：补 guide 导出）
- `packages/plot/plot/tests/ir/guide.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/plot.schema.test.ts`（修改：补 guides 槽位 case）

### 测试象限

**Happy path**：

- `axis_x_valid`：`{ type:'axis', dimension:'x' }` → 通过
- `axis_y_full_valid`：`{ type:'axis', dimension:'y', tickCount:5, grid:true, tickLabels:false, id:'yAxis' }` → 通过
- `axis_with_grid_valid`：`{ type:'axis', dimension:'x', grid:true }` → 通过
- `plot_with_guides_valid`：PlotSpec 带 `guides:[axis x, {axis y, grid:true}]` → 通过

**边界**：

- `axis_omits_optional_valid`：axis 省略 tickCount/tickLabels/grid/id → 通过（lowering 默认：有标签、无网格）
- `plot_omits_guides_valid`：PlotSpec 不带 `guides` → 通过（非破坏；alpha.1 spec 仍合法）
- `plot_empty_guides_valid`：`guides:[]` → 通过（= 无 guide）

**错误路径**：

- `guide_unknown_type_rejected`：`{ type:'grid', ... }`（grid 已不是独立 type）/ `{ type:'legend', ... }` → 拒（literal 'axis'）
- `guide_missing_dimension_rejected`：缺 `dimension` → 拒
- `guide_bad_dimension_rejected`：`dimension:'z'` → 拒（nativeEnum）
- `axis_tickcount_non_positive_rejected`：`tickCount:0` / `-1` / `2.5` → 拒（int positive）
- `axis_grid_non_boolean_rejected`：`grid:'yes'` → 拒（boolean）

**交互**：

- `guides_roundtrip`：含带 grid 的 axis 的 PlotSpec `Schema.parse(JSON.parse(JSON.stringify(ir)))` 等于原 IR（AI 一等公民契约）
- `guides_coexist_with_marks`：同一 PlotSpec 同时含 marks 与 guides，各自校验互不影响 → 通过

### 依赖现有元素

- `zod` —— **引用**。
- `@retikz/core` 的 `ValueOf`（包根 re-export）—— **引用**：派生 `GuideType` / `GuideDimensionType`。
- [alpha.1 ADR-01 `PlotSpecSchema`](../v0.1-alpha.1/01-plot-spec-root.md)（`packages/plot/plot/src/ir/plot.ts`）—— **修改**：加 `guides` 槽位。
- [alpha.1 ADR-04 coordinate](../v0.1-alpha.1/04-plot-coordinate.md) —— **约束来源**：guide `dimension` 关联 coordinate 的 x/y scale 绑定（无代码依赖，设计约束）。

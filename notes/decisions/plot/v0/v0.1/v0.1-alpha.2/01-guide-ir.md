# ADR-01：guide IR（Axis / Grid + Guide union，绑 coordinate scope）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.9 guide / §3.6 coordinate scope / §7 多坐标 / §14 anchor](../../../../../architecture/plot-design.md) · 根节点：[alpha.1 ADR-01 PlotSpec](../v0.1-alpha.1/01-plot-spec-root.md) · 坐标系：[alpha.1 ADR-04 coordinate](../v0.1-alpha.1/04-plot-coordinate.md) · 消费方：[ADR-04 guide lowering](./04-guide-lowering.md)

## 背景

alpha.1 打通了 mark（散点 / 折线），但图**无坐标轴、无网格**——读者看不出数值刻度。plot-design §3.9 把 **guide**（坐标轴 / 网格 / 刻度 / 图例 / 参考线）列为与 mark **并列的一等输出**，由 scale + 坐标系**派生**（§4.3 管线第 6 段）。alpha.2 落 guide 的前两类：**axis（坐标轴 + 刻度 + 刻度标签）与 grid（网格线）**，cartesian2D 下。

本 ADR 只定 guide 的 **IR 声明形态**（画什么轴/网格、绑哪个维度），不含刻度怎么算（[ADR-02 auto-tick](./02-auto-tick.md)）、画在哪（[ADR-03 布局](./03-plot-area-layout.md)）、怎么 lower 成 core 图元（[ADR-04](./04-guide-lowering.md)）。

**关键设计约束——为分面（facet）预留**：plot-design §7 / §3.6 指出分面 = 多个 **coordinate scope**，每个 scope 有自己的 local range / clip / **guide**。因此 guide 不能是「全图全局单份」的语义，必须**归属于某个坐标系**——否则将来做分面时每个子图各自的轴无从表达、被迫重构。

## 决策：guide 是顶层一等节点（与 marks 对称），通过 `dimension` 关联坐标系的 x/y 轴

PlotSpec 顶层加 `guides`（可选数组），与 `marks` 对称——guide 是一等输出，不是 coordinate 的内部属性、也不是 mark 的细节。每个 guide 是 `axis` / `grid` 的 discriminated union，带 `dimension`（`x` / `y`）声明它装饰坐标系的哪一根轴。alpha.2 只有唯一 coordinate，guide 经 `dimension` **隐式绑定**它；分面时演进为 guide 带可选 `coordinate` 引用（见「待决策点」「不在本 ADR 范围」）。

`guides` 省略 / 为空 = 不画任何 guide（IR 显式所得）。**「默认自动出轴」是 [ADR-05](./05-guide-bindings-dsl.md) 的 DSL builder 行为**（无 `<Axis>` 时填默认 guides），不是 IR / lowering 的隐式默认——保证 vanilla 直写 spec 时显式可控、`bare` 易表达。

```ts
// packages/plot/plot/src/ir/guide.ts
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/** guide 类型判别值集（const 对象 + 派生类型；后续加 legend / reference line…） */
export const PlotGuide = { Axis: 'axis', Grid: 'grid' } as const;
export type GuideType = ValueOf<typeof PlotGuide>;

/** guide 装饰的坐标轴维度（暴露给用户；裸 'x' / 'y' 同样可用） */
export const GuideDimension = { X: 'x', Y: 'y' } as const;
export type GuideDimensionType = ValueOf<typeof GuideDimension>;

const guideBase = {
  dimension: z.nativeEnum(GuideDimension).describe('Which coordinate axis this guide decorates: x (horizontal) or y (vertical)'),
  id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional guide handle; reserved scope/anchor target (e.g. plot.xAxis / plot.yAxis region), resolution deferred to alpha.5'),
};

export const AxisGuideSchema = z
  .object({
    type: z.literal(PlotGuide.Axis).describe('Discriminator: a coordinate axis (axis line + ticks + tick labels)'),
    ...guideBase,
    tickCount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Target number of ticks (a hint to auto-tick; omit to use the default tick count)'),
    tickLabels: z
      .boolean()
      .optional()
      .describe('Whether to render tick labels (the numeric text beside each tick); omit = true. Named tickLabels (not label) to avoid confusion with a future axis title'),
  })
  .describe('Axis guide: a coordinate axis with ticks and tick labels, derived from the bound dimension scale');

export const GridGuideSchema = z
  .object({
    type: z.literal(PlotGuide.Grid).describe('Discriminator: grid lines across the plot area at the dimension ticks'),
    ...guideBase,
  })
  .describe('Grid guide: reference lines spanning the plot area at the bound dimension tick positions');

export const GuideSchema = z
  .discriminatedUnion('type', [AxisGuideSchema, GridGuideSchema])
  .describe('Guide union; extensible to legend / reference line in later alphas (plot-design §3.9)');

/** guide（alpha.2：axis / grid） */
export type Guide = z.infer<typeof GuideSchema>;
export type AxisGuide = z.infer<typeof AxisGuideSchema>;
export type GridGuide = z.infer<typeof GridGuideSchema>;
```

PlotSpec 根加槽位（修改 alpha.1 ADR-01 的 `PlotSpecSchema`，非破坏 optional）：

```ts
// packages/plot/plot/src/ir/plot.ts（在 PlotSpecSchema.extend 内补一行）
guides: z
  .array(GuideSchema)
  .optional()
  .describe('Guide layers (axes / grids), derived from scales + coordinate; omit for no guides. Drawn behind marks (grid) / around the plot area (axis).'),
```

理由：

1. **guide 一等、与 marks 对称**（§3.9）：顶层 `guides` 数组而非内嵌 coordinate，便于 DSL 子组件 `<Axis>`/`<Grid>` 直接装配（仿 `<LineMark>`），也契合「guide 与 mark 并列」的概念模型。
2. **绑 coordinate scope（facet 预留）**：guide 经 `dimension` 关联坐标系的轴；分面时坐标系多实例，guide 加可选 `coordinate` 引用即各自归位——结构非破坏。**绑定粒度 = coordinate scope，不是全图单份**，这是为 facet 守住的硬约束。
3. **显式 IR、默认在 DSL**：`guides` 省略 = 无 guide。「默认出轴」交给 [ADR-05](./05-guide-bindings-dsl.md) builder，IR 层保持显式所得——vanilla spec 可控、`bare` 表达为「不填 guides」。
4. **discriminated union 可扩展**：`type` 判别加 legend / reference line 不破坏旧 IR；`dimension` / `tickCount` / `label` 都 100% JSON 可序列化。
5. **anchor 预留**：guide `id` 与 mark / 根 `id` 同构，alpha.5 才解析为 scope/anchor（plot.xAxis / plot.yAxis），alpha.2 仅校验字段位。

## 待决策点

- **guide 归属：顶层数组 (A) vs 内嵌 coordinate (B)** —— 选 **(A) 顶层 `guides` + `dimension`**。理由：一等输出、与 marks 对称、子组件直接装配。(B)「`coordinate.axes` 内嵌」对 facet（coordinate scope 化）更天然（轴随坐标系复制），但与「guide 一等」「子组件 DSL」张力大、且 alpha.2 单坐标系下两者等价。**facet 真正落地时需在 (A) 上加 `guide.coordinate` 引用 + coordinate 具名/多实例**——非破坏。若 review 认为 facet 优先级高到该现在就内嵌，可改投 (B)。
- **`tickLabels` 默认值表达**：用 `optional`（lowering 视 undefined 为 true），与 alpha.1 scale 的 `nice`/`clamp` 一致；备选 `.default(true)`（IR 规范化后显式）。倾向 optional。字段名 `tickLabels`（非 `label`）以免与未来轴标题混（采纳评审 I3）。
- **轴标题（title）**：alpha.2 **不含**（schema 不加 `title`）——标题要额外占 margin + 富排版，聚焦先做轴线/刻度/标签/网格。留后续（非破坏加 `title?`）。
- **`tickCount` 归 axis 还是 scale**：放 **AxisGuide**（更像「这根轴想要几个刻度」的展示配置），而非污染 alpha.1 的 `LinearScale`。grid 与同 `dimension` 的 axis 共享 ticks（lowering 按 dimension 统一算一次，[ADR-04](./04-guide-lowering.md)）。
- **grid 是否需要独立 tickCount**：不需要——grid 复用同维度 axis 的刻度位置；无对应 axis 时按默认 tickCount 算（[ADR-04](./04-guide-lowering.md) 决定）。

## DSL 表面

> 本 ADR 是 IR schema 层；面向用户的 `<Axis>`/`<Grid>` 子组件在 [ADR-05](./05-guide-bindings-dsl.md)。这里给 schema / vanilla spec 视角：

```ts
import { GuideSchema, AxisGuideSchema, PlotGuide, GuideDimension } from '@retikz/plot';

// x 轴（默认出刻度标签）
GuideSchema.parse({ type: 'axis', dimension: 'x' });
// y 轴：指定目标刻度数、关掉刻度标签、预留 anchor id
GuideSchema.parse({ type: 'axis', dimension: 'y', tickCount: 5, tickLabels: false, id: 'yAxis' });
// y 方向网格
GuideSchema.parse({ type: 'grid', dimension: 'y' });

// 进 PlotSpec：与 marks 并列
// { namespace:'plot', type:'plot', data, scales, coordinate, marks,
//   guides: [{ type:'axis', dimension:'x' }, { type:'axis', dimension:'y' }, { type:'grid', dimension:'y' }] }
```

## 测试设计

`packages/plot/plot/tests/ir/guide.schema.test.ts`（新建）+ `plot.schema.test.ts`（补 guides 槽位）覆盖：合法 axis / grid（带 / 不带 tickCount / label / id）；未知 guide type、缺 type / dimension 被拒；非法 dimension 被拒；tickCount 非正 / 非整被拒；PlotSpec 省略 guides 通过、带 guides 数组通过；guides JSON round-trip。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/guide.ts`**（全新）：`PlotGuide` / `GuideDimension` 常量 + `AxisGuideSchema` / `GridGuideSchema` / `GuideSchema` + 类型。
- **`packages/plot/plot/src/ir/plot.ts`**（修改）：`PlotSpecSchema` 加 `guides?` 槽位（import `GuideSchema`）。非破坏——alpha.1 不带 guides 的 spec 仍合法。
- **`packages/plot/plot/src/ir/index.ts`**（修改）：导出 guide schema 与类型。
- **对外 API**：`@retikz/plot` 公开 `GuideSchema` / `AxisGuideSchema` / `GridGuideSchema` / `PlotGuide` / `GuideDimension` 及类型。
- **被消费**：[ADR-04 lowering](./04-guide-lowering.md) 读 `guides`；[ADR-05 DSL](./05-guide-bindings-dsl.md) 装配 `guides`。
- **文档**：plot 文档需展示带轴示例（[ADR-05](./05-guide-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **刻度算法（auto-tick）** → [ADR-02](./02-auto-tick.md)。
- **轴/网格画在哪（plot area 布局、margin）** → [ADR-03](./03-plot-area-layout.md)。
- **guide → core IR 的 lowering** → [ADR-04](./04-guide-lowering.md)。
- **`<Axis>`/`<Grid>` 子组件、默认自动出、`bare`** → [ADR-05](./05-guide-bindings-dsl.md)。
- **轴标题、legend、reference line、富排版** → 后续。
- **`guide.coordinate` 引用 + coordinate 具名/多实例（facet）、guide 的 anchor/scope 解析** → alpha.5 / facet milestone。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**` → red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/guide.ts` | 新建常量 | `PlotGuide` | `{ Axis:'axis', Grid:'grid' } as const`（派生 `GuideType`） | — | guide 类型判别值集 |
| `packages/plot/plot/src/ir/guide.ts` | 新建常量 | `GuideDimension` | `{ X:'x', Y:'y' } as const`（派生 `GuideDimensionType`） | — | guide 装饰的轴维度 |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段（guideBase） | `<guide>.dimension` | `z.nativeEnum(GuideDimension)` | — | 装饰哪根轴（x/y） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段（guideBase） | `<guide>.id` | `z.string().min(1).optional()` | undefined | guide handle；预留 scope/anchor（解析 alpha.5） |
| `packages/plot/plot/src/ir/guide.ts` | 新建 schema | `AxisGuideSchema` | `z.object({ type:z.literal('axis'), dimension, id?, tickCount?, tickLabels? })` | — | 坐标轴（轴线+刻度+标签） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.tickCount` | `z.number().int().positive().optional()` | undefined | 目标刻度数（auto-tick 提示） |
| `packages/plot/plot/src/ir/guide.ts` | 新建字段 | `AxisGuideSchema.tickLabels` | `z.boolean().optional()` | undefined（lowering 视为 true） | 是否出刻度标签 |
| `packages/plot/plot/src/ir/guide.ts` | 新建 schema | `GridGuideSchema` | `z.object({ type:z.literal('grid'), dimension, id? })` | — | 网格线 |
| `packages/plot/plot/src/ir/guide.ts` | 新建 schema | `GuideSchema` | `z.discriminatedUnion('type', [AxisGuideSchema, GridGuideSchema])` | — | guide union（可扩展） |
| `packages/plot/plot/src/ir/plot.ts` | 加字段 | `PlotSpecSchema.guides` | `z.array(GuideSchema).optional()` | undefined | guide 图层（轴/网格），省略=无 guide |

### 文件 scope

- `packages/plot/plot/src/ir/guide.ts`（新建）
- `packages/plot/plot/src/ir/plot.ts`（修改：加 `guides` 槽位 + import）
- `packages/plot/plot/src/ir/index.ts`（修改：补 guide 导出）
- `packages/plot/plot/tests/ir/guide.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/plot.schema.test.ts`（修改：补 guides 槽位 case）

### 测试象限

**Happy path**：

- `axis_x_valid`：`{ type:'axis', dimension:'x' }` → 通过
- `axis_y_full_valid`：`{ type:'axis', dimension:'y', tickCount:5, tickLabels:false, id:'yAxis' }` → 通过
- `grid_valid`：`{ type:'grid', dimension:'x' }` → 通过
- `plot_with_guides_valid`：PlotSpec 带 `guides:[axis x, axis y, grid y]` → 通过

**边界**：

- `axis_omits_optional_valid`：axis 省略 tickCount/tickLabels/id → 通过（lowering 默认）
- `plot_omits_guides_valid`：PlotSpec 不带 `guides` → 通过（非破坏；alpha.1 spec 仍合法）
- `plot_empty_guides_valid`：`guides:[]` → 通过（= 无 guide）

**错误路径**：

- `guide_unknown_type_rejected`：`{ type:'legend', ... }`（alpha.2 未纳入）→ 拒（discriminatedUnion）
- `guide_missing_dimension_rejected`：缺 `dimension` → 拒
- `guide_bad_dimension_rejected`：`dimension:'z'` → 拒（nativeEnum）
- `axis_tickcount_non_positive_rejected`：`tickCount:0` / `-1` / `2.5` → 拒（int positive）

**交互**：

- `guides_roundtrip`：含 axis+grid 的 PlotSpec `Schema.parse(JSON.parse(JSON.stringify(ir)))` 等于原 IR（AI 一等公民契约）
- `guides_coexist_with_marks`：同一 PlotSpec 同时含 marks 与 guides，各自校验互不影响 → 通过

### 依赖现有元素

- `zod` —— **引用**。
- `@retikz/core` 的 `ValueOf`（包根 re-export）—— **引用**：派生 `GuideType` / `GuideDimensionType`。
- [alpha.1 ADR-01 `PlotSpecSchema`](../v0.1-alpha.1/01-plot-spec-root.md)（`packages/plot/plot/src/ir/plot.ts`）—— **修改**：加 `guides` 槽位。
- [alpha.1 ADR-04 coordinate](../v0.1-alpha.1/04-plot-coordinate.md) —— **约束来源**：guide `dimension` 关联 coordinate 的 x/y scale 绑定（无代码依赖，设计约束）。

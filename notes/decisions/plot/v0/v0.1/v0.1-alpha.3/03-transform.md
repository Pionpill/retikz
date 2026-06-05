# ADR-03：transform 阶段（sort / stack；groupBy 作为 stack 的分组参数）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.3 transform / §4.1 管线第 1 段 / §3.8 relation](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-06 lowering](../v0.1-alpha.1/06-plot-lowering.md) · 消费方：[ADR-05 relation](./05-relation.md) · [ADR-02 bar mark](./02-interval-mark.md)

## 背景

alpha.1/alpha.2 的 `expandPlot` 拿到外部 `rows` 后**直接**喂 scale 域推断与 mark——中间没有任何「数据变换」环节。但 plot-design §4.1 的管线第 1 段就是 **transform**（原始数据 → 变换 → 可绘制数据表），堆叠图根本无法不经变换表达：

- **堆叠柱 / 堆叠面积**需要先算每个 (x 类别, 系列) 的累积区间 `[y0, y1]`——这是 **stack** transform 的产物，mark 只负责画 `y0→y1` 的矩形（[ADR-02](./02-interval-mark.md) 的 baseline 从固定 0 推广到 `y0`）。
- **有序折线 / 柱**需要 **sort**。alpha.1 line mark 内联了一个 `order` 字段做就地排序——那是 mark 局部捷径；transform 把「排序」提为管线一等步骤，line `order` 可保留为 sugar、但堆叠 / 多系列的排序需求超出单 mark。

plot-design §3.3 列的 transform（filter / sort / groupBy / aggregate / bin / stack / cumulative / dodge / derive）是个大集合。alpha.3 只做**堆叠柱所需的最小集**。

**关于 groupBy**：roadmap 列了 `sort / groupBy / stack`。但**无 aggregate 时，groupBy 自身不改变平表**（分组只是「按某字段切片」的视角），做成独立 transform op 会产出嵌套结构、破坏「transform 结果仍是 JSON 平表」（§3.3）。主流库（Vega-Lite / d3）也都把 groupBy 当 **aggregate / stack 的参数**而非独立算子。故本 ADR：**transform op = sort + stack**，**groupBy 作为 stack 的 `groupBy` 字段**（以及 [ADR-05](./05-relation.md) relation 的系列字段）统一承载——roadmap 的「groupBy」由这层落地，待 aggregate 进场（后续）再视需要升为独立 op。

## 决策：PlotSpec 加可选 `transform` 数组（有序管线），lowering 在 scale 域推断前依次应用；首批 sort / stack，纯行→行

`PlotSpecSchema` 顶层加 `transform?`：一个**有序的 transform op 数组**，每个 op 是按 `kind` 判别的纯函数 `rows → rows`（可派生新字段，不引入数据值进 IR——IR 只存声明，数据仍走 `lowerPlots(datasets)`）。`expandPlot` 在「取 rows」之后、「scale 域推断 / mark 下沉」之前，按数组顺序折叠应用。首批两种：

- **sort**：按字段升 / 降序重排行。
- **stack**：按 `groupBy`（系列字段）在每个 `x`（分组键）内对 `y`（数值字段）累加，给每行派生 `y0` / `y1`（写到可配置的输出字段，默认 `y0` / `y1`），供堆叠 mark 消费。

```ts
// packages/plot/plot/src/ir/transform.ts（新建）
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/** transform 类型关键字（暴露给用户；裸 'sort' / 'stack' 同样可用；后续加 filter / aggregate / bin…） */
export const PlotTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 堆叠：每个 x 分组内按系列累加，派生 [y0, y1] */
  Stack: 'stack',
} as const;
export type TransformType = ValueOf<typeof PlotTransform>;

export const SortTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Sort).describe('Discriminator: reorder rows by a field'),
    field: z.string().min(1).describe('Field path the rows are ordered by'),
    order: z.enum(['ascending', 'descending']).optional().describe('Sort direction; default ascending'),
  })
  .describe('Sort transform: stable reorder of the data rows by one field');

export const StackTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Stack).describe('Discriminator: cumulative stacking within each x group'),
    x: z.string().min(1).describe('Grouping key field: rows sharing this value stack together (the categorical axis field)'),
    y: z.string().min(1).describe('Numeric value field that is accumulated within each x group'),
    groupBy: z.string().min(1).describe('Series field: ordering of series within each stack (one stacked segment per distinct value)'),
    startField: z.string().min(1).optional().describe('Output field for the lower bound of each segment; default "y0"'),
    endField: z.string().min(1).optional().describe('Output field for the upper bound of each segment; default "y1"'),
  })
  .describe('Stack transform: within each x group, accumulate y across series and derive [start, end] bounds per row');

export const TransformSchema = z
  .discriminatedUnion('kind', [SortTransformSchema, StackTransformSchema])
  .describe('Data transform op applied before scale / mark; ordered pipeline. First batch: sort / stack');

export type Transform = z.infer<typeof TransformSchema>;
```

```ts
// PlotSpecSchema 加槽位（非破坏 optional）
transform: z
  .array(TransformSchema)
  .optional()
  .describe('Ordered data-transform pipeline applied to the bound dataset before scale inference and mark lowering; omit for no transform'),
```

理由：

1. **堆叠无法绕过 transform**：`y0/y1` 是数据派生量，必须在 mark 之前算出；放进 mark 会把「怎么堆」揉进 mark 几何（违背 §3.8 relation 与 mark 解耦）。transform 作为独立管线段是 grammar of graphics 的标准位置。
2. **纯行→行、JSON 平表**：每个 op `rows → rows`，stack 仅**派生标量字段**（y0/y1），不嵌套——守住 §3.3「transform 结果仍是 JSON 可序列化数据表」。数据值不进 IR（只存 op 声明）。
3. **有序数组 = 可组合管线**：sort 后再 stack、或 stack 后排序，由数组顺序显式表达，符合 Vega-Lite transform 列表直觉。
4. **groupBy 收为参数不另立 op**：避免「无 aggregate 的 groupBy」产出嵌套 / 空操作；系列分组的唯一真源是 stack.`groupBy` 与 relation 的系列字段（[ADR-05](./05-relation.md)），不重复。

## 待决策点

- **transform 应用位置**：在 `expandPlot` **取 rows 后、域推断前**统一应用一次，产出 `transformedRows`，后续 scale / mark 全用它。stack 派生的 y0/y1 进入 y 域推断（保证 range 容得下堆叠总高）。
- **stack 的 x/y/groupBy 三字段 vs 复用 encoding**：选 **transform 内显式三字段**（self-contained，transform 不反查 mark encoding）。代价：与 bar 的 encoding 字段重复书写——DSL（[ADR-07](./07-bindings-dsl.md)）可由 `<BarMark stack>` 自动装配 transform，免用户手写。
- **stack 累加顺序**：每个 x 组内按 **`groupBy` 值的全局出现顺序**累加（与 [ADR-01](./01-band-scale.md) 分类域同口径，保序）；可被前置 sort 改变。负值堆叠 / 居中堆叠（streamgraph）留后续。
- **stack 行缺值（拍板——评审 P1-4）**：缺 `y` 字段 / 非有限值的行**按 0 计入累加**（零高段、占位不错位），**不跳过**。下游 bar 若 `arrangement:'stack'` 却整行无 y0/y1（未跑本 transform）由 [ADR-05](./05-relation.md) lowering **抛清晰错误**——两 ADR 行为对齐、不留实现时再定。
- **stack 输出字段名**：默认 `y0` / `y1`，可经 `startField` / `endField` 改（避免与用户数据字段撞名）。bar mark 读这两字段判定「堆叠模式」（[ADR-05](./05-relation.md)）。
- **sort 稳定性**：用稳定排序（保持等键原序）；`order` 省略 = ascending。比较走 alpha.1 `compareByPath` 的同一套（数值 / 字符串通用）。
- **filter / aggregate / bin**：**不在** alpha.3（无聚合需求闭环）；进场时加 union 成员，非破坏。

## DSL 表面

> `<BarMark stack>` 自动装配 stack transform 在 [ADR-07](./07-bindings-dsl.md)。schema / vanilla 视角：

```ts
import { TransformSchema } from '@retikz/plot';

// 按月升序
TransformSchema.parse({ kind: 'sort', field: 'month' });
// 按月分组、对 revenue 堆叠不同 product 系列 → 每行得 y0/y1
TransformSchema.parse({ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' });

// 进 PlotSpec：transform 在 marks 之外、先于绘制
// { ..., transform:[{ kind:'stack', x:'month', y:'revenue', groupBy:'product' }], marks:[...] }
```

## 测试设计

`packages/plot/plot/tests/ir/transform.schema.test.ts`（新建）+ `tests/lower/transform.test.ts`（新建）覆盖：sort/stack schema accept/reject；sort 升 / 降 / 稳定；stack 派生 y0/y1（单组、多系列、累加正确、首段 y0=0）；多 op 管线顺序；空 rows；缺字段行。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/transform.ts`**（新建）：`PlotTransform` + `SortTransformSchema` / `StackTransformSchema` / `TransformSchema` + 类型。
- **`packages/plot/plot/src/ir/plot.ts`**（修改）：`PlotSpecSchema` 加 `transform?` 槽位。非破坏。
- **`packages/plot/plot/src/lower/transform.ts`**（新建）：`applyTransforms(rows, ops) → rows` 折叠器 + sort / stack 实现。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：取 rows 后先 `applyTransforms`，域推断 / mark 用变换后的行。
- **对外 API**：`@retikz/plot` 公开 `TransformSchema` / 子 schema / `PlotTransform`。
- **对 core**：无（transform 是 plot domain，IR 仍纯 JSON）。注意与 core 的 `TransformSchema`（几何 transform，`packages/core/core/src/ir/transform.ts`）**同名不同物**——plot 的是数据 transform，命名空间隔离（各自包内），不冲突。
- **被消费**：[ADR-05](./05-relation.md) 的堆叠柱读 y0/y1；[ADR-02](./02-interval-mark.md) baseline 从 0 推广到 y0。
- **文档**：transform 概念页（[ADR-07](./07-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **filter / aggregate / bin / normalize / cumulative / dodge transform** → 后续（dodge 的并排是 [ADR-05](./05-relation.md) 的 mark 几何，非 transform）。
- **groupBy 独立 op**（需 aggregate 才有意义）→ 后续。
- **堆叠 mark 几何**（读 y0/y1 画堆叠柱）→ [ADR-05](./05-relation.md)；本 ADR 只产数据。
- **居中 / 百分比堆叠（streamgraph / normalize）** → 后续。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（transform schema + PlotSpec 槽位）+ `src/lower/**`（管线段）→ red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/transform.ts` | 新建常量 | `PlotTransform` | `{ Sort:'sort', Stack:'stack' } as const` | — | transform 类型判别值集 |
| `src/ir/transform.ts` | 新建 schema | `SortTransformSchema` | `z.object({ kind:'sort', field, order? })` | — | 按字段排序 |
| `src/ir/transform.ts` | 新建字段 | `SortTransformSchema.order` | `z.enum(['ascending','descending']).optional()` | undefined（ascending） | 排序方向 |
| `src/ir/transform.ts` | 新建 schema | `StackTransformSchema` | `z.object({ kind:'stack', x, y, groupBy, startField?, endField? })` | — | 堆叠派生 y0/y1 |
| `src/ir/transform.ts` | 新建字段 | `StackTransformSchema.startField` | `z.string().min(1).optional()` | undefined（"y0"） | 下界输出字段 |
| `src/ir/transform.ts` | 新建字段 | `StackTransformSchema.endField` | `z.string().min(1).optional()` | undefined（"y1"） | 上界输出字段 |
| `src/ir/transform.ts` | 新建 union | `TransformSchema` | `z.discriminatedUnion('kind',[Sort,Stack])` | — | transform op union |
| `src/ir/plot.ts` | 加字段 | `PlotSpecSchema.transform` | `z.array(TransformSchema).optional()` | undefined | 有序数据变换管线，省略=无 |

### 文件 scope

- `packages/plot/plot/src/ir/transform.ts`（新建）
- `packages/plot/plot/src/ir/plot.ts`（修改：加 transform 槽位 + import）
- `packages/plot/plot/src/ir/index.ts`（修改：补导出）
- `packages/plot/plot/src/lower/transform.ts`（新建：applyTransforms + sort/stack）
- `packages/plot/plot/src/lower/expand.ts`（修改：取 rows 后应用 transform）
- `packages/plot/plot/tests/ir/transform.schema.test.ts`（新建）
- `packages/plot/plot/tests/lower/transform.test.ts`（新建）

### 测试象限

**Happy path**：

- `sort_schema_valid` / `stack_schema_valid`：合法 op → 通过
- `sort_ascending`：`{kind:'sort',field:'m'}` → 行按 m 升序
- `stack_two_series`：2 系列 × 2 类别 → 每行得 y0/y1，同组内 y1 累加、段衔接（前段 y1 = 后段 y0）
- `stack_first_segment_zero`：每组首系列 y0=0

**边界**：

- `sort_descending`：`order:'descending'` → 降序
- `sort_stable`：等键行保持原相对序
- `stack_single_series`：单系列 → y0=0、y1=value（等价非堆叠）
- `stack_empty_rows`：空 rows → 空 rows（不崩）
- `transform_empty_pipeline`：`transform:[]` / 省略 → rows 原样

**错误路径**：

- `transform_unknown_kind_rejected`：`{kind:'filter',...}` → 拒（union 暂无 filter）
- `sort_missing_field_rejected` / `stack_missing_y_rejected`：缺必填 → 拒
- `stack_missing_field_row`：某行缺 y 字段 / 非有限 → **按 0 计入累加**（产生零高段，**不跳过**——跳过会让后续系列累加错位）

**交互**：

- `pipeline_order_sort_then_stack`：先 sort 后 stack，结果反映排序后的累加序
- `stack_feeds_y_domain`：stack 的 y1 最大值进入 y 域推断（range 容得下堆叠总高）—— [ADR-05](./05-relation.md) 前置
- `stack_custom_output_fields`：`startField:'lo'` → 派生到 `lo`/`hi`，不污染默认 y0/y1

### 依赖现有元素

- alpha.1 `compareByPath`（`lower/field.ts`）—— **复用**：sort / stack 的字段取值与比较。
- alpha.1 `channelValue` / `isFiniteNumber`（`lower/field.ts`）—— **复用**：stack 累加取数值。
- alpha.1 `expandPlot`（`lower/expand.ts`）—— **修改**：插入 transform 段。
- [alpha.1 ADR-06 lowering](../v0.1-alpha.1/06-plot-lowering.md) —— **回溯**：rows 流向从「直用」变「先 transform」。

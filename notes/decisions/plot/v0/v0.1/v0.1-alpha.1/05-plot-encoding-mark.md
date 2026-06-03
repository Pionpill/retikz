# ADR-05：Plot 编码与图元（Channel / Encoding + Point / Line / Mark union）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.7 mark / §3.8 order](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 依赖：[ADR-02 data](./02-plot-data.md) · 关联：[ADR-04 coordinate](./04-plot-coordinate.md)

## 背景

[根节点（ADR-01）](./01-plot-spec-root.md)的 `marks` 槽位是图层数组，每层一个 mark（图元）。mark 是图形语法的输出端：把数据行画成可见几何（点 / 线 / ……）。每个 mark 带一份 `encoding`——声明各视觉通道（x / y / ……）绑定到哪个数据字段或常量。

mark 与 encoding 在结构上耦合（`MarkSchema` 每个变体都内嵌 `encoding`），故合一个 ADR。位置通道（x / y）的 scale 由 coordinate 持有（[ADR-04](./04-plot-coordinate.md)），所以 channel 本身**不带 scale 引用**——这是 [ADR-04](./04-plot-coordinate.md) 决策的直接后果。

两点接 [ADR-02](./02-plot-data.md)（数据不进 IR）：① `ChannelSchema.field` 是**路径 accessor** `'a.b.c'`，对**外部数据行**（`ExternalRow`，任意 JS、可嵌套）解析，解析后须落到标量；② `ChannelSchema.value`（常量通道，确实进 IR）复用 `ScalarValueSchema`。故本 ADR **依赖 ADR-02**。

alpha.1 仅 `point` / `line` 两种 mark；mark 设计成 discriminated union，为 alpha.3 的 interval(bar) / area / sector / rule / text 预留。

## 决策：channel = field/value 二选一；mark = point/line union，内嵌 encoding，可挂 id

**Channel**：一个通道绑定到「数据字段」（`field`）或「常量」（`value`），二选一（refine 互斥）。**Encoding**：位置通道 `x` / `y`，各可选，各是一个 channel。位置通道不带 scale 引用（scale 归 coordinate）。

**Mark**：共享 `markBase`（可选 `id` 预留 handle + 必填 `encoding`）。`point` 一行一个 glyph；`line` 把记录按顺序连成路径，带可选 `order`（连接顺序字段，省略 = 数据数组顺序）。

```ts
// packages/plot/plot/src/ir/encoding.ts
import { ScalarValueSchema } from './data'; // ADR-02

export const ChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Path accessor into a data row bound to this channel (e.g. "month" or "user.age"); resolved against the externally-supplied dataset at lowering and must yield a scalar'),
    value: ScalarValueSchema.optional().describe('Constant scalar literal for this channel (mutually exclusive with field)'),
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
import type { ValueOf } from '@retikz/core';

/** mark 类型判别值集（const 对象 + 派生类型；后续加 bar / area / sector / rule / text…） */
export const MARK_TYPES = { point: 'point', line: 'line' } as const;
export type MarkType = ValueOf<typeof MARK_TYPES>;

const markBase = {
  id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional mark handle; reserved scope/anchor target (resolution deferred to alpha.5)'),
  encoding: EncodingSchema,
};

export const PointMarkSchema = z
  .object({ type: z.literal(MARK_TYPES.point).describe('Discriminator: one glyph per record'), ...markBase })
  .describe('Point mark: scatter / dot');

export const LineMarkSchema = z
  .object({
    type: z.literal(MARK_TYPES.line).describe('Discriminator: ordered points connected by a path'),
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

export type Channel = z.infer<typeof ChannelSchema>;
export type Encoding = z.infer<typeof EncodingSchema>;
export type Mark = z.infer<typeof MarkSchema>;
```

理由：

1. **field / value 互斥**：一个通道要么数据驱动（`field` 路径取外部数据）、要么常量（`value` 进 IR），二者并存无意义（refine 强制 exactly-one）；`value` 复用 [ADR-02](./02-plot-data.md) `ScalarValue` 保证常量与「字段解析后的标量」同一定义。
2. **位置通道不带 scale 引用**：scale 归 coordinate（[ADR-04](./04-plot-coordinate.md)），mark 只声明「绑哪个字段」，语义不与 coordinate 重叠。非位置通道（自带 scale）留 alpha.3 在 channel 加 `scale`（非破坏）。
3. **marks 顺序 = z-order**：图层按 `marks` 数组顺序绘制（稳定 z-order，复用 core IR 顺序语义）。该不变量由[根节点（ADR-01）](./01-plot-spec-root.md)的数组承载，本 ADR 的 mark 不需额外 z 字段。
4. **mark `id` 预留**：与根 `id`（[ADR-01](./01-plot-spec-root.md)）独立，alpha.5 才解析为 scope / anchor，alpha.1 仅校验。
5. **line.order 最简字符串**：alpha.1 用字段名表连接顺序；alpha.3 relation 完整化时升级为 `string | { field, descending? }`（非破坏）。
6. **union 可扩展**：discriminatedUnion 加 bar / area 等不破坏旧 IR。

## 待决策点

- **encoding / mark 是否拆**：本 milestone 决定**合一个 ADR**（mark 内嵌 encoding，耦合紧，单拆 encoding 会出现「定义了通道却无 mark 消费」的悬空）。
- **line 的 `order`**：用字段名（omit = 数据顺序）。备选显式 `{ field, descending? }`。alpha.1 倾向最简字符串，alpha.3 升级为 union（非破坏）。
- **mark 的 `meta`**：是否现在给 mark 加 `meta?`（datum locator 可能需要）？倾向 alpha.1 mark 只放 `id`，根放 `meta`，alpha.5 再按需补。
- **encoding 通道集**：alpha.1 仅 `x` / `y`，且都 optional。非位置通道（color / size / shape）→ alpha.3。
- **`field` 路径语法**：点路径 `'a.b.c'`（schema 仍是非空字符串，语义是 accessor）。`['k']` 转义、字段名含点号的歧义、解析规则归 [ADR-06](./roadmap.md) lowering。alpha.1 schema 即接受路径形态（与扁平名同为字符串，非破坏）；是否 alpha.1 lowering 就支持多层解析另议。

## DSL 表面

```ts
import { MarkSchema, EncodingSchema, ChannelSchema } from '@retikz/plot';

// 数据驱动通道（field 是路径 accessor，对外部数据行解析）
ChannelSchema.parse({ field: 'revenue' });
ChannelSchema.parse({ field: 'user.age' });   // 嵌套路径
// 常量通道（所有点固定 y=0，常量进 IR）
ChannelSchema.parse({ value: 0 });

// point mark
MarkSchema.parse({ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } });
// line mark，带连接顺序 + 预留 id
MarkSchema.parse({ type: 'line', id: 'trend', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } });
```

## 测试设计

`packages/plot/plot/tests/ir/encoding.schema.test.ts` + `mark.schema.test.ts`（新建）覆盖：

- 合法 point / line（带 / 不带 order / id）、常量通道、null 常量通过；
- channel 同时给 field+value、两者都不给 被拒；
- 未知 mark type、缺 type 被拒；
- 多 mark 各自 encoding 互不依赖。

具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/encoding.ts`**（全新）：`ChannelSchema` / `EncodingSchema` + 类型。
- **`packages/plot/plot/src/ir/mark.ts`**（全新）：`PointMarkSchema` / `LineMarkSchema` / `MarkSchema` + `Mark` 类型。
- **`packages/plot/plot/src/ir/index.ts`**：补充导出 encoding / mark schema 与类型。
- **依赖**：[ADR-02](./02-plot-data.md) `ScalarValueSchema`（channel 常量）+ `ExternalRow`（`field` 路径解析目标，运行时）。
- **被引用**：[ADR-01](./01-plot-spec-root.md) `marks` 槽位用 `z.array(MarkSchema).min(1)`。
- **对外 API**：`@retikz/plot` 公开 `ChannelSchema` / `EncodingSchema` / `PointMarkSchema` / `LineMarkSchema` / `MarkSchema` 及类型。

## 不在本 ADR 范围

- **interval(bar) / area / sector / rule / text mark** → alpha.3。
- **非位置通道（color / size / shape）及其 channel `scale` 字段** → alpha.3。
- **relation：完整 order / group / stack**（`order` 升级为对象）→ alpha.3。
- **mark `id` 的 anchor / scope 解析、datum locator** → alpha.5。
- **encoding → 几何的 lowering** → ADR-06。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**` → red。本 ADR 自评 level：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/encoding.ts` | 新建 schema | `ChannelSchema` | `z.object({ field?, value? }).refine(exactly-one)` | — | 通道绑定；field/value 互斥 |
| `packages/plot/plot/src/ir/encoding.ts` | 新建字段 | `ChannelSchema.field` | `z.string().min(1).optional()` | undefined | 路径 accessor（`'a.b.c'`），对外部数据行解析、须得标量 |
| `packages/plot/plot/src/ir/encoding.ts` | 新建字段 | `ChannelSchema.value` | `ScalarValueSchema.optional()`（ADR-02） | undefined | 常量标量字面量（与 field 互斥） |
| `packages/plot/plot/src/ir/encoding.ts` | 新建 schema | `EncodingSchema` | `z.object({ x?: ChannelSchema, y?: ChannelSchema })` | — | mark 通道绑定（位置通道，无 scale 引用） |
| `packages/plot/plot/src/ir/mark.ts` | 新建字段（markBase） | `<mark>.id` | `z.string().min(1).optional()` | undefined | mark handle；预留 scope/anchor（解析 alpha.5） |
| `packages/plot/plot/src/ir/mark.ts` | 新建字段（markBase） | `<mark>.encoding` | `EncodingSchema` | — | mark 通道绑定 |
| `packages/plot/plot/src/ir/mark.ts` | 新建常量 | `MARK_TYPES` | `{ point:'point', line:'line' } as const`（派生 `MarkType`） | — | mark 类型判别值集（const 对象 + 派生类型，AGENTS.md 规则） |
| `packages/plot/plot/src/ir/mark.ts` | 新建 schema | `PointMarkSchema` | `z.object({ type:z.literal(MARK_TYPES.point), id?, encoding })` | — | 点 mark |
| `packages/plot/plot/src/ir/mark.ts` | 新建 schema | `LineMarkSchema` | `z.object({ type:z.literal(MARK_TYPES.line), id?, order?, encoding })` | — | 线 mark |
| `packages/plot/plot/src/ir/mark.ts` | 新建字段 | `LineMarkSchema.order` | `z.string().min(1).optional()` | undefined | 连接顺序字段，省略→数据顺序 |
| `packages/plot/plot/src/ir/mark.ts` | 新建 schema | `MarkSchema` | `z.discriminatedUnion('type', [PointMarkSchema, LineMarkSchema])` | — | mark union（可扩展） |

### 文件 scope

- `packages/plot/plot/src/ir/encoding.ts`（新建）
- `packages/plot/plot/src/ir/mark.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（修改：补充 encoding / mark 导出）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（新建）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（新建）

### 测试象限

> 本 milestone 放宽「每 ADR ≥ 9 case」，按复杂度适量。encoding+mark 复杂度较高，取较全。

**Happy path**：

- `mark_point_valid`：point + x/y field encoding → 通过
- `mark_line_with_order_valid`：line + `order` + encoding → 通过
- `channel_field_valid` / `channel_value_valid`：field 版与 value 版 channel 各通过
- `channel_value_null_valid`：`{ value: null }` → 通过（null 是合法 ScalarValue）
- `channel_field_path_valid`：`{ field: 'user.age' }` → 通过（路径形态即非空字符串）

**边界**：

- `mark_line_omits_order_valid`：line 省略 `order` → 通过（默认数据顺序）
- `mark_id_optional_valid`：mark 带 / 不带 `id` 两版 → 都通过

**错误路径**：

- `channel_both_field_and_value_rejected`：`{ field:'x', value:1 }` → 拒（refine 互斥）
- `channel_neither_field_nor_value_rejected`：`{}` → 拒（refine 互斥）
- `mark_unknown_type_rejected`：`{ type:'bar', ... }`（alpha.1 未纳入）→ 拒（discriminatedUnion）
- `mark_missing_type_rejected`：缺 `type` → 拒

**交互**：

- `marks_distinct_encoding_valid`：两 mark（line + point）各自 encoding 绑不同 field → 都通过（encoding 互不依赖）
- `channel_value_uses_scalar`：channel `value` 给嵌套对象 → 拒（复用 ADR-02 `ScalarValue` 标量约束，验证依赖正确接入）

### 依赖现有元素

- `zod` —— **引用**。
- `@retikz/core` 的 `ValueOf`（`packages/core/core/src/types.ts`，包根 re-export）—— **引用**：派生 `MarkType`。
- [ADR-02 `ScalarValueSchema`](./02-plot-data.md)（位于 `packages/plot/plot/src/ir/data.ts`）—— **引用**：`ChannelSchema.value` 复用它；`field` 路径运行时解析 `ExternalRow`。实现顺序上 ADR-02 先于本 ADR。
- [ADR-04 coordinate 决策](./04-plot-coordinate.md) —— **约束来源**：因 coordinate 持有位置 scale，本 ADR 的位置通道不带 scale 引用（无代码依赖，仅设计约束）。

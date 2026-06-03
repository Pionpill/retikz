# ADR-02：Plot 数据结构（DatumValue / Datum / PlotData）

- 状态：Proposed
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 核心概念](../../../../../architecture/plot-design.md) · 根容器：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 消费方：[ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景

Plot IR 的 [根容器（ADR-01）](./01-plot-spec-root.md)有一个 `data` 槽位，承载 mark 要绘制的原始数据。本 ADR 定义这块数据的形态——单元格、行记录、数据集三层。

数据是图形语法的输入端：encoding（[ADR-05](./05-plot-encoding-mark.md)）的 channel 通过字段名 / 常量引用它。alpha.1 只需「绘制就绪」的扁平表格（transform / 聚合留到 alpha.3），所以数据形态要尽量简单、JSON 可序列化、对 LLM 扁平友好。

`DatumValueSchema` 还被 [ADR-05](./05-plot-encoding-mark.md) 的 `ChannelSchema.value`（常量通道）复用——它是「一个数据标量」的统一定义，故归在本 ADR、由 encoding ADR 引用。

## 决策：扁平表格——`{ values: Datum[] }`，单元格仅标量

数据是扁平表格：行记录（`Datum`）的数组，单元格（`DatumValue`）只能是标量（`string` / `number` / `boolean` / `null`），不嵌套对象 / 数组 / 函数。数据集用对象 `{ values }` 包裹（而非裸数组），以便后续非破坏地加 `ref` 变体（外部数据源）。

```ts
// packages/plot/plot/src/ir/data.ts
export const DatumValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('A single data cell: scalar only (string/number/boolean/null), keeps rows JSON-serializable & LLM-flat');

export const DatumSchema = z.record(DatumValueSchema).describe('One data record: field name → scalar cell');

export const PlotDataSchema = z
  .object({
    values: z.array(DatumSchema).describe('Inline rows; large/dynamic datasets use a ref variant in a later version'),
  })
  .describe('Inline dataset (alpha.1). Object wrapper (not bare array) so a `ref` variant can be added non-breakingly later.');

export type Datum = z.infer<typeof DatumSchema>;
export type DatumValue = z.infer<typeof DatumValueSchema>;
export type PlotData = z.infer<typeof PlotDataSchema>;
```

理由：

1. **标量单元格 = JSON 可序列化 + LLM 扁平**：禁嵌套对象 / 数组 / 函数，保证 Plot IR 100% JSON 可序列化（core-design §4.4），也让模型生成的数据行不歧义。
2. **对象包裹便于非破坏扩展**：`{ values }` 而非 `Datum[]`，未来加 `{ ref: '...' }`（外部数据源 / 大数据采样）无需破坏既有 IR。
3. **`DatumValue` 单一来源**：常量通道（[ADR-05](./05-plot-encoding-mark.md)）与单元格共用同一标量定义，避免「什么算合法标量」两处漂移。

## 待决策点

- **`data` 形态**：`{ values: Datum[] }` 内联对象。备选直接 `Datum[]`。倾向对象包裹，便于非破坏加 `ref`。
- **空数据**：`data.values: []` 是否在 schema 层放行？倾向**放行**——空数据是 [ADR-06](./roadmap.md) lowering 的边界（画空图 / 报错由 lowering 决定），不是 schema 的拒绝项。
- **`null` 单元格**：保留为合法 `DatumValue`（缺测 / 空值语义）。consumer（scale / lowering）如何处理 null 留后续。

## DSL 表面

```ts
import { PlotDataSchema } from '@retikz/plot';

// 多列扁平表格
PlotDataSchema.parse({
  values: [
    { month: 0, revenue: 10, region: 'east' },
    { month: 1, revenue: 14, region: 'east' },
    { month: 2, revenue: null, region: 'west' }, // null 合法（缺测）
  ],
});

// 空数据集（schema 放行，lowering 才决定怎么处理）
PlotDataSchema.parse({ values: [] });
```

## 测试设计

`packages/plot/plot/tests/ir/data.schema.test.ts`（新建）覆盖：

- 合法多列 / 单行 / 空数组 / 含 null 的数据集通过；
- 嵌套对象 / 数组 / 函数 / undefined 单元格被拒；
- `values` 缺失被拒。

具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/data.ts`**（全新）：三 schema + 派生类型。
- **`packages/plot/plot/src/ir/index.ts`**：补充导出 data schema 与类型。
- **被引用**：[ADR-01](./01-plot-spec-root.md) `data` 槽位用 `PlotDataSchema`；[ADR-05](./05-plot-encoding-mark.md) `ChannelSchema.value` 用 `DatumValueSchema`。
- **对外 API**：`@retikz/plot` 公开 `DatumValueSchema` / `DatumSchema` / `PlotDataSchema` 及类型。

## 不在本 ADR 范围

- **external dataRef / 大数据采样**（`{ ref }` 变体）→ 后续；alpha.1 仅内联 `values`。
- **transform（filter / sort / groupBy / stack）** → alpha.3（alpha.1 数据已是绘制就绪形态）。
- **空数据 / null 的 lowering 处理** → ADR-06。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（新建 Plot IR schema）→ red。本 ADR 自评 level：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `DatumValueSchema` | `z.union([string, number, boolean, null])` | — | 单元格标量 |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `DatumSchema` | `z.record(DatumValueSchema)` | — | 一行记录（字段名 → 标量） |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `PlotDataSchema` | `z.object({ values: z.array(DatumSchema) })` | — | 内联数据集；对象包裹便于后加 ref |

### 文件 scope

- `packages/plot/plot/src/ir/data.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（修改：补充 data 导出）
- `packages/plot/plot/tests/ir/data.schema.test.ts`（新建）

### 测试象限

> 本 milestone 放宽「每 ADR ≥ 9 case」，按复杂度适量。data 复杂度低。

**Happy path**：

- `data_multi_column_valid`：多列多行 → 通过
- `data_single_datum_valid`：仅 1 行 → 通过
- `datum_value_null_valid`：单元格 `null` → 通过

**边界**：

- `data_empty_values_valid`：`values: []` 空数组 → 通过（空数据是 lowering 的边界，非 schema 拒绝项）

**错误路径**：

- `datum_nested_object_cell_rejected`：单元格 `{ nested: 1 }` → 拒（仅标量）
- `datum_array_cell_rejected`：单元格 `[1, 2]` → 拒
- `datum_function_cell_rejected`：单元格函数 / `undefined` → 拒（非 JSON 值）
- `data_missing_values_rejected`：缺 `values` 键 → 拒

### 依赖现有元素

- `zod` —— **引用**。
- 无 plot / core 既有元素依赖（本 ADR 是数据层基座，被 [ADR-01](./01-plot-spec-root.md) / [ADR-05](./05-plot-encoding-mark.md) 依赖，不反向依赖它们）。

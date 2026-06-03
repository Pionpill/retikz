# ADR-02：Plot 数据引用与数据模型（DataRef / DataModel + 外部数据契约）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 核心概念 / §8 lowering](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 消费方：[ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景

[根节点（ADR-01）](./01-plot-spec-root.md)有一个 `data` 槽位。**关键前提：数据不进 IR**（[plot-design §3](../../../../../architecture/plot-design.md)）——一张图拆成 ① IR（配置）② 外部数据（任意 JS，单独存）③ 绑定函数。把数据集内联进 IR 会让体积随数据量爆炸、拖垮持久化与 LLM 生成。

因此本 ADR 定义**两类东西，分属两个世界**：

1. **进 IR 的**：`data` 槽位的形态——一个**具名数据引用** `ref` + 一份**可选数据模型** `model`（字段名 + 类型声明）。这是 JSON-safe 的 IR 内容。
2. **不进 IR 的**：**外部数据契约**——运行时喂给 `lowerPlots(datasets)` 的数据长什么样、encoding 怎么按 `a.b.c` 路径访问它。外部数据是任意 JS（可嵌套），**不受 IR 的 100% JSON 约束**，因为它从不进 IR；只有绑定函数从中**抽出的标量**才进 lowered core IR。

`ScalarValueSchema`（标量）也在本 ADR 定义并被 [ADR-05](./05-plot-encoding-mark.md) 的 `ChannelSchema.value`（常量通道字面量，**确实进 IR**）复用——它是「一个标量值」的统一定义。

## 决策：IR 持 `{ ref, model? }`；外部数据任意 JS，经路径 accessor 抽标量

**进 IR（`DataRefSchema`）**：`data = { ref: string, model?: DataModel }`。`ref` 是具名数据集名（编译期 `lowerPlots(datasets)` 按名查），`model` 可选——给了就声明字段名与类型（quantitative / nominal / ordinal / temporal），用于校验 encoding 引用、推 scale 类型、让 LLM 不看数据即知字段；不给则绑定期从外部数据推断。

**不进 IR（外部数据契约）**：`datasets` 是 `Record<string, Array<Row>>`，`Row` 是**任意 JS 对象**（可嵌套对象 / 数组）。encoding 的 `field`（[ADR-05](./05-plot-encoding-mark.md)）是**路径 accessor** `'a.b.c'`，对 `Row` 解析；**解析后必须落到一个标量**（`ScalarValue`）才能喂 scale——嵌套对象本身不能直接编码成位置。外部数据**没有 IR zod schema**（运行时校验策略归 [ADR-06](./roadmap.md)）。

```ts
// packages/plot/plot/src/ir/data.ts
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/** 字段类型：grammar-of-graphics 标准集；alpha.1 lowering 仅消费 quantitative（linear scale） */
export const FIELD_TYPES = {
  quantitative: 'quantitative',
  nominal: 'nominal',
  ordinal: 'ordinal',
  temporal: 'temporal',
} as const;
export type FieldType = ValueOf<typeof FIELD_TYPES>;

export const FieldDefSchema = z.object({
  name: z.string().min(1).describe('Field name as referenced by encoding channels (a path accessor like "a.b.c")'),
  type: z.nativeEnum(FIELD_TYPES).describe('Field measurement type; drives default scale selection at lowering (alpha.1 consumes quantitative)'),
});

export const DataModelSchema = z
  .array(FieldDefSchema)
  .describe('Optional declaration of the external data fields and their types; enables encoding validation + scale-type inference without seeing the data. Omit → inferred from the bound dataset at lowering.');

export const DataRefSchema = z
  .object({
    ref: z.string().min(1).describe('Name of an externally-supplied dataset; resolved against lowerPlots(datasets) at compile time. The dataset VALUES never enter the IR.'),
    model: DataModelSchema.optional().describe('Optional data model (field declarations); see DataModelSchema'),
  })
  .describe('Data binding stored in the IR: a named dataset reference plus an optional model. Carries NO data values (plot-design §3).');

/** 标量值：scale 映射的输入、channel 常量字面量（进 IR 的字面量需 JSON-safe 标量） */
export const ScalarValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('A single scalar value: string / number / boolean / null. The leaf a field path must resolve to, and the literal type of a constant channel.');

export type FieldDef = z.infer<typeof FieldDefSchema>;
export type DataModel = z.infer<typeof DataModelSchema>;
export type DataRef = z.infer<typeof DataRefSchema>;
export type ScalarValue = z.infer<typeof ScalarValueSchema>;

/** 外部数据契约（不进 IR，运行时经 lowerPlots 注入；Row 为任意 JS，可嵌套，field 路径解析后须为标量） */
export type ExternalRow = Record<string, unknown>;
export type ExternalDatasets = Record<string, Array<ExternalRow>>;
```

理由：

1. **数据不进 IR**：IR 只存 `ref` + 可选 `model`，体积随配置而非数据量；外部数据经 `lowerPlots(datasets)` 闭包注入（对齐 core「函数 / 数据走 `CompileOptions`、不进 IR」哲学）。
2. **具名引用**：`ref` 让多 mark / 未来 facet / 多数据源都能按名共享或区分数据集（Vega-Lite named datasets 风）。
3. **外部数据任意 JS + 路径 accessor**：外部数据不受 IR JSON 约束，可直接喂 API 返回的嵌套 JSON，`field: 'user.age'` 取值；只有抽出的标量进 lowered IR，IR 仍 100% JSON-safe。
4. **`model` 可选**：给了增强（校验 / 推类型 / LLM 友好），不给保持最小 spec 可跑——类型绑定期推断。
5. **`ScalarValue` 单一来源**：scale 输入、channel 常量字面量共用同一标量定义，避免「什么算合法标量」两处漂移。

## 待决策点

- **`field` 路径语法**：`'a.b.c'` 点路径（含 `['k']` 转义 / 字段名含点号的歧义处理）。schema 定义在 [ADR-05](./05-plot-encoding-mark.md)，解析语义归 [ADR-06](./roadmap.md)。alpha.1 是否先只支持扁平名、点路径推迟？倾向 alpha.1 即支持点路径（非破坏，扁平名是其子集）。
- **`FieldType` 取值集**：quantitative / nominal / ordinal / temporal。alpha.1 lowering 只用 quantitative；其余先入 schema、lowering 留 alpha.3。备选 alpha.1 只放 quantitative，后续非破坏加。倾向先放全集（纯枚举，零成本）。
- **外部数据运行时校验**：是否对 `datasets` 做运行时形状校验（如 `ref` 存在、行非空）？倾向**不在 schema 层**，归 [ADR-06](./roadmap.md) lowering 按需校验（缺 `ref` 数据集 / 空数据如何处理是 lowering 的边界）。
- **`model` 与实际数据不一致**：声明了 `model` 但外部数据缺字段 / 类型不符——校验时机归 ADR-06；本 ADR 只定 schema。

## DSL 表面

```ts
import { DataRefSchema } from '@retikz/plot';

// 进 IR：具名引用 + 可选模型（无值）
DataRefSchema.parse({ ref: 'sales' });                                  // 最小：仅 ref
DataRefSchema.parse({
  ref: 'sales',
  model: [
    { name: 'month', type: 'quantitative' },
    { name: 'user.age', type: 'quantitative' }, // 路径字段也可声明
    { name: 'region', type: 'nominal' },
  ],
});

// 不进 IR：外部数据任意 JS（可嵌套），编译期注入；field 'user.age' 解析到标量
// const datasets = { sales: [{ month: 0, user: { age: 30 }, region: 'east' }, ...] };
// compileToScene(plotIR, { composites: lowerPlots(datasets) });   // ADR-06
```

## 测试设计

`packages/plot/plot/tests/ir/data.schema.test.ts`（新建）覆盖**进 IR 的部分**（DataRef / DataModel / ScalarValue）；外部数据无 IR schema，其解析 / 校验测试归 ADR-06：

- 合法 `{ ref }` / `{ ref, model }` 通过；
- 缺 `ref`、空 `ref`、`data.values`（旧内联形态）被拒；
- `model` 字段类型枚举校验；
- `ScalarValue` 接受标量、拒嵌套 / 函数。

具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/data.ts`**（全新）：`DataRefSchema` / `DataModelSchema` / `FieldDefSchema` / `ScalarValueSchema` + 派生类型 + 外部数据 TS 契约类型。
- **`packages/plot/plot/src/ir/index.ts`**：补充导出 data schema 与类型。
- **被引用**：[ADR-01](./01-plot-spec-root.md) `data` 槽位用 `DataRefSchema`；[ADR-05](./05-plot-encoding-mark.md) `ChannelSchema.value` 用 `ScalarValueSchema`、`field` 路径对 `ExternalRow` 解析。
- **依赖**：`@retikz/core` 的 `ValueOf`（派生 `FieldType`）。
- **对外 API**：`@retikz/plot` 公开 `DataRefSchema` / `DataModelSchema` / `FieldDefSchema` / `ScalarValueSchema` / `FIELD_TYPES` 及类型。

## 不在本 ADR 范围

- **`field` 路径 accessor 的 schema**（点路径字符串）→ [ADR-05](./05-plot-encoding-mark.md)。
- **路径解析 / 标量抽取 / `model` 一致性校验 / `ref` 解析 / 空数据处理** → ADR-06 lowering。
- **transform（filter / sort / groupBy / stack / flatten）** → alpha.3。
- **external dataRef 的 url / 大数据采样**（这里 `ref` 是「内存具名数据集」名；远程加载 / 采样）→ 后续。
- **nominal / ordinal / temporal 的 lowering 消费**（alpha.1 只 quantitative）→ alpha.3。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（新建 Plot IR schema）→ red。本 ADR 自评 level：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/data.ts` | 新建常量 | `FIELD_TYPES` | `as const` 对象（quantitative/nominal/ordinal/temporal） | — | 字段类型枚举（ValueOf 派生 `FieldType`） |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `FieldDefSchema` | `z.object({ name, type })` | — | 字段声明：名 + 类型 |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `DataModelSchema` | `z.array(FieldDefSchema)` | — | 可选数据模型（字段声明数组） |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `DataRefSchema` | `z.object({ ref: string.min(1), model?: DataModelSchema })` | — | IR 数据槽位：具名引用 + 可选模型，**无值** |
| `packages/plot/plot/src/ir/data.ts` | 新建 schema | `ScalarValueSchema` | `z.union([string, number, boolean, null])` | — | 标量值；scale 输入 + channel 常量字面量 |

> 外部数据（`ExternalRow` / `ExternalDatasets`）是 **TS 类型契约、非 IR zod schema**（不进 IR，故不进本表的 schema 校验范畴）。

### 文件 scope

- `packages/plot/plot/src/ir/data.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（修改：补充 data 导出）
- `packages/plot/plot/tests/ir/data.schema.test.ts`（新建）

### 测试象限

> 本 milestone 放宽「每 ADR ≥ 9 case」，按复杂度适量。

**Happy path**：

- `dataref_ref_only_valid`：`{ ref: 'sales' }` → 通过
- `dataref_with_model_valid`：`{ ref, model: [{name,type}] }` → 通过
- `scalar_value_each_kind_valid`：string / number / boolean / null 各通过

**边界**：

- `dataref_empty_ref_rejected`：`{ ref: '' }` → 拒（`.min(1)`）
- `datamodel_empty_array_valid`：`model: []` → 通过（空模型合法，等价不声明）

**错误路径**：

- `dataref_missing_ref_rejected`：缺 `ref` → 拒
- `dataref_inline_values_rejected`：`{ values: [...] }`（旧内联形态、无 ref）→ 拒（数据不进 IR）
- `fielddef_unknown_type_rejected`：`type: 'geojson'` → 拒（枚举外）
- `scalar_value_nested_object_rejected`：`ScalarValueSchema.parse({ a: 1 })` → 拒（仅标量）

### 依赖现有元素

- `zod` —— **引用**。
- `@retikz/core` 的 `ValueOf`（`packages/core/core/src/types.ts`，包根 re-export）—— **引用**：派生 `FieldType`。
- 被 [ADR-01](./01-plot-spec-root.md)（`DataRefSchema`）与 [ADR-05](./05-plot-encoding-mark.md)（`ScalarValueSchema` + `field` 解析 `ExternalRow`）依赖，不反向依赖它们。

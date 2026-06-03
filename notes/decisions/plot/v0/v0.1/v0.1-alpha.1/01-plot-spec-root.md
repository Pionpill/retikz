# ADR-01：PlotSpec 根容器（Plot IR 根 + JSON 透传约束）

- 状态：Proposed
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 / §8 / §11 / §13.1](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md) · 子结构：[ADR-02 data](./02-plot-data.md) · [ADR-03 scale](./03-plot-scale.md) · [ADR-04 coordinate](./04-plot-coordinate.md) · [ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景

`@retikz/plot` 还不存在。要打通 [plot-design §13.1](../../../../../architecture/plot-design.md) 的「最薄纵向闭环」，第一步是有一份 **Plot IR**——所有管线模块（transform / encoding / scale / coordinate / mark / guide / lowering）共用的输入输出契约，100% JSON 可序列化、对 AI 友好（[plot-design §11.1](../../../../../architecture/plot-design.md) 把 `ir` / `schema` 列为「常被忽略却必备」的第一模块）。

Plot IR 由一个**根容器**统领，下挂四块语义子结构：数据（data）、比例尺（scale）、坐标系（coordinate）、图元（mark）。本 ADR **只负责根容器本身**——它如何把四块拼起来、预留哪些扩展位、施加什么全局约束；四块子结构各自的字段由 [ADR-02](./02-plot-data.md) ~ [ADR-05](./05-plot-encoding-mark.md) 定义。把根与子结构拆开，是因为根决定的是「组合形状与跨槽位关系」，子结构决定的是「各自的内部表示」，二者可独立演进、独立审阅。

Plot grammar 属 Tier 2：Plot IR 是 plot 包私有的高层语义，最终 lower 成 core 的 `Scope / Node / Path / Step / Coordinate`（ADR-06）。core 不理解 data / scale / mark。

本 ADR **只定根 schema 与 JSON 透传约束，不含任何编译 / lowering 行为**（lowering 是 ADR-06）。

## 决策：`type: 'plot'` 根对象，挂 data / scales / coordinate / marks 四槽位 + id / meta 预留

一份 Plot IR 是一个 `type: 'plot'` 根对象，挂四块：内联 `data`、命名 `scales` 数组、单个 `coordinate`、`marks` 图层数组。根**不重复**任何子结构的内部决策——`data` / `scales` / `coordinate` / `marks` 分别引用 [ADR-02](./02-plot-data.md) / [ADR-03](./03-plot-scale.md) / [ADR-04](./04-plot-coordinate.md) / [ADR-05](./05-plot-encoding-mark.md) 定义的 schema。anchor / scope 预留为根上的可选 `id` + `meta` 透传。

`meta` 的值需要「任意 JSON 可序列化」约束。`@retikz/core` 已导出 `ir/json.ts` 的 `JsonObjectSchema`（= `z.record(JsonValueSchema)`，递归 JSON 对象），**直接复用、不在 plot 本地另建 `json.ts`**（见「依赖现有元素」）。

```ts
// packages/plot/plot/src/ir/plot.ts
import { JsonObjectSchema } from '@retikz/core'; // 复用 core ir/json.ts，不在 plot 本地另建
import { PlotDataSchema } from './data';        // ADR-02
import { ScaleSchema } from './scale';          // ADR-03
import { CoordinateSchema } from './coordinate'; // ADR-04
import { MarkSchema } from './mark';            // ADR-05

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
    data: PlotDataSchema.describe('Inline dataset consumed by marks (see data schema)'),
    scales: z.array(ScaleSchema).describe('Named scales; referenced by coordinate (and by non-positional channels in later versions)'),
    coordinate: CoordinateSchema.describe('The coordinate system; owns positional scale bindings (alpha.1: cartesian2D only)'),
    marks: z.array(MarkSchema).min(1).describe('Mark layers, drawn in array order (stable z-order)'),
    meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable source metadata passthrough; reserved so lowering can preserve provenance into core IR meta (plot-design §8)'),
  })
  .describe('Plot IR root: a JSON-serializable grammar-of-graphics document that lowers to core Scope/Node/Path/Step/Coordinate (ADR-06)');

export type PlotSpec = z.infer<typeof PlotSpecSchema>;
```

理由：

1. **根只管组合，不管内部**：四槽位各引用子 ADR 的 schema，根 ADR 改动面仅 `plot.ts` + `json.ts`。子结构演进（scale 加 band、mark 加 bar）不动根；根加槽位（未来 guide）不动子结构。职责边界与文件边界对齐。
2. **AI 友好优先**（core-design §7）：根全字段 JSON 可序列化（无函数 / ReactNode / Map）；用全称 grammar 词汇（`data` / `scales` / `coordinate` / `marks`），每槽位清晰 `type` / 显式引用，不把语义藏进字符串。
3. **非破坏可扩展**：`id` / `meta` 预留位让 alpha.5 的 anchor / scope-aware 与 ADR-06 的 provenance 都能非破坏接入；`marks.min(1)` 锁定「至少一层」的根级不变量（空数据是数据层的事，空图层无意义）。
4. **`id` 是「可被连接」的句柄，不是 scope 容器本身**：根 `id` 在 lowering 时**必须绑到 plot lower 成的 core `Scope.id`**（外部句柄，core 的连接 = path step 用 `{ id, anchor }` 引用具名元素）。这是跨 Tier 2 的 lowering 硬约束，规则见 [plot-design §8.1 「id 绑定与可连接性」](../../../../../architecture/plot-design.md)；ADR-06 lowering 必须遵守。alpha.1 只埋字段位、不解析（语义在 alpha.5 接通）。

## 待决策点

> 方案已定，以下命名 / 结构小决策请人工拍板。

- **根类型名**：`PlotSpec`（schema `PlotSpecSchema`，`type: 'plot'`）。备选 `PlotIR` / `Plot`。倾向 `PlotSpec`——「spec」表意「声明式规格」，与 Vega-Lite 习惯一致、对 AI 友好。
- **anchor / scope 预留形态**：根 `id?: string` + 根 `meta?`。mark 上的 `id?` 归 [ADR-05](./05-plot-encoding-mark.md)。是否现在就给根 `meta` 之外再加结构化 provenance 字段？倾向 alpha.1 只放自由 `meta`，alpha.5 / ADR-06 再按需补。
- ~~**`JSONValueSchema` 归属**~~（已定）：`@retikz/core` 已导出 `JsonObjectSchema` / `JsonValueSchema`（`packages/core/core/src/ir/json.ts`，由包根 re-export），`meta` 直接 `JsonObjectSchema.optional()` 复用，**不在 plot 建 `ir/json.ts`**。

## DSL 表面

alpha.1 的 `@retikz/plot` **只产出 Plot IR 对象**（schema 校验），不出框架绑定组件——渲染走 ADR-06 的 lowering → core IR → 现有 `@retikz/react` / `@retikz/vanilla`。本 ADR 的 authoring 表面是 **Plot IR 字面量 / `PlotSpecSchema.parse`**，不是 JSX。框架绑定留到 v0.3。

```ts
import { PlotSpecSchema, type PlotSpec } from '@retikz/plot';

// 最小折线图根：两条命名 scale + cartesian 绑定 + 单 line mark
const spec: PlotSpec = {
  type: 'plot',
  data: { values: [{ month: 0, revenue: 10 }, { month: 1, revenue: 14 }, { month: 2, revenue: 9 }] },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue', nice: true },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};

PlotSpecSchema.parse(spec); // ✅ 通过校验（alpha.1 到此为止；lowering 是 ADR-06）

// 预留 id / meta：整图挂 handle + 来源透传（alpha.5 才解析为 scope / anchor）
const withHandles: PlotSpec = {
  type: 'plot',
  id: 'sales-chart',
  data: { values: [{ x: 0, y: 1 }] },
  scales: [{ type: 'linear', name: 'xs' }, { type: 'linear', name: 'ys' }],
  coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
  marks: [{ type: 'line', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  meta: { source: 'adr-01-example' },
};
```

> 子结构（data / scale / coordinate / encoding+mark）的更多用例见各自 ADR 的「DSL 表面」段。

## 测试设计

`packages/plot/plot/tests/ir/plot-spec.schema.test.ts`（新建）覆盖**根容器**的纯 schema 行为（无 compile），子结构的字段级校验留各自 ADR 的测试：

- 合法根（line / point、带 / 不带 id 与 meta）通过；
- 根 discriminator（`type`）缺失 / 错值被拒；
- `marks` 空数组被拒（`.min(1)`）；
- `meta` 非 JSON 值（function / undefined）被拒；
- 根可选项缺省（id / meta 省略）合法。

具体 case 拆分见下面「实现契约 § 测试象限」。

## 影响

- **新增包 `@retikz/plot`**（`packages/plot/plot`）：前置 setup 步骤建脚手架（见 [alpha.1 待办](./roadmap.md)），本 ADR 在其 `src/ir/` 落根 schema + json helper。
- **`packages/plot/plot/src/ir/plot.ts`**（全新）：`PlotSpecSchema` + `PlotSpec` 类型，import 四子 schema + core `JsonObjectSchema`。
- **`packages/plot/plot/src/ir/index.ts` + `src/index.ts`**：barrel + 公开 API 导出根 schema 与类型（含各子 ADR 的导出）。
- **对 core 的影响**：core 自身不改；但 plot **运行时 import** `@retikz/core` 的 `JsonObjectSchema`（值复用，非仅类型），使 `@retikz/core` 成为 plot 的运行时依赖（workspace 链，前置 setup 已建）。lowering 目标类型（Scope/Node/...）在 ADR-06 才 import。
- **对文档站的影响**：plot 文档分组尚未建；schema 介绍页随 ADR-06 端到端能出图后再补。
- **对外 API 的影响**：`@retikz/plot` 首次公开 `PlotSpecSchema` / `PlotSpec`。

## 不在本 ADR 范围

- **data / scale / coordinate / encoding / mark 的字段定义** → [ADR-02](./02-plot-data.md) ~ [ADR-05](./05-plot-encoding-mark.md)。本 ADR 只引用它们的 schema。
- **lowering / compile**（Plot IR → core IR）→ ADR-06。本 ADR 无任何运行时行为。
- **guide（axis / grid / legend）schema** → alpha.2。
- **anchor 命中 / datum locator / scope-aware 解析**：本 ADR 只留 `id` / `meta` 字段位，**不实现**任何解析 → alpha.5。
- **框架绑定 authoring（`<Plot>` JSX / vanilla plot builder）** → v0.3。

---

## 实现契约（必填）

> 下游 implement / test / document / wrapup 严格按此执行，偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级规则（参 [`flow-alpha`](../../../../../../.agents/skills/flow-alpha/SKILL.md) "自动判级" 表，plot 红线见 [`_template.md`](../../../_template.md)）：

- 动 `packages/plot/plot/src/ir/plot.ts` / `json.ts`（新建 Plot IR 根 schema）→ red
- 动 `packages/plot/plot/src/index.ts`（首次公开 API）→ red

本 ADR 自评 level：`red`，与「文件 scope」段相符。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/plot.ts` | 新建 schema | `PlotSpecSchema` | `z.object({ type, id?, data, scales, coordinate, marks, meta? })` | — | Plot IR 根；JSON 可序列化，lower 到 core IR（ADR-06） |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.type` | `z.literal('plot')` | — | 根 discriminator |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.id` | `z.string().min(1).optional()` | undefined | 整图 handle；预留 scope 引用 / anchor 目标（解析在 alpha.5），alpha.1 仅校验 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.data` | `PlotDataSchema`（ADR-02） | — | 内联数据集（引用） |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.scales` | `z.array(ScaleSchema)`（ADR-03） | — | 命名 scale 数组（引用） |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.coordinate` | `CoordinateSchema`（ADR-04） | — | 坐标系（引用）；持有位置 scale 绑定 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.marks` | `z.array(MarkSchema).min(1)`（ADR-05） | — | mark 图层，数组顺序 = z-order |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.meta` | `JsonObjectSchema.optional()`（复用 `@retikz/core`） | undefined | 来源 meta 透传，预留 provenance（ADR-06 lowering 保留） |

### 文件 scope

- `packages/plot/plot/src/ir/plot.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（新建：barrel 导出全部 schema + 类型；本 ADR 落根，子 ADR 各自补充导出）
- `packages/plot/plot/src/index.ts`（修改：公开 API 转出 ir barrel）
- `packages/plot/plot/tests/ir/plot-spec.schema.test.ts`（新建）

> 包脚手架文件（`package.json` / `tsconfig*` / `vite.config` / `vitest` 配置）由前置 setup 步骤创建，不在本 ADR schema 改动表内。子结构文件（`data.ts` / `scale.ts` / `coordinate.ts` / `encoding.ts` / `mark.ts`）属各自 ADR scope。

偏离白名单需加条或开新 ADR。

### 测试象限

> 本 milestone 拆为细粒度 ADR，**放宽模板「每 ADR ≥ 9 case」要求**：按 schema 复杂度适量取 case，只覆盖真实有意义的 accept/reject。根容器复杂度中等，取以下。

**Happy path**：

- `plot_root_line_valid`：line mark + 两 scale + cartesian + data → `PlotSpecSchema.parse` 通过
- `plot_root_with_id_and_meta_valid`：根 `id` + `meta` 都设 → 通过
- `plot_root_omits_optionals_valid`：省略 `id` / `meta` → 通过

**边界**：

- `plot_marks_empty_array_rejected`：`marks: []` → 拒（`.min(1)`）
- `plot_meta_nested_json_valid`：`meta: { a: { b: [1, true, null] } }` → 通过（JSONValue 递归）

**错误路径**：

- `plot_missing_type_rejected`：根缺 `type` → 拒
- `plot_wrong_type_literal_rejected`：`type: 'chart'` → 拒
- `plot_meta_function_value_rejected`：`meta: { f: () => 1 }` / `undefined` 值 → 拒（非 JSON 值）

**交互**：

- `plot_multi_mark_layers_valid`：`marks: [line, point]` 多图层共享同一 coordinate / scales → 通过（根层不阻止多 mark）
- `coordinate_references_unknown_scale_name_schema_passes`：`coordinate.x` 指向不存在的 scale name → **根 schema 层通过**（引用完整性是 ADR-06 lowering 的校验，非 schema 职责）

### 依赖现有元素

- `zod` —— **引用**：根 schema 基于 zod（catalog 版本，与 core 一致）。
- `@retikz/core` 的 `JsonObjectSchema` / `JsonValueSchema`（`packages/core/core/src/ir/json.ts`，已由包根 re-export）—— **复用**：`meta` = `JsonObjectSchema.optional()`。**仅复用、不修改 core**，plot 不自建 `json.ts`。
- [ADR-02 `PlotDataSchema`](./02-plot-data.md) / [ADR-03 `ScaleSchema`](./03-plot-scale.md) / [ADR-04 `CoordinateSchema`](./04-plot-coordinate.md) / [ADR-05 `MarkSchema`](./05-plot-encoding-mark.md) —— **引用**：根的四槽位 import 这些子 schema。实现顺序上四者先于本 ADR。

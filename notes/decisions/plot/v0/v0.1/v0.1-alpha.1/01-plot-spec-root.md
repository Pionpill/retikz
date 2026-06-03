# ADR-01：Plot 根节点（`plot` composite 节点 + 数据引用 + JSON 透传约束）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3 / §8 / §8.1 / §11 / §13.1](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md) · 子结构：[ADR-02 data](./02-plot-data.md) · [ADR-03 scale](./03-plot-scale.md) · [ADR-04 coordinate](./04-plot-coordinate.md) · [ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景

`@retikz/plot` 还不存在。要打通 [plot-design §13.1](../../../../../architecture/plot-design.md) 的「最薄纵向闭环」，第一步是有一份 **Plot IR**——所有管线模块（encoding / scale / coordinate / mark / guide / lowering）共用的输入输出契约，100% JSON 可序列化、对 AI 友好（[plot-design §11.1](../../../../../architecture/plot-design.md) 把 `ir` / `schema` 列为「常被忽略却必备」的第一模块）。

**关键架构前提：数据不进 IR。** 一张图 = ① **IR（配置）**：图类型 / 数据引用与模型 / scale / coordinate / mark；② **数据**：外部单独存储，任意 JS，不进 IR；③ **绑定逻辑**：写死在代码里的函数，`(IR + 数据) → core IR`。把整张数据集内联进 IR 会让 IR 体积爆炸、拖垮持久化与 LLM 生成（[plot-design §3](../../../../../architecture/plot-design.md)）。这套「配置 / 数据 / 函数」三分恰好是 core 处理所有 Tier 2 与扩展点的既定模式——shapes / arrows / patterns / pathGenerators / composites **无一例外**都是「含函数与数据、不进 IR、经 `CompileOptions` 运行时注入」。

因此 **Plot IR 根是一个 Tier 2 composite 节点**（`namespace: 'plot'`），经 core 的 `CompileOptions.composites` 注册、`compileToScene` 第一步 `lowerComposites` 展开成 Tier 1。本 ADR **只负责这个根节点**——它如何把数据引用 / scale / coordinate / mark 拼起来、预留哪些扩展位、施加什么全局约束；各子结构字段由 [ADR-02](./02-plot-data.md) ~ [ADR-05](./05-plot-encoding-mark.md) 定义。

本 ADR **只定根 schema 与 JSON 透传约束，不含任何编译 / lowering 行为**（lowering / 数据绑定是 ADR-06）。

## 决策：`plot` composite 节点，挂 data 引用 / scales / coordinate / marks + id / meta 预留

Plot IR 根是 `{ namespace: 'plot', type: 'plot', ... }`，extend core 的 `CompositeBaseSchema`，挂四块：**数据引用** `data`（具名 `ref` + 可选 `model`，**不含值**）、命名 `scales` 数组、单个 `coordinate`、`marks` 图层数组。根**不重复**任何子结构的内部决策——`data` / `scales` / `coordinate` / `marks` 分别引用 [ADR-02](./02-plot-data.md) / [ADR-03](./03-plot-scale.md) / [ADR-04](./04-plot-coordinate.md) / [ADR-05](./05-plot-encoding-mark.md)。anchor / scope 预留为根上的可选 `id` + `meta` 透传。

实际数据在编译期经 `lowerPlots(datasets)` 闭包注入（`data.ref` 按名查 `datasets`），renderer 后端只见 lowered 后含具体数字的 core IR，碰不到 plot 原始数据。`meta` 复用 core 的 `JsonObjectSchema`（递归 JSON 对象）。

```ts
// packages/plot/plot/src/ir/plot.ts
import { z } from 'zod';
import { CompositeBaseSchema, JsonObjectSchema, type ValueOf } from '@retikz/core';
import { DataRefSchema } from './data';        // ADR-02：{ ref, model? }，无值
import { ScaleSchema } from './scale';          // ADR-03
import { CoordinateSchema } from './coordinate'; // ADR-04
import { MarkSchema } from './mark';            // ADR-05

/** plot 域 namespace（单一固定值，作 Tier 2 路由键的单一真源） */
export const PLOT_NAMESPACE = 'plot';
/** plot namespace 内的 composite 类型判别值集（后续加 axis / legend…） */
export const PlotComposite = { Plot: 'plot' } as const;
export type PlotNodeType = ValueOf<typeof PlotComposite>;

export const PlotSpecSchema = CompositeBaseSchema.extend({
  namespace: z
    .literal(PLOT_NAMESPACE)
    .describe('Tier 2 domain namespace; routes this node to the plot lowering registered via CompileOptions.composites'),
  type: z
    .literal(PlotComposite.Plot)
    .describe('Composite type within the plot namespace: the top-level grammar-of-graphics spec node'),
  id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Optional handle for the whole plot; reserved as the scope reference id / anchor target used by composition & interaction (resolution deferred to alpha.5). Zero-cost reservation: alpha.1 only validates the field, attaches no semantics.',
    ),
  data: DataRefSchema.describe(
    'Data binding: a named reference to an externally-supplied dataset plus an optional data model. The dataset VALUES never enter the IR; they are injected at compile time via lowerPlots(datasets) (ADR-02, ADR-06).',
  ),
  scales: z.array(ScaleSchema).describe('Named scales; referenced by coordinate (and by non-positional channels in later versions)'),
  coordinate: CoordinateSchema.describe('The coordinate system; owns positional scale bindings (alpha.1: cartesian2D only)'),
  marks: z.array(MarkSchema).min(1).describe('Mark layers, drawn in array order (stable z-order)'),
  meta: JsonObjectSchema.optional().describe('Free-form JSON-serializable source metadata passthrough; reserved so lowering can preserve provenance into core IR meta (plot-design §8)'),
}).describe(
  'Plot IR root: a JSON-serializable, data-free grammar-of-graphics composite node (namespace "plot"); bound to external data and lowered to core Scope/Node/Path/Step/Coordinate at compile time via lowerPlots (ADR-06)',
);

export type PlotSpec = z.infer<typeof PlotSpecSchema>;
```

理由：

1. **数据不进 IR**：IR 只持 `data.ref`（具名引用）+ 可选 `model`，体积只随「配置复杂度」走、不随数据量走；持久化 / 传输 / 喂 LLM 都紧凑。数据经 `lowerPlots(datasets)` 闭包注入，与 core 「函数 / 数据走 `CompileOptions`、不进 IR」的全局哲学一致。
2. **根是 composite 节点而非自定义顶层**：extend `CompositeBaseSchema`（`namespace` + `type`）使根能直接作为 core IR 的 open composite child，被 `lowerComposites` 按 `plot.plot` 路由展开——复用 core 既有 Tier 2 通道，零新机制。
3. **根只管组合，不管内部**：四槽位各引用子 ADR 的 schema，根 ADR 改动面仅 `plot.ts`。子结构演进（scale 加 band、mark 加 bar）不动根；根加槽位（未来 guide）不动子结构。
4. **AI 友好优先**（core-design §7）：根全字段 JSON 可序列化（无函数 / ReactNode / Map）；全称 grammar 词汇（`data` / `scales` / `coordinate` / `marks`）；每槽位清晰 `type` / 显式引用。
5. **非破坏可扩展**：`id` / `meta` 预留位让 alpha.5 的 anchor / scope-aware 与 ADR-06 的 provenance 非破坏接入；`marks.min(1)` 锁定「至少一层」根级不变量。
6. **`id` 是「可被连接」的句柄，非 scope 容器本身**：根 `id` 在 lowering 时**必须绑到 plot lower 成的 core `Scope.id`**（外部句柄，core 的连接 = path step 用 `{ id, anchor }` 引用具名元素）。跨 Tier 2 lowering 硬约束见 [plot-design §8.1](../../../../../architecture/plot-design.md)；ADR-06 必须遵守。alpha.1 只埋字段位、不解析（alpha.5 接通）。

## 待决策点

> 方案已定，以下命名 / 结构小决策请人工拍板。

- **根类型名**：`PlotSpec`（schema `PlotSpecSchema`，`namespace: 'plot'` / `type: 'plot'`）。备选 `PlotIR` / `Plot`。倾向 `PlotSpec`——「spec」表意「声明式规格」，与 Vega-Lite 习惯一致、对 AI 友好。
- **composite `type` 取名**：`'plot'`（路由键 `plot.plot`）。备选 `'spec'`（`plot.spec`）。倾向 `'plot'`——alpha.1 plot 只有一种顶层节点；若 alpha.2+ 出 axis / legend 等独立 composite，它们用各自 `type`（`plot.axis`…），根仍是 `plot.plot`。
- **anchor / scope 预留形态**：根 `id?: string` + 根 `meta?`。mark 上的 `id?` 归 [ADR-05](./05-plot-encoding-mark.md)。倾向 alpha.1 只放自由 `meta`，alpha.5 / ADR-06 再按需补结构化 provenance。
- ~~**`JSONValueSchema` 归属**~~（已定）：复用 `@retikz/core` 的 `JsonObjectSchema`，`meta` 直接 `JsonObjectSchema.optional()`，**不在 plot 建 `ir/json.ts`**。

## DSL 表面

alpha.1 的 `@retikz/plot` **产出 Plot IR 对象（schema 校验）+ lowering 函数**，不出框架绑定组件。authoring 表面是 **Plot IR 字面量 + 外部数据**：渲染 = `compileToScene(plotIR, { composites: lowerPlots(datasets) })`（lowering 在 ADR-06）。框架绑定（`<Plot>` JSX，data 当 prop 由 adapter 拆进 datasets）留到 v0.3。

```ts
import { PlotSpecSchema, type PlotSpec } from '@retikz/plot';

// IR：配置，不含数据，只引用具名数据集 'sales'
const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: {
    ref: 'sales',
    model: [ // 可选：声明字段类型，便于校验 / 推 scale 类型 / LLM 不看数据即知字段
      { name: 'month', type: 'quantitative' },
      { name: 'revenue', type: 'quantitative' },
    ],
  },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue', nice: true },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};

PlotSpecSchema.parse(spec); // ✅ 校验通过（alpha.1 到此为止）

// 数据外置，编译期注入（lowering 是 ADR-06）：
// compileToScene(spec, { composites: lowerPlots({ sales: [{ month: 0, revenue: 10 }, ...] }) });

// 省略 model（绑定期从外部数据推类型）+ 预留 id / meta：
const minimal: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'sales-chart',
  data: { ref: 'sales' },
  scales: [{ type: 'linear', name: 'xs' }, { type: 'linear', name: 'ys' }],
  coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
  marks: [{ type: 'line', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  meta: { source: 'adr-01-example' },
};
```

> 子结构（data 引用 / 数据模型 / scale / coordinate / encoding+mark）的更多用例见各自 ADR 的「DSL 表面」段。

## 测试设计

`packages/plot/plot/tests/ir/plot-spec.schema.test.ts`（新建）覆盖**根节点**的纯 schema 行为（无 compile），子结构字段级校验留各自 ADR：

- 合法根（line / point、带 / 不带 id 与 meta、带 / 不带 data.model）通过；
- `namespace` / `type` 缺失或错值被拒；
- `marks` 空数组被拒（`.min(1)`）；
- `meta` 非 JSON 值（function / undefined）被拒；
- 根可选项缺省（id / meta / data.model 省略）合法；
- IR 中**不接受** `data.values`（数据不进 IR）。

具体见「实现契约 § 测试象限」。

## 影响

- **新增包 `@retikz/plot`**（`packages/plot/plot`）：前置 setup 建脚手架（见 [alpha.1 待办](./roadmap.md)），本 ADR 在 `src/ir/` 落根 schema。
- **`packages/plot/plot/src/ir/plot.ts`**（全新）：`PlotSpecSchema` + `PlotSpec`，extend core `CompositeBaseSchema`，import 子 schema + core `JsonObjectSchema`。
- **`packages/plot/plot/src/ir/index.ts` + `src/index.ts`**：barrel + 公开 API 导出（含各子 ADR）。
- **对 core 的影响**：core 自身不改；plot **运行时 import** `@retikz/core` 的 `CompositeBaseSchema` / `JsonObjectSchema`（值复用），`@retikz/core` 为 plot 运行时依赖。数据绑定走 core 既有 `CompileOptions.composites`（ADR-06），无需 core 新增钩子。
- **对文档站的影响**：plot 文档分组尚未建；schema 介绍页随 ADR-06 端到端能出图后再补。
- **对外 API 的影响**：`@retikz/plot` 首次公开 `PlotSpecSchema` / `PlotSpec`。

## 不在本 ADR 范围

- **data 引用 / 数据模型字段、外部数据契约（任意 JS + `a.b.c` accessor）** → [ADR-02](./02-plot-data.md)。
- **scale / coordinate / encoding / mark 字段** → [ADR-03](./03-plot-scale.md) ~ [ADR-05](./05-plot-encoding-mark.md)。
- **lowering / 数据绑定 `lowerPlots(datasets)`** → ADR-06。本 ADR 无运行时行为。
- **guide（axis / grid / legend）schema** → alpha.2。
- **anchor 命中 / datum locator / scope-aware 解析** → alpha.5（本 ADR 只留 `id` / `meta` 字段位）。
- **框架绑定 authoring（`<Plot>` JSX / data prop 拆分 / vanilla plot builder）** → v0.3。

---

## 实现契约（必填）

> 下游 implement / test / document / wrapup 严格按此执行，偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级规则（参 [`flow-alpha`](../../../../../../.agents/skills/flow-alpha/SKILL.md) "自动判级" 表，plot 红线见 [`_template.md`](../../../_template.md)）：

- 动 `packages/plot/plot/src/ir/plot.ts`（新建 Plot IR 根 schema）→ red
- 动 `packages/plot/plot/src/index.ts`（首次公开 API）→ red

本 ADR 自评 level：`red`，与「文件 scope」段相符。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/plot.ts` | 新建常量 | `PLOT_NAMESPACE` / `PlotComposite` | `'plot'` / `{ Plot:'plot' } as const`（派生 `PlotNodeType`） | — | namespace 单一真源 + composite 类型判别值集（const 对象，AGENTS.md 规则） |
| `packages/plot/plot/src/ir/plot.ts` | 新建 schema | `PlotSpecSchema` | `CompositeBaseSchema.extend({ namespace, type, id?, data, scales, coordinate, marks, meta? })` | — | Plot IR 根 composite 节点；JSON 可序列化、无数据值，lower 到 core IR（ADR-06） |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.namespace` | `z.literal(PLOT_NAMESPACE)` | — | Tier 2 namespace；路由到 plot lowering |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.type` | `z.literal(PlotComposite.Plot)` | — | plot namespace 内的顶层 composite type |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.id` | `z.string().min(1).optional()` | undefined | 整图 handle；预留 scope 引用 / anchor 目标（解析在 alpha.5），alpha.1 仅校验 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.data` | `DataRefSchema`（ADR-02：`{ ref, model? }`） | — | 数据引用（具名 ref + 可选模型）；**无值** |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.scales` | `z.array(ScaleSchema)`（ADR-03） | — | 命名 scale 数组（引用） |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.coordinate` | `CoordinateSchema`（ADR-04） | — | 坐标系（引用）；持有位置 scale 绑定 |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.marks` | `z.array(MarkSchema).min(1)`（ADR-05） | — | mark 图层，数组顺序 = z-order |
| `packages/plot/plot/src/ir/plot.ts` | 新建字段 | `PlotSpecSchema.meta` | `JsonObjectSchema.optional()`（复用 `@retikz/core`） | undefined | 来源 meta 透传，预留 provenance（ADR-06 lowering 保留） |

### 文件 scope

- `packages/plot/plot/src/ir/plot.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（新建：barrel 导出全部 schema + 类型；本 ADR 落根，子 ADR 各自补充导出）
- `packages/plot/plot/src/index.ts`（修改：公开 API 转出 ir barrel）
- `packages/plot/plot/tests/ir/plot-spec.schema.test.ts`（新建）

> 包脚手架文件（`package.json` / `tsconfig*` / `vite.config` / `vitest`）由前置 setup 创建。子结构文件（`data.ts` / `scale.ts` / `coordinate.ts` / `encoding.ts` / `mark.ts`）属各自 ADR scope。

偏离白名单需加条或开新 ADR。

### 测试象限

> 本 milestone 放宽模板「每 ADR ≥ 9 case」：按 schema 复杂度适量取 case。根节点复杂度中等。

**Happy path**：

- `plot_root_line_valid`：line mark + 两 scale + cartesian + `data.ref` → `PlotSpecSchema.parse` 通过
- `plot_root_with_id_and_meta_valid`：根 `id` + `meta` 都设 → 通过
- `plot_root_omits_optionals_valid`：省略 `id` / `meta` / `data.model` → 通过

**边界**：

- `plot_marks_empty_array_rejected`：`marks: []` → 拒（`.min(1)`）
- `plot_meta_nested_json_valid`：`meta: { a: { b: [1, true, null] } }` → 通过（JsonObject 递归）

**错误路径**：

- `plot_missing_namespace_rejected`：缺 `namespace` → 拒
- `plot_wrong_type_literal_rejected`：`type: 'chart'` → 拒
- `plot_meta_function_value_rejected`：`meta: { f: () => 1 }` / `undefined` 值 → 拒（非 JSON 值）
- `plot_data_inline_values_rejected`：`data: { values: [...] }`（无 `ref`）→ 拒（数据不进 IR；`ref` 必填）

**交互**：

- `plot_multi_mark_layers_valid`：`marks: [line, point]` 多图层共享同一 coordinate / scales → 通过
- `coordinate_references_unknown_scale_name_schema_passes`：`coordinate.x` 指向不存在的 scale name → **根 schema 层通过**（引用完整性是 ADR-06 lowering 校验，非 schema 职责）

### 依赖现有元素

- `zod` —— **引用**：根 schema 基于 zod（catalog 版本，与 core 一致）。
- `@retikz/core` 的 `CompositeBaseSchema`（`packages/core/core/src/ir/composite.ts`，包根 re-export）—— **扩展**：`PlotSpecSchema = CompositeBaseSchema.extend({...})`，把 `namespace` / `type` 收窄为 literal。**仅 extend、不改 core**。
- `@retikz/core` 的 `JsonObjectSchema`（`ir/json.ts`，包根 re-export）—— **复用**：`meta` = `JsonObjectSchema.optional()`。
- `@retikz/core` 的 `ValueOf`（`types.ts`，包根 re-export）—— **引用**：派生 `PlotNodeType`。
- `@retikz/core` 的 `CompileOptions.composites` / `defineComposite`（`composites/types.ts`）—— **运行时绑定面（ADR-06 用）**：本 ADR 不直接 import，列明以示根节点最终经此通道展开。
- [ADR-02 `DataRefSchema`](./02-plot-data.md) / [ADR-03 `ScaleSchema`](./03-plot-scale.md) / [ADR-04 `CoordinateSchema`](./04-plot-coordinate.md) / [ADR-05 `MarkSchema`](./05-plot-encoding-mark.md) —— **引用**：根四槽位 import 这些子 schema。实现顺序上四者先于本 ADR。

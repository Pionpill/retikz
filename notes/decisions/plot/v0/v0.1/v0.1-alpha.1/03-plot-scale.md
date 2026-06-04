# ADR-03：Plot 比例尺（LinearScale + Scale union）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 / §11.1](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 引用方：[ADR-04 coordinate](./04-plot-coordinate.md)

## 背景

[根节点（ADR-01）](./01-plot-spec-root.md)的 `scales` 槽位是一个**命名比例尺数组**。比例尺定义「数据值 → 绘图坐标值」的映射规则，是图形语法最核心的一环：业务量纲（如收入 9~18）经 scale 映射到绘图区量纲。

本 ADR 定义 scale 的 schema。位置通道用哪个 scale 由 coordinate 决定（[ADR-04](./04-plot-coordinate.md)），故本 ADR 只管「scale 自身长什么样」与「如何按名引用」，不管「谁用它」。

alpha.1 最薄切片只需 `linear`（连续线性）；scale 设计成 discriminated union，为 alpha.3 的 band / time / ordinal·color 预留扩展位（registry 风格，[plot-design §11.1](../../../../../architecture/plot-design.md)）。

## 决策：命名 `linear` scale，domain / range 可省（lowering 推断）

每个 scale 有唯一 `name`（被 coordinate 按名引用）。alpha.1 仅 `type: 'linear'`：`domain`（输入区间）/ `range`（输出区间）均可省略，省略时留给 [ADR-06](./roadmap.md) lowering 推断（domain 从**绑定的外部数据集**字段推——数据不进 IR、绑定期才到位（[ADR-02](./02-plot-data.md)）；range 从 coordinate extent 推）。`nice` / `clamp` 为可选布尔，语义默认 false。

```ts
// packages/plot/plot/src/ir/scale.ts
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/** scale 类型判别值集（const 对象 + 派生类型；后续加 band / log / time / ordinal…） */
export const PlotScale = { Linear: 'linear' } as const;
export type ScaleType = ValueOf<typeof PlotScale>;

export const LinearScaleSchema = z.object({
  type: z.literal(PlotScale.Linear).describe('Discriminator: continuous linear scale'),
  name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('[min, max] input extent; omit → inferred from bound data fields at lowering'),
  range: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('[start, end] output extent in plot-area units; omit → derived from coordinate extent at lowering'),
  nice: z.boolean().optional().describe('Round domain to nice human numbers; default false'),
  clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to range ends; default false'),
});

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema])
  .describe('Scale union; extensible to band / time / ordinal·color in alpha.3 (registry-style, plot-design §11.1)');

export type Scale = z.infer<typeof ScaleSchema>;
```

理由：

1. **命名 + 引用解耦**：scale 集中声明、按 `name` 被引用，让 coordinate / 未来非位置通道共享同一 scale，不必内联重复。
2. **domain / range 可省 = 自动推断入口**：alpha.1 让用户少写、lowering 兜底推断；显式给出时按用户值。可选而非必填，保证「最小 spec 能跑」。
3. **union 可扩展**：discriminatedUnion 加 band / time / ordinal 变体不破坏旧 IR。
4. **scale 不持有「驱动哪个通道」**：那是 coordinate（[ADR-04](./04-plot-coordinate.md)）的职责，scale 保持纯映射定义、可被任意通道复用。

## 待决策点

- **`domain` / `range` tuple**：固定二元组 `[number, number]`。备选 `{ min, max }` 对象。倾向 tuple，与 d3 / Vega 习惯一致、紧凑。
- **`nice` / `clamp` 默认**：语义默认 false（schema 不写 `.default()`，省略即未启用）。是否要 schema 层 `.default(false)` 让 parse 后字段总存在？倾向**不写 default**，保持 IR 最小（缺省 = false 由 lowering 解释），避免 parse 产物膨胀。
- **scale `name` 唯一性**：schema 层**不校验**跨 scale 名唯一（数组层无法在单元素 schema 表达）；重名检测是 [ADR-06](./roadmap.md) lowering 的职责。
- **scale 类型 ← 数据模型**：alpha.1 只有 `linear`，scale 类型固定。alpha.3 多 scale 类型后，lowering 可据 [ADR-02](./02-plot-data.md) `DataModel` 的字段 `type`（quantitative → linear、nominal → band…）推断默认 scale 类型；本 ADR 不实现推断，仅记此联动。

## DSL 表面

```ts
import { ScaleSchema } from '@retikz/plot';

ScaleSchema.parse({ type: 'linear', name: 'xMonth' });                       // 最小：仅 type + name
ScaleSchema.parse({ type: 'linear', name: 'yRevenue', nice: true });        // 取整 domain
ScaleSchema.parse({ type: 'linear', name: 'y', domain: [0, 100], range: [0, 480], clamp: true }); // 全字段
```

## 测试设计

`packages/plot/plot/tests/ir/scale.schema.test.ts`（新建）覆盖：

- 仅 type+name / 全字段 的 linear scale 通过；
- domain / range 长度非 2 被拒；
- 空 name、未知 type、缺 type 被拒。

具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/scale.ts`**（全新）：`LinearScaleSchema` / `ScaleSchema` + `Scale` 类型。
- **`packages/plot/plot/src/ir/index.ts`**：补充导出 scale schema 与类型。
- **被引用**：[ADR-01](./01-plot-spec-root.md) `scales` 槽位用 `z.array(ScaleSchema)`；[ADR-04](./04-plot-coordinate.md) 按 `name` 字符串引用（不 import scale schema，仅引名）。
- **对外 API**：`@retikz/plot` 公开 `LinearScaleSchema` / `ScaleSchema` / `Scale`。

## 不在本 ADR 范围

- **band / time / ordinal·color scale** → alpha.3。
- **非位置通道（color / size）自带 scale** → alpha.3（届时 channel 加 `scale` 字段）。
- **domain / range 推断、scale 求值、重名检测** → ADR-06 lowering。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**` → red。本 ADR 自评 level：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/scale.ts` | 新建常量 | `PlotScale` | `{ Linear: 'linear' } as const`（派生 `ScaleType = ValueOf<…>`） | — | scale 类型判别值集（const 对象 + 派生类型，AGENTS.md 规则） |
| `packages/plot/plot/src/ir/scale.ts` | 新建 schema | `LinearScaleSchema` | `z.object({ type:z.literal(PlotScale.Linear), name, domain?, range?, nice?, clamp? })` | nice/clamp 语义默认 false（不写 schema default） | 线性 scale |
| `packages/plot/plot/src/ir/scale.ts` | 新建字段 | `LinearScaleSchema.name` | `z.string().min(1)` | — | scale 名；被 coordinate 引用 |
| `packages/plot/plot/src/ir/scale.ts` | 新建字段 | `LinearScaleSchema.domain` | `z.tuple([number, number]).optional()` | undefined | [min,max] 输入区间，省略→lowering 推断 |
| `packages/plot/plot/src/ir/scale.ts` | 新建字段 | `LinearScaleSchema.range` | `z.tuple([number, number]).optional()` | undefined | [start,end] 输出区间，省略→lowering 推断 |
| `packages/plot/plot/src/ir/scale.ts` | 新建字段 | `LinearScaleSchema.nice` | `z.boolean().optional()` | undefined（=false） | domain 取整 |
| `packages/plot/plot/src/ir/scale.ts` | 新建字段 | `LinearScaleSchema.clamp` | `z.boolean().optional()` | undefined（=false） | 越界输入夹到 range 端 |
| `packages/plot/plot/src/ir/scale.ts` | 新建 schema | `ScaleSchema` | `z.discriminatedUnion('type', [LinearScaleSchema])` | — | scale union（可扩展） |

### 文件 scope

- `packages/plot/plot/src/ir/scale.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（修改：补充 scale 导出）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（新建）

### 测试象限

> 本 milestone 放宽「每 ADR ≥ 9 case」，按复杂度适量。scale 复杂度中等。

**Happy path**：

- `scale_linear_omits_optionals_valid`：仅 type + name → 通过
- `scale_linear_full_fields_valid`：domain + range + nice + clamp 全给 → 通过
- `scale_linear_nice_only_valid`：type + name + nice → 通过

**边界**：

- `scale_domain_two_tuple_only`：`domain: [0]` / `[0,1,2]` → 拒（tuple 固定长 2）
- `scale_range_two_tuple_only`：`range` 长度非 2 → 拒

**错误路径**：

- `scale_empty_name_rejected`：`name: ''` → 拒（`.min(1)`）
- `scale_missing_type_rejected`：缺 `type` → 拒
- `scale_unknown_type_rejected`：`type: 'band'`（alpha.1 未纳入）→ 拒（discriminatedUnion）

### 依赖现有元素

- `zod` —— **引用**。
- `@retikz/core` 的 `ValueOf`（`packages/core/core/src/types.ts`，包根 re-export）—— **引用**：派生 `ScaleType`。
- 无其它 plot / core 元素依赖（scale 是独立基座；coordinate 仅按 `name` 字符串引用，不产生 schema 依赖）。

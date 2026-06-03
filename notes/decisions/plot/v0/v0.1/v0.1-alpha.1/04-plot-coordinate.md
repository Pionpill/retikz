# ADR-04：Plot 坐标系（Cartesian2D + Coordinate union，持有位置 scale 绑定）

- 状态：Proposed
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5](../../../../../architecture/plot-design.md) · 根节点：[ADR-01 PlotSpec](./01-plot-spec-root.md) · 关联方：[ADR-03 scale](./03-plot-scale.md) · [ADR-05 encoding+mark](./05-plot-encoding-mark.md)

## 背景

[根节点（ADR-01）](./01-plot-spec-root.md)的 `coordinate` 槽位定义图的坐标空间。本 ADR 定义坐标系 schema，并承担一个**关键跨切决策**：位置通道（x / y）的 scale 绑定**由 coordinate 持有**——coordinate 声明「哪个 scale 驱动 x、哪个驱动 y」。

这是 Plot IR 的一个分叉点：Vega-Lite 风格让每个 channel 自带 scale 引用；本设计把位置 scale 绑定收归 coordinate。本 ADR 锁定后者，并解释代价与收益（见理由）。[encoding（ADR-05）](./05-plot-encoding-mark.md)的位置通道因此**不带 scale 引用**。

alpha.1 仅 `cartesian2D`；coordinate 设计成 discriminated union，为 alpha.4 的 polar2D / linear1D 预留。

## 决策：cartesian2D，x / y 各引用一个 scale 名

`cartesian2D` 是 2D 笛卡尔空间（x 水平 / y 垂直）。它持有两个字段 `x` / `y`，各是一个 scale 名（字符串，引用 [ADR-03](./03-plot-scale.md) 的 `scales[].name`）。

```ts
// packages/plot/plot/src/ir/coordinate.ts
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/** 坐标系类型判别值集（const 对象 + 派生类型；后续加 polar2D / linear1D…） */
export const COORDINATE_TYPES = { cartesian2D: 'cartesian2D' } as const;
export type CoordinateType = ValueOf<typeof COORDINATE_TYPES>;

export const Cartesian2DSchema = z.object({
  type: z.literal(COORDINATE_TYPES.cartesian2D).describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
  x: z.string().min(1).describe('Scale name driving the x (horizontal) position channel'),
  y: z.string().min(1).describe('Scale name driving the y (vertical) position channel'),
});

export const CoordinateSchema = z
  .discriminatedUnion('type', [Cartesian2DSchema])
  .describe('Coordinate-system union; extensible to polar2D / linear1D in later alphas (plot-design §3.5)');

export type Coordinate = z.infer<typeof CoordinateSchema>;
```

理由：

1. **coordinate 持有位置 scale 绑定，消除冗余**：避免「coordinate 声明 x/y + 每个 mark 又重复声明 scale」。多 mark 共享同一坐标空间天然成立——它们都受同一 coordinate 的 x/y scale 驱动。
2. **职责清晰**：coordinate 决定「空间怎么搭、位置通道由谁驱动」；mark 的 encoding（[ADR-05](./05-plot-encoding-mark.md)）只决定「通道绑哪个数据字段」。位置通道无 scale 引用，语义不重叠。
3. **非位置通道留 alpha.3 非破坏接入**：color / size 等自带 scale 的通道届时在 channel 上加 `scale` 字段，与「位置 scale 归 coordinate」并存不矛盾。
4. **union 可扩展**：polar2D / linear1D 加变体不破坏旧 IR；坐标系抽象通用化在 alpha.4 由 polar 逼出。
5. **代价**：引用完整性（x/y 指向的 scale name 是否存在于 `scales`）**不在 schema 层校验**——单元素 schema 无法看到整份 `scales`。这交给 [ADR-06](./roadmap.md) lowering 校验。

## 待决策点

- **位置 scale 绑定归属**：coordinate 持有 `x` / `y` scale 名（本方案）vs 每个 channel 自带 `scale` 引用（Vega-Lite 风格）。倾向前者，理由见上。若预期 alpha.3 非位置通道会让模型割裂，可改为 channel 持有——届时是 [ADR-05](./05-plot-encoding-mark.md) 的破坏性改动，宜现在定死。
- **引用完整性校验时机**：schema 层放行未知 scale 名，lowering 层校验。本 ADR 锁定「schema 不做跨字段引用校验」边界。

## DSL 表面

```ts
import { CoordinateSchema } from '@retikz/plot';

CoordinateSchema.parse({ type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' }); // x/y = scale 名

// schema 层不校验 scale 名是否真存在（lowering 才校验）
CoordinateSchema.parse({ type: 'cartesian2D', x: 'nonexistent', y: 'alsoMissing' }); // ✅ schema 通过
```

## 测试设计

`packages/plot/plot/tests/ir/coordinate.schema.test.ts`（新建）覆盖：

- 合法 cartesian2D 通过；
- 缺 x / y、空字符串、未知 type 被拒；
- 指向不存在 scale 名的 coordinate 在 schema 层**通过**（引用完整性锁边界）。

具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/coordinate.ts`**（全新）：`Cartesian2DSchema` / `CoordinateSchema` + `Coordinate` 类型。
- **`packages/plot/plot/src/ir/index.ts`**：补充导出 coordinate schema 与类型。
- **被引用**：[ADR-01](./01-plot-spec-root.md) `coordinate` 槽位用 `CoordinateSchema`。
- **关联约束**：本 ADR 的「coordinate 持有位置 scale」决定 [ADR-05](./05-plot-encoding-mark.md) 的位置通道不带 scale 引用。
- **对外 API**：`@retikz/plot` 公开 `Cartesian2DSchema` / `CoordinateSchema` / `Coordinate`。

## 不在本 ADR 范围

- **polar2D / linear1D coordinate** → alpha.4 / 后续。
- **坐标系投影几何 / extent 推断 / 引用完整性校验** → ADR-06 lowering（及 alpha.4 几何）。
- **非位置通道的 scale 绑定** → alpha.3（[ADR-05](./05-plot-encoding-mark.md) 后续扩展）。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**` → red。本 ADR 自评 level：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/coordinate.ts` | 新建常量 | `COORDINATE_TYPES` | `{ cartesian2D: 'cartesian2D' } as const`（派生 `CoordinateType`） | — | 坐标系类型判别值集（const 对象 + 派生类型，AGENTS.md 规则） |
| `packages/plot/plot/src/ir/coordinate.ts` | 新建 schema | `Cartesian2DSchema` | `z.object({ type:z.literal(COORDINATE_TYPES.cartesian2D), x:string, y:string })` | — | 笛卡尔 2D；x/y = scale 名 |
| `packages/plot/plot/src/ir/coordinate.ts` | 新建字段 | `Cartesian2DSchema.x` | `z.string().min(1)` | — | 驱动 x（水平）位置通道的 scale 名 |
| `packages/plot/plot/src/ir/coordinate.ts` | 新建字段 | `Cartesian2DSchema.y` | `z.string().min(1)` | — | 驱动 y（垂直）位置通道的 scale 名 |
| `packages/plot/plot/src/ir/coordinate.ts` | 新建 schema | `CoordinateSchema` | `z.discriminatedUnion('type', [Cartesian2DSchema])` | — | coordinate union（可扩展） |

### 文件 scope

- `packages/plot/plot/src/ir/coordinate.ts`（新建）
- `packages/plot/plot/src/ir/index.ts`（修改：补充 coordinate 导出）
- `packages/plot/plot/tests/ir/coordinate.schema.test.ts`（新建）

### 测试象限

> 本 milestone 放宽「每 ADR ≥ 9 case」，按复杂度适量。coordinate 复杂度低。

**Happy path**：

- `coordinate_cartesian2d_valid`：`{ type:'cartesian2D', x:'xs', y:'ys' }` → 通过

**边界**：

- `coordinate_empty_x_rejected`：`x: ''` → 拒（`.min(1)`）

**错误路径**：

- `coordinate_missing_x_rejected`：缺 `x` → 拒
- `coordinate_missing_y_rejected`：缺 `y` → 拒
- `coordinate_unknown_type_rejected`：`type: 'polar2D'`（alpha.1 未纳入）→ 拒

**交互**：

- `coordinate_references_unknown_scale_name_schema_passes`：x/y 指向不存在的 scale name → **schema 层通过**（引用完整性是 ADR-06 lowering 的校验，本 case 锁定边界）

### 依赖现有元素

- `zod` —— **引用**。
- `@retikz/core` 的 `ValueOf`（`packages/core/core/src/types.ts`，包根 re-export）—— **引用**：派生 `CoordinateType`。
- [ADR-03 scale 的 `name`](./03-plot-scale.md) —— **弱引用（仅约定）**：x/y 是字符串，语义上指向 `scales[].name`，但 schema 层不 import scale、不校验存在性。

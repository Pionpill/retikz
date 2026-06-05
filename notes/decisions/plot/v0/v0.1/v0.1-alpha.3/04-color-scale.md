# ADR-04：ordinal·color scale + color 非位置通道（首个非位置通道，按系列着色）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.4 scale / §3.6 encoding（位置 / 非位置）/ §4.2 通道分流](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-05 encoding/mark](../v0.1-alpha.1/05-plot-encoding-mark.md) · 依赖：[ADR-01 band scale（inferCategoryDomain / CategoryValueSchema）](./01-band-scale.md) · 消费方：[ADR-05 relation](./05-relation.md) · [ADR-07 DSL](./07-bindings-dsl.md)

## 背景

alpha.1/alpha.2 的 encoding 只有 **x / y 位置通道**，scale 只有连续 linear。多系列图（多条线、分组 / 堆叠柱）必须用**颜色**区分系列——这是 plot-design §3.6 列的**非位置通道**（color / size / shape / opacity…）里的第一个，也是落地多系列的前提。

引入 color 牵动两处：

1. **scale 补 ordinal**：颜色映射是「分类域 → 颜色范围」的 **ordinal scale**（d3 `scaleOrdinal`）；颜色范围用现成配色方案（`d3-scale-chromatic` 的 `schemeCategory10` 等），用户也可显式给颜色数组。
2. **encoding 补非位置通道 + 通道找 scale 的方式**：位置通道经 `coordinate.x/y` 间接绑 scale；非位置通道**没有 coordinate**，必须自己指明用哪个 scale。故 `ChannelSchema` 加可选 `scale`（scale 名引用），并在 `EncodingSchema` 加 `color` 通道。

本 ADR 做**按字段着色**的最小闭环（如散点 / 多线按类别上色）；与**多系列几何**（分组 / 堆叠柱、多线拆分）的集成在 [ADR-05](./05-relation.md)。

## 决策：encoding 加 `color` 通道 + ChannelSchema 加 `scale` 引用；scale union 加 ordinal；mark 按 color scale 分组着色，每色一子 Scope 设 fill

`ChannelSchema` 加可选 `scale?`（非位置通道用它指明 scale 名；位置通道省略、scale 由 coordinate 绑）。`EncodingSchema` 加 `color?` 通道。`ScaleSchema` 加 `ordinal` 成员（分类域 → 输出值数组，颜色是其典型用途；`range` 省略时 lowering 用默认配色方案）。lowering：解析 color scale，把行按 color 值分组，**每个颜色一个子 Scope**（`fill` 设为该色），柱 / 点落进对应子 Scope——颜色上提到 Scope、不逐元素写，守 IR 体积原则。**注意主从（与 [ADR-05](./05-relation.md) 统一）：当 mark 带 `series` 时，分区以 series 为主、color 仅决定每系列 paint；本 ADR 的「按 color 分子 Scope」专指 *无 series* 的着色（如分类散点）**——lowering 永远不会「先按 color 拆、再按 series 拆」。

```ts
// packages/plot/plot/src/ir/encoding.ts（扩）
export const ChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Path accessor into a data row bound to this channel; resolved at lowering and must yield a scalar'),
    value: ScalarValueSchema.optional().describe('Constant scalar literal for this channel (mutually exclusive with field)'),
    scale: z.string().min(1).optional().describe('Scale name driving this channel (required for non-positional channels like color; positional x/y derive their scale from the coordinate system and omit this)'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'channel must set exactly one of `field` or `value`' })
  .describe('A channel binding: exactly one of field / value, plus an optional scale reference');

export const EncodingSchema = z
  .object({
    x: ChannelSchema.optional().describe('x position channel'),
    y: ChannelSchema.optional().describe('y position channel'),
    color: ChannelSchema.optional().describe('Color channel (non-positional): maps a field through an ordinal/color scale to the mark fill / stroke'),
  })
  .describe('Channel bindings for a mark; positional x/y consumed by the coordinate system, non-positional color fed to mark paint');
```

```ts
// packages/plot/plot/src/ir/scale.ts（再扩 union，承 ADR-01）
export const PlotScale = { Linear:'linear', Band:'band', Point:'point', Ordinal:'ordinal' } as const;

export const OrdinalScaleSchema = z
  .object({
    type: z.literal(PlotScale.Ordinal).describe('Discriminator: ordinal scale mapping a discrete domain to a discrete output range (typically colors)'),
    name: z.string().min(1).describe('Scale name; referenced by a non-positional channel scale ref'),
    domain: z.array(CategoryValueSchema).optional().describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
    range: z.array(z.string()).optional().describe('Output values cycled across the domain (e.g. color strings); omit to use a default categorical color scheme'),
  })
  .describe('Ordinal scale: discrete domain to discrete output range (colors); the workhorse for series color');
```

理由：

1. **color 是多系列的前提**：没有 color 通道 / scale，多条线 / 分组柱无法区分系列——[ADR-05](./05-relation.md) 直接依赖它。先把单通道（color）打通，size / shape / opacity 套同一「非位置通道 + scale ref」模式后续加。
2. **`scale` 引用解决「非位置通道找 scale」**：位置通道的 scale 藏在 coordinate，非位置通道没有归宿，显式 `scale` 名是 grammar of graphics 「scale 名必须显式」（§3.6）的落地；位置通道省略该字段、零影响（非破坏）。
3. **ordinal + d3 配色方案**：`scaleOrdinal` + `d3-scale-chromatic` 是成熟分类配色，省自造调色板；`range` 可显式覆盖（用户给颜色数组）。
4. **每色一子 Scope、颜色上提**：N 行同色 → 一个 `fill` 设在 Scope、子元素不重复写 fill，IR 体积 O(色数) 而非 O(行数)；且天然契合 [ADR-05](./05-relation.md) 的「按系列分子图层」。
5. **JSON 安全 / 可扩展**：color 值、ordinal range 都是字符串数组；`type` 判别位继续扩（size scale 等）非破坏。

## 待决策点

- **默认配色方案**：`range` 省略时用 **`schemeCategory10`**（d3-scale-chromatic，10 色循环，最通用）。色数 > 10 时循环复用（d3 `scaleOrdinal` 默认行为）。引 `d3-scale-chromatic`（catalog 登记）。
- **color 落 fill 还是 stroke**：按 mark 类型——**填充型**（point / interval）落 `fill`，**描边型**（line）落 `stroke` / `color`（master）。lowerMark 各分支自行决定通道（[ADR-05](./05-relation.md) 多线按系列设每线 `color`）。
- **color 与 series 的主从（拍板，与 [ADR-05](./05-relation.md) 一致——评审 P1-5）**：**series 是主分区，color 只定 paint，分组永不「先 color 后 series」**。
  - *无 series*：point / interval 按 color 值分子 Scope（color 即事实分组）；**line 的 color 无 series → 提升为 `series = color`**（一条线不能多色，必须先按色拆成多线）。
  - *有 series*：按 series 分子 Scope，每系列取其 **color 字段值**过 scale 上色（`color` 省略时默认 `color = series`，一系列一色）。`color` 字段 ≠ `series` 字段、且系列内 color 取值不一的「系列内逐 datum 着色」**留后续**——alpha.3 取该系列**首行** color 值定该系列色。
- **color 通道无显式 scale 时**：lowering **自动合成**一个 ordinal color scale（域 = 该字段分类域、range = 默认方案），免用户为「按字段上色」必写一条 scale + scale ref。显式 `scale` 名则查 `scales[]`。DSL（[ADR-07](./07-bindings-dsl.md)）默认走自动合成。
- **`color.value` 常量**：`{ value:'#e4572e' }` → 整个 mark 固定色（不过 scale），等价 alpha.1 的 currentColor 但可指定；与 `field`（过 scale）互斥（沿用 channel refine）。
- **域推断口径**：color 字段的分类域复用 [ADR-01](./01-band-scale.md) `inferCategoryDomain`（保序去重），与 band 同源——保证「系列在图例 / 颜色 / 堆叠序」一致。
- **ScalarValue vs CategoryValue 域**：ordinal `domain` 用 `CategoryValueSchema`（string|number），与 band 对齐；`range` 用 `z.array(z.string())`（颜色串），不混入数值。

## DSL 表面

> `<PointMark color="category" />` 等在 [ADR-07](./07-bindings-dsl.md)。schema / vanilla 视角：

```ts
import { EncodingSchema, ScaleSchema, PlotScale } from '@retikz/plot';

// 散点按 category 上色（color 通道引用名为 'c' 的 ordinal scale）
EncodingSchema.parse({ x:{field:'gdp'}, y:{field:'life'}, color:{ field:'continent', scale:'c' } });
ScaleSchema.parse({ type:'ordinal', name:'c' });                       // 默认配色
ScaleSchema.parse({ type:'ordinal', name:'c', range:['#e4572e','#29335c','#3b7080'] }); // 自定义

// 固定色（不过 scale）
EncodingSchema.parse({ x:{field:'gdp'}, y:{field:'life'}, color:{ value:'#e4572e' } });
```

## 测试设计

`packages/plot/plot/tests/ir/encoding.schema.test.ts`（扩）+ `tests/ir/scale.schema.test.ts`（扩）+ `tests/lower/lowerPlots.test.ts`（扩）覆盖：color 通道 + scale ref accept/reject；ordinal schema；按字段着色 → 每色一子 Scope 设 fill；默认方案循环；显式 range；固定 `color.value`；无 scale ref 自动合成；line 落 stroke / point 落 fill。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/encoding.ts`**（修改）：`ChannelSchema` 加 `scale?`；`EncodingSchema` 加 `color?`。
- **`packages/plot/plot/src/ir/scale.ts`**（修改）：`PlotScale` 加 Ordinal；`OrdinalScaleSchema`；`ScaleSchema` 升 4 成员 union。
- **`packages/plot/plot/src/lower/scale.ts`**（修改）：`resolveOrdinalScale`（d3 scaleOrdinal + 默认方案 + 自动合成）。
- **`packages/plot/plot/src/lower/mark.ts`**（修改）：各 mark 分支按 color scale 分组、每色一子 Scope 设 fill / stroke。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：解析 color scale（显式或合成），传给 lowerMark。
- **`packages/plot/plot/package.json` / `pnpm-workspace.yaml`**（修改）：加 `d3-scale-chromatic` + `@types/d3-scale-chromatic`（catalog）。
- **对外 API**：`@retikz/plot` 公开 `OrdinalScaleSchema`，`PlotScale` 增 Ordinal；`ChannelSchema` / `EncodingSchema` 加字段。
- **对 core**：无（color 在 lowering 算成 CSS 色串落 Scope.fill / element fill，IR 纯 JSON）。
- **被消费**：[ADR-05](./05-relation.md) 多系列按 color 区分；[ADR-07](./07-bindings-dsl.md) `color` prop。
- **文档**：color 编码 / ordinal scale 示例（[ADR-07](./07-bindings-dsl.md) 阶段补）；legend 留后续（不在 alpha.3）。

## 不在本 ADR 范围

- **legend（图例）** → 后续（与 color scale 配套，但富排版 + 布局占位，单独里程碑）。
- **size / shape / opacity 等其余非位置通道** → 后续（套同一「非位置通道 + scale ref」模式）。
- **连续色阶（sequential / diverging，数值 → 渐变色）** → 后续（本 ADR 只 ordinal 分类色）。
- **多系列几何**（按 color 拆多线 / 分组 / 堆叠柱）→ [ADR-05](./05-relation.md)；本 ADR 只做「按字段给元素上色」。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（encoding + scale schema）+ `src/lower/**` + `package.json` 依赖 → red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/encoding.ts` | 加字段 | `ChannelSchema.scale` | `z.string().min(1).optional()` | undefined | 通道 scale 引用（非位置通道用） |
| `src/ir/encoding.ts` | 加字段 | `EncodingSchema.color` | `ChannelSchema.optional()` | undefined | 颜色非位置通道 |
| `src/ir/scale.ts` | 改常量 | `PlotScale` | 加 `Ordinal:'ordinal'` | — | scale 判别值集补 ordinal |
| `src/ir/scale.ts` | 新建 schema | `OrdinalScaleSchema` | `z.object({ type:'ordinal', name, domain?, range? })` | — | 分类 → 离散输出（颜色） |
| `src/ir/scale.ts` | 新建字段 | `OrdinalScaleSchema.range` | `z.array(z.string()).optional()` | undefined（默认方案） | 输出颜色数组 |
| `src/ir/scale.ts` | 改 union | `ScaleSchema` | `z.discriminatedUnion('type',[Linear,Band,Point,Ordinal])` | — | scale 升 4 成员 |

### 文件 scope

- `packages/plot/plot/src/ir/encoding.ts`（修改）
- `packages/plot/plot/src/ir/scale.ts`（修改）
- `packages/plot/plot/src/ir/index.ts`（修改：补导出）
- `packages/plot/plot/src/lower/scale.ts`（修改：resolveOrdinalScale + 自动合成）
- `packages/plot/plot/src/lower/mark.ts`（修改：按 color 分组着色）
- `packages/plot/plot/src/lower/expand.ts`（修改：解析 / 合成 color scale）
- `packages/plot/plot/package.json` / `pnpm-workspace.yaml`（修改：d3-scale-chromatic）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（扩）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（扩）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（扩）

### 测试象限

**Happy path**：

- `color_channel_valid`：`{ x:{field:'a'}, color:{field:'c', scale:'col'} }` → 通过
- `ordinal_schema_valid`：`{ type:'ordinal', name:'col', range:['#a','#b'] }` → 通过
- `color_groups_by_value`：3 类别 → lowering 产 3 个子 Scope，各 fill 不同
- `color_default_scheme`：省略 range → 用 schemeCategory10 前 N 色

**边界**：

- `color_value_constant`：`color:{value:'#e4572e'}` → 整 mark 固定色（不过 scale）
- `ordinal_range_cycles`：域 12 > range 10 → 颜色循环复用
- `color_single_category`：单类别 → 一个子 Scope
- `color_auto_synthesized_scale`：color 有 field 无 scale ref → 自动合成 ordinal 色 scale

**错误路径**：

- `channel_field_and_value_rejected`：同设 field + value → 拒（refine）
- `ordinal_range_non_string_rejected`：`range:[1,2]` → 拒（array string）
- `scale_ref_unknown_rejected`：color.scale 指向不存在的 scale 名 → lowering 抛清晰错误（沿用 alpha.1 未知 scale 校验）

**交互**：

- `point_color_to_fill`：散点按 color → 子 Scope 设 `fill`
- `line_color_to_stroke`：折线按 color → 每线 `color`/`stroke`（[ADR-05](./05-relation.md) 多线前置）
- `color_domain_matches_band`：同字段同时作 band 域与 color 域 → 两域顺序一致（`inferCategoryDomain` 同源）

### 依赖现有元素

- `d3-scale`（`scaleOrdinal`）/ `d3-scale-chromatic`（`schemeCategory10`）—— **复用 / 新增依赖**：颜色映射 + 默认方案。
- [ADR-01 `inferCategoryDomain` / `CategoryValueSchema`](./01-band-scale.md)（`lower/scale.ts` / `ir/scale.ts`）—— **复用**：color 域推断、ordinal domain 类型。
- alpha.1 `ChannelSchema` / `EncodingSchema`（`ir/encoding.ts`）—— **修改**：加 scale / color。
- alpha.1 `lowerMark`（`lower/mark.ts`）—— **修改**：按 color 分子 Scope。
- alpha.1 未知 scale 校验（`lower/expand.ts`）—— **复用**：color.scale 引用校验。

# ADR-05：relation —— series + group(dodge) + stack（多系列柱 / 折线几何）

- 状态：Proposed
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.8 relation / §4.5 mark 构造（relation 是输入非后处理）](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 bar mark](./02-interval-mark.md) · [ADR-03 transform](./03-transform.md) · [ADR-04 color](./04-color-scale.md) · 回溯：[alpha.1 ADR-05 mark（line.order）](../v0.1-alpha.1/05-plot-encoding-mark.md)

## 背景

alpha.1 的 relation 只有 line 的 `order`（连接顺序）。多系列图——多条折线、**分组柱**（同类别多根并排）、**堆叠柱**（同类别累叠）——需要把数据按**系列字段**切分，并决定多系列在几何上如何组合。plot-design §3.8 把这类「多条记录如何组合 / 连接」单列为 **relation**（order / group / series / stack / dodge / connect / facet），**与 mark 解耦**——「怎么连 / 怎么堆 / 怎么分组」不揉进 mark `type`（§4.5：relation 是 mark 构造的输入，不是后处理）。

alpha.3 落 relation 三件（order 已有）：

- **series**：按字段把记录分成多系列（多条线 / 多组柱），每系列一种颜色（[ADR-04](./04-color-scale.md)）。
- **group（dodge）**：同一类别的多系列柱**并排**——把 band（[ADR-01](./01-band-scale.md)）切成 N 个子带，每系列占一个。
- **stack**：同一类别的多系列柱 / 面积**累叠**——消费 [ADR-03](./03-transform.md) stack transform 派生的 `y0/y1`，柱从 `y0` 画到 `y1`。

本 ADR 是 alpha.3 的**集成 ADR**：把 02（bar 几何）+ 03（stack 数据）+ 04（系列色）拼成多系列产物。

## 决策：mark 加 `series` 字段 + bar 的 `arrangement`（dodge/stack）；按系列分子 Scope，dodge 切子带、stack 读 y0/y1

在 mark 上加**两个 relation 字段**（作为 mark 构造输入，不新增 mark type）：

- `series?`（line / interval 通用）：系列字段；present 时 lowering 按其分类域（[ADR-01](./01-band-scale.md) 保序去重）把行分成多系列，**每系列一个子 Scope**（颜色由 [ADR-04](./04-color-scale.md) color scale 给）。line → 多条折线；interval → 多组柱。
- `arrangement?`（仅 interval）：`'dodge'`（并排，默认当有 series 时）/ `'stack'`（累叠）。dodge：把每个 band 按系列数 K 等分为 K 子带，系列 i 的柱落第 i 子带（宽 `bandwidth/K`、中心偏移）。stack：柱从 `y0` 画到 `y1`（来自 [ADR-03](./03-transform.md) stack transform 派生字段），baseline 不再固定 0。

```ts
// packages/plot/plot/src/ir/mark.ts（line / interval 加字段）
export const PlotArrangement = { Dodge:'dodge', Stack:'stack' } as const;
export type ArrangementType = ValueOf<typeof PlotArrangement>;

// LineMarkSchema 加：
series: z.string().min(1).optional().describe('Series field: split records into one line per distinct value (multi-series); each series gets its own color via the color scale'),

// IntervalMarkSchema 加：
series: z.string().min(1).optional().describe('Series field: split records into multiple bar series per distinct value'),
arrangement: z.nativeEnum(PlotArrangement).optional().describe("How multiple series combine within one category: 'dodge' (side-by-side sub-bands; default when series is set) / 'stack' (cumulative, reading the stack-transform y0/y1)"),
y0Field: z.string().min(1).optional().describe('Lower-bound field for stacked bars (matches the stack transform startField; default "y0"). Only read when arrangement = stack'),
y1Field: z.string().min(1).optional().describe('Upper-bound field for stacked bars (matches the stack transform endField; default "y1"). Only read when arrangement = stack'),
```

```ts
// lower/mark.ts interval 多系列分支（示意）
const seriesValues = inferCategoryDomain(rows.map(r => channelValue(mark.series, r)));   // 系列顺序
if (mark.arrangement === 'stack') {
  // 每系列一子 Scope（fill=color），柱 y 从 y0Field 到 y1Field（来自 ADR-03 transform）
} else { // dodge（默认）
  const K = seriesValues.length;
  const sub = project.xBandwidth / K;                 // 子带宽
  // 系列 i 的柱：中心 = 类别 band 起点 + (i + 0.5) * sub，宽 = sub
}
```

理由：

1. **relation 字段在 mark 上、但语义独立于 mark type**（§4.5）：`series` / `arrangement` 是 mark 构造输入，line / interval 共享 `series`；不为「分组柱」「堆叠柱」造新 mark type（否则 chart-type 思维回潮）。bar 仍是一个 `interval`，组合方式由 `arrangement` 调。
2. **dodge 复用 band `bandwidth`**：子带 = band 均分，几何单一真源仍是 x band scale（[ADR-01](./01-band-scale.md)），与轴刻度对齐；不另引子 scale（子带均分是确定算法、无需 scale 对象）。
3. **stack 数据与几何分离**（§3.8）：累积区间 `y0/y1` 由 [ADR-03](./03-transform.md) transform 算（数据职责），interval mark 只读字段画矩形（几何职责）——`arrangement:'stack'` 把 baseline 从 0 切换到 `y0`。两者解耦：换 streamgraph 只改 transform。
4. **每系列一子 Scope、颜色上提**：N 系列 → N 子 Scope（各设 fill / color），续 [ADR-04](./04-color-scale.md) 的「颜色上提 Scope」，IR 体积 O(系列 × 类别) 而非逐元素重复色。
5. **多线 = line + series**：line 的 `series` 把行分组、各组按 order 连线、各线一色——多系列折线无需新 mark。

## 待决策点

- **dodge vs stack 的开关位置**：选 **interval 的 `arrangement` 字段**（`dodge`/`stack`），`series` present 且 `arrangement` 省略 → 默认 **dodge**。备选「靠 transform 有无 stack 推断」被否：mark 几何不应反查 transform 存在性，显式 `arrangement` 更清晰。
- **stack 的 y0/y1 来源耦合**：interval `y0Field`/`y1Field` 默认 `"y0"`/`"y1"`，须与 [ADR-03](./03-transform.md) stack 的 `startField`/`endField` 对齐——**DSL（[ADR-07](./07-bindings-dsl.md)）`<BarMark stack>` 同时装配 transform + arrangement + 字段名，保证一致**；手写 spec 时用户自负对齐（文档说明）。
- **dodge 子带顺序 / padding**：子带按系列分类域顺序排列；子带间是否再留缝——alpha.3 **不留**（子带紧贴，组间缝由 band paddingInner 提供）；子带内 padding 留后续。
- **dodge 的 series 域来源**：取该 mark `series` 字段在**全数据**的分类域（不是逐类别各算），保证每个类别的子带数 / 顺序一致（缺某系列的类别留空位，对齐）。
- **line 多系列的 order**：每系列内部仍按 line `order`（或数据序）连点；series 只分组不排序。
- **color 与 series 的主从（拍板，与 [ADR-04](./04-color-scale.md) 统一——评审 P1-5）**：**series 是主分区，color 只定 paint，lowering 永不「先 color 后 series」**。无 series 时按 color 分组（line 的 color 无 series → 提升 `series = color`）；有 series 时按 series 分子 Scope、每系列取 color 字段值上色（`color` 省略默认 `color = series`）。`color` ≠ `series` 且系列内取值不一 → alpha.3 取该系列**首行** color 值，「系列内逐 datum 着色」留后续。
- **未知字段不靠 schema 拒（评审 P1-3）**：mark schema **不加 `.strict()`**（沿用 alpha.1/alpha.2，IR round-trip 测试依赖 zod 默认 strip）。line 误写 `arrangement` 由 **TS `LineMarkProps` 类型挡**（无此 prop）、schema 层静默 strip，不报错——故测试断言「忽略」而非「拒绝」。
- **stack 缺 y0/y1 的处理（拍板，与 [ADR-03](./03-transform.md) 对齐——评审 P1-4）**：`arrangement:'stack'` 但行缺 `y0Field`/`y1Field`（手写 spec 忘配 stack transform）→ lowering **抛清晰错误**（提示「stacked interval 需配套 stack transform 派生 y0/y1」），**不静默退化**。DSL（[ADR-07](./07-bindings-dsl.md)）自动装配 transform，只有手写 spec 才会触发。
- **横向柱 / 负值堆叠 / 百分比堆叠** → 不在本 ADR。

## DSL 表面

> `<BarMark series color stack/dodge>` / 多线在 [ADR-07](./07-bindings-dsl.md)。schema / vanilla 视角：

```ts
import { MarkSchema } from '@retikz/plot';

// 分组柱（默认 dodge）：按 product 分系列并排
MarkSchema.parse({ type:'interval', series:'product', encoding:{ x:{field:'month'}, y:{field:'revenue'}, color:{field:'product',scale:'col'} } });

// 堆叠柱：配 ADR-03 stack transform（x/y/groupBy 对齐）
MarkSchema.parse({ type:'interval', series:'product', arrangement:'stack', encoding:{ x:{field:'month'}, y:{field:'revenue'}, color:{field:'product',scale:'col'} } });

// 多系列折线
MarkSchema.parse({ type:'line', series:'product', order:'month', encoding:{ x:{field:'month'}, y:{field:'revenue'}, color:{field:'product',scale:'col'} } });
```

## 测试设计

`packages/plot/plot/tests/ir/mark.schema.test.ts`（扩）+ `tests/lower/lowerPlots.test.ts`（扩，多系列几何）覆盖：series / arrangement schema；dodge 子带宽 = bandwidth/K、偏移正确、子带数 = 系列数；stack 柱从 y0 到 y1、累叠衔接；多线按 series 分组各一色；缺系列的类别对齐留空；series 省略 → 退化单系列（等价 [ADR-02](./02-interval-mark.md)）。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/mark.ts`**（修改）：`PlotArrangement`；line 加 `series?`；interval 加 `series?` / `arrangement?` / `y0Field?` / `y1Field?`。
- **`packages/plot/plot/src/lower/mark.ts`**（修改）：line / interval 多系列分支（分子 Scope、dodge 切子带、stack 读 y0/y1）。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：把 series / color scale 解析结果传入 lowerMark；y 域推断对 stack 取 y1 上界、对 dodge 取 y 值。
- **对外 API**：`@retikz/plot` line / interval schema 加字段，公开 `PlotArrangement`。
- **对 core**：无（多系列仍下沉 Scope/Node/Path，不依赖 core 新能力）；多系列子 Scope 为 alpha.5「按系列命中」预留结构（仅埋点）。
- **被依赖**：[ADR-07](./07-bindings-dsl.md) 的 `series` / `stack` / `dodge` props + 多系列 demo。
- **文档**：分组柱 / 堆叠柱 / 多线示例（[ADR-07](./07-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **横向柱（y 分类）、负值 / 百分比 / 居中堆叠（streamgraph / normalize）** → 后续。
- **stack transform 本身**（算 y0/y1）→ [ADR-03](./03-transform.md)；本 ADR 只消费。
- **connect / ribbon（跨记录 / 跨 scope 关系线）、facet（多 coordinate scope）** → 后续 / alpha.5+。
- **legend（系列图例）** → 后续。
- **子带内 padding、系列排序控制** → 后续（非破坏加字段）。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（mark 字段）+ `src/lower/**`（多系列几何）→ red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/mark.ts` | 新建常量 | `PlotArrangement` | `{ Dodge:'dodge', Stack:'stack' } as const` | — | 多系列柱组合方式判别值集 |
| `src/ir/mark.ts` | 加字段 | `LineMarkSchema.series` | `z.string().min(1).optional()` | undefined | 系列字段（拆多线） |
| `src/ir/mark.ts` | 加字段 | `IntervalMarkSchema.series` | `z.string().min(1).optional()` | undefined | 系列字段（拆多组柱） |
| `src/ir/mark.ts` | 加字段 | `IntervalMarkSchema.arrangement` | `z.nativeEnum(PlotArrangement).optional()` | undefined（有 series 时 dodge） | dodge / stack |
| `src/ir/mark.ts` | 加字段 | `IntervalMarkSchema.y0Field` | `z.string().min(1).optional()` | undefined（"y0"） | 堆叠下界字段（对齐 transform startField） |
| `src/ir/mark.ts` | 加字段 | `IntervalMarkSchema.y1Field` | `z.string().min(1).optional()` | undefined（"y1"） | 堆叠上界字段（对齐 transform endField） |

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（修改）
- `packages/plot/plot/src/ir/index.ts`（修改：补 PlotArrangement 导出）
- `packages/plot/plot/src/lower/mark.ts`（修改：多系列 / dodge / stack 几何）
- `packages/plot/plot/src/lower/expand.ts`（修改：传 series + color；y 域含堆叠上界）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（扩）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（扩：多系列几何断言）

### 测试象限

**Happy path**：

- `interval_series_schema_valid` / `interval_stack_schema_valid`：合法 → 通过
- `dodge_subband_width`：K=2 系列、band 宽 100 → 每子带宽 50
- `dodge_subband_offset`：系列 0 / 1 柱中心 = band 起点 + 25 / 75
- `stack_bar_from_y0_to_y1`：堆叠柱高 = |y(y1)−y(y0)|、段衔接（下段 y1 = 上段 y0）
- `line_multi_series`：series 拆 2 组 → 2 条 Path、各一色

**边界**：

- `series_omitted_single`：无 series → 退化单系列（等价 [ADR-02](./02-interval-mark.md) 柱 / alpha.1 线）
- `dodge_missing_series_in_category`：某类别缺某系列 → 对应子带空位（其余子带位置不变、对齐）
- `single_series_value`：series 只有 1 个值 → 1 子带占满 band（等价非分组）
- `stack_single_series`：单系列 stack → 等价非堆叠柱（y0=0）

**错误路径**：

- `arrangement_bad_value_rejected`：`arrangement:'pile'` → 拒（nativeEnum）
- `line_arrangement_ignored`：line 上写 `arrangement` → zod 默认 strip（mark schema 不加 `.strict()`）；TS `LineMarkProps` 无该 prop 已先挡。断言「被忽略」非「报错」
- `stack_without_y0y1_fields`：arrangement stack 但行缺 y0/y1（未配 stack transform）→ lowering **抛清晰错误**（不静默退化）

**交互**：

- `dodge_uses_band_and_color`：分组柱 = band 子带（[ADR-01](./01-band-scale.md)）× 系列色（[ADR-04](./04-color-scale.md)），子带对齐轴、每系列一色
- `stack_consumes_transform`：[ADR-03](./03-transform.md) stack transform + interval stack 端到端 → 堆叠柱总高 = 各段和
- `series_color_same_field`：series 字段 == color 字段 → 系列分组顺序与颜色顺序一致

### 依赖现有元素

- [ADR-02 interval mark](./02-interval-mark.md)（`lower/mark.ts`）—— **扩展**：单系列柱 → 多系列 dodge/stack。
- [ADR-03 stack transform](./03-transform.md)（`lower/transform.ts`）—— **消费**：堆叠读 y0/y1。
- [ADR-04 color scale / 子 Scope 着色](./04-color-scale.md)（`lower/mark.ts` / `lower/scale.ts`）—— **消费**：每系列一色。
- [ADR-01 `inferCategoryDomain` / `bandwidth`](./01-band-scale.md)—— **复用**：系列域、子带均分。
- alpha.1 line `order` / `compareByPath`（`ir/mark.ts` / `lower/field.ts`）—— **复用**：系列内连接顺序。

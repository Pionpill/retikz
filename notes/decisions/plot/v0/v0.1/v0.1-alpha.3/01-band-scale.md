# ADR-01：band / point scale（分类域 + bandwidth；projector 抽象为 PositionScale）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.4 scale / §3.5 coordinate / §4.3 管线](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-03 scale](../v0.1-alpha.1/03-plot-scale.md) · [alpha.2 ADR-02 d3-scale](../v0.1-alpha.2/02-d3-scale.md) · 消费方：[ADR-02 bar mark](./02-interval-mark.md) · [ADR-05 relation](./05-relation.md)

## 背景

alpha.1/alpha.2 的 scale 只有 **linear**——连续数值 `[min,max] → [r0,r1]`。柱状图的 x 轴是**分类**的（「一月 / 二月 / 三月」而非连续数轴）：每个类别占据一段等宽的「band」，柱画在 band 里、宽度 = band 宽。这正是 grammar of graphics 的 **band scale**（plot-design §3.4 列出 band / point）；d3-scale 的 `scaleBand` 现成提供 `domain（类别数组）→ range`、`bandwidth()`（每类宽度）、`step()`、`paddingInner/Outer`。其姊妹 `scalePoint`（band 的退化：bandwidth=0、类别落在点上）用于「分类轴上的折线 / 散点」。

引入 band 牵动三处现状：

1. **域推断**：linear 的域 = 数值 extent（d3 `extent`）；band 的域 = **按数据出现顺序去重的类别序列**（不是排序、不是 min/max）。`expandPlot` 现在的 `axisValues` 只收 `isFiniteNumber`，分类值（字符串）会被丢掉——要加一条分类域推断路径。
2. **投影**：linear 的 `scale(value)` 直接返回坐标；band 的 `scaleBand()(value)` 返回 **band 起点**，点 / 线要居中（`起点 + bandwidth/2`）、柱要占满（`起点 .. 起点+bandwidth`）。现在 projector 直接把 d3 scale 当 `(value)=>number` 调用，对 band 语义不对。
3. **guide**：linear 轴刻度走 `scale.ticks(count)` + `nice`；band 轴刻度 = **每个类别一个刻度，落在 band 中心**，标签 = 类别串，**无 nice / 无 tickFormat 数值格式化**。

本 ADR 定 band / point 的 **scale IR + lowering 解析 + projector 抽象 + guide 适配**；不含柱几何（[ADR-02](./02-interval-mark.md)）、分组 / 堆叠（[ADR-05](./05-relation.md)）。

## 决策：scale union 加 band / point；lowering 引入统一 `PositionScale`（coordinate + bandwidth），分类域按数据序去重

`ScaleSchema` 从「仅 linear」升为含 `band` / `point` 的 discriminated union（`type` 判别位已在，非破坏）。lowering 不再把 d3 scale 直接当函数用，而是经一层 **`PositionScale`** 归一化：暴露 `coordinate(value)`（连续 = `scale(value)`；band = 居中 `scale(v)+bandwidth/2`；point = `scale(v)`）、`bandwidth`（连续 / point = 0，band = `scale.bandwidth()`）、`ticks(count?)`（连续走 alpha.2 `scaleTicks`；band/point = 类别落位 + 类别串标签）。projector 与 guide 都改吃 `PositionScale`，linear 行为逐字不变（`bandwidth=0`、`coordinate=scale(value)`）。

```ts
// packages/plot/plot/src/ir/scale.ts（扩 union）
import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

export const PlotScale = {
  /** 连续线性映射 */
  Linear: 'linear',
  /** 分类带：每个类别占一段等宽 band（柱状图 x 轴） */
  Band: 'band',
  /** 分类点：band 的退化，类别落在等距点上（分类轴上的折线 / 散点） */
  Point: 'point',
} as const;
export type ScaleType = ValueOf<typeof PlotScale>;

/** 分类标量：类别取值（字符串或数值；不含 boolean/null） */
export const CategoryValueSchema = z.union([z.string(), z.number()]);

export const BandScaleSchema = z
  .object({
    type: z.literal(PlotScale.Band).describe('Discriminator: categorical band scale; each category occupies one equal-width band'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z.array(CategoryValueSchema).optional().describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
    paddingInner: z.number().min(0).max(1).optional().describe('Gap between adjacent bands as a fraction of step, 0..1; default 0.1'),
    paddingOuter: z.number().min(0).max(1).optional().describe('Gap before the first and after the last band as a fraction of step, 0..1; default = paddingInner'),
    align: z.number().min(0).max(1).optional().describe('How outer padding is distributed around the bands, 0..1; default 0.5 (centered)'),
  })
  .describe('Band scale: maps a discrete category set to equal-width bands across the range');

export const PointScaleSchema = z
  .object({
    type: z.literal(PlotScale.Point).describe('Discriminator: categorical point scale; categories land on evenly spaced points (zero bandwidth)'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z.array(CategoryValueSchema).optional().describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
    padding: z.number().min(0).max(1).optional().describe('Outer padding as a fraction of step, 0..1; default 0.5'),
    align: z.number().min(0).max(1).optional().describe('How padding is distributed, 0..1; default 0.5 (centered)'),
  })
  .describe('Point scale: degenerate band (zero width) placing categories on evenly spaced positions');

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema, BandScaleSchema, PointScaleSchema])
  .describe('Scale union: linear (continuous) / band / point (categorical); extensible to time / ordinal / color in later ADRs');
```

lowering 侧（示意，`packages/plot/plot/src/lower/scale.ts`）：

```ts
/** 投影归一化层：连续 / band / point 统一对 projector & guide 暴露同一形态 */
export type PositionScale = {
  /** 把一个数据值投到坐标（连续=scale(value)；band=band 中心；point=点位） */
  coordinate: (value: ScalarValue) => number;
  /** band 宽（连续 / point = 0；band = scale.bandwidth()）；bar 用它定柱宽 */
  bandwidth: number;
  /** 刻度位置 + 标签（连续走 scaleTicks；band/point = 每类别一刻度、落 band 中心 / 点位） */
  ticks: (count?: number) => TickSet;
};

/** 分类域推断：按数据出现顺序去重（非排序、非 extent） */
export const inferCategoryDomain = (values: Array<ScalarValue>): Array<string | number> => {
  const seen = new Set<string | number>();
  const out: Array<string | number> = [];
  for (const v of values) {
    if (typeof v !== 'string' && typeof v !== 'number') continue;
    if (!seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
};
```

理由：

1. **band 是柱状图 / 分类轴的地基**：没有 band scale 无法表达「类别等宽占位」；d3 `scaleBand` 是成熟实现（padding / align / bandwidth / step），自写又是造轮子（同 alpha.2 ADR-02 的论证）。
2. **`PositionScale` 抽象隔离 band 语义**：把「band 起点 vs 中心」「bandwidth 是否为 0」收进一层，projector / guide / bar 只认 `coordinate` + `bandwidth`，**不必各自分支 linear/band**——加 time / ordinal 时同样套这层。linear 走 `bandwidth=0` + `coordinate=scale(value)`，**逐字守住 alpha.1/alpha.2 投影**。
3. **分类域按数据序去重**：符合用户直觉（图上类别顺序 = 数据顺序），排序是 [ADR-03](./03-transform.md) transform 的显式职责、不在 scale 隐式做。
4. **JSON 安全 + 可扩展**：band/point 字段全 JSON 可序列化；`type` 判别位为 time / ordinal 继续扩 union 留空间，旧 IR 不破。

## 待决策点

- **band 是否同时出 point**：选 **都出**。point 是 band 的退化（bandwidth=0），分类轴上的折线 / 散点需要它（折线连分类点）；d3 同包、成本低；不出的话「分类 x 的折线」无处落。
- **paddingInner 默认值**：选 **0.1**（柱间留窄缝，主流默认）。d3 `scaleBand` 原始默认是 0（柱贴柱），但视觉上柱状图普遍带缝；lowering 在 `def.paddingInner ?? 0.1` 兜默认，用户显式 0 则贴合。paddingOuter 默认 = paddingInner。
- **point padding 默认值**：选 **0.5**（首尾各留半步，类别点不贴边），对齐 d3 `scalePoint` 默认。
- **域推断收谁的值**：收**该维度所有 mark 的 encoding 字段值**（沿用 alpha.2 `axisValues` 的聚合口径），分类路径用 `inferCategoryDomain`、连续路径用 `extent`，按 scale.type 二选一。
- **band 刻度 `tickCount` 语义**：band 轴**忽略 `tickCount`**——每类别一刻度（落 band 中心），不做「抽稀显示」。类别过多时的 thinning / 旋转标签留后续（非破坏）。
- **混用校验**：coordinate.x 绑 band scale 但对应 encoding 给的是纯数值、或 linear scale 绑到分类字段——lowering 以「按 scale.type 走对应域推断」为准，类型不匹配时产出退化（空域 → d3 行为），**不**在本 ADR 加强校验（留给 data model 校验，后续）。

## DSL 表面

> 本 ADR 是 scale IR + lowering 层；面向用户的 scale 选择（`<BarMark>` 自动用 band x）在 [ADR-07](./07-bindings-dsl.md)。schema / vanilla 视角：

```ts
import { ScaleSchema, PlotScale } from '@retikz/plot';

// 分类 x（类别从数据推断，柱间 10% 缝）
ScaleSchema.parse({ type: 'band', name: 'x' });
// 显式类别顺序 + 无缝
ScaleSchema.parse({ type: 'band', name: 'x', domain: ['Q1', 'Q2', 'Q3', 'Q4'], paddingInner: 0 });
// 分类轴上的折线用 point
ScaleSchema.parse({ type: 'point', name: 'x' });
```

## 测试设计

`packages/plot/plot/tests/ir/scale.schema.test.ts`（扩）+ `tests/lower/scale.test.ts`（扩）覆盖：band/point schema accept/reject；分类域去重（保序、去重、过滤非标量）；`coordinate` 居中（band）/ 点位（point）；`bandwidth` 值（band>0、point/linear=0）；band 刻度落中心 + 标签 = 类别串；linear 经 `PositionScale` 后投影 / 刻度与 alpha.2 逐字等价（向后兼容）。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/scale.ts`**（修改）：`PlotScale` 加 Band/Point；新增 `CategoryValueSchema` / `BandScaleSchema` / `PointScaleSchema`；`ScaleSchema` 升 3 成员 union。
- **`packages/plot/plot/src/lower/scale.ts`**（修改）：新增 `PositionScale` 抽象 + `resolveBandScale` / `resolvePointScale` + `inferCategoryDomain`；`resolveLinearScale` 包成 `PositionScale`（行为不变）；`scaleTicks` 扩出 band/point 分支（类别落位）。
- **`packages/plot/plot/src/lower/project.ts`**（修改）：projector 改吃 `PositionScale.coordinate`（而非裸 d3 scale），暴露 `bandwidth` 给 bar。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：`axisValues` 按 scale.type 分流（分类 → `inferCategoryDomain`、连续 → extent）；建 scale 走新 dispatcher。
- **对外 API**：`@retikz/plot` 公开 `BandScaleSchema` / `PointScaleSchema` / `CategoryValueSchema`，`PlotScale` 增成员。
- **对 core**：无（band/point 在 lowering 内部，IR 仍纯 JSON）。
- **被消费**：[ADR-02](./02-interval-mark.md) 用 `bandwidth` 定柱宽、`coordinate` 定柱位；[ADR-05](./05-relation.md) dodge 在 band 内切子带；guide lowering 复用 `PositionScale.ticks`。
- **文档**：scale 概念页 / band 示例（[ADR-07](./07-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **柱几何 / baseline**（bar 怎么画）→ [ADR-02](./02-interval-mark.md)。
- **分组（dodge：band 内切子带）/ 堆叠** → [ADR-05](./05-relation.md)。
- **ordinal·color scale**（分类 → 颜色）→ [ADR-04](./04-color-scale.md)；**time scale** → [ADR-06](./06-time-scale.md)。
- **类别过多的标签 thinning / 旋转 / 自动隐藏** → 后续。
- **log / pow / sqrt / quantize / threshold scale** → 后续。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（scale schema）+ `src/lower/**`（PositionScale / projector 契约边界）→ red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/scale.ts` | 改常量 | `PlotScale` | 加 `Band:'band'` / `Point:'point'` | — | scale 类型判别值集补分类 |
| `src/ir/scale.ts` | 新建 schema | `CategoryValueSchema` | `z.union([z.string(), z.number()])` | — | 分类标量（类别取值） |
| `src/ir/scale.ts` | 新建 schema | `BandScaleSchema` | `z.object({ type:'band', name, domain?, paddingInner?, paddingOuter?, align? })` | — | 分类带 scale |
| `src/ir/scale.ts` | 新建字段 | `BandScaleSchema.domain` | `z.array(CategoryValueSchema).optional()` | undefined（推断） | 类别序列，省略=按数据序去重推断 |
| `src/ir/scale.ts` | 新建字段 | `BandScaleSchema.paddingInner` | `z.number().min(0).max(1).optional()` | undefined（lowering 0.1） | 柱间缝（占 step 比例） |
| `src/ir/scale.ts` | 新建字段 | `BandScaleSchema.paddingOuter` | `z.number().min(0).max(1).optional()` | undefined（= paddingInner） | 首尾缝 |
| `src/ir/scale.ts` | 新建字段 | `BandScaleSchema.align` | `z.number().min(0).max(1).optional()` | undefined（0.5） | 外缝分布 |
| `src/ir/scale.ts` | 新建 schema | `PointScaleSchema` | `z.object({ type:'point', name, domain?, padding?, align? })` | — | 分类点 scale（bandwidth=0） |
| `src/ir/scale.ts` | 新建字段 | `PointScaleSchema.padding` | `z.number().min(0).max(1).optional()` | undefined（0.5） | 外缝 |
| `src/ir/scale.ts` | 改 union | `ScaleSchema` | `z.discriminatedUnion('type',[Linear,Band,Point])` | — | scale 升 3 成员 |

### 文件 scope

- `packages/plot/plot/src/ir/scale.ts`（修改）
- `packages/plot/plot/src/ir/index.ts`（修改：补导出）
- `packages/plot/plot/src/lower/scale.ts`（修改：PositionScale + band/point + inferCategoryDomain）
- `packages/plot/plot/src/lower/project.ts`（修改：projector 吃 PositionScale）
- `packages/plot/plot/src/lower/expand.ts`（修改：axisValues 分流 + scale dispatcher）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（扩）
- `packages/plot/plot/tests/lower/scale.test.ts`（扩）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（守 linear 向后兼容）

### 测试象限

**Happy path**：

- `band_schema_valid`：`{ type:'band', name:'x', domain:['a','b'] }` → 通过
- `point_schema_valid`：`{ type:'point', name:'x' }` → 通过
- `band_coordinate_center`：3 类别 band 投到 range `[0,300]` → `coordinate('b')` 落第 2 个 band 中心
- `band_bandwidth_positive`：band `bandwidth > 0`、point/linear `bandwidth === 0`

**边界**：

- `category_domain_dedup_order`：`['b','a','b','c','a']` → 推断域 `['b','a','c']`（保序去重）
- `category_domain_filter_nonscalar`：含 `null`/对象 → 被过滤
- `band_single_category`：单类别 → 占满整个 range（一个 band）
- `band_padding_default`：省略 paddingInner → lowering 用 0.1；显式 0 → 柱贴柱

**错误路径**：

- `band_padding_out_of_range_rejected`：`paddingInner:1.5` / `-0.1` → 拒（min0 max1）
- `scale_unknown_type_rejected`：`{ type:'log', name:'x' }` → 拒（union 暂无 log）
- `band_domain_bad_element_rejected`：`domain:[true]` / `domain:[{}]` → 拒（CategoryValue）

**交互（向后兼容 / 跨 ADR）**：

- `linear_through_positionscale_unchanged`：linear 经 `PositionScale` 后 `coordinate(value)` / `ticks()` 与 alpha.2 逐字相等（守投影 + 刻度兼容）
- `band_ticks_at_centers`：band 轴 `ticks()` 的位置 = 各 band 中心、labels = 类别串、无 nice
- `band_feeds_bar_width`：同一 band scale 的 `bandwidth` 给 bar 定宽、`coordinate` 给柱定位，二者一致（[ADR-02](./02-interval-mark.md) 前置）

### 依赖现有元素

- `d3-scale`（`scaleBand` / `scalePoint`，alpha.2 已引入 d3-scale）—— **复用**：band/point 实现。
- `inferCategoryDomain`（本 ADR 新增，替代连续 `extent` 的分类路径）—— **新增**。
- alpha.2 `resolveLinearScale` / `scaleTicks`（`lower/scale.ts`）—— **包装**：纳入 `PositionScale`，行为不变。
- alpha.1/alpha.2 `createCartesianProjector`（`lower/project.ts`）—— **修改**：吃 `PositionScale.coordinate`。
- [alpha.1 ADR-04 coordinate](../v0.1-alpha.1/04-plot-coordinate.md) —— **约束来源**：coordinate.x/y 绑 scale name，band 经其接入位置通道。

# ADR-02：采用 d3-scale 作 scale / 刻度 / 格式化基础（回溯 alpha.1 自写 linear）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 scale / §3.9 guide / §13（plot 可拉 d3-scale）](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md) · 消费方：[ADR-03 布局](./03-plot-area-layout.md) · [ADR-04 guide lowering](./04-guide-lowering.md)

## 背景

坐标轴 / 网格要落在「好看的刻度」上（`[0,9.7]` 该画 0/2/4/6/8 而非每隔 1.94），并带格式化标签——这就是 scale + auto-tick。alpha.1 为「最薄闭环」**自写**了一个 13 行的 linear（`packages/plot/plot/src/lower/scale.ts`：手算 `domain→range` + `extent`），本 ADR 原打算继续自写 nice-tick 算法。

但 **plot 是 Tier 2、可以依赖 d3**——「运行时只准 zod」是 **core** 的白名单，plot 不进 core；plot-design §13 本就预期「图表会拉 d3-scale / 颜色映射」。`d3-scale` 的 `scaleLinear` 现成提供 domain/range/clamp/**nice**/**ticks**/**tickFormat**/invert，`scale.ticks(count)` 就是成熟的 1/2/5×10ⁿ 算法、`scale.tickFormat(count)` 就是去尾零 + 自适应精度的标签格式化。后续 alpha.3 的 band/time/ordinal/log scale 与颜色映射也都在 `d3-scale` / `d3-scale-chromatic`。**自己再写一套既多 bug 又重复造轮子**。

故本 ADR 改为：**plot lowering 以 `d3-scale` 为 scale 基础**，刻度 / 格式化由 scale 提供；并**回溯重构 alpha.1 自写的 `resolveLinearScale`**。原「自写 auto-tick 算法」整段作废。

## 决策：plot 自 alpha.2 起以 d3-scale 为 scale/tick/format 基础；alpha.1 自写 linear 重构为 scaleLinear

`resolveLinearScale` 重写为基于 `d3.scaleLinear()`（domain 经 `d3-array` 的 `extent` 推断或显式给定、range 由坐标系/plot area 给）；刻度与标签直接取 `scale.ticks(count)` / `scale.tickFormat(count)`。删除自写的 `linear` / `linearTicks` / `formatTickLabel` / `computeTicks`。plot 包加 `d3-scale` + `d3-array` 运行时依赖（catalog 登记）；d3 只在 **lowering 内部**算，**不进 IR**（IR 仍纯 JSON，core/render 不碰 d3）。

```ts
// packages/plot/plot/src/lower/scale.ts（重构，基于 d3-scale）
import { extent } from 'd3-array';
import { scaleLinear, type ScaleLinear } from 'd3-scale';

/** 默认目标刻度数（AxisGuide.tickCount 省略时用） */
export const DEFAULT_TICK_COUNT = 5;

/** 从一组数值求 [min,max]；空集回退 [0,1]（保留 alpha.1 边界语义） */
const safeExtent = (values: Array<number>): [number, number] => {
  const [lo, hi] = extent(values); // d3-array：空集 → [undefined, undefined]
  return lo === undefined || hi === undefined ? [0, 1] : [lo, hi];
};

/**
 * 建线性 scale（d3-scale）
 * @description domain 缺省从绑定数据值推断（d3 extent）；range 缺省用 fallback（坐标系 / plot area 给）。
 *   返回的 d3 ScaleLinear 本身可作 (value)=>number 调用，投影器照常用；并暴露 .ticks/.tickFormat 供 guide
 */
export const resolveLinearScale = (
  def: { domain?: readonly [number, number]; range?: readonly [number, number]; nice?: boolean; clamp?: boolean },
  values: Array<number>,
  fallbackRange: readonly [number, number],
): ScaleLinear<number, number> => {
  const scale = scaleLinear()
    .domain([...(def.domain ?? safeExtent(values))])
    .range([...(def.range ?? fallbackRange)]);
  if (def.nice) scale.nice();   // 消费 alpha.1 LinearScale.nice 字段（此前未用）
  if (def.clamp) scale.clamp(true);
  return scale;
};

/** 刻度位置 + 对齐标签（替代自写 computeTicks）；count 来自 AxisGuide.tickCount ?? 默认 */
export type TickSet = { values: Array<number>; labels: Array<string> };
export const scaleTicks = (scale: ScaleLinear<number, number>, count = DEFAULT_TICK_COUNT): TickSet => {
  const values = scale.ticks(count);
  const format = scale.tickFormat(count);
  return { values, labels: values.map(format) };
};
```

理由：

1. **不重复造轮子**：`scale.ticks` = 成熟 1/2/5×10ⁿ、`scale.tickFormat` = 去尾零 + 自适应精度（比自写的 `toFixed` 朴素格式更稳）；nice / clamp / invert 一并白拿。
2. **为 alpha.3 铺路**：band/time/ordinal/log + 颜色映射都在 d3-scale 家族，统一一套基础，避免每加一种 scale 自写一遍。
3. **plot 本就允许依赖 d3**（plot-design §13）；core 的 zod 白名单不约束 Tier 2。
4. **不污染 IR**：scale / tick 计算只在 lowering 内部产像素 / 刻度数；IR 仍是纯 JSON 的 core `Scope/Node/Path`，AI 一等公民契约不动。
5. **回溯统一**：alpha.1 自写 linear 是「最薄闭环」的临时物，本就该并入 d3-scale；现在趁 alpha.2 要加 ticks/format/nice（自写成本陡增）一次纠偏。

## 待决策点

- **引哪些 d3 子包**：`d3-scale`（scaleLinear/ticks/tickFormat，内部依赖 d3-array/d3-format/d3-interpolate）+ `d3-array`（extent）。倾向显式直依赖这两个 + `@types/*`；都小、ESM、tree-shakable。
- **`nice` 是否默认开**：alpha.1 `LinearScale.nice` 字段此前未用；本 ADR 让 `def.nice` → `scale.nice()`。默认仍 **不开**（沿用 alpha.1 optional 语义），用户显式 `nice:true` 才扩展 domain。备选默认开（轴端点更整）。倾向不开（不悄改既有投影）。
- **向后兼容 — `d0===d1`（single datum）边界**：alpha.1 自写 `linear` 在 domain 退化时取 range 中点 `(r0+r1)/2`；`d3.scaleLinear().domain([a,a])` 的映射行为需核验（可能给 range[0]）。**必须守住 alpha.1 `lower_single_datum_point` 等测试**——若 d3 行为不同，在 `resolveLinearScale` 对 `d0===d1` 显式取中点兜一层。实现时验证并加测试。
- **degenerate / 反向 / 非有限 domain**：交给 d3-scale，行为以 d3 为准（d3 `ticks` 对 `[a,a]`→`[a]`、支持反向 domain）；用测试锁定实际行为，不再自定义。alpha.1 [W1](../v0.1-alpha.1/roadmap.md) 已在 lowerPlots 挡非有限 width/height（range 侧）。
- **tickFormat 定制**：alpha.2 用 d3 默认 `scale.tickFormat(count)`；自定义 formatter / 科学计数 / 千分位留后续（d3-format 支持，按需暴露）。

## DSL 表面

无直接用户表面（scale / tick 是 lowering 内部）。用户经 [ADR-01](./01-guide-ir.md) `AxisGuide.tickCount` 间接控制 `scale.ticks(count)`：

```ts
{ type: 'axis', dimension: 'y', tickCount: 3 } // → scale.ticks(3) / scale.tickFormat(3)
```

## 测试设计

`packages/plot/plot/tests/lower/scale.test.ts`（新建 / 扩充）覆盖：scale 映射与 alpha.1 等价（同 domain/range → 同像素，守投影向后兼容）；`scaleTicks` 产 nice 刻度 + 去尾零标签；`tickCount` 控制密度；`nice` 开关；degenerate / single-datum / 非有限 domain 行为（以 d3 为准、锁定）；空 values → `[0,1]` extent。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/lower/scale.ts`**（**重构**）：基于 `d3-scale` 重写 `resolveLinearScale`；新增 `scaleTicks` / `TickSet` / `DEFAULT_TICK_COUNT`；删自写 `linear` / `extent`（改用 d3）。
- **不新建 `lower/ticks.ts`**（原计划自写算法作废）。
- **`packages/plot/plot/package.json`**（修改）：deps 加 `d3-scale`、`d3-array`（`catalog:`）；devDeps 加 `@types/d3-scale`、`@types/d3-array`。
- **`pnpm-workspace.yaml`**（修改）：catalog 登记 `d3-scale` / `d3-array` / 类型版本。
- **`packages/plot/plot/src/lower/expand.ts`**（轻改）：`resolveLinearScale` 返回类型由 `LinearScaleFn` → `ScaleLinear`（仍可作 `(value)=>number` 调用，投影器兼容）。
- **被消费**：[ADR-03](./03-plot-area-layout.md) 用 `scaleTicks` 拿 labels 估算 margin；[ADR-04](./04-guide-lowering.md) 用 `scaleTicks` 拿刻度 + 标签、`scale(value)` 投影。
- **对 IR / 对外 API**：无（d3 是 lowering 内部依赖，不进 IR、不进包 barrel）。

## 不在本 ADR 范围

- **band / time / ordinal / log scale、颜色映射**（d3-scale 家族）→ alpha.3+。
- **自定义 tick 数组 / 自定义 d3-format formatter / 科学计数 / 千分位** → 后续。
- **刻度怎么画（轴线 / tick / label）与位置（plot area）** → [ADR-04](./04-guide-lowering.md) / [ADR-03](./03-plot-area-layout.md)。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/lower/**`（下沉 core IR 契约边界）+ `packages/plot/plot/src/index.ts` 无关但改 package.json 依赖。本 ADR 自评：`red`。

### Schema 改动

无（scale / tick 是 lowering 内部，不进 IR）。

### 文件 scope

- `packages/plot/plot/src/lower/scale.ts`（重构：基于 d3-scale）
- `packages/plot/plot/src/lower/expand.ts`（轻改：scale 类型 `ScaleLinear`）
- `packages/plot/plot/package.json`（加 `d3-scale` / `d3-array` deps + 类型 devDeps）
- `pnpm-workspace.yaml`（catalog 登记 d3 版本）
- `packages/plot/plot/tests/lower/scale.test.ts`（新建 / 扩充）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（守向后兼容：投影 / single-datum 不变）

### 测试象限

**Happy path**：

- `scale_maps_like_alpha1`：`resolveLinearScale({domain:[0,2]},_,[0,480])(1)` → `240`（与 alpha.1 自写等价、守投影兼容）
- `scaleticks_nice`：`scaleTicks(scaleLinear().domain([0,9.7]).range([0,1]),5).values` → 1/2/5 步长 nice 刻度（d3）
- `scaleticks_labels_trim`：标签去尾零（d3 tickFormat，如 `'2'` 而非 `'2.0'`）
- `scaleticks_count`：`tickCount` 大 → 刻度更密

**边界**：

- `scale_empty_values_extent`：空 values → domain `[0,1]`（保留 alpha.1 fallback）
- `scale_single_datum_midpoint`：domain `[5,5]`（single datum）→ 投影值与 alpha.1 一致（守 `lower_single_datum_point`；必要时 wrapper 取中点）
- `scale_nice_toggle`：`nice:true` 扩 domain 到整、`nice` 省略不扩

**错误路径 / 退化**：

- `scaleticks_degenerate_domain`：`[a,a]` → d3 行为（`[a]`），锁定不崩
- `scale_non_finite_domain`：非有限 domain 的行为锁定（不产 `NaN` 像素污染；配合 alpha.1 W1）

**交互（跨 ADR / 兼容）**：

- `legacy_projection_unchanged`：alpha.1 无 guides 的投影 `[0,240]/[240,0]/[480,300]` 用 d3 scale 后**逐字不变**
- `scaleticks_feeds_guide`：同一 `scale` 既 `scale(value)` 投影 mark、又 `scaleTicks` 出刻度，二者像素对齐（[ADR-04](./04-guide-lowering.md) 前置）

### 依赖现有元素

- `d3-scale`（`scaleLinear` / `ticks` / `tickFormat` / `nice` / `clamp`）—— **新增依赖**：scale + tick + format 基础。
- `d3-array`（`extent`）—— **新增依赖**：domain 推断。
- alpha.1 `resolveLinearScale` / `createCartesianProjector`（`lower/scale.ts` / `project.ts`）—— **重构 / 复用**：scale 换 d3，投影器消费 `scale(value)`。
- [alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md) —— **回溯**：scale 基础从自写迁 d3，守既有投影 / single-datum 测试。

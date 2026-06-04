# ADR-02：auto-tick 算法（linear domain → nice 刻度位置 + 默认标签格式化）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 scale / §3.9 guide](../../../../../architecture/plot-design.md) · 消费方：[ADR-04 guide lowering](./04-guide-lowering.md) · 配置来源：[ADR-01 AxisGuide.tickCount](./01-guide-ir.md)

## 背景

坐标轴 / 网格要画在「好看的刻度」上——`[0, 9.7]` 的轴不该每隔 9.7/5=1.94 画一根，而该落在 0 / 2 / 4 / 6 / 8 这种人类友好的整步上。这就是 **auto-tick**：给定一个连续 domain 与目标刻度数，算出 nice 的刻度位置与标签。plot-design §3.5 把「ticks」列为 scale 的派生职责。

这是一段**纯算法**，不进 IR、不依赖渲染——属于 lowering 的内部能力（`packages/plot/plot/src/lower/`）。[ADR-01](./01-guide-ir.md) 的 `AxisGuide.tickCount` 是它的目标数提示；[ADR-04](./04-guide-lowering.md) 在 lower 轴/网格时调它拿刻度。单拆一个 ADR，因为它与 guide IR 形态、布局、lowering 都解耦，是可独立测试 / 替换的算法核。

## 决策：d3.ticks 等价的 1/2/5×10ⁿ nice-step 算法 + 量级自适应标签格式化

`linearTicks(domain, count?)` 返回落在 `[min, max]` 内的 nice 刻度位置数组；步长取 `1 / 2 / 5 × 10ⁿ`（成熟的 d3.ticks 选步策略，等价实现）。`formatTickLabel(value, step)` 按步长量级定小数位、去多余尾零，产出默认数字标签。**不修改 domain**（不做 nice 扩展——那是 scale 的事，见「不在本 ADR 范围」）：轴线画 domain 全长，刻度落在内部 nice 位置。

```ts
// packages/plot/plot/src/lower/ticks.ts
/** 默认目标刻度数（AxisGuide.tickCount 省略时用） */
export const DEFAULT_TICK_COUNT = 5;

/**
 * nice 步长：把 raw step 吸附到 1/2/5×10ⁿ（d3.tickStep 等价）
 */
const niceStep = (span: number, count: number): number => {
  const step0 = Math.abs(span) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const factor = err >= Math.sqrt(50) ? 10 : err >= Math.sqrt(10) ? 5 : err >= Math.sqrt(2) ? 2 : 1;
  return factor * mag;
};

/**
 * 在 [min,max] 内生成 nice 刻度位置（不改 domain）
 * @description 假定 **min ≤ max（升序 domain）**。domain 非有限 → []；退化（min===max）→ 单刻度 [min]；
 *   反向（min>max）→ []（alpha.2 不支持反向 domain，明确不画而非乱画——评审 P1.3）。均不除零 / 不死循环
 */
export const linearTicks = (domain: readonly [number, number], count = DEFAULT_TICK_COUNT): Array<number> => {
  const [min, max] = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  if (min > max) return []; // 反向 domain：alpha.2 不支持（见 JSDoc / 待决策点）
  const step = niceStep(max - min, count);
  const start = Math.ceil(min / step) * step;
  const out: Array<number> = [];
  // 用整数计数避免浮点累加漂移
  for (let i = 0; start + i * step <= max + step * 1e-9; i++) out.push(start + i * step);
  return out;
};

/** 默认刻度标签：按 step 量级定小数位、去尾零（避免 0.30000000004 之类浮点噪声） */
export const formatTickLabel = (value: number, step: number): string => {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(value.toFixed(decimals)).toString();
};

/** auto-tick 产物：刻度位置 + 对齐的标签 + 选定步长（lowering / grid 复用） */
export type TickSet = { values: Array<number>; labels: Array<string>; step: number };

export const computeTicks = (domain: readonly [number, number], count = DEFAULT_TICK_COUNT): TickSet => {
  const values = linearTicks(domain, count);
  // 单刻度（退化 domain）：直接用值本身的精度，不靠 step 推小数位——否则 computeTicks([3.14,3.14]) 会被标成 '3'（评审 P1.3）
  if (values.length < 2) return { values, labels: values.map(v => String(v)), step: 0 };
  const step = values[1] - values[0];
  return { values, labels: values.map(v => formatTickLabel(v, step)), step };
};
```

理由：

1. **1/2/5×10ⁿ 是公认的 nice 步长族**：人眼对这些步长最易读；d3 / matplotlib / Vega 同源策略，成熟、可预测、易测。
2. **不改 domain**：domain 由 scale resolve（alpha.1 `resolveLinearScale`），改它会牵动 mark 投影。auto-tick 只在给定 domain 内取刻度，职责单一；nice domain 扩展（消费 alpha.1 `LinearScale.nice` 字段）留后续，互不耦合。
3. **整数计数生成、容差比较**：避免 `start += step` 的浮点累加漂移与边界刻度漏 / 多。
4. **标签格式按 step 量级**：step=2 → 整数标签；step=0.1 → 一位小数；`Number(toFixed).toString()` 去尾零，消除浮点噪声。LLM / 人读都干净。
5. **退化输入安全**：`min===max`（数据全等）→ 单刻度；非有限 → 空数组（caller 不画刻度而非崩——与 [W1](../v0.1-alpha.1/roadmap.md) 同思路：边角输入要稳）。

## 待决策点

- **目标刻度数默认值**：`DEFAULT_TICK_COUNT = 5`（含端点附近通常 4~6 根）。备选 6 / 8。倾向 5。
- **是否对外 public**：alpha.2 作 lowering 内部模块（测试直接 import `lower/ticks.ts`，不进包 barrel），与 alpha.1 的 `field`/`scale`/`project` 一致。用户想自定义刻度的能力（显式 tick 数组 / 自定义 formatter）留后续。
- **是否顺带实现 `LinearScale.nice`**：alpha.1 给 scale 留了 `nice` 字段但没用。**本 ADR 不碰**——auto-tick 只取 domain 内刻度；nice domain 扩展涉及改 `resolveLinearScale` + 牵动 mark 投影，单独评估。
- **标签格式化的极端量级**（如 1e-7 / 1e9）：alpha.2 用 `toFixed` 朴素格式，超大 / 超小不转科学计数。够用；科学计数 / 千分位留后续 formatter。
- **退化 / 反向 domain（评审 P1.3，已定）**：`min===max` → 单刻度 `[min]`，且 `computeTicks` 单刻度时标签用 `String(min)` **保原值精度**（不被 step 取整成 `'3'`）；非有限 → `[]`；`min>max`（反向）→ `[]`——alpha.2 **不支持反向 domain**（domain 来自 `resolveLinearScale` 通常升序）。显式反向 domain 的支持（swap 升序 vs 明确报错）留后续。

## DSL 表面

无直接用户表面——auto-tick 是 lowering 内部算法。用户经 [ADR-01](./01-guide-ir.md) 的 `AxisGuide.tickCount` 间接调目标刻度数：

```ts
// tickCount 省略 → DEFAULT_TICK_COUNT；给 3 → 更稀疏
{ type: 'axis', dimension: 'y', tickCount: 3 }
```

## 测试设计

`packages/plot/plot/tests/lower/ticks.test.ts`（新建）覆盖：常规 domain 产 1/2/5 步长 nice 刻度；count 控制密度；负 / 跨 0 domain；单值 / 非有限 domain 退化；标签去尾零与小数位。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/lower/ticks.ts`**（全新）：`linearTicks` / `computeTicks` / `formatTickLabel` / `DEFAULT_TICK_COUNT` / `TickSet`。
- **被消费**：[ADR-04 guide lowering](./04-guide-lowering.md) 调 `computeTicks(domain, axis.tickCount)` 拿刻度位置 + 标签；grid 复用同维度 `TickSet`。
- **对 IR / API**：无（纯内部算法，不进 IR、不进包 barrel）。
- **依赖**：alpha.1 `resolveLinearScale`（[ADR-06](../v0.1-alpha.1/06-plot-lowering.md)）产出的 domain 作为 `linearTicks` 输入——接线在 [ADR-04](./04-guide-lowering.md)。

## 不在本 ADR 范围

- **nice domain 扩展（消费 `LinearScale.nice`）** → 后续 / 独立评估。
- **非 linear scale 的刻度（band / time / log / ordinal）** → alpha.3+。
- **用户自定义 tick 数组 / 自定义 label formatter / 科学计数 / 千分位** → 后续。
- **刻度怎么画（轴线 / tick mark / label node）与位置（plot area）** → [ADR-04](./04-guide-lowering.md) / [ADR-03](./03-plot-area-layout.md)。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/lower/**`（下沉到 core IR 的契约边界）→ red。本 ADR 自评：`red`。

### Schema 改动

无（auto-tick 是 lowering 内部纯算法，不进 IR）。

### 文件 scope

- `packages/plot/plot/src/lower/ticks.ts`（新建）
- `packages/plot/plot/tests/lower/ticks.test.ts`（新建）

### 测试象限

**Happy path**：

- `ticks_step_2`：`linearTicks([0,10],5)` → `[0,2,4,6,8,10]`
- `ticks_nice_from_messy_domain`：`linearTicks([0,9.7],5)` → `[0,2,4,6,8]`（落 domain 内、1/2/5 步长）
- `ticks_cross_zero`：`linearTicks([-5,5],5)` → `[-4,-2,0,2,4]`
- `compute_ticks_labels_aligned`：`computeTicks([0,10],5).labels` → `['0','2','4','6','8','10']`，`values.length===labels.length`
- `compute_single_decimal_label_preserved`：`computeTicks([3.14,3.14]).labels` → `['3.14']`（单刻度用原值精度，**不**取整成 `'3'`——评审 P1.3）

**边界**：

- `ticks_single_value`：`linearTicks([3,3])` → `[3]`
- `ticks_non_finite_empty`：`linearTicks([0, Infinity])` / `[NaN,1]` → `[]`
- `ticks_count_density`：同 domain，`count=3` 比 `count=10` 刻度更少（步长更大）

**错误路径 / 退化**：

- `ticks_zero_span_single`：`linearTicks([5,5])` → `[5]`（min===max 单刻度，不崩、不空循环）
- `ticks_reversed_empty`：`linearTicks([5,0])` → `[]`（反向 domain，alpha.2 明确不画——评审 P1.3）
- `format_no_float_noise`：`formatTickLabel(0.30000000000000004, 0.1)` → `'0.3'`

**交互**：

- `format_decimals_follow_step`：step=2 → `formatTickLabel(4,2)==='4'`（整数）；step=0.1 → `formatTickLabel(0.1,0.1)==='0.1'`（一位小数）
- `ticks_within_domain`：任意 domain 产出的每个 tick 都 `>= min && <= max`（不画轴外刻度）

### 依赖现有元素

- 标准 `Math` —— **引用**（log10 / floor / ceil / sqrt / abs / pow）。
- alpha.1 `resolveLinearScale`（`packages/plot/plot/src/lower/scale.ts`）—— **间接依赖**：其产出的 domain 是 `linearTicks` 的输入，接线在 [ADR-04](./04-guide-lowering.md)（本 ADR 只定算法、不接线）。

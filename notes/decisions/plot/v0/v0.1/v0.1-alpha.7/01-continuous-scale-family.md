# ADR-01：连续 scale 家族——log / pow / sqrt 连续 scale + L1 baseline 限制

- 状态：Proposed
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.4 Scale / §3.9 Guide](../../../../../architecture/plot-design.md) · 下游：[ADR-02 通道→scale 抽象 + size](./02-channel-scale-resolver-size.md)（size 派生到本 ADR 的 sqrt）/ [ADR-03 color·series](./03-color-series.md) · 前身：[alpha.2 ADR-02 d3-scale](../v0.1-alpha.2/02-d3-scale.md)

## 背景

当前 `PlotScale` 只有 5 个成员——`linear` / `band` / `point` / `ordinal` / `time`（`packages/plot/plot/src/ir/scale.ts:8`），连续数值映射仅 `linear`（`time` 是时间专用）。真实数据有两类常见诉求落不下：

1. **跨数量级**：人口、收入、计数、地震能量等跨多个 10 倍区间的数据，线性轴把小值压成一团，需 **log** 轴。
2. **感知/几何编码**：面积正确的尺寸编码（散点 bubble）要 **sqrt**（半径 ∝ √值，面积 ∝ 值）；更一般的幂次需 **pow**。alpha.7 的 `size` 通道（[ADR-02](./02-channel-scale-resolver-size.md)）**直接依赖 sqrt**。

同类库共识：**Vega-Lite** 连续 scale = linear/log/pow/sqrt/symlog；**Observable Plot** 同（`r` 通道默认 sqrt）；**ggplot2** 有 `scale_*_log10` / `scale_*_sqrt` / `trans`。连续 scale 家族是图形语法的基础能力。

把 sqrt 放在本 ADR（而非 size ADR 内部自造一份）是评审采纳的依赖重排：**sqrt 作为公开 `PlotScale.Sqrt` 单一真源**，size 通道复用之，消除「size 先内部 sqrt、后又公开 Sqrt」的重复实现。

**baseline 冲突**：`interval`（柱）/ `area`（面积）的 `baseline=0` 是结构语义——lowering 把 baseline 0 注入位置 scale 的 domain（`lower/expand.ts`）、area baseline 默认 0（`ir/mark.ts:135`）。而 `log(0) = -∞`、`pow`（exponent<1）在 0 处不可导，所以**非线性连续 scale 与 bar/area 天然冲突**。本轮按 **L1** 处理：限制非线性连续 scale 只作用 point/line，bar/area 撞上即 fail-loud。

## 决策：`PlotScale` 新增 log / pow / sqrt 三个连续变体（公开 scale 家族），非线性连续 scale 仅作用 point/line（L1），bar/area 用之即 fail-loud

新增三个 scale 类型，schema 沿 `LinearScale` 风格（`domain` / `range` / `nice` / `clamp`），各加自身参数；lowering 经现有 d3-scale（`scaleLog` / `scalePow` / `scaleSqrt`）求值与出 tick。**不**新增 `size` / `radius` scale type——size 是通道（[ADR-02](./02-channel-scale-resolver-size.md)），默认派生到此处的 `sqrt`。

```ts
// ir/scale.ts —— PlotScale 追加成员（沿 DrawWay 风格，裸 'log' 同样可用）
export const PlotScale = {
  Linear: 'linear', Band: 'band', Point: 'point', Ordinal: 'ordinal', Time: 'time',
  /** 对数：连续对数映射 y = m·log_base(x) + b；domain / value 必须全正（0 与负值 fail-loud） */
  Log: 'log',
  /** 幂：连续幂映射 y = m·x^exponent + b */
  Pow: 'pow',
  /** 平方根：pow exponent 0.5 的常用别名（面积感知正确；size 通道默认派生到此）；domain / value 必须 ≥ 0 */
  Sqrt: 'sqrt',
} as const;

// LogScaleSchema：在 LinearScale 字段基础上加 base
//   type: z.literal(PlotScale.Log) / name / domain?[num,num] / range?[num,num] / base?(default 10) / nice? / clamp?
//   domain refine：两端均 > 0（含 0 或负值 → fail-loud；不接受负单侧，见错误路径）。推断 domain 时也只取正值范围。
// PowScaleSchema：加 exponent
//   type: z.literal(PlotScale.Pow) / name / domain? / range? / exponent?(default 2) / nice? / clamp?
//   负值规则：整数 exponent 允许负 domain（幂 well-defined）；非整数 exponent + domain 含负值 → fail-loud（避免 d3 sign-preserving 的反直觉行为）
// SqrtScaleSchema：无额外参数（等价 pow exponent 0.5，独立暴露）
//   type: z.literal(PlotScale.Sqrt) / name / domain? / range? / nice? / clamp?
//   domain refine：两端均 ≥ 0（负值 → fail-loud）
// ScaleSchema 追加三者进 discriminatedUnion('type', [...])
```

理由：

1. **sqrt 单一真源**：size 通道与显式 sqrt 轴共用一个 `PlotScale.Sqrt`，不重复实现、IR 可序列化、对 LLM 暴露裸 `'sqrt'`。
2. **L1 最薄且 fail-loud**：bar/area 的 baseline 0 是结构语义，不是改个数能绕过；与其默默产 NaN/-∞，不如清晰报错，后续真有 log 柱需求再做 L2（显式正 baseline）。
3. **沿 LinearScale 风格 + d3-scale**：复用已有 scale lowering 路径（alpha.2 起 d3-scale），新增成本集中在 schema + 选型分支。

## 待决策点 🔻

- **pow 默认 exponent**：取 `2`（裸 `'pow'` 即「超线性」直觉）。倾向 2；若认为裸 pow 该等价 linear（d3 默认 exponent 1）则改 1——但那样裸 `'pow'` 无意义，故定 2。
- **React `scaleX` / `scaleY` 暴露范围**：本轮 `scaleX` 与**新增 `scaleY`** 字符串各加 `'log' | 'sqrt'`（语义无歧义、用默认 base/exponent）。**log 的主用场是值轴（y）**，故必须有 `scaleY`（评审 P1：原 ADR 只有 `scaleX`，无法表达 log y）。**`'pow'`（需 exponent）+ log 自定义 base / pow 自定义 exponent 暂不进 React**——待 `<Scale>` DSL 落地（当前 `buildPlotSpec` 自动合成 scale、无 `<Scale>` 组件）。IR + vanilla 三表面全支持。
- **L1 守卫触发面**：以「mark 使用的位置 scale 类型」为准——任一 `interval` / `area` mark 的 x 或 y 绑定到 log/pow/sqrt scale 即 fail-loud。倾向放 `lower/expand.ts` 解析位置 scale 处（baseline 注入前）。

## DSL 表面

```tsx
// React：log y 轴的折线（仅 point/line 合法）—— y 是值轴，log 的主用场
<Plot data={{ quakes }} scaleY="log">
  <LineMark x="year" y="energy" />
</Plot>

// React：sqrt x（point/line）
<Plot data={{ rows }} scaleX="sqrt">
  <PointMark x="dose" y="response" />
</Plot>
```

```ts
// vanilla / 原生 IR：完整连续家族（log base / pow exponent 全可配）
renderPlot(
  { type: 'plot', data: { reference: 'rows' },
    coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
    scales: [
      { type: 'log', name: '__y', base: 10, nice: true },
      { type: 'linear', name: '__x' },
    ],
    marks: [{ type: 'line', encoding: { x: { field: 'year' }, y: { field: 'value' } } }],
    guides: [{ type: 'axis', dimension: 'y', grid: true }] },
  { rows },
);
```

## 测试设计

`packages/plot/plot/tests/lower/scale-family.test.ts`（新建）+ `tests/ir/scale.schema.test.ts`（扩）覆盖：

- 三类 scale 求值与 tick 生成（log/pow/sqrt）
- L1 守卫：bar/area + 非线性连续 scale → 抛错
- domain 边界（log 含 0 / 负值拒绝、正值域推断、nice；sqrt/pow 负值规则）
- 与 guide / size（ADR-02）的交互

具体见下「实现契约 § 测试象限」。

## 影响

- **Plot IR**：`ir/scale.ts` 加 3 个 schema + 派生类型，`ScaleSchema` union 扩 3 成员；**纯增量，无既有字段语义变化**。
- **lowering**：`lower/scale.ts` 加 log/pow/sqrt 求值 + tick 分支；`lower/expand.ts` 加 L1 守卫。
- **core**：无新依赖、不触 core IR（连续 scale 求值在 plot 内，产出仍是已有几何）。
- **文档站**：scale 概念页 + 折线/散点示例页加 log/sqrt demo；`<Plot scaleX>` API 表加 `'log' | 'sqrt'`。
- **对外 API**：`PlotScale` 加 3 成员（裸字面量 + 常量）；React `DslScaleX` 加 `'log' | 'sqrt'` + **新增 `scaleY`**（`DslScaleY`，同样 `'log' | 'sqrt'`，覆盖 log 值轴主用场）。**非 breaking**（纯新增）。

## 不在本 ADR 范围

- **symlog**（跨零/负值的对数兜底）——需求驱动，本轮 log 遇非正值 fail-loud。
- **L2**：bar/area + log 配显式正 baseline——本轮 L1 直接拒绝。
- **离散化 scale**（quantize / threshold / quantile）→ alpha.8。
- **React `<Scale>` 组件 / pow 自定义 exponent 的 React 表面** → 后续。
- **polar radius 用 log** → 需求驱动（本轮 L1 守卫覆盖 cartesian；polar 径向暂不特别支持非线性）。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条目或开新 ADR。

### Level

`red`——动 `packages/plot/plot/src/ir/scale.ts`（IR 契约）+ `lower/**` + react 表面。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/scale.ts` | 加 | `PlotScale.Log` | `'log'` | — | 对数 scale 判别串 |
| `ir/scale.ts` | 加 | `PlotScale.Pow` | `'pow'` | — | 幂 scale 判别串 |
| `ir/scale.ts` | 加 | `PlotScale.Sqrt` | `'sqrt'` | — | 平方根 scale 判别串 |
| `ir/scale.ts` | 加 | `LogScaleSchema` | `z.object` | — | log scale：type/name/domain?/range?/base?/nice?/clamp? |
| `ir/scale.ts` | 加 | `LogScaleSchema.base` | `z.number().positive()` | `10` | 对数底 |
| `ir/scale.ts` | 加 | `PowScaleSchema` | `z.object` | — | pow scale：type/name/domain?/range?/exponent?/nice?/clamp? |
| `ir/scale.ts` | 加 | `PowScaleSchema.exponent` | `z.number()` | `2` | 幂指数 |
| `ir/scale.ts` | 加 | `SqrtScaleSchema` | `z.object` | — | sqrt scale：type/name/domain?/range?/nice?/clamp? |
| `ir/scale.ts` | 改 | `ScaleSchema` | `z.discriminatedUnion` | — | union 追加 Log/Pow/Sqrt |
| `ir/scale.ts` | 加 | `LogScale`/`PowScale`/`SqrtScale` | `z.infer` | — | 三个派生类型 |

> `domain` refine：log 两端均 > 0；sqrt 两端均 ≥ 0；pow 非整数 exponent 时两端均 ≥ 0（整数 exponent 不限）。违反即 fail-loud。

### 文件 scope

- `packages/plot/plot/src/ir/scale.ts`（改）
- `packages/plot/plot/src/lower/scale.ts`（改：log/pow/sqrt 求值 + tick）
- `packages/plot/plot/src/lower/expand.ts`（改：L1 守卫——interval/area + 非线性连续 scale fail-loud）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（改：log/pow/sqrt schema accept/reject + domain refine）
- `packages/plot/plot/tests/lower/scale-family.test.ts`（新建：求值 / tick / L1 守卫）
- `packages/plot/react/src/components/buildPlotSpec.ts`（改：`DslScaleX` + 新增 `DslScaleY`，各加 `'log' | 'sqrt'`）
- `packages/plot/react/src/Plot.tsx`（改：`PlotDslProps` 加 `scaleY?`）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（改：scaleX/scaleY log/sqrt）
- `apps/docs/src/contents/**`（scale 概念页 + 示例 mdx/demo）

### 测试象限

**Happy path**：
- `log scale on y`：log y + line mark + 正值数据 → 节点按 log 投影、tick 落 10 的幂
- `sqrt scale on x`：sqrt x + point mark → 按 √ 投影
- `pow scale exponent 2`：pow + 显式 exponent → 按幂投影

**边界**：
- `log 正值域推断`：全正数据省略 domain → 推断 [minPositive, max]，不含 0
- `nice rounding`：log + nice → domain 取整到底的幂

**错误路径**：
- `log + bar fail-loud`：interval mark + log y → 抛 `nonlinear continuous scale (log/pow/sqrt) cannot be used with interval/area because their baseline includes 0; use point/line or wait for explicit positive baseline support`
- `sqrt + area fail-loud`：area mark + sqrt y → 同上错误信息
- `log domain 含 0 / 负值`：显式 domain `[0, 100]` 或 `[-10, -1]` 的 log scale → 拒绝（log 必须全正）
- `sqrt 负值拒绝`：sqrt domain `[-1, 9]` 或数据含负值 → fail-loud（sqrt 必须 ≥ 0）
- `pow 非整数 exponent + 负 domain`：exponent 0.5 + domain 含负 → fail-loud（整数 exponent 则允许）

**交互**：
- `log y + grid guide`：log y + 网格 → 网格线落 log tick 位
- `sqrt 复用于 size`：同一 sqrt 概念被 size 通道（ADR-02）消费 → 半径 √ 映射一致（跨 ADR 锚点）

### 依赖的现有元素

- `PlotScale` / `ScaleSchema` / `LinearScaleSchema`（`ir/scale.ts`）—— 扩展（加成员、沿风格）
- `deriveScale` / 位置 scale 求值（`lower/scale.ts`）—— 修改（加 log/pow/sqrt 分支）
- d3-scale（`scaleLog` / `scalePow` / `scaleSqrt`，已是 plot 依赖）—— 引用
- baseline 注入 / 位置 scale 解析（`lower/expand.ts`）—— 修改（加 L1 守卫）
- `DslScaleX`（`react/.../buildPlotSpec.ts:43`）—— 扩展（加 `'log' | 'sqrt'`）+ 新增 `DslScaleY`
- `PlotDslProps`（`react/.../Plot.tsx:20`）—— 扩展（加 `scaleY?`，与 `scaleX` 对称）

# ADR-02：离散化 scale——quantize / threshold / quantile（连续 domain → 离散 color 档）

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.4 Scale](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 连续色阶](./01-continuous-color-scale.md)（复用 scheme/range schema）· 下游：[ADR-03 legend](./03-legend-guide.md)（分箱 swatch）

## 背景

[ADR-01](./01-continuous-color-scale.md) 把连续量编码成**连续色带**（平滑渐变）。但很多场景要**分箱离散色**——把连续量切成有限档、每档一色：

- **choropleth**（分级统计地图风）：人口密度切 5 档、每档一色，比连续渐变更易读数。
- **阈值告警**：按业务断点（`< 60` 红、`60–80` 黄、`≥ 80` 绿）上色。
- **抗离群**：数据高度偏斜时，按**分位**分箱（每档样本数相等）比等宽分箱更均衡。

这三种正是 d3 / GoG 的三个离散化 scale：

| scale | 切分依据 | d3 | 典型 |
|---|---|---|---|
| **quantize** | domain 等宽切 N 段 | `scaleQuantize` | 均匀分布的连续量 |
| **threshold** | 用户自定义断点 | `scaleThreshold` | 业务阈值 / 告警 |
| **quantile** | 数据分位（每档样本数相等） | `scaleQuantile` | 偏斜数据 / 抗离群 |

同类库：Vega-Lite `bin` + `quantize/quantile/threshold`；ggplot2 `scale_*_steps`（分箱渐变）/ `cut` + 离散色；Observable Plot `color: { type: 'quantize'|'quantile'|'threshold' }`。

本轮三者**输出域只做 color**（决策 ③）——离散 size / opacity 档（D1）需求驱动再做；与「高级 Scales 服务颜色」主线一致。离散色的颜色档**复用 [ADR-01](./01-continuous-color-scale.md) 的 scheme / range schema**：从命名 scheme 采样 N 个离散色，或用户直接给 range 颜色数组。**故本 ADR dep ADR-01**（共用配色词表与 range 形态，非并行）。

## 决策：`PlotScale` 新增 `quantize` / `threshold` / `quantile`，连续 domain → 离散 color 档，颜色复用 ADR-01 scheme/range

三个独立判别串。输出色 = 从 ADR-01 命名 scheme 等距采样 N 档，或 `range` 显式颜色数组。lowering 经 d3 `scaleQuantize` / `scaleThreshold` / `scaleQuantile`。

```ts
// ir/scale.ts —— PlotScale 追加（沿 DrawWay 风格）
export const PlotScale = {
  /* …linear/band/point/ordinal/time/log/pow/sqrt/sequential/diverging… */
  /** 分位化等宽：连续 domain 等宽切 count 段 → 离散 color 档 */
  Quantize: 'quantize',
  /** 阈值：用户自定义断点切档 → 离散 color 档（断点须升序，色数 = 断点数 + 1） */
  Threshold: 'threshold',
  /** 分位：按数据分位切 count 档（每档样本数约等）→ 离散 color 档 */
  Quantile: 'quantile',
} as const;

// QuantizeColorScaleSchema：
//   type: z.literal(PlotScale.Quantize) / name
//   domain?: [number, number]（省略→数据 [min,max]）
//   count?: z.number().int().min(2)（档数，默认 5）
//   scheme?: z.nativeEnum(PlotColorScheme)（复用 ADR-01，默认 'viridis'）
//   range?: z.array(z.string()).min(2)（显式离散色数组，覆盖 scheme；长度即档数）
// ThresholdColorScaleSchema：
//   type: z.literal(PlotScale.Threshold) / name
//   breakpoints: z.array(z.number()).min(1)（严格升序断点；必填——阈值无默认）
//   scheme? / range?: range 长度须 = breakpoints.length + 1（强校验，决策 ④）
// QuantileColorScaleSchema：
//   type: z.literal(PlotScale.Quantile) / name
//   count?: z.number().int().min(2)（分位档数，默认 5）
//   scheme? / range?: 长度 = count
//   ❌ 无显式数值 domain——分位由数据定（决策 ⑤；给显式 domain → fail-loud）
// ScaleSchema 追加三者进 discriminatedUnion('type', [...])
```

**配色采样**：scheme → 在 `[0,1]` 等距取 `count`（或 `breakpoints.length+1`）个点喂 interpolator，得离散色数组；`range` 给定则直接用、覆盖 scheme。采样工具与 ADR-01 共用一处（`lower/scale.ts`），不重复。

理由：

1. **补全 GoG 离散化三件套**：quantize/threshold/quantile 覆盖「等宽 / 业务断点 / 抗偏斜」三类真实需求，d3 现成。
2. **颜色复用 ADR-01**：不另造配色词表——同一 `PlotColorScheme` + range，离散色 = 连续 scheme 的采样。这是 dep ADR-01 的实质（修评审 P2 的依赖含糊）。
3. **fail-loud 契约清晰**：threshold 断点升序 + 色数匹配强校验、quantile 不接受显式数值 domain，避免静默截断 / 语义冲突。

**实现校准（2026-06-08，与实现/测试对齐）**：

- **quantile 显式 domain = schema strip（非硬抛）**：决策⑤原写「给显式 domain → fail-loud」，落地为 `QuantileColorScaleSchema` 不定义 `domain` 字段、由 `z.object` 默认 strip（与全仓 scale schema 均裸 `z.object` 风格一致，不给 quantile 单独 `.strict()`）。效果是显式 domain 被静默剥离、lowering 不读、分位纯由数据定——目的达成（用户 domain 不生效），但形式是 strip 而非抛错。
- **count×range 一致性也 fail-loud**：除 threshold 的 `range.length === breakpoints.length + 1`，quantize/quantile 在 **`count` 显式且 ≠ `range.length`** 时也 fail-loud（与 threshold 对称，修 adversarial WARNING；只给 range 省 count 仍宽容，档数 = range.length）。
- **数值字段 `.finite()`**：`breakpoints` / quantize `domain`（及 ADR-01 sequential/diverging `domain`）的数值改 `z.number().finite()`，parse 期拒 `Infinity`/`-Infinity`（修 adversarial BLOCKING：裸 `z.number()` 放过 Infinity，既过 schema 又破坏 JSON round-trip）。


## DSL 表面

```ts
// vanilla / 原生 IR：quantize 5 档 choropleth 风散点
{ type: 'quantize', name: '__color', domain: [0, 100], count: 5, scheme: 'blues' }

// threshold 业务断点（3 色：<60 / 60–80 / ≥80）
{ type: 'threshold', name: '__color', breakpoints: [60, 80], range: ['#e74c3c', '#f1c40f', '#2ecc71'] }

// quantile 4 档（每档样本数约等，抗偏斜）
{ type: 'quantile', name: '__color', count: 4, scheme: 'viridis' }
```

> React 表面：本轮离散化 scale **仅经 vanilla IR**（与 ADR-01 diverging 同口径——React 自动派生只做连续 sequential，离散化属显式高级用法，等 `<ColorScale>` DSL）。

## 测试设计

`packages/plot/plot/tests/lower/discretization-scale.test.ts`（新建）+ `tests/ir/scale.schema.test.ts`（扩）覆盖：三类切档求值、scheme 采样档色、range 覆盖、threshold 断点校验、quantile 分位、边界落档、fail-loud。落地测试见实现指针。

## 影响

- **Plot IR**：`ir/scale.ts` 加 3 schema + 派生类型，`ScaleSchema` union 扩 3 成员；纯增量。
- **lowering**：`lower/scale.ts` 加 quantize/threshold/quantile 求值 + scheme→离散色采样（与 ADR-01 共用采样工具）；`lower/expand.ts` color resolver 认离散化 scale（categorical 之外，离散化是「连续字段 → 离散色」的第三条路）。
- **core**：无新依赖、不触 core IR。
- **文档站**：scale 页加离散化三件套；散点 / 柱 choropleth demo。
- **对外 API**：`PlotScale` 加 3 成员；纯新增，不破坏既有 spec。

## 不在本 ADR 范围

- **离散 size / opacity 档**（D1）→ 顺延需求驱动（本轮离散化只输出 color）。
- **bin transform**（数据层分箱产新字段）→ alpha.12 Statistics（与 scale 层离散化正交：transform 改数据、scale 改映射）。
- **React 离散化 scale 显式表面 / `<ColorScale>` DSL** → 顺延。
- **legend 分箱 swatch 渲染** → [ADR-03](./03-legend-guide.md)。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/scale.ts` 与 `packages/plot/plot/src/lower/{scale,expand}.ts`，测试见 `packages/plot/plot/tests/{ir/scale.schema,lower/discretization-scale}.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.8/02-discretization-scale.md`（封板全文）。

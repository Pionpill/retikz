# ADR-02：离散化 scale——quantize / threshold / quantile（连续 domain → 离散 color 档）

- 状态：Proposed
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

## 待决策点 🔻

- **threshold range 长度校验位置**：`range.length === breakpoints.length + 1` 在 schema refine 还是 lowering？倾向 **lowering 校验**（`range` / `breakpoints` 可分别省略——省 range 用 scheme 采样 `breakpoints.length+1` 档；只有都显式时才在 lowering 比对长度），schema 只管单字段合法性。
- **quantize / quantile 默认 count**：默认 `5`（choropleth 社区惯例 4–7 档）。倾向 5。
- **超出 domain 的值**：quantize 经 d3 落到首/末档（clamp 语义）；threshold < 最小断点落第 0 档、≥ 最大断点落末档。倾向沿 d3 默认（不额外报错）。
- **离散化 scale 作用 mark 边界**：与 ADR-01 一致——per-datum 离散色仅 **point / bar / sector**；line/area + 离散化 color.field → fail-loud（同 path 整体着色边界）。倾向一致。
- **NaN / 缺失值落档**：连续字段缺失行经 alpha.6 `invalid` 策略处理（skip/error）；进到离散化的都是有效数。倾向复用既有 invalid 链、不在离散化 scale 内特判。

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

`packages/plot/plot/tests/lower/discretization-scale.test.ts`（新建）+ `tests/ir/scale.schema.test.ts`（扩）覆盖：三类切档求值、scheme 采样档色、range 覆盖、threshold 断点校验、quantile 分位、边界落档、fail-loud。具体见「测试象限」。

## 影响

- **Plot IR**：`ir/scale.ts` 加 3 schema + 派生类型，`ScaleSchema` union 扩 3 成员；纯增量。
- **lowering**：`lower/scale.ts` 加 quantize/threshold/quantile 求值 + scheme→离散色采样（与 ADR-01 共用采样工具）；`lower/expand.ts` color resolver 认离散化 scale（categorical 之外，离散化是「连续字段 → 离散色」的第三条路）。
- **core**：无新依赖、不触 core IR。
- **文档站**：scale 页加离散化三件套；散点 / 柱 choropleth demo。
- **对外 API**：`PlotScale` 加 3 成员；纯新增，不破坏既有 spec。

## 不在本 ADR 范围

- **离散 size / opacity 档**（D1）→ 顺延需求驱动（本轮离散化只输出 color）。
- **bin transform**（数据层分箱产新字段）→ alpha.11 Statistics（与 scale 层离散化正交：transform 改数据、scale 改映射）。
- **React 离散化 scale 显式表面 / `<ColorScale>` DSL** → 顺延。
- **legend 分箱 swatch 渲染** → [ADR-03](./03-legend-guide.md)。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/scale.ts`（IR 契约）+ `lower/**`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/scale.ts` | 加 | `PlotScale.Quantize` | `'quantize'` | — | 等宽离散化判别串 |
| `ir/scale.ts` | 加 | `PlotScale.Threshold` | `'threshold'` | — | 阈值离散化判别串 |
| `ir/scale.ts` | 加 | `PlotScale.Quantile` | `'quantile'` | — | 分位离散化判别串 |
| `ir/scale.ts` | 加 | `QuantizeColorScaleSchema` | `z.object` | — | type/name/domain?/count?/scheme?/range? |
| `ir/scale.ts` | 加 | `QuantizeColorScaleSchema.count` | `z.number().int().min(2)` | `5` | 等宽档数 |
| `ir/scale.ts` | 加 | `ThresholdColorScaleSchema` | `z.object` | — | type/name/breakpoints(必填升序)/scheme?/range? |
| `ir/scale.ts` | 加 | `ThresholdColorScaleSchema.breakpoints` | `z.array(z.number()).min(1)` | — | 严格升序断点（必填） |
| `ir/scale.ts` | 加 | `QuantileColorScaleSchema` | `z.object` | — | type/name/count?/scheme?/range?（无数值 domain） |
| `ir/scale.ts` | 加 | `QuantileColorScaleSchema.count` | `z.number().int().min(2)` | `5` | 分位档数 |
| `ir/scale.ts` | 改 | `ScaleSchema` | `z.discriminatedUnion` | — | union 追加 Quantize/Threshold/Quantile |
| `ir/scale.ts` | 加 | `QuantizeColorScale`/`ThresholdColorScale`/`QuantileColorScale` | `z.infer` | — | 派生类型 |

> threshold `breakpoints` 严格升序（违反 fail-loud）；`range`（若显式）长度 = `breakpoints.length + 1`（lowering 校验）。quantile 不接受显式数值 domain（给即 fail-loud）。

### 文件 scope

- `packages/plot/plot/src/ir/scale.ts`（改）
- `packages/plot/plot/src/lower/scale.ts`（改：三类求值 + scheme→离散色采样，与 ADR-01 共用采样工具）
- `packages/plot/plot/src/lower/expand.ts`（改：color resolver 认离散化 scale）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（改）
- `packages/plot/plot/tests/lower/discretization-scale.test.ts`（新建）
- `apps/docs/src/contents/**`（scale 页 + choropleth demo）

### 测试象限

**Happy path**：
- `quantize 5 档`：domain [0,100] count 5 → 值 0–20 第 0 档、80–100 末档，色取 scheme 采样
- `threshold 断点`：breakpoints [60,80] + 3 色 → 50→色0、70→色1、90→色2
- `quantile 分位`：偏斜数据 count 4 → 每档样本数约等

**边界**：
- `quantize domain 推断`：省略 domain → 从数据 [min,max] 切
- `单断点 threshold`：breakpoints [50] + 2 色 → 二分

**错误路径**：
- `threshold 断点乱序`：[80,60] → fail-loud
- `threshold range 长度不匹配`：breakpoints [60,80] + 2 色 → fail-loud（须 3 色）
- `quantile 显式 domain`：给 domain → fail-loud（分位由数据定）
- `line + 离散化 color fail-loud`：LineMark + quantize color → 抛（仅 point/bar/sector）

**交互**：
- `scheme 采样与 ADR-01 一致`：quantize scheme 'blues' 采 5 档 = sequential 'blues' 在 [0,1] 等距 5 点（共用采样工具锚点）
- `离散化 + legend`：离散化 scale 被 [ADR-03](./03-legend-guide.md) 分箱 swatch 消费（跨 ADR 锚点）
- `range 覆盖 scheme`：同给 range + scheme → 取 range

### 依赖的现有元素

- `PlotScale` / `ScaleSchema`（`ir/scale.ts`）—— 扩展
- `PlotColorScheme` / scheme 采样工具（[ADR-01](./01-continuous-color-scale.md) `ir/scale.ts` / `lower/scale.ts`）—— 复用（离散色 = 连续 scheme 采样）
- `makeColorResolver`（`lower/expand.ts`）—— 修改（认离散化 scale）
- line/area within-series 校验（`lower/mark.ts`）—— 复用（离散化 color 命中 fail-loud）
- d3 `scaleQuantize` / `scaleThreshold` / `scaleQuantile`（`d3-scale`，已是 plot 依赖）—— 引用
- alpha.6 `invalid` 缺失值策略（`lower/coerce.ts` / `validate.ts`）—— 引用（NaN 落档前已处理）

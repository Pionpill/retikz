# ADR-01：连续色阶——sequential / diverging color scale + 配色方案词表

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.4 Scale / §3.6 Encoding](../../../../../architecture/plot-design.md) · 依赖出口：[alpha.7 ADR-03 color·series](../v0.1-alpha.7/03-color-series.md)（continuous/temporal color 本轮兑现）· 下游：[ADR-02 离散化 scale](./02-discretization-scale.md)（复用本 ADR 的 scheme/range schema）/ [ADR-03 legend](./03-legend-guide.md)

## 背景

alpha.7 [ADR-03](../v0.1-alpha.7/03-color-series.md) 把 color 收口成真通道，但**连续 / temporal `color.field` 一律 fail-loud**——明确写「连续色阶 sequential / diverging 是 alpha.8」。当前 `PlotScale` 颜色映射只有 `ordinal`（分类 → 离散色），数值字段（温度、密度、收入、相关系数）无法编码成色。

连续色编码是 GoG 基础能力，同类库共识清晰：

- **Vega-Lite**：连续字段 + `color` → 自动 `sequential`（`scheme: 'viridis'` 等）；带正负中点的量用 `diverging`（`scheme: 'redblue'`）。
- **ggplot2**：`scale_colour_gradient`（双端）/ `gradient2`（带 midpoint diverging）/ `viridis_c`。
- **Observable Plot**：`color: { type: 'linear'|'diverging', scheme }`，`r`→sqrt、`color`→sequential 默认。
- **d3**：`scaleSequential(interpolator)` / `scaleDiverging`，配 `d3-scale-chromatic` 一大批命名 scheme。

两类语义需求：**sequential**（单调量，低→高单方向色阶）与 **diverging**（有意义中点的量，如盈亏 / 距均值偏离，两侧异色、中间淡）。`d3-scale-chromatic` 已是 `@retikz/plot` 依赖（`package.json`），配色 interpolator 现成。

**mark 边界（承 alpha.7 ④B/C）**：连续色 per-datum 着色只对 **point / bar / sector** 成立（按 datum 取色）。**line / area 是 path 级整体图元、按 series 着色**，连续字段几乎必然「同 series 内 color 不恒定」，直接命中 alpha.7 ADR-03 既有的「同 series 内 color 不恒定 → fail-loud」。故本轮 **line/area + 连续 `color.field` 仍 fail-loud**（一条线沿程渐变的 path/stroke gradient 不做，顺延）。

## 决策：`PlotScale` 新增 `sequential` / `diverging` 两个连续颜色 scale，配色走命名 scheme 词表（可选 range 覆盖），continuous/temporal color 经其映射；line/area 连续色仍 fail-loud

新增两个独立判别串（决策 ①：拆两个成员而非「sequential + 可选 midpoint」——判别清晰、裸字面量友好、`.describe` 各自完整）。配色用**命名 scheme 闭枚举**（决策 ②：可序列化进 IR、LLM 可生成）+ 可选 `range`（自定义颜色端点逃生）。lowering 经 d3 `scaleSequential` / `scaleDiverging` + `d3-scale-chromatic` interpolator 求值。

```ts
// ir/scale.ts —— PlotScale 追加（沿 DrawWay 风格，裸 'sequential' 同样可用）
export const PlotScale = {
  Linear: 'linear', Band: 'band', Point: 'point', Ordinal: 'ordinal', Time: 'time',
  Log: 'log', Pow: 'pow', Sqrt: 'sqrt',
  /** 连续顺序色阶：单调量 domain → 单方向色带（低→高），continuous/temporal color 主力 */
  Sequential: 'sequential',
  /** 连续发散色阶：有中点的量 domain → 两侧异色色带（中点淡），盈亏 / 偏离均值 */
  Diverging: 'diverging',
} as const;

// 配色方案命名词表（闭枚举，进 IR；取 d3-scale-chromatic 子集，避免全量撑爆 describe）
// PlotColorScheme = {
//   // sequential 单/多色相：Blues Greens Greys Oranges Purples Reds Viridis Magma Inferno Plasma Cividis Turbo
//   // diverging：BrBG PRGn PiYG PuOr RdBu RdGy RdYlBu RdYlGn Spectral
// } as const  →  type ColorScheme = ValueOf<typeof PlotColorScheme>

// SequentialColorScaleSchema：
//   type: z.literal(PlotScale.Sequential) / name
//   domain?: [number, number]（省略→数据推断 [min,max]；temporal 用时间戳区间）
//   scheme?: z.nativeEnum(PlotColorScheme)（默认 'viridis'）
//   range?: [string, string]（两端颜色，覆盖 scheme；与 scheme 互斥优先 range）
//   nice? / clamp?
// DivergingColorScaleSchema：
//   type: z.literal(PlotScale.Diverging) / name
//   domain?: [number, number, number]（[low, mid, high]；省略→ [min, (min+max)/2, max]）
//   scheme?: z.nativeEnum(PlotColorScheme)（默认 'rdbu'）
//   range?: [string, string, string]（覆盖 scheme）
//   nice? / clamp?
// ScaleSchema 追加二者进 discriminatedUnion('type', [...])
```

**React / vanilla 入口（决策 ⑧，修评审 P1）**：当前 `buildPlotSpec.ts:102` 把所有 color 绑死 `AUTO_COLOR`、`:289` 固定 push **ordinal**。本轮改成 **type-driven 派生**——color 字段类型为 continuous/temporal 时（有 model 或推断得知），自动派生 `sequential`（连续）；categorical 仍 `ordinal`。显式覆盖（指定 scheme / diverging / midpoint）走后续 `<ColorScale>` DSL（与 alpha.7 `scaleX/scaleY` 同样「先自动、后显式」节奏；本轮 React 仅做自动派生 sequential，diverging / 自定义 scheme 经 vanilla IR 全量可用，React 显式表面顺延）。

理由：

1. **兑现 alpha.7 埋点**：continuous/temporal color 的 fail-loud 是显式占位，本 ADR 是其出口；point/bar/sector 立刻可做连续色编码。
2. **scheme 词表 = 可序列化 + LLM 友好**：命名 scheme 进 IR、裸字面量可写，`range` 给逃生；不把 interpolator 函数塞进 IR（违反「IR 100% JSON 可序列化」）。
3. **拆两成员**：sequential / diverging 语义不同（单调 vs 有中点），分开判别比「一个 type + midpoint 开关」对 LLM 与 `.describe` 都更清晰；diverging 复用 sequential 的 interpolator 机制、只是三段 domain。
4. **守 mark 边界**：line/area 连续色 fail-loud，不偷偷做半成品 path gradient。


## DSL 表面

```tsx
// React：散点连续色（数值字段 → 自动 sequential viridis，按 datum 取色）
<Plot data={{ stations }}>
  <PointMark x="lon" y="lat" color="temperature" />   {/* continuous → sequential 自动派生 */}
</Plot>
```

```ts
// vanilla / 原生 IR：显式 diverging（盈亏，0 为中点）+ 自定义 scheme
renderPlot(
  { type: 'plot', data: { reference: 'rows' },
    coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
    scales: [
      { type: 'linear', name: '__x' }, { type: 'linear', name: '__y' },
      { type: 'diverging', name: '__color', domain: [-100, 0, 100], scheme: 'rdbu' },
    ],
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'profit', scale: '__color' } } }],
    guides: [{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y' }] },
  { rows },
);
```

## 测试设计

`packages/plot/plot/tests/lower/continuous-color.test.ts`（新建）+ `tests/ir/scale.schema.test.ts`（扩）覆盖：sequential / diverging 求值、端点 / 中点映射、scheme 取色、range 覆盖、domain 推断、line/area 连续色 fail-loud、React type-driven 派生。落地测试见实现指针。

## 影响

- **Plot IR**：`ir/scale.ts` 加 2 schema + `PlotColorScheme` 词表 + 派生类型，`ScaleSchema` union 扩 2 成员；纯增量。
- **lowering**：`lower/scale.ts` 加 sequential/diverging 求值（d3 scaleSequential/scaleDiverging + d3-scale-chromatic）；`lower/expand.ts` `makeColorResolver` 去掉 continuous/temporal fail-loud、改派生连续色阶（line/area 仍 fail-loud，复用 alpha.7 ADR-03 既有 within-series 校验路径）。
- **core**：无新依赖、不触 core IR（连续色求值在 plot 内，产物仍是 core node 的 fill/stroke 颜色字符串）。
- **文档站**：scale 概念页加连续色阶；散点 / 柱 / 扇形页加连续色 demo；`<Plot>` color 文案补「连续字段自动 sequential」。
- **对外 API**：`PlotScale` 加 2 成员 + `PlotColorScheme` 词表；React color 入口从「全 ordinal」变「按字段类型派生」。⚠️ **行为变化**：此前 point/bar/sector 绑连续 `color.field` 会 fail-loud，现在出连续色——属能力新增，不破坏既有合法 spec。

## 不在本 ADR 范围

- **离散化 scale**（quantize / threshold / quantile）→ [ADR-02](./02-discretization-scale.md)（复用本 ADR scheme/range）。
- **legend**（连续色带 ramp）→ [ADR-03](./03-legend-guide.md)。
- **path / stroke gradient**（一条 line 沿程渐变）→ 顺延需求驱动；本轮 line/area 连续色 fail-loud。
- **React 显式 `<ColorScale>` DSL / diverging React 入口** → 顺延。
- **多 hue 自定义插值 / 自定义 interpolator 函数** → 不做（IR 须可序列化，只命名 scheme + range 端点）。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/scale.ts`、`packages/plot/plot/src/lower/{scale,expand}.ts` 与 `packages/plot/react/src/components/buildPlotSpec.ts`，测试见 `packages/plot/plot/tests/{ir/scale.schema,lower/continuous-color}.test.ts` 和 `packages/plot/react/tests/components/buildPlotSpec.test.tsx`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/v0.1-alpha.8/01-continuous-color-scale.md`（封板全文）。

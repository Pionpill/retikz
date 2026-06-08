# ADR-01：连续色阶——sequential / diverging color scale + 配色方案词表

- 状态：Proposed
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

## 待决策点 🔻

- **scheme 词表成员集**：sequential 取 `Blues/Greens/Greys/Oranges/Purples/Reds/Viridis/Magma/Inferno/Plasma/Cividis/Turbo`，diverging 取 `BrBG/PRGn/PiYG/PuOr/RdBu/RdGy/RdYlBu/RdYlGn/Spectral`。倾向如上（覆盖 d3 常用集）；最终成员可实现期增删，**但一旦定下进 IR 即契约**。命名用 PascalCase 常量 + 小写判别串（`Viridis: 'viridis'`、`RdBu: 'rdbu'`）。
- **默认 scheme**：sequential 默认 `'viridis'`（感知均匀、色盲友好、社区共识），diverging 默认 `'rdbu'`。倾向如上。
- **temporal 连续色**：时间字段经 sequential（时间戳当连续量）→ 时间渐变色。倾向支持（与连续同路径，domain 取时间戳区间）；diverging 对 temporal 无意义、temporal + diverging fail-loud。
- **`scheme` 与 `range` 并存**：倾向 `range` 优先（显式颜色覆盖命名 scheme），二者都给不报错、取 range。
- **React 显式 diverging 入口**：本轮 React 只自动派生 sequential，diverging / 自定义 scheme 暂只经 vanilla IR。倾向如此（避免在 `<Plot>` 上堆 color-scale props，等 `<ColorScale>` DSL 统一做）；若评审认为 diverging 太常用需提前，再加 `<Plot colorScheme=…>` 最小入口。

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

`packages/plot/plot/tests/lower/continuous-color.test.ts`（新建）+ `tests/ir/scale.schema.test.ts`（扩）覆盖：sequential / diverging 求值、端点 / 中点映射、scheme 取色、range 覆盖、domain 推断、line/area 连续色 fail-loud、React type-driven 派生。具体见「测试象限」。

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

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/scale.ts`（IR 契约）+ `lower/**` + react 表面。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/scale.ts` | 加 | `PlotScale.Sequential` | `'sequential'` | — | 连续顺序色阶判别串 |
| `ir/scale.ts` | 加 | `PlotScale.Diverging` | `'diverging'` | — | 连续发散色阶判别串 |
| `ir/scale.ts` | 加 | `PlotColorScheme` | `as const 对象` | — | 命名配色方案词表（sequential + diverging 子集） |
| `ir/scale.ts` | 加 | `SequentialColorScaleSchema` | `z.object` | — | type/name/domain?[num,num]/scheme?/range?[str,str]/nice?/clamp? |
| `ir/scale.ts` | 加 | `SequentialColorScaleSchema.scheme` | `z.nativeEnum(PlotColorScheme)` | `'viridis'` | 配色方案名 |
| `ir/scale.ts` | 加 | `DivergingColorScaleSchema` | `z.object` | — | type/name/domain?[num,num,num]/scheme?/range?[str,str,str]/nice?/clamp? |
| `ir/scale.ts` | 加 | `DivergingColorScaleSchema.scheme` | `z.nativeEnum(PlotColorScheme)` | `'rdbu'` | 配色方案名 |
| `ir/scale.ts` | 改 | `ScaleSchema` | `z.discriminatedUnion` | — | union 追加 Sequential/Diverging |
| `ir/scale.ts` | 加 | `ColorScheme`/`SequentialColorScale`/`DivergingColorScale` | `z.infer` / `ValueOf` | — | 派生类型 |

> diverging `domain` 三元组须 `low < mid < high`（违反 fail-loud）；sequential `domain` 须 `min < max`。temporal + diverging → fail-loud。`range` 给定时覆盖 `scheme`。

### 文件 scope

- `packages/plot/plot/src/ir/scale.ts`（改）
- `packages/plot/plot/src/lower/scale.ts`（改：sequential/diverging 求值 + scheme 取色）
- `packages/plot/plot/src/lower/expand.ts`（改：`makeColorResolver` 接连续色阶，去 continuous/temporal fail-loud；line/area 经既有 within-series 校验仍 fail-loud）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（改）
- `packages/plot/plot/tests/lower/continuous-color.test.ts`（新建）
- `packages/plot/react/src/components/buildPlotSpec.ts`（改：color scale 从固定 ordinal → 按字段类型派生 sequential/ordinal）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（改：连续 color 派生 sequential）
- `apps/docs/src/contents/**`（scale 页 + 散点/柱/扇形连续色 demo）

### 测试象限

**Happy path**：
- `sequential continuous`：数值字段 + point → 各点按 viridis 取色，端点对色带两端
- `diverging midpoint`：domain `[-100,0,100]` → 0 处取中点淡色、两端异色
- `scheme 取色`：指定 `scheme: 'blues'` → 按对应 interpolator

**边界**：
- `domain 推断`：省略 domain → 从数据取 [min,max]（diverging 取 [min,mid,max]）
- `单值数据`：所有值相等 → 不崩（退化取色，端点）

**错误路径**：
- `line + 连续 color fail-loud`：LineMark + 数值 color 字段 → 抛（连续色仅 point/bar/sector）
- `area + 连续 color fail-loud`：同上
- `diverging domain 乱序`：`[100, 0, -100]` → schema/ lowering 拒绝
- `temporal + diverging fail-loud`：时间字段 + diverging → 抛

**交互**：
- `react type-driven 派生`：`<PointMark color={continuousField}/>` + model → 自动 sequential（非 ordinal）
- `range 覆盖 scheme`：同给 range + scheme → 取 range
- `连续色 + legend`：连续色 scale 被 [ADR-03](./03-legend-guide.md) legend ramp 消费（跨 ADR 锚点）

### 依赖的现有元素

- `PlotScale` / `ScaleSchema` / `LinearScaleSchema`（`ir/scale.ts`）—— 扩展
- `makeColorResolver`（`lower/expand.ts`）—— 修改（接连续色阶，去 continuous/temporal fail-loud）
- line/area within-series color 校验（`lower/mark.ts`，alpha.7 ADR-03 落地）—— 复用（连续 color 自然命中 fail-loud）
- `OrdinalScale` 求值（`lower/scale.ts`）—— 引用（categorical 仍走 ordinal）
- d3 `scaleSequential` / `scaleDiverging` + `d3-scale-chromatic`（已是 plot 依赖）—— 引用
- `buildPlotSpec.ts:102/289`（react color 绑定 + ordinal push）—— 修改（type-driven 派生）
- 字段类型推断（`lower/infer.ts`）—— 引用（判 continuous/temporal vs categorical）

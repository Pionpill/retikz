# ADR-03：color 真通道收口 + series 一等化（B/C 规则）

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.3 Aesthetics / §3.7 Series](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 通道→scale resolver](./02-channel-scale-resolver-size.md)（color 迁入）· 关联：[alpha.5 ADR-02 datum locator](../alpha.5/02-datum-locator.md)（隐式拆等价性）

## 背景

color 通道名义上是「真 scale 通道」，实则半成品，且 color 与 series 的边界含糊：

1. **color resolver 恒走 ordinal、不查字段类型**：`makeColorResolver`（`lower/expand.ts:372`）无论字段是 categorical 还是 continuous/temporal，一律合成 ordinal scale 调色。数值字段会被**静默当分类**调色（错误编码），而连续色阶本应是 alpha.8 的事（[alpha.6 ADR-03](../alpha.6/03-type-driven-scale.md) 明确连续/temporal color 留 alpha.8）。
2. **单系列 path 的 `color.field` 静默丢弃**：line/area 有 series 时取每组首行颜色（`lower/mark.ts:344` / `:395`）；**无 series 时 `color.field` 被忽略、回退 `currentColor`**（`lower/mark.ts:355`），而 React `<LineMark color>` 文档写成「颜色字段」（`marks.tsx:13`）、`buildPlotSpec` 也把 `color` 转 `{field, scale: __color}`（`buildPlotSpec.ts:97`）——表面承诺与行为不符（cross-review P2 债）。
3. **series 与 color 关系未定调**：retikz 的 `series` 是 mark 级显式字段（`ir/mark.ts:63`），color 是独立通道——但「单系列 + color 字段」该怎样、是否隐式分组，从未写死。

同类库谱系：**ggplot2** 离散 `colour` 同时 = 分组 + 上色 + 图例（`group` 才是真分组键，通常隐式）；**Vega-Lite** `detail` 只分组不上色、`color` 分组+上色，二者可分离；**Observable Plot** `z` 分组、`fill/stroke` 上色，可分离；**Highcharts** 显式 `series` 数组。retikz 取「**显式 series 一等 + color 兜底拆分**」的折中——既修债，又不滑向 ggplot「所有离散 aesthetic 自动分组」。

## 决策：按 B/C 规则收口 color×series；color 补字段类型兼容校验；color 迁入 ADR-02 的通用 resolver

**(1) 字段类型兼容校验**（收口「真通道」）：color resolver 经 [ADR-02](./02-channel-scale-resolver-size.md) 的通用通道→scale resolver 解析；按字段类型分流：

- **categorical** `color.field` → ordinal scale（现状，保留）；
- **continuous / temporal** `color.field` → **fail-loud**（连续色阶 sequential/diverging 是 alpha.8，本轮不静默当 ordinal）；
- 常量 `color.value` → 直用（不变）。

**(2) B/C color×series 收口规则**：

| mark 类 | 着色 | series 语义 |
|---|---|---|
| point / bar / sector | 按 **datum** 着色 | 不引入 series（已能按 datum 分色）|
| line / area（path）| 按 **series** 着色 | path 是整体图元，按 series 上色 |

- **line/area 无显式 `series` 且有 categorical `color.field`** → **隐式按 color 拆 series**（修单系列静默丢弃）；
- **显式 `series` + `color.field` 并存** 且**同一 series 内 color 不恒定** → **fail-loud**；
- **显式 `series` 优先**，color 不反向覆盖 series。

**(3) 隐式拆 = 显式 series 等价**：line/area 由 categorical color 隐式拆出的 IR，**必须逐字段等价于**显式写 `series=<colorField>` 的 IR（Path/Scope 数量、id、meta 一致），守住 [alpha.5 datum locator](../alpha.5/02-datum-locator.md) parity——配等价性测试 `expect(buildIR(implicitColor)).toEqual(buildIR(explicitSeries))`。

```ts
// lower/mark.ts —— 概念伪码（line/area 解析 series 来源）
// 优先级：显式 series > categorical color 隐式 > 单条
const seriesField =
  mark.series ??                                   // 显式优先
  (isCategoricalColorField(mark.encoding.color) ? mark.encoding.color.field : undefined);  // color 兜底
// 显式 series + color：校验 color 在每个 series 内恒定，否则 fail-loud
if (mark.series && colorField && !colorConstantWithinSeries(...)) throw new Error('color must be constant within each series; ...');
```

理由：

1. **修债且不过界**：隐式拆只发生在 path mark（line/area）、只认 categorical color——既消灭「单系列 color 静默丢弃」，又把「显式 series 一等」守住，不滑向 ggplot 全自动分组。
2. **真通道名副其实**：连续/temporal color fail-loud，杜绝数值字段被错当分类调色；连续色阶按计划留 alpha.8。
3. **locator 安全**：隐式拆等价显式 series，alpha.5 接通的 datum 定位不被新行为破坏。


## DSL 表面

```tsx
// 单折线 + categorical color 字段 → 隐式拆成每类一条线（= 显式 series）
<Plot data={{ sales }}>
  <LineMark x="month" y="amount" color="region" />   {/* 隐式按 region 拆系列 */}
</Plot>

// 等价显式写法
<Plot data={{ sales }}>
  <LineMark x="month" y="amount" series="region" color="region" />
</Plot>

// 散点：color 按 datum（不拆系列）
<Plot data={{ rows }}>
  <PointMark x="x" y="y" color="category" />
</Plot>
```

```ts
// vanilla / 原生 IR：显式 series + 每系列恒定 color（合法）；series 内 color 不恒定 → 报错
{ type: 'line', series: 'region', encoding: { x: { field: 'month' }, y: { field: 'amount' }, color: { field: 'region', scale: '__color' } } }
```

## 测试设计

`packages/plot/plot/tests/lower/color-series.test.ts` 覆盖：类型兼容校验、B/C 各 mark 着色、隐式拆等价性、冲突 fail-loud。落地测试见实现指针。

## 影响

- **Plot IR**：**无 schema 字段增删**（color/series 字段已存在）——本 ADR 是 **lowering 行为契约** 改动。
- **lowering**：`lower/expand.ts` `makeColorResolver` 加类型校验并迁到通用 resolver（[ADR-02](./02-channel-scale-resolver-size.md)）；`lower/mark.ts` line/area 解析 series 来源（显式 > color 隐式）+ 冲突校验 + 单系列 color 不再丢弃。
- **core**：无影响。
- **文档站**：折线/面积/散点页 `color` 语义说明 + 「color 隐式拆系列」概念；改 `<LineMark color>` / `<AreaMark color>` API 文案。
- **对外 API**：⚠️ **BREAKING（行为）**——此前**单折线/面积 + `color={field}` 被静默忽略**（出一条 `currentColor` 线），现在**隐式拆成多条线**。迁移：不想拆系列就别绑 color 字段（用常量 `color` 或去掉）；想要旧的「单色线」语义用 `color={常量}`。changelog 标明。

## 不在本 ADR 范围

- **连续色阶**（sequential / diverging color scale）→ alpha.8（本轮连续/temporal color fail-loud）。
- **legend**（由 color/series 派生图例）→ alpha.8。
- **point/bar/sector 的隐式 series** → 不做（它们按 datum 着色，无 path 整体性问题）。
- **size 通道** → [ADR-02](./02-channel-scale-resolver-size.md)。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/lower/{expand,mark,channel}.ts` 与 React mark 构造，测试见 `packages/plot/plot/tests/lower/color-series.test.ts` 和 `packages/plot/react/tests/components/buildPlotSpec.test.tsx`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.7/03-color-series.md`（封板全文）。

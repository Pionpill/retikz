# ADR-11: Legend size symbol 布局与缩放策略

- 状态：Accepted（首轮实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

当前 size legend 直接复用 size 通道 descriptor 的半径范围。默认 size 通道最大半径是 `20`，而 legend 默认 `swatchSize` 是 `14`。当 size legend 下沉为圆点符号时，最大符号的实际包围盒会大于 legend 条目的基准格子，导致符号遮挡相邻条目、标签或 plot area。

开源图表库通常不会让图例符号无约束地继承 mark 的真实几何尺寸。Vega / Vega-Lite 将 legend symbol 的 `symbolSize`、`rowPadding`、`symbolLimit` 等布局 token 独立出来；Recharts 的 legend icon 有固定 `iconSize`；ECharts 对过多 legend 提供 scroll legend；AG Charts 将 legend marker 尺寸、legend 最大尺寸与分页分开处理；Matplotlib 的 scatter legend 也提供 `markerscale` 来控制图例 marker 相对原图 marker 的缩放。

因此 size legend 需要同时解决两层问题：第一，默认不遮挡；第二，允许用户选择图例符号是否保持实绘比例。仅把 `swatchSize` 调大不能解决全部问题，因为用户可以显式配置更大的 size range，且 color / shape / opacity legend 的 swatch 基准尺寸不应该被 size legend 的策略绑死。

## 决策：size legend 使用独立 symbol fit，并按实际符号尺寸参与条目布局

Legend style 新增 size symbol 相关 token：`symbolSize`、`symbolScale`、`symbolFit`。默认使用 `symbolFit:'fit'`，把 size legend 的最大符号放入 `symbolSize` 盒子内；需要保留 mark 真实尺寸关系时，用户可以显式设置 `symbolFit:'preserve'`，再配合 `symbolScale` 做整体缩放。无论哪种模式，legend 条目布局都必须按实际符号包围盒计算 item 尺寸，不再只按 `swatchSize` 推进行高或列宽。

```ts
type LegendStyle = {
  swatchSize?: number;
  swatchGap?: number;
  entryGap?: number;
  titleGap?: number;
  rampLength?: number;
  rampThickness?: number;
  symbolSize?: number;
  symbolScale?: number;
  symbolFit?: 'fit' | 'preserve';
  title?: GuideTextStyle;
  label?: GuideTextStyle;
};
```

语义固定如下：

- `symbolSize` 是 size / shape 等符号型 legend 的目标视觉盒尺寸，默认等于 `swatchSize`。它不改变 mark 的实绘半径，只影响 legend。
- `symbolScale` 是 legend 符号缩放系数，默认 `1`。在 `fit` 模式下，它作用在 fit 后的符号半径上；在 `preserve` 模式下，它直接作用在 descriptor 半径上。
- `symbolFit:'fit'` 将 size descriptor 的最大符号压缩到 `symbolSize` 视觉盒内，同时保持各代表值之间的半径比例。默认采用该模式，保证普通图例不会遮挡。
- `symbolFit:'preserve'` 不按 `symbolSize` 压缩，只使用 descriptor 半径与 `symbolScale`。此模式适合精确说明实绘半径，但 layout 仍按最终符号尺寸动态预留空间。
- legend item 的主轴步进使用 `max(swatchSize, symbolBBox)`，标签中心对齐 item 中心。横向 legend 同理用 item 宽度推进，避免大符号压住下一个条目。

理由：

1. 默认 `fit` 符合大多数图表库的图例心智：legend 是解释控件，不应该破坏图表布局。
2. `preserve` 保留精确出版或调试场景，避免完全切断 legend 与 mark 实绘尺寸的关系。
3. 动态 item 尺寸修复了根因：即使用户显式配置很大的 `symbolScale` 或 `preserve`，legend 也会为最终符号留出条目空间。
4. 字段全部是 JSON-safe 标量，不引入 renderer 测量、DOM 或函数。

## DSL 表面

默认不需要额外配置：

```ts
{
  type: 'legend',
  channel: 'size'
}
```

压缩到更小的图例符号：

```ts
{
  type: 'legend',
  channel: 'size',
  style: {
    symbolSize: 10,
    symbolFit: 'fit'
  }
}
```

保留实绘尺寸但整体缩小：

```ts
{
  type: 'legend',
  channel: 'size',
  style: {
    symbolFit: 'preserve',
    symbolScale: 0.5
  }
}
```

主题默认同名配置：

```ts
{
  theme: {
    legend: {
      symbolSize: 14,
      symbolFit: 'fit'
    }
  }
}
```

## 测试设计

`packages/viz/plot/tests/features/guide/legend.test.ts` 覆盖：

- 默认 size legend 的最大符号不会超过 `symbolSize` 盒子。
- 默认 size legend 条目行距按符号实际尺寸推进，不再用固定 `swatchSize` 导致遮挡。
- `style.symbolSize` 能改变 fit 后的最大符号尺寸。
- `style.symbolFit:'preserve'` 保留 descriptor 半径，并让条目布局按更大符号留空间。
- `theme.legend.symbolSize` 能作为全局默认，被单个 legend `style.symbolSize` 覆盖。

`packages/viz/plot/tests/ir/plot.schema.test.ts` 覆盖：

- `LegendGuideStyleSchema` 接受 `symbolSize`、`symbolScale`、`symbolFit`。
- 非正数 `symbolSize` / `symbolScale` 被拒绝。

## 影响

- `LegendGuideStyleSchema` 新增 `symbolSize`、`symbolScale`、`symbolFit`，同时影响 `guide.style` 与 `theme.legend`。
- `ResolvedLegendGuideTokens` 新增同名解析字段，默认 `symbolSize = swatchSize`、`symbolScale = 1`、`symbolFit = 'fit'`。
- size legend 的下沉几何改变：默认会把图例圆点压入 symbol box，因此默认视觉比旧版本小；这是为了修复遮挡问题。
- 不修改 core IR；仍然下沉为 core `Node`。
- 文档需要同步 legend style 字段说明和 size legend 默认行为。

## 不在本 ADR 范围

- legend 整体 `maxWidth` / `maxHeight`、滚动、分页、自动换行和列布局。
- color ramp 的自动压缩或 tick label 避让。
- 与后续全局 `LayoutClaim` solver 的统一 overflow 策略。
- chart preset 对 size legend 的二次默认值包装。

---

## 实现契约

### Level

`yellow`

本 ADR 修改 guide schema、theme provider、legend lowering、测试和 docs；不修改 core IR，不修改包顶层公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `LegendGuideStyleSchema.symbolSize` | `z.number().positive().optional()` | `swatchSize` | 符号型 legend 的目标视觉盒尺寸 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `LegendGuideStyleSchema.symbolScale` | `z.number().positive().optional()` | `1` | legend 符号缩放系数 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `LegendGuideStyleSchema.symbolFit` | `z.enum(['fit', 'preserve']).optional()` | `fit` | size legend 是否压入 symbol 盒子或保留 descriptor 半径 |

### 文件 scope

- `packages/viz/_notes/decisions/v0/v0.1/alpha.15/11-legend-size-symbol-layout.md`
- `packages/viz/plot/src/schemas/guide/constants.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/src/pipeline/expand.ts`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/tests/features/guide/legend.test.ts`
- `packages/viz/plot/tests/ir/plot.schema.test.ts`
- `packages/viz/plot/tests/theme/theme.test.ts`
- `apps/docs/src/modules/docs/contents/viz/grammar/guide/axis/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/viz/grammar/guide/axis/index.en.mdx`

### 测试象限

Happy path：
- `size_legend_default_symbols_fit_inside_symbol_box`：默认 size legend 最大符号不超过 symbol box。
- `size_legend_symbol_size_style_controls_fit_box`：局部 `style.symbolSize` 改变最大 legend 符号尺寸。
- `theme_legend_symbol_size_is_used_by_size_legend`：主题默认影响 size legend。

边界：
- `size_legend_preserve_keeps_descriptor_radius_and_reserves_space`：`preserve` 保留较大符号并动态留出行距。
- `single_value_size_legend_still_fits_symbol_box`：单值或退化 ticks 不突破 symbol box。

错误路径：
- schema 拒绝 `symbolSize <= 0`。
- schema 拒绝 `symbolScale <= 0`。

交互：
- 局部 `style.symbolSize` 覆盖 `theme.legend.symbolSize`。
- 文本 label 位置跟随动态 item center，不与大符号重叠。

### 依赖的现有元素

- `ScaleDescriptor.range`：继续作为 size legend 的原始半径来源。
- `resolveSqrtForLegend`：继续计算代表值半径，新增 legend-only fit/scale 后处理。
- `LegendGuideStyleSchema`：扩展公开 style token。
- core `Node`：继续承载 size legend 符号和文本，不新增 core 能力。

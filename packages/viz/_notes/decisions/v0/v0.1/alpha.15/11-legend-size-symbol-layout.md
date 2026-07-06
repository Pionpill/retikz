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
- size legend 只渲染代表半径的圆点符号，不再额外绘制矩形 swatch 外框；color / opacity / bin legend 仍保留矩形 swatch。
- legend item 的主轴步进使用 `max(swatchSize, symbolBBox)`，标签中心对齐 item 中心。横向 legend 同理用 item 宽度推进，避免大符号压住下一个条目。

理由：

1. 默认 `fit` 符合大多数图表库的图例心智：legend 是解释控件，不应该破坏图表布局。
2. `preserve` 保留精确出版或调试场景，避免完全切断 legend 与 mark 实绘尺寸的关系。
3. 动态 item 尺寸修复了根因：即使用户显式配置很大的 `symbolScale` 或 `preserve`，legend 也会为最终符号留出条目空间。
4. 字段全部是 JSON-safe 标量，不引入 renderer 测量、DOM 或函数。

## 不在本 ADR 范围

- legend 整体 `maxWidth` / `maxHeight`、滚动、分页、自动换行和列布局。
- color ramp 的自动压缩或 tick label 避让。
- 与后续全局 `LayoutClaim` solver 的统一 overflow 策略。
- chart preset 对 size legend 的二次默认值包装。

---

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/11-legend-size-symbol-layout.md`。

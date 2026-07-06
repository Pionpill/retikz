# ADR-03：Plot theme schema 与合并优先级

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §11.1 模块清单](../../../../architecture/plot-design.md#111-模块清单)

## 背景

alpha.15 需要把 axis、axis grid、legend、palette、typography 与背景的默认样式收口到同一入口。当前 PlotSpec 只有根级 `colors`，guide lowering 内部仍有多处硬编码视觉默认。随着 axis guide 部件槽位和 legend/palette 细化，如果没有统一 theme 入口，用户必须在每个 Axis / Legend 上重复写局部覆盖，adapter 也容易各自发明默认。

Theme 是横切能力，但它不能变成第二套语义系统。Scale 的 `domain`、`domainPadding`、`nice`、`ticks.values`、`tickLabels.format` 属于 scale / guide 语义，不能进入 theme merge chain。Theme 只提供视觉 token、typography、palette 与 background 默认，并在 lowering 前被解析成具体 guide / mark / core style。Typography 复用 ADR-02 的 `GuideTextStyleSchema`，也就是 core `FontSchema` / `textColor` / `opacity` / `align` / `lineHeight` / `maxTextWidth` vocabulary。

retikz 的 IR 必须 JSON-safe。因此 theme 只能包含 plain object、颜色字符串、数值、枚举和数组；不能包含 formatter 函数、ReactNode、DOM、CSSStyleDeclaration、d3 scale 函数或 renderer 对象。

## 决策：新增 JSON-safe `PlotSpec.theme`，采用 built-in < spec theme < local guide override 的覆盖链

`PlotSpec` 新增 `theme?: PlotTheme`。Theme 在 plot lowering 内被消费，不作为 opaque object 原样下沉到 core IR。合并顺序固定为：

```text
built-in default theme
  < PlotSpec.theme
  < local guide / legend override
```

Theme 顶层结构固定为：

```ts
type PlotTheme = {
  background?: string;
  typography?: GuideTextStyle;
  axis?: PlotAxisTheme;
  legend?: PlotLegendTheme;
  palette?: PlotPaletteTheme;
};
```

其中 `axis` 复用 ADR-02 的 axis 部件槽位词汇：`line`、`ticks`、`tickLabels`、`title`、`grid`，但只包含视觉和局部几何 token 默认，不包含 `ticks.count`、`ticks.values`、`tickLabels.format`、`title.text`、`grid.applyTo`、`grid.select`。`legend` 与 `palette` 由 ADR-04 固定。Theme 不包含 `hover`、`selected`、`active` 等 interaction state token。

实现上新增 `resolvePlotTheme(spec.theme)`，返回内部 `ResolvedPlotTheme`。所有 built-in default、`PlotSpec.theme`、palette fallback 与 typography 默认都在这里收敛；axis / legend lowering 不直接读取未解析 theme。

局部 guide 覆盖走专门 resolver：

```ts
resolveAxisGuideTokens(resolvedTheme.axis, axisGuide)
resolveLegendGuideTokens(resolvedTheme.legend, legendGuide.style)
```

这两个 resolver 只合并 token 字段。`ticks.count`、`ticks.values`、`tickLabels.format`、`title.text`、`grid.applyTo`、`grid.select`、legend `position`、`orient`、`ticks`、`tickLabels` 等语义字段不进入 token merge，也不应该出现在 theme schema 里。

理由：

1. 单一 `PlotSpec.theme` 能让 plot / React / Vanilla 三包共享默认，不在 adapter 层复制外观策略。
2. 覆盖链清晰：内置默认保证可读，spec theme 提供全局风格，局部 guide / legend 字段处理单个对象的例外。
3. Theme 只负责视觉 token，避免把 domain / tick / scale 语义塞进样式系统。
4. JSON-safe 结构符合 retikz IR 原则，也便于 LLM 生成、保存和跨 renderer 复用。

## 不在本 ADR 范围

- Axis domain padding、`ticks.values`、`tickLabels.format`；由 ADR-01 / ADR-02 处理，且不进入 theme。
- Axis 子结构 token 的细节；由 ADR-02 处理。
- Legend / palette token 的具体字段和 `colors` 迁移；由 ADR-04 处理。
- CSS variable runtime 读取、React context theme provider、dark mode 自动切换。
- Interaction state token，例如 hover / selected / active / disabled。
- Named theme registry；若后续需要，应通过 JSON-safe name + runtime registry 另开 ADR。

---

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/03-theme-schema-merge.md`。

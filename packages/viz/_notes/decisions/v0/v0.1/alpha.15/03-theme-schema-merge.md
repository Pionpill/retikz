# ADR-03：Plot theme schema 与合并优先级

- 状态：Proposed
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

## 待决策点

无。Named theme registry、dark mode runtime 联动和 CSS variable 读取均不在本 ADR 内。

## DSL 表面

```tsx
<Plot
  data={rows}
  theme={{
    background: '#ffffff',
    typography: { font: { size: 12 }, textColor: '#1f2937' },
    axis: {
      line: { stroke: '#374151' },
      tickLabels: { textColor: '#4b5563' },
      grid: { stroke: '#d1d5db', drawOpacity: 0.55 },
    },
    palette: {
      categorical: ['#2563eb', '#dc2626', '#16a34a'],
    },
  }}
>
  <Axis dimension="x" grid />
  <Axis dimension="y" grid={{ drawOpacity: 0.8 }} />
</Plot>
```

第二个 Axis 的 `grid.drawOpacity: 0.8` 只覆盖自己的 grid line；它不改变全局 theme，也不影响 scale domain / tick 计算。

## 测试设计

`packages/viz/plot/tests/theme/theme-merge.test.ts` 覆盖 theme schema、默认值、合并顺序、JSON-safe 边界。

`packages/viz/plot/tests/guide/axis-style.test.ts` 与 `packages/viz/plot/tests/guide/legend-style.test.ts` 覆盖 theme token 到 guide lowering 的消费。

`packages/viz/plot-react/tests/theme-authoring.test.tsx` 与 `packages/viz/plot-vanilla/tests/theme-authoring.test.ts` 覆盖 adapter 生成 PlotSpec 等价性。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `PlotSpecSchema` 增加 `theme` 字段；新增 `schemas/theme/**` 作为 theme schema/type 真源。
- `theme.background` 设置时，plot lowering 在 plot root scope 最底层生成覆盖 plot panel 的背景矩形；省略时不生成背景 primitive。
- guide / legend lowering 需要从 `ResolvedPlotTheme` 读取默认视觉 token，并通过 axis / legend token resolver 合并局部覆盖。
- `colors` 的长期语义由 ADR-04 迁移到 palette 体系；本 ADR 只定义 theme 总入口和 merge priority。
- docs 需要新增 theme 概念页或 reference 小节，并在 guide 示例中展示全局 theme + 本地 guide 字段覆盖。
- 不触碰 core IR；theme 被 plot lowering 消费后落成 core 样式字段。

## 不在本 ADR 范围

- Axis domain padding、`ticks.values`、`tickLabels.format`；由 ADR-01 / ADR-02 处理，且不进入 theme。
- Axis 子结构 token 的细节；由 ADR-02 处理。
- Legend / palette token 的具体字段和 `colors` 迁移；由 ADR-04 处理。
- CSS variable runtime 读取、React context theme provider、dark mode 自动切换。
- Interaction state token，例如 hover / selected / active / disabled。
- Named theme registry；若后续需要，应通过 JSON-safe name + runtime registry 另开 ADR。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 PlotSpec schema、plot lowering 解析默认和 adapter authoring 表面；不改变 core IR 和 renderer API。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/plot/schema.ts` | 加 | `theme` | `PlotThemeSchema.optional()` | `—` | Plot 级 JSON-safe 主题，提供 axis/axis grid/legend/palette/typography/background 默认 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 新建 | `background` | `z.string().min(1).optional()` | `—` | Plot 背景色；设置时 lowering 生成 plot panel 背景矩形，省略表示透明或继承 renderer 背景 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 新建 | `typography` | `GuideTextStyleSchema.optional()` | 内置 font.size 12，textColor currentColor | 全局 guide 文本默认；字段与 ADR-02 / core 文本 vocabulary 同名同义 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 新建 | `axis` | `PlotAxisThemeSchema.optional()` | ADR-02 内置 axis 默认 | Axis line / ticks / tickLabels / title / grid 的视觉和局部几何默认；复用 ADR-02 部件名，但排除 tick source、format、title text、grid projection 等语义字段 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 新建 | `legend` | `PlotLegendThemeSchema.optional()` | ADR-04 内置 legend 默认 | Legend layout 与文字默认 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 新建 | `palette` | `PlotPaletteThemeSchema.optional()` | ADR-04 内置 palette 默认 | Categorical / sequential / diverging / series / sector 默认色板 |

`PlotThemeSchema` 必须 `.strict()`；所有子对象也默认 `.strict()`，除非 ADR-04 为 palette custom scheme 明确开放 passthrough。Theme 中不得出现函数、Date、class instance 或 renderer-specific object。

Theme resolver 输出为内部类型，不进入 PlotSpec schema：

| 内部类型 / helper | 输入 | 输出 | 契约 |
|---|---|---|---|
| `resolvePlotTheme` | built-in default theme + `PlotSpec.theme` + `PlotSpec.colors` | `ResolvedPlotTheme` | 解析 typography、axis、legend、palette、background 默认；不保留语义字段 |
| `resolveAxisGuideTokens` | `ResolvedPlotTheme.axis` + `AxisGuide` | `ResolvedAxisGuideTokens` | 合并 axis line / ticks line / tickLabels style / title style / grid line token；排除 tick source、format、title text、grid projection |
| `resolveLegendGuideTokens` | `ResolvedPlotTheme.legend` + `LegendGuide.style` | `ResolvedLegendGuideTokens` | 合并 legend layout、swatch/ramp 与 title/label text style；排除 channel、scale、position、orient、tick source |
| `resolvePlotPalette` | `PlotSpec.theme.palette` + `PlotSpec.colors` + built-in palette | `ResolvedPlotPalette` | 产出 categorical / series / sector / sequential / diverging 的最终默认值，供 scale、mark default 和 legend 共用 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/theme/**`（新建）
- `packages/viz/plot/src/schemas/plot/schema.ts`
- `packages/viz/plot/src/schemas/plot/types.ts`
- `packages/viz/plot/src/schemas/index.ts`
- `packages/viz/plot/src/features/guide/**`
- `packages/viz/plot/src/pipeline/expand.ts`
- `packages/viz/plot/src/pipeline/layout.ts`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot/tests/theme/**`
- `packages/viz/plot/tests/guide/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `PlotSpec theme is accepted`：schema 接受包含 background / typography / axis / legend / palette 的 JSON-safe theme。
- `built-in theme supplies guide defaults`：没有本地 guide override 时，axis/grid/legend 使用内置主题默认。
- `PlotSpec.theme overrides built-in theme`：spec theme 改 axis tick label textColor / grid opacity → lowering 产物变化。
- `local guide fields override PlotSpec.theme`：单个 Axis 的 `tickLabels` / `grid` 覆盖 theme axis 默认，其他 Axis 不受影响。
- `background theme emits panel background`：设置 `theme.background` 后，plot root scope 最底层生成覆盖 plot panel 的背景矩形。

**边界**：

- `empty theme object is valid`：`theme: {}` 合法，等价使用内置默认。
- `background omitted remains transparent`：不写 background 不应强制生成背景矩形。
- `typography partially overrides defaults`：只写 `font.size` 时 textColor 等默认仍来自内置 theme。
- `domain and tick semantics ignore theme`：theme 不影响 `domainPadding`、`ticks.values`、`tickLabels.format` 的 resolved 结果。

**错误路径**：

- `theme rejects unknown keys`：strict schema 拒绝未知顶层 key。
- `theme rejects function-like non-json values`：schema 或 JSON-safe 校验拒绝非 plain JSON 值。
- `negative visual sizes are rejected`：font.size / lineHeight / maxTextWidth / gap / swatch size 等负值拒绝。

**交互**：

- `theme works with axis local components`：ADR-02 axis 部件槽位和 theme merge 一起工作。
- `theme works with legend local style`：ADR-04 legend style 和 theme merge 一起工作。
- `semantic guide fields never enter theme merge`：theme 和 local token resolver 不会改写 `ticks.values`、`tickLabels.format`、`title.text`、`grid.applyTo`、legend `orient`。
- `adapter specs are equivalent`：React / Vanilla theme props 生成的 PlotSpec 与手写 spec 等价。

### 依赖的现有元素

- `PlotSpecSchema`（`packages/viz/plot/src/schemas/plot/schema.ts`）——新增 `theme` 字段。
- `AxisGuideSchema` 与 ADR-02 axis 部件 schema（`packages/viz/plot/src/schemas/guide/schema.ts`）——作为 `theme.axis` 的 token 来源。
- `lowerGuide` / `lowerLegend`（`packages/viz/plot/src/features/guide/guide.ts`）——消费 resolved theme。
- `resolvePlotTheme` / `resolveAxisGuideTokens` / `resolveLegendGuideTokens` / `resolvePlotPalette`（`packages/viz/plot/src/features/guide/**` 或 `packages/viz/plot/src/pipeline/**`）——实现阶段新增的主题解析与局部覆盖共用入口。
- `PlotSpec.colors`（`packages/viz/plot/src/schemas/plot/schema.ts`）——由 ADR-04 定义与 `theme.palette` 的迁移和优先级。
- `@retikz/core` style 字段 —— theme 解析后的最终落点，仅消费不修改。

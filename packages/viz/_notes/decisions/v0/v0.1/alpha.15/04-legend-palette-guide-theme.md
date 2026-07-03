# ADR-04：Legend、palette 与 guide family theme

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

Legend 是 guide family 的另一半。alpha.8 已经让 legend 能表达离散 swatch、连续 ramp、分箱、size / opacity / shape 等通道，但 legend 几何和默认配色仍散落在 lowering 常量与 scale 默认里。alpha.15 的 Theme 不能只覆盖 axis；否则图的解释性结构仍然分裂。

当前 PlotSpec 有根级 `colors`，ordinal color scale 会把它作为默认 palette；连续色带使用 scheme 字段或内置默认。随着 `PlotSpec.theme.palette` 引入，需要明确 `colors`、theme palette、显式 scale `range` / `scheme` 的优先级，避免同一张图因为入口不同得到不同颜色。

Legend 外观同样需要分槽位 token：swatch size、entry gap、title gap、ramp length / thickness、title / label typography。它们应该通过 theme 提供默认，也允许单个 LegendGuide 本地覆盖。Legend title / label 的文本样式复用 ADR-02 的 `GuideTextStyleSchema`，title 内容复用 core `TextBlockSchema`。自定义 legend item template、HTML legend、交互筛选不属于静态 GoG v0.1 收口范围。

## 决策：palette 进入 theme，显式 scale 优先，LegendGuide 增加本地 style override

`PlotTheme.palette` 固定为 plot 默认配色入口，覆盖 categorical / series / sector / sequential / diverging 等用途。显式 scale `range` / `scheme` 优先级最高；theme palette 次之；现有 `PlotSpec.colors` 作为兼容 shorthand，只在 categorical / series 对应槽位省略时参与默认；内置 palette 兜底。

```text
ordinal categorical = explicit range ?? theme.palette.categorical ?? PlotSpec.colors ?? built-in categorical
series color        = theme.palette.series ?? theme.palette.categorical ?? PlotSpec.colors ?? built-in categorical
sector color        = theme.palette.sector ?? theme.palette.categorical ?? PlotSpec.colors ?? built-in categorical
sequential scheme   = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
quantize scheme     = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
threshold scheme    = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
quantile scheme     = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
diverging scheme    = explicit range/scheme ?? theme.palette.diverging ?? built-in diverging
```

LegendGuide 新增 `style?: LegendGuideStyle`，字段覆盖 `theme.legend`。Legend style 控制 layout token 和文字 / swatch 外观，不改变 legend 绑定的 channel、scale、position、orient、tick source。

Palette 解析必须产出单一 `ResolvedPlotPalette`：color scale provider、无 color encoding 的 series 默认色、sector 默认色和 legend swatch / ramp 都只能消费这个 resolved palette，不各自重复实现 fallback 链。

Legend ramp 的 tick 语义复用 ADR-01 / ADR-02 的 guide tick vocabulary。LegendGuide root 使用 `ticks?: GuideTickSource` 表达 ramp tick source，使用 `tickLabels?: false | GuideTickLabelFormat` 表达 ramp tick label 开关与格式；离散 legend 忽略 tick source，但仍可用 `tickLabels: false` 隐藏条目标签。`style.label` 只控制文字样式，不控制格式。

```ts
const spec = {
  theme: {
    palette: {
      categorical: ['#2563eb', '#dc2626', '#16a34a'],
      sequential: 'viridis',
      diverging: 'rdbu',
      sector: ['#0ea5e9', '#f97316', '#84cc16'],
    },
    legend: {
      swatchSize: 12,
      entryGap: 8,
      label: { font: { size: 11 }, textColor: '#4b5563' },
      title: { font: { size: 12 }, textColor: '#111827' },
    },
  },
  guides: [
    {
      type: 'legend',
      channel: 'color',
      style: { rampLength: 120 },
    },
  ],
};
```

理由：

1. Palette 是 theme 的核心部分，不能继续只靠根级 `colors` 表达。
2. 显式 scale range / scheme 必须保持最高优先级，因为它是用户对具体编码的直接声明。
3. `colors` 保留为 shorthand 可降低迁移成本，但新文档应引导用户使用 `theme.palette`。
4. Legend 本地 style 与 Axis 本地 style 对称，guide family 的覆盖模型一致。

## 待决策点

无。Legend frame / background 本轮不开放；如果实现时发现必须画背景框，应新开 ADR 或扩展本 ADR 后再施工。

## DSL 表面

```tsx
<Plot
  data={rows}
  theme={{
    palette: {
      categorical: ['#2563eb', '#dc2626', '#16a34a'],
      sequential: 'viridis',
    },
    legend: {
      swatchSize: 12,
      swatchGap: 6,
      entryGap: 8,
      title: { font: { size: 12 }, textColor: '#111827' },
      label: { font: { size: 11 }, textColor: '#4b5563' },
    },
  }}
>
  <Legend channel="color" position="right" title={['Category', { text: 'n = 42', font: { size: 10 }, opacity: 0.72 }]} />
  <Legend channel="size" position="bottom" orient="horizontal" style={{ swatchSize: 10 }} />
  <Legend channel="opacity" position="right" ticks={{ count: 4 }} tickLabels={{ format: '.0%' }} />
</Plot>
```

Vanilla builder 生成同一 PlotSpec。`orient`、`ticks`、`tickLabels.format` 是 LegendGuide root 的语义字段，不进入 `style`；若用户需要改变 legend 排布方向，必须写在 LegendGuide root。

## 测试设计

`packages/viz/plot/tests/theme/palette.test.ts` 覆盖 palette 优先级、categorical / series / sector 默认色和连续 scheme 默认。

`packages/viz/plot/tests/guide/legend-style.test.ts` 覆盖 legend style token 到 lowerLegend 的几何和文字样式。

`packages/viz/plot-react/tests/theme-authoring.test.tsx` 与 `packages/viz/plot-vanilla/tests/theme-authoring.test.ts` 覆盖 adapter 生成 PlotSpec 等价性。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `PlotThemeSchema` 增加 `palette` 与 `legend` 子 schema。
- `LegendGuideSchema` 的 `title` 内容改为 `TextBlockSchema`，并增加 `style` 字段。
- `LegendGuideSchema` 的连续 ramp tick source 改为复用 `GuideTickSourceSchema`，tick label format 复用 `GuideTickLabelFormatSchema`。
- color scale / mark default color / legend lowering 需要读取同一个 `ResolvedPlotPalette` 和 resolved legend theme。
- 根级 `colors` 不删除，但定义为 palette shorthand；docs 新示例优先使用 `theme.palette`。
- 不触碰 core IR；legend 仍 lowering 成 core Scope / Node / Path / paint server。

## 不在本 ADR 范围

- HTML legend、自定义 legend item render/template。
- Legend hover 高亮、click filter、selection state。
- Legend frame / background / border。
- CSS variable palette、runtime dark mode palette switch。
- 新增 color scheme registry；现有 `options.colorSchemes` 继续用于 scale `scheme` 名解析。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 theme / guide schema、scale 默认解析、legend lowering 与 adapter authoring；不改 core IR。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `palette.categorical` | `z.array(z.string().min(1)).min(1)` | built-in categorical palette | 分类颜色 scale 默认色板 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `palette.series` | `z.array(z.string().min(1)).min(1)` | 同 `categorical` | 无 color encoding 的多 mark / series 默认色板 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `palette.sector` | `z.array(z.string().min(1)).min(1)` | 同 `categorical` | sector / pie / donut 默认色板 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `palette.sequential` | `z.string().min(1)` | `viridis` | sequential / quantize / threshold / quantile 默认 scheme 名 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `palette.diverging` | `z.string().min(1)` | `rdbu` | diverging 默认 scheme 名 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.swatchSize` | `z.number().positive()` | `14` | 离散 legend swatch 基准尺寸 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.swatchGap` | `z.number().nonnegative()` | `6` | swatch 到 label 的间距 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.entryGap` | `z.number().nonnegative()` | `6` | legend 条目之间的间距 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.titleGap` | `z.number().nonnegative()` | `6` | title 到首条目的间距 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.rampLength` | `z.number().positive()` | `100` | 连续色带长边长度 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.rampThickness` | `z.number().positive()` | `12` | 连续色带短边厚度 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.title` | `GuideTextStyleSchema.optional()` | 继承 typography | Legend title 文字样式，复用 ADR-02 guide 文本样式 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `legend.label` | `GuideTextStyleSchema.optional()` | 继承 typography | Legend label 文字样式，复用 ADR-02 guide 文本样式 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `title` | `TextBlockSchema.optional()` | `—` | Legend title 内容；支持 string、多行、styled line、mixed text/math runs |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `ticks` | `GuideTickSourceSchema.optional()` | scale 默认 tick source | 连续 ramp tick source；离散 legend 忽略 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `tickLabels` | `z.union([z.literal(false), GuideTickLabelFormatSchema]).optional()` | 渲染 label；format 省略用 scale 默认 | Legend label 开关与 ramp tick label 格式；离散 legend 仅消费开关 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `style` | `LegendGuideStyleSchema.optional()` | `—` | LegendGuide 本地视觉覆盖；优先级高于 theme legend 默认 |

`LegendGuideStyleSchema` 与 `PlotLegendThemeSchema` 共享字段集合；LegendGuide root 的 `position`、`orient`、`ticks`、`tickLabels` 仍是语义字段，不进入 `style`。`style.title` / `style.label` 只提供文本样式，不提供 title 内容或 tick label format；title 内容只来自 LegendGuide root `title`。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/theme/**`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/plot/schema.ts`
- `packages/viz/plot/src/providers/scale/features/color.ts`
- `packages/viz/plot/src/providers/scale/shared/**`
- `packages/viz/plot/src/features/guide/**`
- `packages/viz/plot/src/pipeline/expand.ts`
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

- `theme categorical palette drives ordinal scale default range`：ordinal color scale 未写 range → 使用 `theme.palette.categorical`。
- `theme sequential palette drives sequential defaults`：sequential / quantize / threshold / quantile 未写 scheme/range → 使用 `theme.palette.sequential`。
- `theme diverging palette drives diverging defaults`：diverging 未写 scheme/range → 使用 `theme.palette.diverging`。
- `legend theme controls swatch and ramp geometry`：swatchSize / rampLength / rampThickness 改变 legend lower 产物。
- `legend title supports text block`：LegendGuide `title` 写多行 / styled line → lowering 成 core Node text block，不丢失 per-line 样式。
- `legend ramp ticks share guide tick resolver`：连续 legend 写 `ticks.count` / `ticks.values` / `tickLabels.format` → 与 axis 使用同一解析和格式化路径。

**边界**：

- `explicit scale range beats theme palette`：scale 写 range → 不被 theme palette 覆盖。
- `explicit scale scheme beats theme palette`：scale 写 scheme → 不被 theme palette 覆盖。
- `PlotSpec.colors is a per-slot palette fallback`：只配置 `theme.palette.sequential` 时，categorical / series 仍可回退到 `colors`；配置 `theme.palette.categorical` 或 `series` 时对应槽位优先 theme。
- `legend local style overrides theme legend`：单个 LegendGuide 的 style 只影响自身。
- `ResolvedPlotPalette is shared by marks and legends`：mark 默认色、scale 默认 range / scheme、legend swatch / ramp 从同一 resolved palette 读取。

**错误路径**：

- `empty palette arrays are rejected`：categorical / series / sector 空数组 schema 拒绝。
- `negative legend sizes are rejected`：swatchSize / rampLength / rampThickness / font.size / lineHeight / maxTextWidth 负值 schema 拒绝。
- `unknown scheme still fails through color scheme resolver`：theme sequential/diverging 指向未知 scheme 时，lowering 通过现有 color scheme resolver fail-loud。

**交互**：

- `palette applies to legend and marks consistently`：mark 颜色与 legend swatch 使用同一 resolved palette。
- `palette works with sector mark legend`：sector 默认色板与 legend 条目一致。
- `adapter specs are equivalent`：React / Vanilla theme palette 与 legend style 生成的 PlotSpec 与手写 spec 等价。

### 依赖的现有元素

- `PlotSpec.colors`（`packages/viz/plot/src/schemas/plot/schema.ts`）——保留为 categorical / series / sector 的 palette shorthand，优先级低于对应 `theme.palette` 槽位。
- `ColorSchemeNameSchema` 与 color scale schemas（`packages/viz/plot/src/schemas/scale/schema.ts`）——theme scheme 名沿用现有 scheme resolver。
- `providers/scale/features/color.ts`——消费 resolved palette 作为默认 range / scheme 来源。
- `resolvePlotPalette`（见 ADR-03）——解析 theme palette、`PlotSpec.colors` 与 built-in palette，作为 color scale、mark default 与 legend 的单一 palette 来源。
- `resolveGuideTicks`（见 ADR-01 / ADR-02）——连续 legend ramp tick source 与 tick label format 的统一解析入口。
- `lowerLegend` 与 legend constants（`packages/viz/plot/src/features/guide/guide.ts`）——把常量迁移到 theme / local style token。
- `GuideTextStyleSchema` 与 core `TextBlockSchema` / `FontSchema`（见 ADR-02）——作为 legend title / label 文本契约来源。
- `options.colorSchemes` 现有运行时注入 ——继续解析 scheme 名；theme 不引入函数或 registry 对象。

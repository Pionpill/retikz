# ADR-02：Axis guide 部件槽位与样式 token

- 状态：Proposed
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

当前 axis / grid lowering 中存在多处硬编码常量，例如 `AXIS_TICK_LENGTH`、`AXIS_LABEL_GAP`、grid `drawOpacity: 0.15`，以及 legend swatch / ramp 尺寸。硬编码在早期闭环阶段可以接受，但 alpha.15 要把 Guide + Theme 收口为长期契约，否则用户只能通过改源码或等待 theme 才能调整 axis 可读性。

Axis 不是一条线。完整 axis 至少包含 axis line、tick line、tick label、axis title 和可选 grid line。它们既有视觉样式，也有会影响布局的几何 token，例如 tick length、label gap、title gap。把这些字段全部塞进 `style` 会让“style 只管外观，不改变 guide 结构或几何”的边界变模糊。

Guide 的几何还要跨 cartesian、polar、ternary、自定义坐标系成立。因此 token 名称必须围绕“轴线 / 刻度 / 标签 / 标题 / 网格”定义，不能绑定到 screen x/y，也不能只为笛卡尔坐标写特例。

## 决策：AxisGuide 使用部件槽位，而不是统一 `style` 袋子

AxisGuide 增加顶层部件槽位：`line`、`ticks`、`tickLabels`、`title`、`grid`。每个槽位既承载该部件的语义开关，也承载该部件自身的视觉和局部几何 token。

```ts
const yAxis = {
  type: 'axis',
  dimension: 'y',
  title: { text: 'Revenue', gap: 14, font: { size: 12 }, textColor: '#202124' },
  line: { stroke: '#202124', strokeWidth: 1 },
  ticks: {
    count: 6,
    length: 5,
    line: { stroke: '#202124' },
  },
  tickLabels: {
    format: '.2f',
    gap: 6,
    font: { size: 11 },
    textColor: '#3c4043',
  },
  grid: {
    applyTo: 'plotArea',
    stroke: '#dadce0',
    strokeWidth: 1,
    drawOpacity: 0.7,
  },
};
```

字段 shorthand 固定如下：

- `title: string` 等价于 `{ text: string }`。
- `tickLabels: false` 表示不渲染 tick label；对象形态表示渲染并覆盖默认。
- `line: false` 表示不渲染 axis line；对象形态表示渲染并覆盖默认。
- `grid: true` 表示开启默认 grid；`grid: false` 或省略表示不渲染 grid；对象形态表示开启 grid 并覆盖默认。
- `ticks` 不使用 boolean shorthand，因为 tick source 还要供 tick label 与 grid 复用；隐藏 tick line 时写 `ticks: { line: false }`。

`placement`、`offset`、`dimension`、`coordinateView` 仍是 AxisGuide 的结构语义字段，不进入任何部件槽位。`ticks.count` / `ticks.values` 是 tick source 语义；`ticks.length`、`tickLabels.gap`、`title.gap`、`grid.stroke` 等是部件 token。Theme 复用同一套部件名作为默认值入口，但只提供视觉和局部几何 token 默认，不提供 `ticks.count`、`ticks.values`、`tickLabels.format`、`title.text`、`grid.applyTo`、`grid.select` 这类内容或语义字段默认。

Guide 文本统一使用 core 文本 vocabulary：内容使用 `TextBlockSchema`，字体使用 `FontSchema`，文本样式使用 `textColor` / `opacity` / `align` / `lineHeight` / `maxTextWidth`。Plot 不直接暴露完整 `NodeSchema`，因为 guide layout 必须控制 position、shape、padding、minimum size、label 等 Node 字段；但 title / tick label / legend label 的文本内容和文本样式必须与 core Node 文本保持同名同义。

Guide 线条样式同样复用 core path vocabulary：`GuideLineStyleSchema` 只包含 `stroke`、`strokeWidth`、`drawOpacity`、`dashPattern`。PlotSpec schema 不新增 `dash` 这类平行 shorthand；如果 React / Vanilla 以后需要更短 authoring，可以在 adapter 入参层转换成 PlotSpec 的 `dashPattern`。

Guide tick 语义需要跨 axis 与 legend ramp 共用。本 ADR 固定 axis 形态，但实现时应把 `count` / `values` 抽成 `GuideTickSourceSchema`，把 `format` 抽成 `GuideTickLabelFormatSchema`，并由 `resolveGuideTicks(scale, tickSource, labelFormat)` 统一生成 tick values 与 labels。Axis 的 `tickLabels` 只是在此基础上追加 layout 和 text style。

理由：

1. Axis 的部件本来就是 guide 结构的一部分，不只是 style；顶层槽位比 `style.xxx` 更贴近真实模型。
2. `title: string | { text, ... }` 只用于有文本内容的部件，shorthand 克制且 LLM 友好。
3. `ticks`、`tickLabels`、`grid` 分开后，tick source、tick line、tick label、grid line 的职责更清楚。
4. Theme 可以直接提供 `theme.axis.line/ticks/tickLabels/title/grid` 的视觉和几何默认，不需要维护一套不同的 style 词汇。

## 待决策点

无。自动 label collision、自动旋转与文字测量不在本 ADR 内，不以待决策形式悬挂。

## DSL 表面

```tsx
<Axis
  dimension="y"
  title={{ text: ['Revenue', { text: 'USD, millions', font: { size: 10 }, opacity: 0.72 }], gap: 12, font: { size: 12 }, textColor: '#111827' }}
  ticks={{ count: 6, length: 4 }}
  tickLabels={{ format: '.2f', gap: 6, font: { size: 11 }, textColor: '#4b5563' }}
  grid={{ stroke: '#d1d5db', drawOpacity: 0.65 }}
/>
```

简短写法：

```tsx
<Axis dimension="x" title="Date" grid />
<Axis dimension="y" tickLabels={false} grid={{ drawOpacity: 0.4 }} />
```

Vanilla builder 暴露同名 plain object；所有字段都必须 JSON-safe，不接受 renderer 对象、CSSStyleDeclaration、ReactNode 或函数。

## 测试设计

`packages/viz/plot/tests/guide/axis-style.test.ts` 覆盖部件 token 到 core Path / Node / Scope style 的落点。

`packages/viz/plot-react/tests/axis-authoring.test.tsx` 与 `packages/viz/plot-vanilla/tests/axis-authoring.test.ts` 覆盖部件槽位 authoring 表面等价性。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `AxisGuideSchema` 增加 `line`、`ticks`、`tickLabels`、`title`、`grid` 的对象形态，并保留必要 shorthand。
- guide 文本样式新增统一 `GuideTextStyleSchema`，复用 core `FontSchema`、`TextBlockSchema` 和文本字段命名；Axis title、tick labels、Legend title / label 共享它。
- guide 线条样式新增统一 `GuideLineStyleSchema`，复用 core path `stroke`、`strokeWidth`、`drawOpacity`、`dashPattern` 字段；Axis line、tick line、grid line 与 legend 可描边部件共享它。
- 现有 root `tickCount` 被 `ticks.count` 取代；ADR-01 的显式 tick 值 / tick label 格式分别落到 `ticks.values` / `tickLabels.format`。
- `features/guide` 的 axis lowering 不再直接使用硬编码常量作为唯一来源，而是通过 resolved axis component token 读取默认值。
- ADR-03 可以把同一 token 结构挂到 `PlotSpec.theme.axis`。
- docs 需要补充 line、ticks、tickLabels、title、grid 各自的作用和示例。
- 不触碰 core IR；token 最终落到 core Path / Node / Scope 的已有样式字段。

## 不在本 ADR 范围

- `PlotSpec.theme` 的入口与 merge priority；由 ADR-03 处理。
- legend / palette token；由 ADR-04 处理。
- 自动文字测量、tick label 防重叠、自动旋转、自动抽稀。
- 新增 reference line / reference band guide。
- Interaction state style，例如 hover / selected axis。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot guide schema 与 lowering，不改变 plot root discriminator 或 core schema。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `line` | `z.union([z.literal(false), AxisLineSchema]).optional()` | 渲染 axis line，stroke currentColor，strokeWidth 1 | Axis 主线开关与样式 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `ticks` | `AxisTicksSchema.optional()` | `count` 使用 scale 默认 tick count；`length` 4；stroke currentColor | Tick source 与 tick line token |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `tickLabels` | `z.union([z.literal(false), AxisTickLabelsSchema]).optional()` | 渲染 tick label；gap 4；文本样式继承 plot typography / core text 默认 | Tick label 开关、格式和文本样式；取代旧 boolean |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `title` | `z.union([z.string(), AxisTitleSchema]).optional()` | `—` | Axis title 文本 shorthand 或对象形态；对象形态可配置 text block、gap、guide layout 与文本样式 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `grid` | `z.union([z.boolean(), AxisGridComponentSchema]).optional()` | `false` | Grid 投影语义与 grid line token；对象形态等价开启 grid |

子 schema 字段固定如下：

| 子 schema | 字段 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|
| `GuideLineStyleSchema` | `stroke` | `PaintValueSchema.optional()` | currentColor | 线条描边；字段与 core path `stroke` 同名同义 |
| `GuideLineStyleSchema` | `strokeWidth` | `z.number().nonnegative().optional()` | 1 | 线条宽度；字段与 core path `strokeWidth` 同名同义 |
| `GuideLineStyleSchema` | `drawOpacity` | `OpacitySchema.optional()` | 1 | 线条描边透明度；字段与 core path `drawOpacity` 同名同义 |
| `GuideLineStyleSchema` | `dashPattern` | `z.array(z.number().nonnegative()).min(1).optional()` | `—` | 线条 dash pattern；字段与 core path `dashPattern` 同名同义 |
| `GuideTextStyleSchema` | `font` | `FontSchema.optional()` | 继承 plot typography / core text 默认 | 文本字体；字段与 core `FontSchema` 同名同义 |
| `GuideTextStyleSchema` | `textColor` | `CssColorSchema.optional()` | currentColor | 文本颜色；字段名与 core Node 文本一致 |
| `GuideTextStyleSchema` | `opacity` | `OpacitySchema.optional()` | 1 | 文本透明度 |
| `GuideTextStyleSchema` | `align` | `z.enum(['left', 'center', 'right']).optional()` | center | 多行文本在文本块内的对齐 |
| `GuideTextStyleSchema` | `lineHeight` | `z.number().positive().optional()` | `font.size * 1.2` | 多行文本行高 |
| `GuideTextStyleSchema` | `maxTextWidth` | `z.number().positive().optional()` | `—` | 文本自动换行宽度；省略不自动换行 |
| `AxisLineSchema` | `...GuideLineStyleSchema` | 见上 | 见上 | Axis 主线样式 |
| `AxisTicksSchema` | `count` | `z.number().int().positive().optional()` | scale 默认 tick count | Tick 数量 hint |
| `AxisTicksSchema` | `values` | `z.array(z.union([z.number(), z.string()])).min(1).optional()` | `—` | 显式 tick 值；存在时优先于 `count` |
| `AxisTicksSchema` | `length` | `z.number().nonnegative().optional()` | 4 | Tick line 长度 |
| `AxisTicksSchema` | `line` | `z.union([z.literal(false), GuideLineStyleSchema]).optional()` | 渲染 tick line | Tick line 开关与样式；`false` 只隐藏 tick line，不取消 tick source |
| `AxisTickLabelsSchema` | `format` | `z.string().min(1).optional()` | `—` | 声明式 tick label 格式，数值走 d3-format，时间走 UTC d3-time-format |
| `AxisTickLabelsSchema` | `gap` / `rotate` / `anchor` | `number` / `number` / `'start' \| 'middle' \| 'end'` | 4 / 0 / middle | Tick label 与 axis 的 guide layout token |
| `AxisTickLabelsSchema` | `...GuideTextStyleSchema` | 见上 | 见上 | Tick label 文本样式；文本内容来自 tick values，不直接配置 `text` |
| `AxisTitleSchema` | `text` | `TextBlockSchema` | 必填 | Axis title 文本；支持 string、多行、styled line、mixed text/math runs |
| `AxisTitleSchema` | `gap` / `rotate` / `anchor` | `number` / `number` / `'start' \| 'middle' \| 'end'` | 8 / 0 / middle | Axis title 与 axis 的 guide layout token |
| `AxisTitleSchema` | `...GuideTextStyleSchema` | 见上 | 见上 | Axis title 文本样式 |
| `AxisGridComponentSchema` | `applyTo` / `select` | 沿用现有 `AxisGridSchema` | 沿用现有 grid 默认 | Grid 投影语义 |
| `AxisGridComponentSchema` | `...GuideLineStyleSchema` | 见上，drawOpacity 默认 0.15 | 见上 | Grid line 样式 |

所有数值尺寸单位为 plot user units；`rotate` 单位为 degree，沿用 core Node / label 的字段名。`dashPattern` 是 JSON-safe number array，直接映射到 core path dash 风格；guide token resolver 不引入平行字段名。

`ticks.line: false` 只控制 tick line 是否绘制，不改写 tick source。tick label 与 title 的位置仍按 `ticks.length` 和各自 `gap` 计算。用户若想让 label 贴近轴线，应显式设置 `ticks.length: 0` 或减小 `tickLabels.gap`。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/features/guide/**`
- `packages/viz/plot/src/pipeline/layout.ts`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot/tests/guide/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `line token reaches axis path`：设置 stroke / strokeWidth / dashPattern → axis main path 使用该样式。
- `ticks length changes tick geometry`：设置 `ticks.length` → tick segment 端点距离按 token 改变。
- `tickLabels token reaches tick nodes`：设置 font / textColor / gap → label node style 和位置符合预期。
- `title string shorthand creates title node`：`title: 'Revenue'` 生成 title node，样式走默认。
- `title text block supports multiline and styled lines`：`title.text` 写多行 / styled line → lowering 成 core Node text block，不丢失 per-line 样式。
- `grid object reaches grid path`：设置 drawOpacity / stroke → grid scope/path 使用该样式。

**边界**：

- `tickLabels false hides labels`：`tickLabels: false` → 不生成 tick label nodes。
- `ticks line false preserves label geometry`：`ticks: { line: false }` 不画 tick line，但 label offset 仍使用 `ticks.length`。
- `grid false disables grid`：`grid: false` 或省略 → 不生成 grid layer。
- `title omitted does not create title`：`title` 省略 → 不生成 title node。
- `zero drawOpacity is allowed`：`drawOpacity: 0` 合法并能隐藏对应 path。

**错误路径**：

- `negative lengths are rejected`：tick length / gap / font.size / lineHeight / maxTextWidth 负值 schema 拒绝。
- `empty dashPattern arrays are rejected`：dashPattern 为空数组 schema 拒绝。
- `invalid anchor is rejected`：anchor 非 `start/middle/end` schema 拒绝。
- `empty title object text is rejected`：`title: { text: '' }` schema 拒绝。

**交互**：

- `cartesian axis components do not affect placement`：部件 token 覆盖后 axis side / offset 仍由 placement 决定。
- `polar axis components apply to arc and radial guides`：angular / radial axis 使用同一部件 token，不丢失弧线 / 辐条几何。
- `ternary axis components apply to triangle axes`：ternary2D 三条 axis 与 grid line 消费相同 token。
- `adapter specs are equivalent`：React / Vanilla Axis 部件槽位生成的 PlotSpec 与手写 spec 等价。

### 依赖的现有元素

- `AxisGuideSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——新增部件槽位对象形态，收敛旧 root `tickCount` / `tickLabels` / `title` / `grid`。
- `TextBlockSchema` / `FontSchema`（`packages/kernel/core/src/schemas/text/schema.ts`、`packages/kernel/core/src/schemas/font/schema.ts`）——作为 guide 文本内容与字体契约来源，只复用文本 vocabulary，不暴露完整 Node schema。
- `AxisGridSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——作为 `AxisGridComponentSchema` 的投影语义来源，并追加 grid line token。
- `lowerGuide` 及 cartesian / polar / ternary / custom axis lowering（`packages/viz/plot/src/features/guide/guide.ts`）——消费 resolved axis component token。
- `resolveGuideTicks` / `applyGuideLineStyle` / `buildGuideTextNode`（`packages/viz/plot/src/features/guide/**`）——实现阶段新增的 guide 共用 helper，分别处理 tick source + label format、line token 到 core path、guide text style 到 core node。
- `AXIS_TICK_LENGTH` / `AXIS_LABEL_GAP` / `estimateLabelWidth`（`packages/viz/plot/src/pipeline/layout.ts`）——常量默认值迁移为 axis component resolver 默认，估算函数仍可复用。
- `IRScope` / `IRPath` / `IRNode`（`@retikz/core`）——作为 token 落点消费，不改 core。

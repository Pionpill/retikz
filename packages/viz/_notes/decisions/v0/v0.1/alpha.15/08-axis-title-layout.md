# ADR-08：Axis title 布局与锚点策略

- 状态：Accepted（已实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 axis title 放进独立 `title` 槽位。ADR-05 又补充了 `title.placement` 与 `title.orientation`，让数学坐标系可以把 x / y 标题放到轴线正方向端点，并允许 y 标题保持正向水平显示。

当前 `AxisTitleSchema` 仍有几处长期风险。第一，`AxisTitlePlacementSchema` 在 plot 内复制了一套 `at-start`、`near-start`、`midway`、`near-end`、`at-end` 等关键字，而 core path label 已有同一套 `GeometryLabelPosition` 关键字和比例心智模型。重复维护会让 axis title 与 path label 的位置语义漂移。第二，`title.gap` 表达的是标题相对 tick label band / axis label band 的外侧留白，和 Vega `titlePadding`、Chart.js scale title `padding` 更接近；继续叫 `gap` 容易和 guide 内部组件之间的 gap、legend entry gap 混淆。第三，端点标题、旋转标题和多行标题需要更明确的锚点与偏移能力，仅靠 `anchor: string` 不足以稳定表达。

同类图表库通常把轴标题拆成位置、旋转、间距、锚点和布局策略。Vega axis 提供 `titleAnchor`、`titleAlign`、`titleBaseline`、`titleAngle`、`titlePadding`、`titleLimit`、`titleX`、`titleY`；Highcharts axis title 提供 `align`、`rotation`、`margin`、`offset`、`reserveSpace`、`x`、`y`；Chart.js scale title 提供 `align`、`padding`、`font`；Observable Plot axis label 提供 `labelAnchor`、`labelArrow`、`labelOffset`。retikz 不应照搬这些命名，但需要覆盖同一类能力。

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Highcharts axis title](https://api.highcharts.com/highcharts/xAxis.title)、[Chart.js labelling axes](https://www.chartjs.org/docs/latest/axes/labelling.html)、[Observable Plot axes](https://observablehq.com/plot/features/axes)。

## 决策：title 采用 core position、padding、shift、anchor 与 layout 分层

`AxisTitleSchema` 调整为五类字段：文本内容、外侧留白、沿轴位置、方向/旋转、锚点/偏移/布局。`placement` 字段名保留，但关键字来源改为复用 core 的 `GeometryLabelPosition`；`gap` 破坏性改名为 `padding`；新增 `shift`、结构化 `anchor` 和 `layout`。

```ts
import { GeometryLabelPosition } from '@retikz/core';
import type { GeometryLabelPositionValue } from '@retikz/core';

type AxisTitlePlacement = GeometryLabelPositionValue | number;

type AxisTitleAnchor =
  | 'auto'
  | 'center'
  | 'start'
  | 'end'
  | {
      align?: 'start' | 'center' | 'end';
      baseline?: 'top' | 'middle' | 'bottom';
    };

type AxisTitleShift = {
  along?: number;
  normal?: number;
};

type AxisTitleLayout =
  | false
  | {
      reserveSpace?: boolean;
      avoidTickLabels?: boolean;
      avoidLineMarks?: boolean;
      overflow?: 'allow' | 'hide' | 'flush';
    };

type AxisTitle = {
  text: TextBlock;
  padding?: number;
  placement?: AxisTitlePlacement;
  orientation?: 'auto' | 'horizontal' | 'axis';
  rotate?: number;
  anchor?: AxisTitleAnchor;
  shift?: AxisTitleShift;
  layout?: AxisTitleLayout;
} & GuideTextStyle;
```

语义固定如下：

- `placement`：沿 axis baseline 从 negative 到 positive 方向采样。关键字直接复用 core `GeometryLabelPosition`，数值继续表示 `0..1` 比例。字段仍叫 `placement`，因为它描述 axis title 放在轴线上的位置；不改成 `position`，避免破坏现有 axis guide 语义层次。
- `padding`：标题中心相对 tick label band 外缘的法线距离。默认值沿用现有内置常量；`0` 表示贴近 tick label band，不表示 title 文本内部 padding。
- `orientation`：语义旋转策略，继续支持 `auto`、`horizontal`、`axis`。显式 `rotate` 仍是低层 escape hatch，优先级高于 `orientation`。
- `anchor`：结构化文本锚点。`auto` 由 lowering 按 side、placement、orientation 推导；`start/end/center` 是沿轴方向的快捷锚点；对象形态允许明确文本水平对齐和基线。
- `shift`：相对最终锚点的微调。`along` 沿轴切向，正方向为 axis positive；`normal` 沿标题所在侧外法线，正方向远离轴线。它比裸 `x/y` 更适合 cartesian、polar、ternary 和 custom axis 复用。
- `layout`：标题自动布局策略。`false` 关闭自动预留和避让；省略时使用内置默认，至少保留现有 padding 估算，并允许后续实现避让 tick labels 与 line arrow / endpoint marks。

理由：

1. 复用 core `GeometryLabelPosition` 能让 path label、mark label 和 axis title 使用同一套位置关键字，减少重复常量和映射表。
2. `padding` 更贴近主流图表库对 axis title 外侧留白的命名，也能和 legend entry gap、swatch gap 区分。
3. `shift.along/normal` 比 `x/y` 更符合坐标轴语义，非笛卡尔坐标也能沿局部切向和法向解释。
4. 结构化 `anchor` 让端点标题、旋转标题和多行标题的对齐方式可预测，不再依赖自由字符串。
5. `layout` 把自动避让做成显式策略，chart preset 可以组合默认规则，底层 guide 不需要写死某个截图场景。

## 待决策点

无。`labelArrow`、标题截断、富文本片段级样式和真实 renderer 文本测量不在本 ADR 范围。

## 实现记录

- `title.gap` 已破坏性替换为 `title.padding`，guide local 与 theme axis title 都不再接收 `gap`。
- `title.placement` 的 schema 直接复用 core `GeometryLabelPosition`，plot 导出的 `AxisTitlePlacementKeyword` 也改为 core 常量别名。
- `title.shift.along/normal` 已在 cartesian、polar angular、polar radial、ternary 和 custom axis lowering 中按局部切向 / 外法线解释。
- `title.anchor.align` 已下沉为 core Node 现有的 `align`；`anchor.baseline` 先作为 schema 级契约保留，等待 core Node 暴露文本基线能力后再完整下沉。
- `title.layout` 已进入 schema，当前 lowering 仍沿用既有 padding / label band 估算，后续避让 arrow endpoint、旋转 tick label band 和 title overflow 时复用该字段。

## DSL 表面

数学坐标系标题放在轴正方向，y 标题保持正向：

```tsx
<Axis
  dimension="y"
  placement={{ kind: 'origin', origin: 0 }}
  title={{
    text: 'y',
    placement: 'at-end',
    orientation: 'horizontal',
    anchor: 'end',
    padding: 4,
  }}
/>
```

端点标题沿轴线微调：

```tsx
<Axis
  dimension="x"
  title={{
    text: 'Revenue',
    placement: 0.92,
    orientation: 'axis',
    anchor: { align: 'end', baseline: 'top' },
    shift: { along: -6, normal: 2 },
  }}
/>
```

关闭自动避让，保留精确手动布局：

```tsx
<Axis
  dimension="x"
  title={{
    text: 'x',
    placement: 'at-end',
    padding: 0,
    layout: false,
  }}
/>
```

Vanilla builder 暴露同名 plain object；所有字段必须 JSON-safe，不接受函数、ReactNode、DOM 节点或 renderer 对象。

## 测试设计

`packages/viz/plot/tests/ir/guide.schema.test.ts` 覆盖 schema accept / reject。
`packages/viz/plot/tests/features/guide/guide.test.ts` 覆盖 cartesian、polar、ternary、custom axis title lowering。
`packages/viz/plot/tests/theme/theme.test.ts` 覆盖 theme 与 local override 边界。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- ⚠️ BREAKING：`title.gap` 改名为 `title.padding`，不保留别名。当前仍处 `0.x`，按本仓原则优先修正语义。
- `AxisTitlePlacementKeyword` 改为从 core `GeometryLabelPosition` 派生；plot 不再维护平行关键字表。
- `AxisTitleSchema` 新增 `anchor` 结构化 union、`shift` 和 `layout`。
- theme 仍不能接收 `title.text`、`title.placement`、`title.orientation`、`title.anchor`、`title.shift`、`title.layout` 等结构语义默认；`title.rotate` 保留为现有样式默认，`padding` 作为布局 token 进入 theme。若实现发现 `anchor/layout` 进入 theme 有明确价值，需要回到本 ADR 扩展。
- guide lowering 需要在所有 axis 类型中使用同一套 title placement -> point/tangent/normal 流程，再叠加 padding、anchor、shift 与 layout。
- React / Vanilla authoring 只透传同名 PlotSpec 字段，不新增 adapter-only API。
- docs 需要更新 axis guide API 表、标题示例和 `gap -> padding` 的迁移说明。
- 不触及 core IR；plot 只消费 core 已公开的 `GeometryLabelPosition` 和文本/节点能力。

## 不在本 ADR 范围

- Observable Plot 风格的 `labelArrow` / 方向箭头。
- axis title ellipsis、wrap、text truncation。
- renderer 真实文本测量。
- title 背景、边框、leader line、pin。
- chart preset 默认规则；后续 chart 可以消费本 PlotSpec 能力。
- 修改 core `GeometryLabelPosition` 的关键字集合。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot guide schema、theme schema 边界和 guide lowering；不修改 core IR，不修改包顶层公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/constants.ts` | 删 / 改 | `AxisTitlePlacementKeyword` | 从 core `GeometryLabelPosition` 复用 | `midway` | axis title 沿轴位置关键字，不再由 plot 自建 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTitlePlacementSchema` | `z.union([z.enum(GeometryLabelPosition), NormalizedRatioSchema])` | `midway` | 沿 axis baseline 的关键字或比例位置 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 删 | `AxisTitleSchema.gap` | `z.number().nonnegative()` | 旧内置常量 | 删除，改用 `padding` |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTitleSchema.padding` | `z.number().nonnegative().optional()` | 旧 title gap 默认值 | 标题相对 tick label band 外缘的外侧留白 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisTitleSchema.anchor` | `z.union([z.enum(AxisTitleAnchor), AxisTitleAnchorObjectSchema])` | `auto` | 标题文本锚点策略 |
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisTitleAnchor` | `{ Auto, Start, Center, End }` | `auto` | 标题快捷锚点 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTitleShiftSchema` | `{ along?: finite; normal?: finite }` | `{ along:0, normal:0 }` | 沿轴切向和外法线方向微调标题 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisTitleLayoutSchema` | `false | { reserveSpace?, avoidTickLabels?, avoidLineMarks?, overflow? }` | 内置默认 | 标题自动预留、避让和溢出策略 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 改 | `ThemeAxisTitleSchema.gap` | 删除 | 旧内置常量 | theme 不再使用 gap 命名 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `ThemeAxisTitleSchema.padding` | `z.number().nonnegative().optional()` | 旧 title gap 默认值 | theme 级标题外侧留白 token |

refinement：

- `AxisTitleShiftSchema` 至少出现 `along` 或 `normal` 一个字段；空对象应被拒绝。
- `AxisTitleAnchorObjectSchema` 至少出现 `align` 或 `baseline` 一个字段；空对象应被拒绝。
- `layout: false` 合法，表示关闭 title 自动预留、避让和溢出处理。
- `rotate` 与 `orientation` 同时出现时 schema 不拒绝；lowering 必须以 `rotate` 为准。
- `gap` 不再被 schema 接收，包括 guide local 和 theme axis title。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/guide/constants.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/theme/schema.ts`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/src/shared/**`
- `packages/viz/plot/tests/ir/guide.schema.test.ts`
- `packages/viz/plot/tests/features/guide/**`
- `packages/viz/plot/tests/theme/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/grammar/guide/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `title padding replaces gap`：`title.padding` 改变标题法线距离，输出位置与旧 gap 语义一致。
- `placement reuses core keywords`：`at-start`、`midway`、`at-end` 在 axis title 中与数值 `0`、`0.5`、`1` 等价。
- `shift along moves toward axis positive`：cartesian x / y 中 `shift.along` 分别沿右 / 上正方向移动。
- `shift normal moves outward`：top / right / bottom / left side 下 `shift.normal` 均沿外法线移动。
- `anchor object reaches text node`：`anchor: { align, baseline }` lowering 为稳定文本对齐和基线。
- `layout false disables title avoidance`：`layout:false` 时只使用 padding / anchor / shift，不做自动避让。

**边界**：

- `rotate overrides orientation`：同时配置 `rotate` 与 `orientation` 时，最终使用 `rotate`。
- `orientation horizontal with at-end y title`：数学 y 轴端点标题可以保持水平正向显示。
- `polar title shift uses local tangent and normal`：polar angular / radial axis 的 `shift` 使用局部切向与法向。
- `custom title shift uses pointAndTangent`：custom axis title 的 `shift.along` 跟随 `pointAndTangent` 切向。
- `theme padding overridden by local padding`：theme title padding 被局部 title padding 覆盖。

**错误路径**：

- `title gap rejected`：guide local `title.gap` schema 拒绝。
- `theme title gap rejected`：theme `axis.title.gap` schema 拒绝。
- `empty shift rejected`：`shift: {}` schema 拒绝。
- `empty anchor object rejected`：`anchor: {}` schema 拒绝。
- `invalid overflow rejected`：非 `allow/hide/flush` 的 `layout.overflow` schema 拒绝。

**交互**：

- `title layout does not change ticks or grid`：title 避让只改变 title node，不改变 ticks、tick labels、grid。
- `line arrow endpoint and title at-end coexist`：ADR-05 的 arrow endpoint 与 `title.placement:'at-end'` 共存时，title 可通过 layout / shift 避开箭头。
- `tick label adaptive layout feeds title reserve`：ADR-07 旋转 tick labels 后，title 默认 padding / reserve 使用旋转后的 label band。
- `theme title style stays visual`：theme title 仍拒绝 `text`、`placement`、`orientation`、`shift`、`layout` 等结构字段。

### 依赖的现有元素

- `GeometryLabelPosition`（`@retikz/core`）——作为 axis title placement 关键字来源，plot 不再复制关键字枚举。
- `TextBlockSchema` / core Node text style（`@retikz/core`）——继续作为 axis title 文本 lowering 目标。
- `AxisTitleSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——扩展 title 字段并删除 `gap`。
- `PlotAxisThemeSchema`（`packages/viz/plot/src/schemas/theme/schema.ts`）——同步 `gap -> padding`，并继续限制 theme 只接收样式 / token。
- `resolveAxisGuideTokens`（`packages/viz/plot/src/providers/theme/theme.ts`）——合并 theme padding 和 local title padding，保证 local override 优先。
- `lowerGuide` / `lowerCartesianGuide` / polar / ternary / custom guide lowering（`packages/viz/plot/src/pipeline/guide/guide.ts`）——统一消费 placement、padding、orientation、anchor、shift 和 layout。

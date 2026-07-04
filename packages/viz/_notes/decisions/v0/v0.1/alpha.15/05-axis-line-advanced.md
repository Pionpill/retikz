# ADR-05：Axis line 进阶几何

- 状态：Accepted（已实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 axis 拆成 line、ticks、tickLabels、title、grid 五个部件槽位，并让 `line` 支持 stroke、strokeWidth、drawOpacity、dashPattern、dashOffset 等线条样式。这个模型能覆盖常规商业图表，但数学图、函数图和平面直角坐标系还缺少两个高频表达：轴线端点箭头，以及 x / y 轴穿过原点或指定交叉值。

底层 core Path 已经支持路径上的 arrow mark：`marks: [{ pos, mark: { kind: 'arrow', ... } }]`。plot 不应再造一套 parallel arrow IR；axis line 只需要把 guide 语义映射到 core path marks。关键在于 plot 的 axis 语义不是“start / end”这么简单：用户通常关心的是数据轴的正方向和负方向，例如 x 轴右端、y 轴上端，或双向箭头。

原点穿越也不应该混进箭头字段。箭头描述轴线端点的视觉标记；原点描述轴线放在哪里。把两者放在同一字段会让后续扩展变难，例如“x 轴穿过 y = 0，但只有正方向箭头”与“轴仍在底部，但两端都有箭头”是两个独立组合。

## 决策：箭头归 axis line，原点归 placement

AxisGuide 新增两组能力：

1. `line.extent`、`line.arrow` 和 `lineCap` 描述 axis baseline 的端点形态、长度与端点箭头。
2. `placement.kind: 'origin'` 描述 cartesian axis 穿过另一维的指定数据值。

```ts
const mathAxes = {
  guides: [
    {
      type: 'axis',
      dimension: 'x',
      placement: { kind: 'origin', origin: 0 },
      line: {
        extent: 'plotArea',
        arrow: {
          positive: { shape: 'stealth', length: 8, width: 6 },
          negative: true,
        },
      },
    },
    {
      type: 'axis',
      dimension: 'y',
      placement: { kind: 'origin', origin: 0 },
      line: {
        arrow: {
          positive: { shape: 'stealth', length: 8 },
        },
      },
    },
  ],
};
```

`line.arrow` 固定使用轴方向语义：

- `positive`：轴的正方向端。cartesian x 默认是右端，cartesian y 默认是上端。
- `negative`：轴的负方向端。cartesian x 默认是左端，cartesian y 默认是下端。

每一端接受 `boolean | AxisArrowEnd`：

```ts
type AxisArrowEnd = {
  shape?: string;
  scale?: number;
  length?: number;
  width?: number;
  color?: string;
  fill?: string;
  opacity?: number;
  lineWidth?: number;
};

type AxisLineArrow = {
  negative?: boolean | AxisArrowEnd;
  positive?: boolean | AxisArrowEnd;
};
```

其中 `AxisArrowEnd` 不在 plot 内重新定义字段含义，而是复用 core 的 `ArrowEndDetailSchema`。`true` 表示使用 core arrow 默认值；`false` 或省略表示该方向不画箭头。`line.arrow: {}` 应被 schema 拒绝，避免用户以为开启了箭头但无效果。

`lineCap` 作为 axis baseline 的纯线条样式字段纳入 `line`：

```ts
line: {
  lineCap: 'butt' | 'round' | 'square';
}
```

它直接复用 core `PathLineCapSchema`，并 lowering 到 core Path 的 `lineCap`。省略时沿用 core 默认 `butt`。`lineCap` 与 `line.arrow` 可以同时存在；箭头仍按 core arrow shrink 语义处理，line cap 只影响 baseline 自身的描边端点。

`line.extent` 控制 axis baseline 线段范围：

```ts
type AxisLineExtent =
  | 'plotArea'
  | {
      from: string | number;
      to: string | number;
    };
```

- 省略或 `'plotArea'`：轴线覆盖当前 plotArea 在该维度上的可见边界。
- `{ from, to }`：按 axis 绑定维度的数据值投影出 baseline 两端。`from` 是 negative 端，`to` 是 positive 端。
- `extent` 只影响 axis baseline，不改变 scale domain、不改变 tick source、不自动裁剪 tick 或 grid。

`placement.kind: 'origin'` 固定为 cartesian axis 的交叉摆放方式：

```ts
type AxisOriginPlacement = {
  kind: 'origin';
  origin?: string | number;
  tickSide?: 'top' | 'right' | 'bottom' | 'left';
  offset?: number;
};
```

- 对 x axis，`origin` 表示交叉的 y 值；省略默认 `0`。
- 对 y axis，`origin` 表示交叉的 x 值；省略默认 `0`。
- `tickSide` 控制 tick line、tick label、title 落在轴线哪一侧。x axis 只接受 `top | bottom`，默认 `bottom`；y axis 只接受 `left | right`，默认 `left`。
- `offset` 表示在 `tickSide` 的外向方向上追加位移，供原点轴微调。

本 ADR 只要求 cartesian lowering 支持 `origin`。polar / ternary / custom coordinate 遇到 `placement.kind: 'origin'` 必须 fail-loud，并提示该 placement 只支持 cartesian axis。`line.arrow` 与 `line.extent` 可先支持 cartesian；非 cartesian axis 如需箭头，应在对应 coordinate provider 明确轴方向后另行接入，避免用屏幕 start/end 误导用户。

Theme 不接收 `line.arrow`、`line.extent` 或 `placement.origin`。这些字段改变 guide 结构和几何语义，不是纯视觉默认。`lineCap` 属于纯线条样式，可进入 theme 的 axis line 默认。实现时必须把 theme 的 `axis.line` 改为只包含纯线条样式的 schema，避免 `PlotSpec.theme.axis.line.arrow` 这种全局结构开关静默生效。未来如果需要全局箭头视觉默认，应另设 `theme.axis.arrow` 之类的纯 detail 默认，而不是把结构开关塞进 line style。

理由：

1. `positive / negative` 比 `start / end` 更符合轴语义，能稳定表达“y 轴上方箭头 / 下方箭头”。
2. 复用 core `ArrowEndDetailSchema` 可以继承 shape、length、width、color、fill、opacity、lineWidth 和自定义 arrow provider，不引入 plot-only 箭头样式。
3. `origin` 是 placement 语义，独立于 line arrow，能组合出更多数学坐标系形态。
4. `lineCap` 已是 core Path 的稳定字段，补入 axis line 能覆盖圆头 / 方头 baseline，成本低且与常见 axis domain cap 能力对齐。
5. Theme 只保留视觉 token 默认，避免全局 theme 不小心改变 axis 的结构和阅读语义。

## 实现补充：交叉值、端点刻度与标题位置

在实现 ADR-05 后，数学坐标系示例暴露出三个和 axis line 端点相关但不应写死在 chart preset 里的低层策略。最终补充为可配置字段，而不是只针对现有截图做特殊分支：

- 原点交叉冲突通过 `axis.crossing` 表达。`crossing.value` 默认是 `0`，`crossing.tick: 'hide'` 可隐藏交叉值 tick mark，`crossing.label: 'hide' | 'corner'` 可隐藏或把共用原点 label 放到指定角落。chart / math-axis preset 可以默认组合出“隐藏交叉 tick，单个左下角 label”的规则，但 plot guide 只提供配置能力。
- 箭头端点附近的刻度避让通过 `ticks.endpoint` 表达。省略该字段时，有 axis arrow 的端点默认会避让附近 tick mark；`ticks.endpoint: false` 可关闭该默认避让。默认只影响 mark，不改变 tick source、grid 或 tick label；需要连 label 一起隐藏时使用 `affect: 'mark-and-label'`。
- 轴标题沿轴线位置通过 `title.placement` 表达。它复用 core path label 同类心智模型，支持 `at-start`、`near-start`、`midway`、`near-end`、`at-end` 等关键字，也支持 `0..1` 比例。baseline 始终按 negative -> positive 方向解释，所以 x 轴 `at-end` 是右侧，y 轴 `at-end` 是视觉顶部。

这三个补充字段均属于具体 guide 的结构语义，不进入 theme。React `<Axis>` 已透传 `crossing`；`ticks.endpoint` 与 `title.placement` 继续通过既有 `ticks` / `title` props 派生。

## 待决策点

无。非 cartesian axis arrow、自动 domain 扩展到 origin、axis clipping 和全局 arrow theme 默认均不在本 ADR 内。

## 与 dashOffset 的关系

core 已经具备稳定 `dashOffset` / stroke dash offset 能力。plot 不需要在 ADR-05 里为 axis line 单独设计 `dashOffset`，而应按 ADR-02 把它作为普通 `GuideLineStyleSchema` 字段接入 axis line、tick line、grid line、legend 可描边部件与 theme line style。

历史需求输入见 [`core dashOffset 能力补全请求`](../../../../../../kernel/_notes/analysis/core-dash-offset-capability-request.md)，该 note 现在只作为追溯，不再阻塞 plot 实现。

## DSL 表面

平面直角坐标系双向 x 轴与正向 y 轴：

```tsx
<Plot
  data={rows}
  scales={[
    { type: 'linear', name: 'x', domain: [-10, 10] },
    { type: 'linear', name: 'y', domain: [-10, 10] },
  ]}
  coordinate={{ type: 'cartesian2D', x: 'x', y: 'y' }}
  guides={[
    {
      type: 'axis',
      dimension: 'x',
      placement: { kind: 'origin', origin: 0, tickSide: 'bottom' },
      line: {
        arrow: {
          negative: { shape: 'stealth', length: 7 },
          positive: { shape: 'stealth', length: 7 },
        },
      },
    },
    {
      type: 'axis',
      dimension: 'y',
      placement: { kind: 'origin', origin: 0, tickSide: 'left' },
      line: {
        arrow: {
          positive: { shape: 'stealth', length: 7 },
        },
      },
    },
  ]}
/>
```

只给底部 x 轴加正方向箭头：

```tsx
<Axis
  dimension="x"
  line={{
    arrow: {
      positive: { shape: 'open', length: 8, lineWidth: 1.25 },
    },
  }}
/>
```

用数据值裁剪 axis baseline：

```tsx
<Axis
  dimension="x"
  line={{
    extent: { from: -5, to: 20 },
    lineCap: 'round',
    arrow: { positive: true },
  }}
/>
```

Vanilla builder 暴露同名 plain object；所有字段必须 JSON-safe，不接受函数、ReactNode 或 renderer 对象。

## 测试设计

`packages/viz/plot/tests/ir/guide.schema.test.ts` 覆盖 schema accept / reject。

`packages/viz/plot/tests/features/guide/guide.test.ts` 覆盖 cartesian lowering 的 path marks、origin placement、extent 投影和 title / tick 侧向。

`packages/viz/plot/tests/composition/same-panel-multi-axis.test.ts` 或 composition guide 测试覆盖多 axis 与 origin / side axis 共存。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `AxisGuideSchema` 增加 `placement.kind: 'origin'`、`line.extent`、`line.arrow`。
- `AxisLineSchema` 需要从纯 style schema 变成 axis baseline 的结构 + 样式 schema，并新增 `lineCap` 纯样式字段；theme 侧必须改用纯 line style schema，不能继续把完整 `AxisLineSchema` 当 theme token。
- cartesian guide lowering 需要按 axis 维度构造 negative -> positive 的 baseline path，并把 arrow 映射为 core `IRPath.marks`。
- `origin` placement 不改 scale domain。若用户希望原点可见，应显式 domain 或 domain padding 让 origin 落在可见范围内。
- React / Vanilla authoring 若已有 Axis 组件 / builder，应透传新字段，不另造 `arrowStart` / `arrowEnd` 等 adapter-only API。
- docs 需要补充 axis line extent、arrow、origin placement 的示例，并说明 theme 不控制 axis line 结构字段。
- 不触碰 core IR；仅消费 core Path `marks` 和 ArrowEndDetail。

## 不在本 ADR 范围

- polar / ternary / custom coordinate 的 axis arrow 方向定义。
- 自动把 scale domain 扩展到 origin。
- axis baseline clipping、超出 plotArea 自动隐藏或裁剪。
- minor ticks、axis cap、axis background、axis frame。
- axis line 专用 dash offset 结构字段。`dashOffset` 已由 core 提供，plot 应通过 ADR-02 的 `GuideLineStyleSchema` 作为普通线条样式复用，不在 ADR-05 另造字段。
- theme 级 axis arrow 默认。
- 新增 arrow provider 或修改 core arrow registry。
- chart preset；后续 chart 可消费本 PlotSpec 能力。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot guide schema、theme schema 边界与 pipeline guide lowering；不改 core IR、不改 package 公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/constants.ts` | 加 | `AxisPlacementKind.Origin` | `'origin'` | `—` | axis 穿过另一维指定数据值的 placement kind |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisGuideValueSchema` | `z.union([z.string(), z.number().finite()])` | `—` | axis placement / extent 使用的 JSON-safe 数据值 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisOriginPlacementSchema` | `{ kind:'origin'; origin?: AxisGuideValue; tickSide?: AxisCardinalSide; offset?: number }` | `origin: 0`; x tickSide bottom；y tickSide left；offset 0 | cartesian axis 穿过另一维指定值，tick/title 侧向可控 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisPlacementSchema` | `z.discriminatedUnion('kind', [auto, side, edge, origin])` | `auto` | 增加 origin placement |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisLineStyleSchema` | `GuideLineStyleSchema.shape + { lineCap?: PathLineCapSchema }` | currentColor / strokeWidth 1 / lineCap butt | 纯 axis baseline 线条样式，供 theme 复用 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisLineExtentSchema` | `z.union([z.literal('plotArea'), z.object({ from: AxisGuideValueSchema, to: AxisGuideValueSchema })])` | `'plotArea'` | axis baseline 的可见线段范围 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisArrowEndSchema` | `z.union([z.boolean(), ArrowEndDetailSchema])` | `false` | 单个轴方向端点的箭头开关或 core arrow detail |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisLineArrowSchema` | `{ negative?: AxisArrowEndSchema; positive?: AxisArrowEndSchema }` + 非空 refinement | `—` | axis negative / positive 方向的箭头配置 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisLineSchema` | `AxisLineStyleSchema.shape + { extent?: AxisLineExtentSchema; arrow?: AxisLineArrowSchema }` | `extent: 'plotArea'`; no arrow | axis baseline 的样式、端点线帽、长度和端点箭头 |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 改 | `PlotAxisThemeSchema.line` | `z.union([z.literal(false), AxisLineStyleSchema])` | built-in axis line style | theme 只接纯线条样式，不接 extent / arrow |

`AxisArrowEndSchema` 中的 object 形态必须直接使用 core `ArrowEndDetailSchema`，不在 plot 内复制字段 schema。实现若发现 `ArrowEndDetailSchema` 未从 `@retikz/core` 顶层导出，应优先通过 core 既有 public barrel 消费；不要 deep import core 私有路径。

`AxisLineArrowSchema` 的 refinement：`negative` 与 `positive` 至少出现一个；`false` 可显式关闭某端，但 `{ negative: false, positive: false }` 应被拒绝或规范化为无 arrow。本 ADR 倾向 schema 拒绝，避免无效果对象。

`AxisOriginPlacementSchema.tickSide` 的 refinement：x axis 只能在 lowering 阶段接受 `top | bottom`，y axis 只能接受 `left | right`；schema 层不知道 active dimension，先只校验 cardinal side 字面量。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/guide/constants.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/theme/schema.ts`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/tests/ir/guide.schema.test.ts`
- `packages/viz/plot/tests/features/guide/guide.test.ts`
- `packages/viz/plot/tests/composition/**`
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

- `axis line positive arrow lowers to path mark at pos 1`：x axis `line.arrow.positive: true` → axis baseline path 有 `{ pos: 1, mark: { kind: 'arrow' } }`。
- `axis line negative arrow lowers to path mark at pos 0`：x axis `line.arrow.negative: true` → axis baseline path 有 `{ pos: 0, mark: { kind: 'arrow' } }`。
- `axis arrow detail is preserved`：`shape / length / width / color / fill / opacity / lineWidth` → core path mark detail 不丢字段。
- `lineCap reaches axis baseline path`：`line.lineCap: 'round'` → axis baseline path 带 `lineCap: 'round'`。
- `y positive arrow points to visual top`：cartesian y axis positive arrow 生成在正方向端，baseline path 顺序为 negative -> positive。
- `origin placement crosses at projected value`：x axis `placement.origin: 0` → axisY 等于 `projectY.coordinate(0)`；y axis 类似。
- `line extent projects from and to values`：`line.extent: { from, to }` → baseline 端点由 axis dimension scale 投影。

**边界**：

- `arrow false disables that side`：`positive: false` 不生成该端 mark，另一端仍可生成。
- `line extent omitted uses plotArea`：省略 extent 与 `'plotArea'` 输出一致。
- `origin omitted defaults to zero`：`placement: { kind: 'origin' }` 使用 cross value 0。
- `origin offset shifts toward tickSide`：origin axis 写 offset → axis line 沿 tickSide 外向平移。
- `origin outside visible domain does not mutate domain`：origin 投影在 plotArea 外时仍按投影值放置，不自动扩 domain。

**错误路径**：

- `empty arrow object rejected`：`line.arrow: {}` schema 拒绝。
- `all false arrow object rejected`：`line.arrow: { negative: false, positive: false }` schema 拒绝。
- `negative arrow dimensions rejected`：arrow detail `scale < 0` / `length < 0` / `width < 0` / `lineWidth < 0` schema 拒绝。
- `invalid origin tickSide for dimension fails loud`：x axis `tickSide: 'left'`、y axis `tickSide: 'top'` lowering 抛清晰错误。
- `origin placement outside cartesian fails loud`：polar / ternary / custom coordinate 若未声明支持 origin placement，lowering 抛清晰错误。

**交互**：

- `origin axis keeps tick label and title side`：origin x axis `tickSide: 'top'` / `bottom` 改变 tick label 与 title 方向，不影响 tick positions。
- `axis arrow coexists with dashed line and grid`：`dashPattern` / `dashOffset`、`grid` 与 `line.arrow` 同时存在，baseline path marks 不影响 grid layer。
- `theme axis lineCap reaches axis baseline but arrow does not`：`theme.axis.line.lineCap` 可作用于 axis baseline；`theme.axis.line.arrow` schema 拒绝。
- `side axis can use arrow without origin`：普通 bottom / left axis 写 `line.arrow`，placement 仍按 side 语义。
- `same panel multi axis arrows stay isolated`：同 panel 多个 y axis 只有配置 arrow 的 axis baseline 带 marks。
- `theme axis line does not accept arrow`：`PlotSpec.theme.axis.line.arrow` schema 拒绝或类型测试覆盖，防止结构字段进入 theme。

### 依赖的现有元素

- `AxisGuideSchema` / `AxisPlacementSchema` / `AxisLineSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——扩展 axis line 与 placement 契约。
- `PlotAxisThemeSchema`（`packages/viz/plot/src/schemas/theme/schema.ts`）——改为消费纯 `AxisLineStyleSchema`，保持 theme 只管视觉默认。
- `ArrowEndDetailSchema` / `IRArrowEndDetail`（`@retikz/core`）——作为 axis arrow 样式契约来源；plot lowering 只把它嵌入 core `IRPath.marks`。
- `PathLineCapSchema` / `PathLineCapValue`（`@retikz/core`）——作为 axis baseline lineCap 契约来源。
- `IRPath.marks` / `IRArrowMark` / `IRPath.lineCap`（`@retikz/core`）——axis line 端点箭头和 lineCap 的 lowering 目标。
- `GuideContext.projectX` / `GuideContext.projectY`（`packages/viz/plot/src/contract/guide.ts`）——origin placement 和 extent 投影的 scale 来源。
- `lowerCartesianGuide`（`packages/viz/plot/src/pipeline/guide/guide.ts`）——实现 cartesian origin placement、axis baseline extent 和 arrow marks。
- `resolveAxisGuideTokens`（`packages/viz/plot/src/providers/theme/theme.ts`）——继续合并纯 line style，但不得把 arrow / extent 从 theme 合并进 guide。

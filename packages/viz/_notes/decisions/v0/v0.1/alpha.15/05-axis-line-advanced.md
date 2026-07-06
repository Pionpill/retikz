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
- 轴标题沿轴线位置通过 `title.placement` 表达。它复用 core path label 同类心智模型，支持 `at-start`、`near-start`、`midway`、`near-end`、`at-end` 等关键字，也支持 `0..1` 比例。baseline 始终按 negative -> positive 方向解释，所以 x 轴 `at-end` 是右侧，y 轴 `at-end` 是视觉顶部；polar / ternary / custom 轴也按各自可见轴线或曲线轴从起点到终点采样。
- 轴标题旋转通过 `title.orientation` 表达语义模式：`auto` 保持现有默认，`horizontal` 强制水平显示，`axis` 沿轴线切向显示。显式 `title.rotate` 仍是低层逃生口，优先级高于 `orientation`。数学坐标系 preset 可以用 `title: { text: 'y', placement: 'at-end', orientation: 'horizontal' }` 得到正向 y 标题。

这些补充字段均属于具体 guide 的结构语义，不进入 theme。React `<Axis>` 已透传 `crossing`；`ticks.endpoint`、`title.placement` 与 `title.orientation` 继续通过既有 `ticks` / `title` props 派生。

## 与 dashOffset 的关系

core 已经具备稳定 `dashOffset` / stroke dash offset 能力。plot 不需要在 ADR-05 里为 axis line 单独设计 `dashOffset`，而应按 ADR-02 把它作为普通 `GuideLineStyleSchema` 字段接入 axis line、tick line、grid line、legend 可描边部件与 theme line style。

历史需求输入见 [`core dashOffset 能力补全请求`](../../../../../../kernel/_notes/analysis/core-dash-offset-capability-request.md)，该 note 现在只作为追溯，不再阻塞 plot 实现。

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

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/05-axis-line-advanced.md`。

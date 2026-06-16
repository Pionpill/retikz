# Plot Mark 抽象方案草案

状态：讨论草案，尚非正式 ADR
日期：2026-06-17
范围：plot v0.1 底层 Mark 抽象、v0.2 chart 分层

这份文档记录一次设计讨论的结论：v0.1 应优先把 plot 的底层图形语法抽象建对，v0.2 再在 chart 层提供更贴近用户心智的图表 API。本文不实现代码，也不最终确定 schema 字段名；后续需要拆成正式 ADR。

## 核心结论

当前 plot 图元已经开始从“抽象数据几何”滑向“具体图表形状”。例如 `BarMark`、`RectMark`、`SectorMark` 都带有很强的最终形状含义，但它们在底层其实都可以被解释为 interval 在不同坐标系下的表现。

目标方向：

- v0.1 的 `plot` 只做底层图形语法：data model、encoding、scale、coordinate、抽象 mark、lowering、registry。
- v0.2 的 `chart` 做用户图表语义：BarChart、PieChart、Heatmap、RadarChart 等易用 API。
- Mark 描述数据几何语义，不描述最终 SVG/core 形状。
- Coordinate 决定数据几何如何在坐标空间中投影和实现。
- Chart 是基于 plot 的 Tier 3，不是 sugar。

一句话原则：

```txt
Mark = 数据几何语义
Coordinate = 投影与几何实现
Lowering = mark x coordinate 的解释规则
Chart = 基于 plot 的用户图表意图层
```

## 现有问题

当前公开图元和 IR 里有一些类型更接近“渲染结果”或“图表类型”：

- `BarMark`：本质是 baseline 到 value 的 interval。
- `RectMark`：本质是二维 interval cell。
- `SectorMark`：本质是 interval 在 polar 下的实现结果。
- `LineMark` / `AreaMark`：共享 path 构造，只是 fill / baseline 语义不同。
- `PointMark` / `TextMark`：共享点投影，只是 glyph 内容不同。

这会带来几个扩展问题：

- 新坐标系容易驱动新增形状专用 mark，而不是复用抽象 mark。
- 同一个 mark 在不同坐标系下本应表现不同，但 API 名称暗示它只能画某一种形状。
- 饼图、环图、热力图这类图表形态会侵入底层 grammar。
- 自定义坐标系需要稳定的几何操作契约，而不是不断枚举具体 chart shape。

## 分层决策

### v0.1：plot grammar

v0.1 应构建底层抽象 Mark：

- point / glyph
- path
- area / region
- interval
- reference / span
- link / flow

这些是图形语法 primitive。它们不关心最终会被画成矩形、扇形、路径还是文本节点；它们只描述数据在几何空间里的结构。

### v0.2：chart tier

v0.2 再提供面向用户心智的 chart API：

- bar chart
- line chart
- pie / donut chart
- heatmap
- radar chart
- sankey / alluvial chart

chart 不是 sugar。Sugar 应该满足“几乎 1:1 展开、不引入新语义、不持有新的默认逻辑”。Chart 会拥有：

- 自动 transform：stack、bin、aggregate、sort、normalize。
- 自动 scale / guide：默认轴、图例、网格、标签、tooltip。
- 自动 layout：多面板、facet、legend placement、axis collision。
- 自动交互：hover、selection、brush、highlight。
- 自动组合：例如 line chart 可能组合 path、point、rule、tooltip。
- 图表级配置：例如 `stacked`、`grouped`、`percent`、`showTotal`。

因此 chart 应作为 plot 之上的 Tier 3，而不是 plot sugar。

## 抽象 Mark 模型

Mark 应通过 registry 注册。内置图元只是内置注册项。

概念模型：

```ts
type MarkDefinition = {
  type: string;
  channels: ChannelDefinition;
  semantics: MarkSemantics;
  defaultLowering: MarkLowering;
  coordinateOverrides?: Record<string, MarkLowering>;
};
```

注意：IR 必须保持 JSON 可序列化。`defaultLowering` / `coordinateOverrides` 这类函数不进 IR，只通过运行时 registry 或 compiler options 注入。

### Lowering 需要什么

Mark lowering 不应该依赖 `Axis` 组件。Axis 是 guide，是 scale 的可视化结果，不是几何真源。

Mark lowering 真正需要：

- 数据行。
- encoding / channel 解析结果。
- scale。
- coordinate frame。
- plot area。
- style channel。
- provenance / anchor 信息。

Axis 可以由 scale 派生，但 mark 几何不应该依赖 guide 实例。

## 坐标系职责

Coordinate 应提供投影和几何实现能力。

概念 API：

```ts
type CoordinateFrame = {
  type: string;
  projectPoint(point: PositionTuple): ScreenPoint;
  projectInterval?(interval: IntervalGeometry): CellGeometry;
  projectPath?(points: Array<PositionTuple>): PathGeometry;
  baseline?(role: PositionRole): ScalarValue;
  supports(operation: GeometryOperation): boolean;
};
```

具体实现可以不长这样，但职责要清晰：

- Mark 构造数据空间几何。
- Coordinate 投影或实现这段几何。
- 坐标系不支持某种几何操作时 fail loud。

## 兜底与特殊处理

每类抽象 Mark 可以有默认兜底策略：

- point：投影一个 position tuple。
- path：投影有序 position tuple，然后连线。
- area：基于 path + baseline / closure 构造填充区域。
- interval：构造正交 interval product。
- reference / span：在固定位置构造 full-domain 或 partial-domain span。
- link / flow：投影 source / target endpoint，再构造曲线或带。

Coordinate 可以为特殊组合提供 override：

- interval + cartesian2D -> rectangle。
- interval + polar2D angle band + radius value -> radial bar sector。
- interval + polar2D accumulated angle interval -> pie / donut sector。
- interval + cartesian2D x band + y band -> heatmap cell。
- path + polar2D + closed -> radar outline。
- area + polar2D + closed -> filled radar region。

这样特殊形状集中在 `mark x coordinate` 的解释规则里，不需要暴露新的 shape-specific mark。

## 建议的抽象 Mark 集合

### Point / Glyph

语义：

- 每行数据映射到一个坐标点。
- 可带 color、size、opacity、shape 等 glyph channel。

覆盖现有：

- `PointMark`
- `TextMark` 的定位基础

待决策：

- 底层叫 `point` 还是 `glyph`。`point` 更简单；`glyph` 更通用，适合未来把 symbol 和 text 统一到底层 glyph 系统。

### Path

语义：

- 一组有序坐标点连接成路径。
- 可按 series 拆线。
- 可闭合。

覆盖现有：

- `LineMark`
- `AreaMark` 的路径构造部分

公开 API 可以暂时保留 `LineMark`，但 lowering 应抽出 path construction。

### Area / Region

语义：

- path 与 baseline / closure / 坐标系闭合规则构成的可填充区域。

覆盖现有：

- `AreaMark`
- polar 下的 filled radar

它可以复用 Path 的点投影和路径构造，但仍应保留为独立抽象 mark，因为 fill / baseline 不是简单 stroke style。

### Interval

语义：

- 一个或多个位置维度上的 interval product。
- interval 可以来自 category band、显式上下界字段、baseline 到 value、transform 派生边界。

覆盖现有：

- `BarMark`
- `RectMark`
- internal `SectorMark`
- histogram interval bars
- polar radial bars
- pie / donut sectors

这是最重要的合并目标。

概念形态示意：

```ts
type IntervalMark = {
  type: 'interval';
  encoding: Encoding;
  bounds?: {
    x?: IntervalBound;
    y?: IntervalBound;
    angle?: IntervalBound;
    radius?: IntervalBound;
  };
  arrangement?: 'stack' | 'dodge';
  series?: string;
};
```

这只是方向示意，最终 JSON schema 字段名必须通过 ADR 决定。

### Reference / Span

语义：

- 固定位置的参考线或参考带。
- 可 full-domain span，也可 partial-domain span。

覆盖现有：

- `RuleMark`

实现上可以复用 interval/span 机制。公开层是否保留 `RuleMark`、改成 `ReferenceMark` 或 `SpanMark`，后续再定。

### Link / Flow

语义：

- source endpoint 到 target endpoint 的关系图元。
- 可带 width、endWidth、curvature、orientation。

覆盖现有：

- `RibbonMark`

它不应该合并进 `LineMark`。两者都会产出 path，但数据语义不同：line 是跨多行的有序轨迹；link / flow 是每行一条 source-target 关系。

## 可合并项

### 强合并：Bar + Rect + Sector -> Interval

这三者应收敛到一个底层 `IntervalMark`。

| 当前形态 | 抽象语义 | 坐标系实现 |
| --- | --- | --- |
| `BarMark x/y` | x category band x y baseline-value interval | cartesian rectangle |
| `BarMark x/y` in polar | angle band x radius interval | radial sector |
| `BarMark angle` | accumulated angle interval x full radius span | pie / donut sector |
| `RectMark x/y/color` | x band x y band | heatmap cell |
| histogram `x0/x1/y` | explicit x interval x y baseline-value interval | continuous interval bar |

`SectorMark` 不应作为 public authoring mark。迁移期如果需要，可以暂时留作内部 lowering result；长期 IR 应尽量表达抽象 interval，而不是最终 sector shape。

### 半合并：Line + Area -> 共享 Path lowering

`LineMark` 和 `AreaMark` 应共享：

- order。
- series split。
- point projection。
- path construction。
- coordinate-specific path behavior。

公开组件不必立刻合并。用户认知里折线和面积仍是不同图表形态。

### 半合并：Point + Text -> 共享 Glyph positioning

`PointMark` 和 `TextMark` 应共享：

- 坐标角色校验。
- point projection。
- datum anchor。
- provenance / label 机制。

公开组件不必立刻合并。文字有 `text/format/dx/dy`，点有 `size/shape/opacity`，用户心智不同。

### 内部复用：Rule -> Span / Interval mechanics

`RuleMark` 可以理解为常量位置上的 span：

- `x = const`，y full domain -> vertical rule。
- `x in [lo, hi]`，y full domain -> vertical band。
- y 方向同理。

公开上它可以继续叫 `RuleMark` 或后续调整为 `ReferenceMark`。

### 暂不合并：Ribbon

`RibbonMark` 是关系图元，或未来改名为 `LinkMark` / `FlowMark`。它与 Path 可以共享曲线装配工具，但不应合并成同一个 mark。

## Registry 方向

目标架构应允许内置 mark 和自定义 mark 走同一套机制。

组件：

- mark schema registry：JSON-safe IR schema 与 channel 声明。
- mark lowering registry：按 mark type + coordinate type 查找 lowering。
- coordinate registry：投影函数与支持的 geometry operation。
- channel resolver registry：位置 channel 与样式 channel 解析。

内置 mark 本质上就是内置 registry entry。

自定义 mark 必须遵守：

- 行为函数不进 IR。
- 持久化 IR 只引用稳定 type name 和 JSON-safe 字段。

## 包边界建议

长期分层：

```txt
@retikz/core
  renderer-agnostic graphics IR and Scene

@retikz/plot
  data grammar: model, transform, scale, coordinate, abstract mark IR, lowering

@retikz/plot-react / @retikz/plot-vanilla
  plot grammar authoring surfaces

@retikz/chart
  framework-agnostic chart presets and chart spec builders

@retikz/chart-react / @retikz/chart-vanilla
  user-facing chart components/builders
```

短期 v0.2 可以遵循既有 ADR，先把 chart 核心放在 plot 包内的自包含模块里。但概念上 chart 是 Tier 3。只要 chart 逻辑开始明显独立、出现 type/config preset、或需要独立版本线，就应毕业成 `@retikz/chart` 系列包。

## 迁移计划

### Phase 1：设计收敛

- 写正式 ADR：抽象 mark 模型。
- 决定最终 IR 名称和 schema 字段。
- 决定 v0.1 public React API 是否直接改成抽象名，例如 `IntervalMark`。
- 决定现有 `sector` / `rect` IR 哪些能现在合并，哪些保留到下一轮。

### Phase 2：内部 lowering 重构

- 抽出通用 point projection。
- 抽出通用 path construction。
- 抽出通用 interval cell / sector construction。
- 将 shape-specific 逻辑移动到 coordinate-specific interval realization。
- 用等价性测试锁住现有 demo 行为。

### Phase 3：IR schema 清理

- 持久化 PlotSpec 优先表达抽象 mark type。
- 当 interval 语义能覆盖时，移除或替换 shape-specific IR mark。
- v0.x 阶段不默认保留旧别名；除非某个 release ADR 明确要求兼容。

### Phase 4：公开 Plot API 清理

- v0.1 文档用抽象 grammar 名称解释 mark。
- 决定 `BarMark` 是改名为 `IntervalMark`，还是暂时作为 React convenience。
- 将 chart-shaped examples 解释为抽象 mark 在坐标系下的实现，不再把它们当底层 mark 分类。

### Phase 5：Chart Tier

- 基于 plot grammar 构建 chart preset。
- 把用户友好的 `BarChart`、`PieChart`、`Heatmap`、`RadarChart` 放到 chart 层。
- chart 输出应能被检查为 PlotSpec，保证仍然复用 plot lowering。

## 兼容性判断

项目仍在 0.x。此阶段应优先修正设计，不应为了兼容旧写法保留长期别名。

可能的 breaking change：

- `BarMark` 改名或收敛为 `IntervalMark`。
- `RectMark` 从 public grammar 移除，变成 interval 形态或 chart 层入口。
- internal `sector` IR 被 interval + coordinate realization 取代。
- 文档侧边栏从具体图表形态改为抽象 mark 分类。

如果某个 release 需要兼容策略，应写进对应 ADR。否则不要同时保留“图表类型 mark”和“抽象 mark”两套长期入口。

## 测试策略

Schema tests：

- 抽象 mark 接受合法 JSON-safe spec。
- 如果移除旧 shape-specific spec，要明确 reject。
- 不支持的 mark x coordinate 组合 fail loud。

Lowering tests：

- point 在各支持坐标系下正确投影。
- path 共享 line / area construction。
- interval 下沉为 cartesian rectangle。
- interval 下沉为 polar radial sector。
- interval 使用 accumulated angle bounds 下沉为 pie / donut sector。
- interval 下沉为 heatmap cell。
- rule / span 复用 interval-like bounds。
- ribbon 保持 relation semantics，不回归。

Equivalence tests：

- 当前 bar demo 在 interval 重构后几何等价。
- 当前 pie / donut demo 通过 interval + polar lowering 后几何等价。
- 当前 heatmap demo 通过 interval cell lowering 后几何等价。
- line / area 共享 path refactor 后路径不变。

Registry tests：

- 内置 mark 可按 type 查到。
- coordinate override 优先于 default lowering。
- unsupported mark x coordinate pair 报错清晰。
- custom registry entry 只存在运行时，不进入 IR。

## 文档策略

v0.1 grammar docs 应按抽象数据几何解释 mark：

- point / glyph
- path
- area / region
- interval
- reference / span
- link / flow

仍可保留图表形态示例，但解释要改成：

- bar 是 interval 在 cartesian2D 下的实现。
- radial bar 是 interval 在 polar2D 下的实现。
- pie / donut slice 是 accumulated angle interval 在 polar2D 下的实现。
- heatmap cell 是二维 interval 在 cartesian2D 下的实现。

v0.2 chart docs 再使用面向用户的图表名，除非用户进入底层定制，否则不暴露全部 grammar 细节。

## 待决策问题

- v0.1 public 组件是否立即从 `BarMark` 改为 `IntervalMark`？
- `RectMark` 是直接移除，还是保留为 thin wrapper 直到 chart 层出现？
- `TextMark` 是否保持独立，还是作为 glyph subtype？
- `RuleMark` 是否改名为 `ReferenceMark` / `SpanMark`？
- interval bounds 的 JSON schema 应如何设计，才能兼顾 AI 友好、手写友好和可扩展？
- v0.2 chart 是先按既有 ADR 放在 plot 包内，还是直接毕业成独立 `@retikz/chart` 包？

## 非目标

- 本文不实现重构。
- 本文不最终确定 schema 字段名。
- 本文不定义最终 custom mark plugin API。
- 本文不决定 chart 包发布边界。
- 本文不默认保留旧 API alias。

# @retikz/plot 坐标语法草案

> 本文是 `@retikz/plot` 的底层设计预研。它只讨论技术语义：坐标系、数据映射、mark、guide、layer 与 lowering 边界；不定义已发布 API，也不承诺实现排期。

## 1. 核心判断

`@retikz/plot` 不应以传统 chart type 作为底层模型。折线图、柱状图、饼图、雷达图等名称只是最终组合结果；真正的一等概念应是：

```txt
Data + Transform + Scale + CoordinateSystem + Encoding + Mark + Guide + Layer
```

换句话说：

> 图表不是类型，而是数据关系在某个坐标空间中的几何显现。

`type="line"` / `type="bar"` 可以作为上层 preset API，但 preset 必须展开成底层 primitive grammar，不能拥有底层无法表达的能力。这与 retikz 现有的 Kernel / Sugar 分层规则一致：快捷入口服务上手，语义核心保持单一。

## 2. Plot 包边界

`@retikz/plot` 的底座是坐标系。只有能自然表达为“数据维度 → 坐标空间 → 几何 mark”的图，才应放进 plot 包。

适合 plot：

- 一维坐标可视化：rug、timeline、histogram、pie / donut（value → angle interval）。
- 二维坐标可视化：line、scatter、bar、area、heatmap、gantt；也包括用极坐标表达的二维坐标图，如 radar、rose、polar bar。
- 约束三维投影：ternary / barycentric plot（`a + b + c = 1` 投影到二维平面）。

不适合 plot：

- flowchart / UML：核心是节点拓扑、布局和边路由。
- network / tree / sankey：核心是 graph / hierarchy layout。
- treemap：核心是层级面积布局，而不是普通坐标投影。
- 真 3D camera plot：涉及相机、投影、遮挡和深度排序，早期不进。
- geo map：核心是地理投影与地图数据，未来可作为独立 domain 包。

边界原则：

> plot 负责坐标化的数据可视化；flow / graph / geo 等 domain 包负责拓扑、层级、地理投影或布局算法。

## 3. 核心概念

### 3.1 Data

Data 是原始记录集合或经过外部查询得到的表格数据。小数据集可以直接进入 Plot IR；大数据集或动态数据应预留 `dataRef` / external dataset 的路径，避免 IR 膨胀。

要求：

- Data 进入 IR 时必须 JSON 可序列化。
- 数据记录不携带函数、ReactNode 或运行时对象。
- 同一个 Plot Scene 内多个 coordinate scope 可以共享同一份 data。

### 3.2 Dimension

Dimension 描述字段的语义类型，不等于视觉坐标轴。常见维度：

| 类型 | 含义 | 例子 |
|---|---|---|
| quantitative | 连续数值 | revenue、age |
| temporal | 时间 | date、startTime、endTime |
| nominal | 无序分类 | country、owner |
| ordinal | 有序分类 | rank、stage |
| interval | 区间 | start/end、low/high |
| proportion | 归一比例 | pie value、ternary a/b/c |

维度数量不是看图形占据几何空间几维，而是看有多少独立数据变量参与空间定位或空间区间生成。

例子：

- 普通饼图是一维：`value -> angle span`。
- 可变半径饼图 / rose chart 是二维：`value -> angle span`，另一个变量或同一变量派生到 `radius` / `area`。
- 甘特图是二维：`task -> categorical band`，`time interval -> x range`。
- 气泡图是二维坐标 + 非空间通道：`x/y` 定位，第三变量映射 size。

### 3.3 Transform

Transform 把原始数据变成可绘制数据。它发生在 scale / coordinate / mark 之前。

常见 transform：

- filter / sort。
- groupBy / aggregate。
- bin / histogram。
- stack / normalize。
- cumulative sum（pie / donut 的 angle interval）。
- dodge / jitter。
- derive interval（如 gantt 的 start/end）。

Transform 属于 plot domain，不进 core。Transform 的结果仍应是 JSON 可序列化的数据表或派生字段。

### 3.4 Scale

Scale 是单个数据维度到视觉通道的映射函数。

例子：

- linear：`[min,max] -> [y0,y1]`。
- log / pow / sqrt。
- time。
- band / point。
- ordinal color。
- quantize / threshold。

Scale 不等于 coordinate system。Scale 处理单个维度的 domain / range / clamp / nice / ticks；coordinate system 负责把多个 scale 组合成空间。

### 3.5 CoordinateSystem

CoordinateSystem 定义一组 scale 如何组合为局部坐标空间。

首批可考虑：

| 坐标系 | 通道 | 典型结果 |
|---|---|---|
| linear1D | x 或 t | rug、timeline、histogram 的一维底座 |
| cartesian2D | x / y | line、scatter、bar、area、heatmap、gantt |
| polar2D | angle / radius | radar、rose、polar bar、pie、donut |
| ternary2D | a / b / c | 三元图，约束三维投影到二维 |

CoordinateSystem 应被 Scope 化：每个 coordinate scope 有自己的 local range、clip、guide、transform，也可以选择共享外层 scale 或 data。

### 3.6 Encoding

Encoding 把字段、常量或派生值绑定到视觉通道。

空间通道：

- x / y。
- xStart / xEnd、yStart / yEnd。
- angle / radius。
- startAngle / endAngle。
- a / b / c（ternary）。

非空间通道：

- color / fill / stroke。
- size / radius / width。
- opacity。
- shape。
- text。
- order / group / series。

Encoding 是 AI 生成 Plot IR 的核心入口：字段名、维度类型、scale 名称与视觉通道都必须显式，避免把语义藏进 `type` 字符串。

### 3.7 Mark

Mark 是数据在坐标系中的几何显现。Mark 应比传统 chart type 更底层。

首批 mark 可以按几何语义分：

| Mark | 语义 | 例子 |
|---|---|---|
| point | 单条记录的位置 | scatter、dot plot |
| line | 有序点之间的连接关系 | line chart、radar line |
| area | 线与 baseline / 另一条线之间的区域 | area chart |
| interval / bar | 从 baseline 到 value 或 start/end 的区间 | bar、gantt |
| rect | 二维格子区域 | heatmap |
| sector | 极坐标角度 / 半径区间 | pie、donut、rose |
| rule | 参考线 / 阈值线 | average line |
| text | 数据标签 | label |
| ribbon | 两个端点集合之间的带状关系 | alluvial-like 局部关系、跨 scope connector |

同一个 mark 在不同坐标系下可形成不同俗名：

- `line + cartesian2D` → 折线图。
- `line + polar2D + closed` → 雷达图。
- `interval + cartesian2D` → 柱状图 / 甘特图。
- `sector + polar2D` → 饼图 / 环图 / 玫瑰图。

### 3.8 Relation

Relation 描述多条记录如何组合或连接。

常见 relation：

- order：line / area 的连接顺序。
- group / series：多条线、多组柱。
- stack：堆叠。
- dodge：并排。
- connect：点到点或 scope 到 scope 的关系线。
- facet：按字段拆成多个 coordinate scope。

Relation 与 mark 分开，是为了避免把“连接顺序”“堆叠方式”“分组方式”揉进某个 chart type。

### 3.9 Guide

Guide 是帮助读图的辅助结构，不是数据 mark 本身。

Guide 包括：

- axis。
- grid。
- tick。
- tick label。
- legend。
- reference line / band。
- scale annotation。

Guide 应是一等对象，而不是某个 chart type 的内部细节。Guide 最终同样 lowering 成 core 的 Node / Path / Step / Scope。

### 3.10 Layer

Layer 允许同一个 coordinate scope 内叠加多组 mark / guide / annotation。

例子：

```txt
cartesian2D
  - grid layer
  - bar mark layer
  - line mark layer
  - point mark layer
  - threshold rule layer
  - label annotation layer
```

Layer 需要稳定 z-order，复用 core 已有的 IR 顺序与 `zIndex` 语义。

### 3.11 Annotation

Annotation 是解释性图形，可能绑定数据，也可能只是版面说明。

Annotation 不应被 plot 黑盒吞掉。它应该能直接混用 retikz core 能力：

- `Node`：说明文字、callout、标题。
- `Path` / `Draw`：引线、框选、关系线。
- `Scope`：局部高亮区域。
- `Paint` / pattern：异常区间填充。

这也是 plot 与 retikz core 的关键协同：plot 负责坐标化数据，core 负责任意几何说明。

## 4. Preset API 与 Primitive API

`@retikz/plot` 可以提供两层 API：

### 4.1 Preset API

Preset API 服务快速上手，允许传统 chart type 入口。

示意：

```tsx
<Chart type="line" data={data} x="date" y="value" />
```

约束：

- Preset 只是 recipe / sugar。
- Preset 必须可展开成 Primitive API。
- Preset 不引入 primitive 无法表达的能力。
- 文档应展示 preset 的展开结构。

### 4.2 Primitive API

Primitive API 是稳定核心。

示意：

```tsx
<Plot data={data}>
  <Cartesian2D>
    <Scale channel="x" field="date" type="time" />
    <Scale channel="y" field="value" type="linear" />
    <XAxis />
    <YAxis />
    <LineMark x="date" y="value" />
  </Cartesian2D>
</Plot>
```

Primitive API 的核心对象是 coordinate / scale / encoding / mark / guide / layer，而不是 `LineChart` / `BarChart` 等结果类型。

## 5. 多坐标组合

复杂信息图往往不是一个 chart type，而是多个 coordinate scope、多个 mark layer 与大量 annotation 的组合。

推荐模型：

```txt
Page coordinate
  - coordinate scope A
    - local scales
    - marks
    - guides
  - coordinate scope B
    - shared color scale
    - local x/y scale
    - mini marks
  - annotation scope
  - connector scope
```

Scope 的职责：

- 分隔局部坐标系。
- 挂局部 transform / clip / style defaults。
- 提供 bbox 与 anchor，供外层 annotation / connector 引用。
- 可共享 data / scale，也可定义局部 data / scale。

多坐标组合需要预留 semantic anchor：

- panel bbox：`plot.north` / `plot.southEast`。
- plot area：`plot.plotArea`。
- axis region：`plot.xAxis` / `plot.yAxis`。
- series region：`plot.series.<id>`。
- data point anchor：`plot.datum.<id>` 或后续等价 locator。

早期可以只实现 bbox anchor；但设计上应避免把 plot lowering 成不可引用的黑盒 primitive。

## 6. Lowering 到 core IR

Plot grammar 属于 Tier 2。它的高层语义应先进入 Plot IR，再 lowering 到 core IR。

Lowering 原则：

- `CoordinateSystem` / `Scale` / `Guide` / `Mark` 是 plot 高层语义。
- core 不理解数据、scale、axis、mark。
- lowering 后只产 core `Scope` / `Node` / `Path` / `Step` / `Coordinate`。
- lowering 后的 core IR 仍应保留必要 `meta`，让工具可追踪来源。
- plot 包不做自己的 renderer。

例子：

```txt
LineMark(data, x, y)
  -> resolve scale
  -> project points through CoordinateSystem
  -> Path + Step line sequence
```

```txt
SectorMark(value)
  -> transform cumulative angle intervals
  -> polar projection
  -> Path sector geometry
```

```txt
Axis(scale)
  -> ticks
  -> Path tick lines + Node tick labels + Path baseline
```

## 7. 与 core 当前能力的关系

plot 底层会复用 core 已有能力：

- `Scope`：局部坐标系、局部 transform、样式默认值、bbox anchor。
- `Path` / `Step`：line、area、bar outline、sector、ribbon、guide。
- `Node` / `Text`：label、tick label、legend、annotation。
- `Paint` / pattern：series fill、area fill、highlight region。
- `zIndex`：layer 顺序。
- `ShapeDefinition` / `ArrowDefinition` / `PatternDefinition` / `PathGeneratorDefinition`：扩展 mark 或 guide 的几何产出。

仍需补齐或预留：

- Tier 2 composite 接入：open Plot IR / `lowerComposites` 或等价 lowering 管线。
- coordinate scope 的 scale registry。
- plot semantic anchor / locator。
- shared scale / shared data 的引用规则。
- guide 与 mark 的 bbox / clipping 策略。
- 大数据降采样或 external dataRef 策略。

## 8. 早期实现建议

第一阶段不追求覆盖所有 chart type，只验证 grammar 是否正确。

建议首批坐标系：

1. `cartesian2D`：连续 / 时间 / band scale。
2. `polar2D`：angle / radius。
3. `linear1D`：timeline / histogram 底座。

建议首批 mark：

1. `point`。
2. `line`。
3. `interval / bar`。
4. `area`。
5. `sector`。
6. `text`。
7. `rule`。

建议首批 guide：

1. x / y axis。
2. radial / angular axis。
3. grid。
4. legend。

建议首批 preset：

- line。
- scatter。
- bar。
- area。
- pie / donut。
- radar。
- gantt。

这些 preset 都必须展开成同一套 coordinate / scale / mark / guide 结构。

## 9. 明确不做

早期 `@retikz/plot` 不做：

- 企业 dashboard 数据接入 / 权限 / 报表治理。
- 大规模实时 dashboard 性能引擎。
- graph / flow / hierarchy layout。
- geo map。
- 真 3D camera plot。
- 与 core 平行的 renderer。

这些能力可以由其它 domain 包或上层产品承载；plot 包只守住坐标化数据可视化这一层。

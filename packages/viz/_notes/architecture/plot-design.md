# @retikz/plot 坐标语法设计

> **状态：长期技术语义参考，当前公开契约以代码、用户文档和 Accepted ADR 为准。** 本文讨论坐标系、数据映射、mark、guide、layer 与 lowering 边界，不定义已发布 API，也不维护实现排期。
>
> §6 记录 viz domain 中 data / plot / table / geo 及各自框架绑定包的结构与命名；当前实际包与 release group 以 [`包拓扑`](../../../../notes/architecture/package-topology.md) 和 [`scripts/release-groups.config.mjs`](../../../../scripts/release-groups.config.mjs) 为准。

## 1. 核心判断

`@retikz/plot` 不应以传统 chart type 作为底层模型。折线图、柱状图、饼图、雷达图等名称只是最终组合结果；真正的一等概念是 **数据与通道（channel）**：

```txt
Data + Transform + Channel(Encoding):
  位置通道 (x/y, angle/radius, a/b/c, ...)  -> Scale -> CoordinateSystem --+
  非位置通道 (color/size/shape/text, ...)    -> Scale --------------------- +--> Mark + Guide + Layer
```

通道是「数据字段 / 常量 / 派生值 → 视觉属性」的绑定（即 §3.6 Encoding），分两类：

- **位置通道**：x / y、angle / radius、xStart / xEnd、a / b / c 等。位置通道由 **坐标系（CoordinateSystem）** 消费，被解析进绘图空间。
- **非位置通道**：color / size / opacity / shape / text / order / group / series 等。

换句话说：

> 图表不是类型，也不是「坐标空间里的几何」，而是 **数据经由通道绑定到几何与视觉属性后的显现**；坐标系只是消费「位置」这一类通道的机制，不是底座。

这条判断决定了 plot 的能力边界（见 §2）：凡能被「数据 → 通道」描述的图就能进 plot——位置通道交给坐标系、关系类几何交给 ribbon 等 mark；而定义性几何来自 packing / layout 算法（与原始数据字段无直接映射）的图（如词云）也不需要独立 struct 包，它们应作为 plot 的 layout transform：先算出位置 / 尺寸 / 路由等派生字段，再继续走通道、scale、坐标系、mark、guide 与 lowering。

`type="line"` / `type="bar"` 这类新手友好入口归 `@retikz/chart`：chart 可以拥有自己的 Tier 3 `ChartSpec`，但它只 lower 成 PlotSpec，再由 plot 下沉到 core。chart 不能直接 lower 到 core，也不能拥有 plot 底层无法表达的能力。这与 retikz 现有的 Kernel / Sugar 分层规则一致：快捷入口服务上手，语义核心保持单一。

## 2. Plot 包边界

`@retikz/plot` 的底座是 **数据与通道**（§1），不是坐标系。判定一张图是否属于 plot，看它能否被「数据 → 通道」描述：位置通道交给坐标系解析，关系类几何交给 ribbon 等 mark。**只要定义性几何来自「数据 → 通道」映射，就属于 plot。**

适合 plot：

- 一维坐标可视化：rug、timeline、histogram、pie / donut（value → angle interval）。
- 二维坐标可视化：line、scatter、bar、area、heatmap、gantt；也包括用极坐标表达的二维坐标图，如 radar、rose、polar bar。
- 关系 / 流量可视化：sankey / alluvial。flow 是数据记录，value → ribbon 宽度，两端 → 位置通道（stage 为 ordinal 位置 + value 的 stack）；其几何由通道决定，故可描述（复用 §3.7 ribbon mark）。节点排序的交叉最小化只是可选 transform 启发式，不是外部 layout 引擎。

不适合直接用普通位置通道描述、但适合作为 plot layout transform：

- **词云（word cloud）**：frequency 可映射到字号；每个词的位置来自碰撞避让 packing。layout transform 负责产出 `x/y/fontSize/rotate` 等派生字段，后续用 `TextMark` 表达。
- network / tree / dendrogram：节点位置来自 force-directed / 层级 layout 算法，而非原始位置字段。layout transform 负责产出节点 `x/y` 与边路由字段，后续用 `DotMark` / `LinkMark` / `TextMark` 表达。
- treemap：面积来自 value 通道，但位置与矩形范围来自 squarify packing。layout transform 负责产出 `x/y/width/height`，后续用 `RectMark` 表达。
- flowchart / UML：若作为通用图编辑 / 语义建模工具，超出 plot；若只作为数据驱动的结构图展示，可由 plot layout transform 产出节点位置与边路由后继续走 mark。
- 真 3D camera plot：涉及相机、投影、遮挡与深度排序，早期不进。
- geo map：核心是地理投影、地图数据格式、地理图层与地理坐标语义；是否独立为 `@retikz/geo` 待后续 ADR 决定，也可能作为 plot 的 projection / layout 能力进入同一 pipeline。

边界原则：

> viz 组解决的是「有了数据之后如何可视化」。数据语义归共享 `@retikz/data`；底层可视化表达至少分为 plot 与 table：plot 负责 GoG 图形语法（含 layout transform），table 负责表格型展示，geo 作为地图类边界待决策；chart 是 plot 之上的 Tier 3 新手友好封装，负责把 type/config/preset 收敛为 `ChartSpec`，再 lower 成 PlotSpec。几何由 packing / layout 算法（词云、力导向 network、treemap）决定的结构化可视化不设独立 `@retikz/struct` 包，而是作为 plot 的 layout transform：先把结构数据转成位置、尺寸、路由等派生字段，之后统一走 plot 的 channel / scale / coordinate / mark / guide / lowering。

Plot 拥有 guide 的领域解析，但不独占已经去除数据与坐标语义的通用呈现。以 Legend 为例，Plot 负责 channel / scale 绑定、domain / ticks、formatter、theme mapping、guide resolve、provenance / locator 与交互意图；解析后的 title、entries、swatch / ramp / symbol、内部布局与 lowering 交给 `@retikz/standard`。依赖保持 `plot -> standard -> core / math`，Standard 不反向读取 Plot IR。

## 3. 核心概念

### 3.1 Data

**数据不进 IR。** 一张图拆成三层：① **IR（配置）**——图类型 / 数据引用与模型 / scale / coordinate / mark；② **数据**——外部单独存储，任意 JS（可嵌套），不进 IR；③ **绑定逻辑**——写死在代码里的函数，`(IR + 数据) → core IR`。把整张数据集内联进 IR 会让 IR 体积随数据量爆炸，拖垮持久化、传输与 LLM 生成。

这套「配置 / 数据 / 函数」三分正是 core 处理所有 Tier 2 与扩展点的既定模式——shapes / arrows / patterns / pathGenerators / composites **无一例外**都是「含函数与数据、不进 IR、经 `CompileOptions` 运行时注入」。plot 据此实现：

- **IR 只持数据引用**：`data = { ref, model? }`——具名数据集名 `ref` + 可选数据模型 `model`（字段名 + 类型声明）。`ref` / `model` 是 JSON-safe 的 IR 内容；**数据值从不进 IR**。
- **数据经闭包注入**：编译期 `compileToScene(plotIR, { composites: lowerPlots(datasets) })`，`datasets` 是 `Record<string, Array<Row>>`，`Row` 为任意 JS（可嵌套）；`data.ref` 按名查 `datasets`。
- **字段经路径 accessor 取值**：encoding 的 `field` 是 `'a.b.c'` 路径，对 `Row` 解析，**解析后须落到标量**才能喂 scale；只有抽出的标量进 lowered core IR。
- **外部数据不受 IR 的 JSON 约束**（它不进 IR），可直接喂 API 返回的嵌套 JSON；但 **lowered 后的 core IR 仍 100% JSON-safe**（全是算好的标量 / 几何）。
- **共享**：同一 Plot Scene 内多个 coordinate scope 可按同一 `ref` 共享数据集。

> 小数据 / 示例的便利（如 React DSL 里 `data` 当 prop）由框架 adapter 在 authoring 期把数据拆进 `datasets`、IR 仍只存 `ref`（`@retikz/plot-react`，v0.1 ADR-07/08），不破坏「数据不进 IR」。

### 3.2 Dimension

Dimension 描述字段的语义类型，不等于视觉坐标轴。常见维度：

| 类型         | 含义     | 例子                     |
| ------------ | -------- | ------------------------ |
| quantitative | 连续数值 | revenue、age             |
| temporal     | 时间     | date、startTime、endTime |
| nominal      | 无序分类 | country、owner           |
| ordinal      | 有序分类 | rank、stage              |
| interval     | 区间     | start/end、low/high      |
| proportion   | 归一比例 | pie value                |

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

Transform 属于 viz 数据 / 可视化能力域，不进 core。宿主无关的 rows / fields / statistics 变换归 `@retikz/data`；依赖 mark、geometry 或 layout 语义的 plot-specific transform 留在 `@retikz/plot`，但复用 data 的 definition、registry 与 apply contract。Transform 的结果仍应是 JSON 可序列化的数据表或派生字段。

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

CoordinateSystem 定义一组 scale 如何组合为局部坐标空间。**坐标系按空间几何命名（非 scale 类型）**——它是 scale-agnostic 的：任一坐标系的轴都可配任意 scale（linear / log / sqrt / time / band），命名只描述「空间是直线 / 平面 / 圆 / 三角」。

首批可考虑：

| 坐标系      | 通道           | 典型结果                                                              |
| ----------- | -------------- | --------------------------------------------------------------------- |
| cartesian1D | x              | rug、timeline、histogram 的一维底座（一维直线，scale 可 log/time 等） |
| polar1D     | angle          | 环形 / 周期数据（钟面、星期轮）；一维圆周                             |
| cartesian2D | x / y          | line、scatter、bar、area、heatmap、gantt                              |
| polar2D     | angle / radius | radar、rose、polar bar、pie、donut                                    |

> 命名注：早期草拟过 `linear1D`，已改 `cartesian1D`——坐标系名描述空间几何而非 scale，「linear」错误暗示仅线性 scale（实际一维直线轴同样可配 log / time）。一维有直线（cartesian1D）/ 圆周（polar1D）两种载体，分别是 cartesian2D / polar2D 的降维。详见 alpha.9。

CoordinateSystem 应被 Scope 化：每个 coordinate scope 有自己的 local range、clip、guide、transform，也可以选择共享外层 scale 或 data。

### 3.6 Encoding

Encoding 把字段、常量或派生值绑定到视觉通道。

空间通道：

- x / y。
- xStart / xEnd、yStart / yEnd。
- angle / radius。
- startAngle / endAngle。

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

| Mark           | 语义                                     | 例子                                       |
| -------------- | ---------------------------------------- | ------------------------------------------ |
| point          | 单条记录的位置                           | scatter、dot plot                          |
| line           | 有序点之间的连接关系                     | line chart、radar line                     |
| area           | 线与 baseline / 另一条线之间的区域       | area chart                                 |
| interval / bar | 从 baseline 到 value 或 start/end 的区间 | bar、gantt                                 |
| rect           | 二维格子区域                             | heatmap                                    |
| sector         | 极坐标角度 / 半径区间                    | pie、donut、rose                           |
| rule           | 参考线 / 阈值线                          | average line                               |
| text           | 数据标签                                 | label                                      |
| ribbon         | 两个端点集合之间的带状关系               | sankey / alluvial 流量、跨 scope connector |

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

## 4. 绘制流程

把 §3 的概念串成一条端到端管线。核心顺序：**数据 → 通道 → scale → 坐标系（仅位置通道）→ mark → guide → 合成 → lowering**。位置只是被坐标系消费的一类通道（§1），其余通道直接喂给 mark 的视觉属性。

```text
1. 数据 + Transform   原始数据 -> 变换 -> 可绘制数据表
2. 通道 (Encoding)    字段 / 常量 / 派生值 -> 通道；分「位置通道」与「非位置通道」
3. Scale             每个通道一个 scale(domain -> range)；两类通道都要过
4. 坐标系             选预提供坐标系，消费「位置通道(过 scale 后)」-> 绘图空间坐标
5. Mark 构造          位置(4) + 视觉属性(3) + Relation(order/stack/group/dodge) -> 几何
6. Guide             由 scale + 坐标系派生 axis / grid / tick / legend / reference line
7. Layer / 合成        按 z-order 叠加 mark / guide / annotation(多坐标时为多 scope)
8. Lowering          Plot IR -> core IR(Scope/Node/Path/Step/Coordinate) -> core/render 渲染
```

逐步说明：

1. **数据 + Transform（§3.1 / §3.3）**：原始数据先过 transform——filter / sort、groupBy / aggregate、bin、stack、cumulative sum（饼图 value → 角度区间）、derive interval（甘特 start/end）。没有这步，饼图 / 堆叠 / 直方图无法表达。
2. **通道 / Encoding（§3.6）**：把字段、常量或派生值绑定到通道，并区分由坐标系消费的 **位置通道**（x/y、angle/radius、a/b/c…）与直接作用于视觉属性的 **非位置通道**（color/size/shape/text…）。
3. **Scale（§3.4）**：每个通道各有一个 scale 做 `domain → range`（linear/log/time/band/ordinal/color/size…）。位置通道与非位置通道 **都要过 scale**——位置 scale 喂坐标系，颜色 / 大小 scale 喂 mark 视觉属性。
4. **坐标系（§3.5）**：选预提供的坐标系（cartesian / polar）或注册自定义坐标系，它只消费 **位置通道（已过 scale）**，把它们组合解析为绘图空间坐标。坐标系是位置通道的消费者，不是底座。
5. **Mark 构造（§3.7 + §3.8）**：mark 几何 = 位置（来自 4）+ 视觉属性（来自 3）+ Relation（order / group / series / stack / dodge）。**注意**：折线 / 面积 / sector / ribbon 都是 **mark 本身**，由有序数据直接生成几何，**不是「先画点再事后连线」**；「怎么连 / 怎么堆 / 怎么分组」属 Relation，是 mark 构造的输入，而非后处理步骤。
6. **Guide（§3.9）**：由 scale + 坐标系派生坐标轴 / 网格 / 刻度 / 图例 / 参考线。guide 是一等输出，与 mark 并列，不是某个 mark 的内部细节。
7. **Layer / 合成（§3.10）**：按稳定 z-order 叠加多组 mark / guide / annotation；多坐标信息图则是多个 coordinate scope 的组合（§7）。
8. **Lowering（§8）**：plot 自己不渲染。Plot IR 经 lowering 产出 core 的 `Scope / Node / Path / Step / Coordinate`，交给 core / render 真正绘制。

> 常见误区：把「折线」当作「画完点之后再连」的独立步骤。在本模型里折线是 line mark、由 order relation 驱动的一等几何；真正的「图元间联系」只有 connector / ribbon（跨 scope、sankey 流量），且它们同样是 mark，不是后处理。

## 5. Viz API 分层

viz domain 分为三类 API：

- **共享数据层**：`@retikz/data`。职责是数据模型、字段与值语义、通用 transform / statistics、字段输入解析、lineage 等宿主无关契约。
- **Tier 2 表达层**：`@retikz/plot` / `@retikz/table` / geo 候选能力。职责是抽象能力、扩展契约、底层实现和 lowering；面向高级用户、AI、preset 作者和扩展作者。原 struct 范围收敛进 plot 的 layout transform，不作为独立包。
- **Tier 3 封装层**：`@retikz/chart`。职责是通过 `type` / config / preset 提供新手友好的 API；可以拥有 JSON-safe 的 `ChartSpec`，但唯一执行出口是 lower 成 PlotSpec；不拥有直接到 core 的底层 IR、lowering 或 renderer。
- **框架绑定层**：各模块各自发布 React / Vanilla 绑定包，例如 `@retikz/plot-react` / `@retikz/plot-vanilla`、`@retikz/chart-react` / `@retikz/chart-vanilla`、`@retikz/table-react` / `@retikz/table-vanilla`，以及候选的 `@retikz/geo-react` / `@retikz/geo-vanilla`。不规划统一 `@retikz/viz-react` / `@retikz/viz-vanilla` 聚合 adapter，避免安装不需要的模块。

`data` 是 viz 共享数据语义层，`plot` / `table` / geo（若独立）都消费它；`chart` 是 `plot` 之上的友好封装，line / bar / tree / wordCloud 等 type/config 入口可以先装配成 ChartSpec，但必须 lower 成 PlotSpec。

### 5.1 Chart API

Chart API（包：`@retikz/chart`，框架表面由 `@retikz/chart-react` / `@retikz/chart-vanilla` 暴露）服务快速上手，允许传统 chart type / preset 入口。它是 plot 之上的 Tier 3 封装层，不是 plot grammar 的一部分。

示意：

```tsx
<Chart type="line" data={data} x="date" y="value" />
<Chart type="tree" data={nodes} parent="parentId" label="name" />
<Chart type="gauge" value={0.72} />
```

约束：

- Chart 可以定义自己的 JSON-safe `ChartSpec`，承载 type、series、默认装饰、主题 preset 与语义配置。
- ChartSpec 的唯一执行出口是 `lowerChartSpec(chartSpec): PlotSpec`。
- Chart preset 必须可展开成 plot 底层表达 API。
- `line` / `bar` / `pie` 等坐标化图形展开成 plot primitive。
- `tree` / `network` / `wordCloud` / `gauge` / `progress` / `pictogram` 等结构化图形展开成 plot layout transform + plot mark 组合。
- Chart 不封装 table 能力；geo-backed type 等 geo 边界决策后再定。
- Chart 不引入底层无法表达的能力；新能力先进入 data / plot / core，再由 chart 封装。
- Chart 不直接表达 core Node / Path，不直接 lower 到 core。
- 文档应展示 chart type 的底层展开结构或等价 primitive 写法。

### 5.2 Data API

Data API（包：`@retikz/data`）是 viz 的共享数据层。它负责数据模型、数据引用、字段与输入格式解析、通用 transform / statistics 与 lineage 等宿主无关契约；视觉 channel、scale、展示 formatter 和 theme 由 plot / table / geo 等宿主按自身表达语义负责。

数据层的原则：

- 内置数据处理逻辑与外部注入逻辑都是一等公民，统一走 definition / registry。
- 通用 transform 可以放在 data：filter、derive、sort、limit、sample、groupBy、aggregate 等只关心数据表和字段的变换。
- 领域 transform 留在使用方：plot 保留依赖 series / mark / geometry 的 stack / dodge 和 stratify / force / packing / treemap / wordCloud 等 layout transform；bin / density / smooth 等操作如果只依赖 rows / fields / statistics，应下沉 data，当前代码位置不决定长期所有权。table 保留 pivot / subtotal / column sizing 等表格语义；geo 若独立则保留 projection / topojson feature extraction / tile / graticule 等地图语义。
- data 不拥有 coordinate / mark / guide / layout / lowering。

### 5.3 Plot API

Plot API（包：`@retikz/plot`）是坐标化图形的稳定核心。

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

Plot API 的核心对象是 coordinate / scale / encoding / mark / guide / layer，而不是 `LineChart` / `BarChart` 等结果类型。

### 5.4 Layout Transform API

Layout Transform API 属于 `@retikz/plot`，不单独设 `@retikz/struct` 包。它承载那些位置、尺寸或路由需要先由算法计算的图形，例如 tree、network、word cloud、treemap、circle packing、gauge、progress、pictogram。

Layout transform 不是第二套 GoG。它发生在通道求值之前，把结构数据转换为 plot 可消费的派生字段；后续仍然使用 plot 的 channel / scale / coordinate / mark / guide / theme / lowering。

```txt
data
  -> layout transform
  -> enriched data with position / size / route / group
  -> channel / scale / coordinate
  -> mark / guide
  -> plot lowering
  -> core IR
```

典型 layout：

- `status`：gauge、progress、quota ring、token usage circle。
- `hierarchy`：tree、dendrogram、treemap、sunburst、icicle。
- `network`：knowledge graph、dependency graph、force graph。
- `packing`：word cloud、circle packing。
- `pictorial`：pictogram、icon array、symbolic/waffle-like chart。

这些能力最终仍应落回普通 plot mark。例如 word cloud 产出 `TextMark` 所需字段，tree/network 产出 `LinkMark` + `DotMark` + `TextMark` 所需字段，treemap 产出 `RectMark` 所需字段。layout transform 追求抽象、扩展和可组合，不承担 chart 级「最短上手 API」。

### 5.5 Table API

Table API（包：`@retikz/table`）是表格可视化的稳定核心。它承载列、行、单元格、分组、汇总、透视表、矩阵等表格型展示语义，并允许复用 data 的字段与输入格式解析、通用 transform / statistics 和 lineage；列映射、展示 formatter 与 theme token 由 table 自己负责。

Table 与 Plot 一样是 Tier 2 能力层：它负责表格语义、布局与 lowering，不承担 chart 级新手封装。

### 5.6 Geo API（待决策）

Geo API 是否独立成 `@retikz/geo` 尚待后续 ADR 决定。地图类可视化需要处理地理投影、地图数据格式、地理图层、地理坐标与地理拓扑等语义；这些能力可以独立成 geo Tier 2 包，也可能作为 plot 的 projection / layout 扩展进入同一 pipeline。

典型能力：

- `projection`：mercator、albers、orthographic 等地理投影。
- `feature`：GeoJSON / TopoJSON feature、mesh、boundary、graticule。
- `layer`：choropleth、symbol map、flow map、tile layer、annotation。
- `geoChannel`：经纬度、行政区 id、地理路径、地理区域与普通数据字段的 join。

若独立成包，Geo 与 Plot / Table 一样是 Tier 2 能力层：它负责地图语义、投影与 lowering，不承担 chart 级新手封装。

### 5.7 Framework Adapter Packages

框架绑定按表达层各自发包，不设统一 viz adapter：

```tsx
import { Plot } from '@retikz/plot-react';
import { Chart } from '@retikz/chart-react';
import { Table } from '@retikz/table-react';
import { Geo } from '@retikz/geo-react';
```

绑定包只负责把框架 authoring 表面装配成对应 spec 并委托底层包；不复制 data transform、plot grammar / layout、chart preset、table layout 或 geo projection 逻辑。

保留 per-module adapter 的原因是 npm 安装边界：用户只用 plot 时只安装 `@retikz/plot-react`，不会被统一 `viz-react` 聚合包拉入 table / geo 依赖。

## 6. 包结构与命名约定

本节是工程约定，约束 viz domain 相关包如何命名、如何在 monorepo 中分组；语义设计见前文各节。

### 6.1 Tier 2 能力层 + Per-Module Adapter

- **共享 `@retikz/data`**：viz 数据语义层，提供 data model / field / transform / statistics / field parsing / lineage 等宿主无关契约。
- **底层 `@retikz/plot`**：可组合的坐标语法 primitive（data / transform / layout / scale / coordinate / encoding / mark / guide / layer），像 Recharts / Observable Plot 那样自由组合（即 §5.3 Plot API）。原 struct 范围作为 plot layout transform，不独立成包。
- **底层 `@retikz/table`**：可组合的表格可视化 primitive（columns / cells / grouping / summary / pivot / matrix 等），承载表格布局和表格语义。
- **底层 `@retikz/geo`（候选）**：可组合的地图可视化 primitive（projection / feature / layer / geo channel 等），是否独立成包待决策；若不独立，地图投影 / 地理布局能力进入 plot pipeline。
- **高层 `@retikz/chart`**：line / bar / tree / wordCloud 等新手友好封装，拥有 Tier 3 ChartSpec，lower 成 PlotSpec 并调度 plot；不封装 table，不在本阶段封装 geo。
- **框架绑定**：各表达层各自发布 `*-react` / `*-vanilla` 包，保持安装依赖精确。

命名理由与业界直觉一致：**data** 指共享数据语义，**plot** 指坐标语法 / 组合层（Observable Plot、ggplot、Recharts），**chart** 指面向用户的图表封装，**table** 指表格可视化底座，**geo** 指地图 / 地理可视化候选底座。结构化算法不再命名为独立 struct 包，而是作为 plot 的 layout transform。

### 6.2 命名轴：层级用基名，框架用后缀

两个轴严格分离，绝不混用：

- 能力层 / 封装层 → 基名：`data`（共享数据层）、`plot`（坐标语法底层，含 layout transform）、`chart`（plot 之上的友好封装）、`table`（表格可视化底层）、`geo`（地图可视化候选底层）。
- 框架绑定 → 由各表达层各自发 `-react` / `-vanilla` 包，避免统一 adapter 拉入无关依赖。

| 层级               | core 逻辑             | react                       | vanilla                       |
| ------------------ | --------------------- | --------------------------- | ----------------------------- |
| 共享数据层         | `@retikz/data`        | —                           | —                             |
| 坐标语法底层       | `@retikz/plot`        | `@retikz/plot-react`        | `@retikz/plot-vanilla`        |
| 图表封装层         | `@retikz/chart`       | `@retikz/chart-react`       | `@retikz/chart-vanilla`       |
| 表格可视化底层     | `@retikz/table`       | `@retikz/table-react`       | `@retikz/table-vanilla`       |
| 地图可视化候选底层 | `@retikz/geo`（候选） | `@retikz/geo-react`（候选） | `@retikz/geo-vanilla`（候选） |

**禁止**把层级塞进后缀（如 `@retikz/plot-chart`）。`plot-react` / `chart-react` / `table-react` / `geo-react` 这类 per-module adapter 是长期形态，不再由 viz adapter 收敛。

### 6.3 目录分组：viz domain 下按包分，glob 用 `packages/*/*`

路径形如 `packages/<域>/<短名>/`。core 是基础域；data / plot / chart / table / geo 及其绑定包都属于 viz domain，放在 `packages/viz/` 下，避免把每个可视化 family 扩成新的顶层 workspace 域。

```text
packages/
  core/      core/  render/  react/  vanilla/    -> @retikz/core, render, react, vanilla
  viz/       data/     -> @retikz/data
             plot/     -> @retikz/plot
             plot-react/   -> @retikz/plot-react
             plot-vanilla/ -> @retikz/plot-vanilla
             chart/    -> @retikz/chart
             chart-react/   -> @retikz/chart-react
             chart-vanilla/ -> @retikz/chart-vanilla
             table/    -> @retikz/table
             table-react/   -> @retikz/table-react
             table-vanilla/ -> @retikz/table-vanilla
             geo/      -> @retikz/geo (candidate)
             geo-react/   -> @retikz/geo-react (candidate)
             geo-vanilla/ -> @retikz/geo-vanilla (candidate)
```

- workspace glob：`packages/*/*`（根 `tsconfig.json` 的 `include` 同步为 `packages/*/*/src`）。
- core 域的 render / react / vanilla 是一等基元、名字已立，**不加 `core-` 前缀**；viz 域下的框架包按能力包派生，保持 npm 安装边界精确。
- 先例：`radix-ui/primitives` 即用 `packages/*/*`（`core/` + `react/` 分组）；pnpm 自身按域分几十个顶层文件夹；TanStack Query 用 `query-core` + `react-query` 的「锚点 + 框架变体」命名。

### 6.4 单仓而非独立仓

viz domain（data / plot / chart / table / geo 及其绑定包）留在主 monorepo，不拆独立仓——至少贯穿整个 0.x。

- **理由**：data / plot / chart / table / geo 及其绑定包是 core 的紧耦合消费者，直接吃 core 的 IR / Scene 契约、并以验证该契约为职责；0.x 契约频繁破坏性变更，单仓可在同一 PR 原子联调、用 `workspace:*` 直连源码，免去「发版 → 消费」回环与版本错配。
- **可逆**：`packages/viz/*` 是干净子树，需要时可 `git subtree split` 带历史拆出。先合后拆易，先拆再天天联调难。
- **重新评估触发条件**：core API 稳定（≥1.0）且 viz 各包有独立发布节奏；或出现不同团队 / 治理 / license 需求。注意「仓库 ≠ 安装单位」——各包在 npm 上始终独立可选安装，与同处一仓无关。

## 7. 多坐标组合

复杂信息图往往不是一个 chart type，而是多个 coordinate scope、多个 mark layer 与大量 annotation 的组合。

需要区分两个层级的「组合」：

- **plot 内坐标复合**：一个 plot 图内部的多个 coordinate scope（facet 小多图、inset、双轴、共享坐标骨架的 radial rings / cartesian lanes 等）。这是 plot 的职责，模型见下。
- **跨域内容组合**：把整个 plot 与 uml / table / 任意业务内容拼到一起。这 **不由 plot 负责**，而是基于 core 现有 `Scope` 的通用能力——任意 Tier 2 内容都 lower 进可引用的 scope，由通用组合层编排。plot 对它的唯一义务是「可被组合」：lower 进可引用 scope 并暴露下列 anchor（见 §14）。

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

坐标复合还需要一个比单个 coordinate scope 更高的共享骨架（shared scaffold）：多个 scope 可以共享一部分坐标基底，再各自拥有局部 range / guide / clip。典型形态：

- facet grid：共享 mark / encoding 定义，按字段拆 panel，每个 panel 有自己的 coordinate scope。
- same-panel overlay：共享 plot area 或 x scale，不同 mark 选择不同 y scale / guide。
- radial tracks：共享 polar center / angle domain / orientation，不同 ring 拥有自己的 radius band 与 mark。
- cartesian lanes：共享 x domain，不同 lane 拥有自己的 y band / local y scale。
- mixed overlay：不同 coordinate 类型共享 anchor / bbox / data / guide 语义，但仍 lower 成各自的 core `Scope`。

多坐标组合需要预留 semantic anchor：

- panel bbox：`plot.north` / `plot.southEast`。
- plot area：`plot.plotArea`。
- axis region：`plot.xAxis` / `plot.yAxis`。
- series region：`plot.series.<id>`。
- data point anchor：`plot.datum.<id>` 或后续等价 locator。

早期可以只实现 bbox anchor；但设计上应避免把 plot lowering 成不可引用的黑盒 primitive。

## 8. Lowering 到 core IR

Plot grammar 属于 Tier 2。它的高层语义应先进入 Plot IR，再 lowering 到 core IR。

Lowering 原则：

- `CoordinateSystem` / `Scale` / `Guide` / `Mark` 是 plot IR 语义。
- core 不理解数据、scale、axis、mark。
- lowering 后只产 core `Scope` / `Node` / `Path` / `Step` / `Coordinate`。
- lowering 后的 core IR 仍应保留必要 `meta`，让工具可追踪来源。
- plot 包不做自己的 renderer。

### 8.1 id 绑定与可连接性（跨 Tier 2 lowering 硬约束）

> 适用于 plot 及后续所有 Tier 2（table / …）。这是 ADR-06（plot lowering）的**硬约束**，新 Tier 2 包的 lowering 同样遵守。

core 的「连接」本质是 id 驱动的：`Path` 的 step target 用 `{ id, anchor?, offset? }` 引用具名 `Node` / `Coordinate` / `Scope`（`Node.id` 可选「要被引用才需」，`Coordinate.id` 必填，`Scope.id` 设了即在父帧注册 bbox 节点成为外部句柄）。因此 **Tier 2 的 `id` 凡 lower 成 core `Node` / `Coordinate` / `Scope`，必须绑到对应 core 元素的 `id` 字段**——这是「可被连接 / 可被组合」的唯一前提；不绑则 lower 成不可引用的黑盒 primitive（§7 已明确要避免）。

绑定层级与命名：

- **整图 root id** → lower 成的外层 core `Scope.id`（外部句柄；父帧 bbox 让整图可被指向）。
- **series / 用户显式命名单元 id** → 承载它的 `Scope` / `Node` 的 id，对应 anchor `plot.series.<id>`。
- **datum 级** → **默认通过 id 字段绑定**：把数据行的某个属性当 id 源，lower 成 `Node` / `Coordinate` 的 id，对应 anchor `plot.datum.<id>`。**作为 id 源的数据属性名可配置**（缺省约定 + lowering option 覆盖，具体配置面在 ADR-06 定）。
- **namespace 防撞**：plot 整体 lower 成 `localNamespace` scope，只有 root id + 显式 anchor 上浮；内部 id 统一带 `<plotId>.` 前缀（点路径 `plot.series.<id>` / `plot.datum.<id>` 即此约定），避免同页多图 id 在父 namespace 相撞。
- **唯一性**：用户提供的 id 优先；缺省时 lowering 按确定性规则合成（如 `<plotId>.series.<markIndex>`），保证可复现、可被 anchor 路径寻址。

> ⚠️ **风险备注（datum 级逐点绑 id）**：把每个数据点都绑 id 会在 core `nodeIndex` 里产生与数据量等量的具名注册——万级散点 = 万级注册，显著抬高 IR 体积、编译成本与 namespace 压力。故 datum id 绑定应**按需开启**（仅在确需逐点被引用时配置 id 字段）；高基数且只需「按规则定位」的场景，优先用 locator 解析（`<plotId>.datum.<rowIndex>` 连接时按需算出），而非逐点预注册。

### 8.2 数据绑定（IR + 外部数据 → core IR；数据不进 IR）

承 §3.1「数据不进 IR」：Plot IR 是 Tier 2 **composite 节点**（`namespace: 'plot'`），数据外置，绑定逻辑是写死的函数——三者经 core 既有 `CompileOptions.composites` 通道汇合，**无需 core 新增钩子**。

- **注册**：plot 包提供 `lowerPlots(datasets)`，返回 `CompositeDefinition[]`（`{ schema, expand }`），其 `expand` **闭包 `datasets`**。数据随函数从 `CompileOptions` 进来，不进 IR。
- **展开**：`compileToScene(plotIR, { composites: lowerPlots(datasets) })` 第一步 `lowerComposites` 按 `plot.plot` 路由调 `expand(plotNode)`：`data.ref` 按名查 `datasets` → encoding `field` 路径对每行取值 → 抽标量 → 过 `scale` → 经 `coordinate` 投影 → 产 Tier 1 `Scope` / `Node` / `Path` / `Step` / `Coordinate`。
- **id 绑定**：`expand` 产出的 `Scope` / `Node` / `Coordinate` 按 §8.1 绑 id（root → 外层 `Scope.id`、series/datum → 对应元素 id + `<plotId>.` 前缀）。
- **后端无感**：renderer 后端只见 lowered 后含具体数字的 core IR，碰不到 plot 原始数据；数据访问全发生在 `expand` 期。
- **数据模型**：`data.model`（可选，在 IR）给了则校验 encoding 字段引用 + 推 scale 类型；缺省则 `expand` 从 `datasets` 推断。

### 8.3 mark 几何 × coordinate：正交配置与投影分层（决策已定：(i) 投影整形 + core 参数化 shape 下沉）

plot 的本质 = 在一个**正交配置空间** `coordinate × mark × scale × encoding` 里，由 lowering 把每个组合投影 / 下沉成 core 几何。其中最吃设计的是 **mark 几何 = f(mark 类型, coordinate)**：同一 mark 在不同坐标系产出不同几何。

```
            point            bar
cartesian   圆点 @ (x,y)     矩形
polar       圆点 @ (r,θ)     扇形（环楔）
```

要点：

- **定位永远过 coordinate 投影**；mark 之间差在「几何形状是否依赖坐标系」——point 的 glyph 不依赖（位置仍投影）、bar / line / area 的几何强依赖（line 在 polar 成螺旋 / 径向折线）。
- **靠分层避免 `N_mark × N_coord` 爆炸**：`scale`（数据值 → 归一化位置，坐标系无关）→ `coordinate`（归一化 → 实际 2D 点，笛卡尔 vs 极坐标差在此）→ `mark`（投影点 + 坐标系的「区间 / 带」概念 → 几何）。

但 bar 类几何无法完全坐标无关，故有**两条实现路线，互斥，需在 polar 落地时拍板**：

- **(i) mark 坐标无关 + coordinate 投影整形**：mark 在归一化空间出形（bar 出单位矩形），coordinate 把归一化区间 / 边投影成坐标系几何。**加新坐标系 O(1)**（所有 mark 自动适配），近 ggplot `coord_*`。落地分两条：**区间 / 离散 mark**（bar / point）经 coordinate 把归一化区间映射成**参数化 shape 参数**，下沉成 **core 参数化可连接 Node**（bar→`sector`、point→`circle`、cartesian 下 bar→`rectangle`；core v0.3-alpha.4 已补齐 `sector` / `arc` 参数化 shape）——精确几何 + 可连接（anchor）+ 省 IR，优于纯采样 Path；**连续 mark**（line / area）跨多数据点、无参数化形态，仍由 coordinate 逐点投影成 **Path**（直边采样弯成弧），连接靠 datum 锚点。
- **(ii) mark 自带每坐标系几何分支**：bar 内写死「笛卡尔→矩形、极坐标→扇形」。直白，但**等于把 N×M 矩阵塞进逻辑**，加新坐标系 = O(N_marks)，近 Vega 分立的 `rect` / `arc` mark。

**决策已定为 (i)**（2026-06-06）：core v0.3-alpha.4 补齐参数化可连接 `sector` / `arc` shape 后，(i) 不再受限于「采样弯曲 Path」——区间 mark 下沉成参数化可连接 Node（见上），连续 mark 仍走投影点 Path。alpha.1~alpha.3 的 lowering 已遵守「不把笛卡尔假设写死进 mark」（保持坐标系投影是可替换中间层），(i) 在 alpha.4 polar 落地。详见 [plot v0.1 roadmap](../decisions/plot/v0/v0.1/roadmap.md) alpha.4。

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

## 9. 与 core 当前能力的关系

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

## 10. 渐进式生成与渲染

`@retikz/plot` 不应只追求最终渲染总耗时最短，也应追求用户感知上的丝滑。复杂图表和大数据图可以借鉴 React concurrent rendering 的思路：把生成、lowering 与绘制拆成可中断的小任务，在每一帧只消耗有限时间预算，先给用户一个可理解的中间态，再逐步补全细节。

渐进式渲染的推荐阶段：

1. layout shell：先确定 plot bbox、coordinate scope、axis range 与 clip。
2. guide skeleton：先画坐标轴、网格、刻度占位。
3. coarse marks：用采样 / 聚合后的数据画主趋势或主要几何。
4. refined marks：补完整数据、精确路径、堆叠 / dodge 等关系。
5. annotation layer：补 label、legend、callout、reference line / band。
6. interaction index：最后构建 tooltip、hover、selection、brush 所需索引。

调度约束：

- 每个阶段都应可暂停、恢复或取消；新的数据、尺寸、筛选条件到来时，旧任务应尽快丢弃。
- 每个阶段产物都应是可渲染的 Plot IR、render plan 或 core IR 片段，避免只在最后一步才出现画面。
- 主线程任务应有时间预算，例如每帧只处理约 5ms 的 geometry / lowering 工作，把输入响应和浏览器绘制时间让出来。
- 大数据场景应优先走 `dataRef`、采样、可见区裁剪与缓存；不应为每个 datum 立即生成完整 core IR 对象。

同一套思想也适用于 AI 生成。AI 不应一次性憋出完整复杂图，而应按稳定中间表示逐层补全：

```txt
intent
  -> coordinate / scale / encoding skeleton
  -> mark layer
  -> guide layer
  -> annotation layer
  -> interaction / accessibility metadata
```

每一步都必须能通过 schema 校验，并保留来源 `meta`。这样用户可以更早看到方向是否正确，工具也可以在坐标系、字段映射或 mark 选择错误时局部修正，而不是等最终图生成失败后整体重来。

渐进式策略不能替代性能优化。它解决的是“先可读、再精细”的体验问题；百万级数据的最终性能仍需要专用 lowering、采样、缓存以及必要时的 Canvas / WebGL 热路径。

## 11. 模块划分与 MVP 范围

`@retikz/plot` 内部按 §4 管线切模块，模块与管线阶段大致一一对应。`coordinate` / `mark` / `scale` 等「可自定义」能力走 **注册表**，不写死枚举（对齐 core 的 `ShapeDefinition` 等扩展位，见 §9）。

### 11.1 模块清单

| 管线阶段 | 模块              | 职责                                                                                                  |
| -------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| —        | `ir` / `schema`   | Plot IR 类型 + zod schema（JSON 可序列化），所有模块的输入输出契约                                    |
| 1        | `transform`       | filter / sort、groupBy / aggregate、bin、stack、cumulative sum、dodge、derive interval                |
| 2        | `encoding`        | 通道声明与解析；位置通道 / 非位置通道分流（§1）                                                       |
| 3        | `scale`           | domain → range：linear / log / pow / time、band / point、ordinal / color / size；nice / clamp / ticks |
| 4        | `coordinate`      | 默认 cartesian + polar，可注册自定义；coordinate definition 提供投影几何                              |
| 5        | `mark`            | point / line / area / interval(bar) / rect / sector / rule / text / ribbon；曲线插值与 path 生成      |
| 5        | `relation`        | order / group / series / stack / dodge / connect / facet                                              |
| 6        | `guide`           | axis / grid / tick / tick-label / legend / reference line / band                                      |
| 7        | `scope` / `layer` | z-order 分层、多坐标 scope、semantic anchor（bbox / plotArea / series / datum，见 §7）                |
| 8        | `lowering`        | Plot IR → core IR（Scope / Node / Path / Step / Coordinate）；plot 不自带 renderer（§8）              |
| 横切     | `theme`（可选）   | 调色板、默认样式（series 配色等）                                                                     |

`ir` / `scale` / `guide` / `lowering` 是常被忽略却必备的模块——没有 `guide` 画不出轴与图例，没有 `lowering` 图停在内存里无法渲染，没有 `scale` 位置与颜色都无从映射。「数学计算」不单列为模块：数据层聚合归 `transform`、通道映射与 ticks 归 `scale`、投影与曲线几何归 `coordinate` / `mark` 各自承担。

### 11.2 MVP 范围（最小端到端闭环）

目标：同一份 Plot IR 端到端画出 **带坐标轴与网格的折线图 / 柱状图**，验证 §4 管线与 §8 lowering 真正打通。

首批纳入：

- `ir`：覆盖 data / encoding / scale / coordinate / mark / guide 的最小 schema。
- `transform`：最小集（sort、groupBy、stack）。
- `scale`：linear、band、time、ordinal / color。
- `coordinate`：cartesian（polar 紧随其后）。
- `mark`：point、line、interval(bar)（area / sector 紧随其后）。
- `relation`：order、group、stack。
- `guide`：x / y axis、grid、legend。
- `lowering`：上述模块到 core IR 的完整下沉。

首批不做（留待后续）：

- polar 坐标系与 sector / ribbon mark（极坐标族第二批）。
- facet 多坐标 scope、connector / sankey。
- chart preset 层（属于 `@retikz/chart`，见 §5.1 / §6）。
- `theme` 高级配色、注册表对外开放（先内置，后开放自定义）。

> 首批坐标系 / mark / guide / preset 的更细清单见 §12 早期实现建议；本节只定模块边界与 MVP 闭环。

## 12. 早期实现建议

第一阶段不追求覆盖所有 chart type，只验证 grammar 是否正确。

建议首批坐标系：

1. `cartesian2D`：连续 / 时间 / band scale。
2. `polar2D`：angle / radius。
3. `cartesian1D` / `polar1D`：rug / timeline / histogram 底座（直线）、环形 / 周期（圆周）。

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

这些 preset 都必须展开成同一套 coordinate / scale / mark / guide 结构（preset 属 `@retikz/chart`，见 §5.1 / §6）。

## 13. 路线与版本边界

`@retikz/plot` 有独立于 kernel 的版本演进，只消费公开 Data / Core / Runtime 能力，不反向改变底座所有权。当前 GoG 基座、独立 Data 层、Definition / registry、coordinate / scale / mark / guide、composition、theme、provenance / lineage 与 React / Vanilla 入口已经形成 v0.1 基线；具体完成状态以 [plot v0.1 roadmap](../decisions/plot/v0/v0.1/roadmap.md) 为准。

后续版本主题、Chart 候选、交互、layout transform、渐进生成与跨域组合只在各自 roadmap / ADR 中排期，本文不复制版本编号或承诺包名。长期设计只保留三条 gating 原则：

1. Plot IR 保持 JSON-safe；runtime 函数、datasets 与宿主状态通过 options / program 注入，不进入 IR。
2. semantic anchor、datum locator、provenance 与 scope-aware lowering 沿同一 Plot → Core 主链演进，不建立交互或组合旁路。
3. 缺少通用图形、测量、增量执行或 renderer 能力时，先由 Core / Math / Runtime / Render owner 补齐；Plot 不自建平行底座。

## 14. 明确不做

早期 `@retikz/plot` 不做：

- 企业 dashboard 数据接入 / 权限 / 报表治理。
- 大规模实时 dashboard 性能引擎。
- graph / flow / hierarchy layout。
- geo map 独立性待决策：可归 `@retikz/geo`，也可作为 plot projection / layout 能力。
- 真 3D camera plot。
- 与 core 平行的 renderer。
- 跨域内容组合（plot 与 table / uml / 任意内容的排版拼装）：属基于 core `Scope` 的通用能力，plot 只保证自身可被组合（lower 进可引用 scope + 暴露 anchor），不自建组合容器。

这些能力可以由 `@retikz/plot` layout transform、`@retikz/chart`、`@retikz/table`、geo 候选包或其它 domain 包承载；其中结构化算法能产出位置 / 尺寸 / 路由字段时应直接进入 plot pipeline。

## 15. 与主流图形语法对比

> 记于 2026-06-07（v0.1 alpha.1~5 收尾复盘）；2026-06-08 补入 Observable Plot 行（retikz 最近的同类）。本节只比**整体设计立场**，不比具体功能（scale 类型、通道广度、legend、facet 等功能缺口是开发阶段问题，见各版本 roadmap）。

五者的设计立场：

| 库                   | 范式本质                                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ggplot2**          | Wilkinson 分层语法的 R 实现，统计图形优先；底层绑 grid grob 树                                                                                                                      |
| **Vega / Vega-Lite** | 声明式 JSON 语法 + 编译管线(VL→Vega) + 响应式 dataflow + 视图组合代数 + 交互语法(selection)；底层私有 scenegraph                                                                    |
| **Observable Plot**  | D3 团队的 mark-based 图形语法，智能默认极强、mark/transform/facet 丰富；但 options 含函数 → 不可序列化、SVG 单后端、故意不做极坐标；retikz 最近的同类（JS 里比 Vega-Lite 轻的 GoG） |
| **Highcharts**       | **不是**图形语法——图表类型目录(`chart.type` 选型 + 深层 options)，series 为中心的配置库；直接生成 SVG                                                                               |
| **retikz/plot**      | 声明式 JSON 语法 + 编译管线，但**下沉目标是一套用户可见、可手写、可组合的通用绘图语法(Tier 1 Kernel)**，而非私有 scenegraph（即 §8 lowering）                                       |

核心维度：

| 维度                      | ggplot2           | Vega-Lite          | Observable Plot               | Highcharts         | retikz/plot                                       |
| ------------------------- | ----------------- | ------------------ | ----------------------------- | ------------------ | ------------------------------------------------- |
| 真·图形语法               | ✅                | ✅ + 组合代数      | ✅                            | ❌ 配置目录        | ✅                                                |
| 最低层                    | grid grob（私有） | scenegraph（私有） | SVG DOM（D3）                 | SVG DOM            | **Tier 1 通用图元（公开/可手写/可组合）**         |
| 序列化/声明               | ❌ R 对象+闭包    | ✅ JSON            | ❌ JS options 带函数/accessor | △ JS config 带函数 | ✅ JSON（§3.1 数据不进 IR）                       |
| 渲染后端中立              | ❌ grid           | ✅ SVG/Canvas      | ❌ 仅 SVG                     | ❌ SVG             | ✅ SVG/Canvas/SSR（后端只懂图元、chart 语义透明） |
| 图元可被连接/嵌入更大图解 | ❌ 终端产物       | ❌                 | ❌ 终端 SVG                   | ❌                 | ✅ **每个柱/点是可连接 Node**（§7 / §8.1）        |

管线分段高度同源（retikz 多出末段 `scope → lowering`，即 Tier 2 落回 Tier 1，§4 / §8）：

- ggplot：`data → stat → scale-train → coord → facet → render`
- Vega：`data → transform → scale → mark → encode → signal/交互`
- retikz：`transform → encoding → scale → coordinate → mark → guide → scope → lowering`

**结论**：语法分解（管线分段、scale/coord/mark 正交）与 ggplot/Vega 一脉，没另起炉灶。真正的差异化赌注是**下沉到一套通用、可组合、后端中立的绘图语法**（类比 PGFPlots 之于 TikZ）——让「图表是可被连接、可嵌入更大图解的一等图元」，这是 ggplot/Vega/Observable Plot/Highcharts 结构上做不到的。代价见 §16。

## 16. 架构权衡：固有软肋与处置

> 记于 2026-06-07。本节保留当时识别的**架构性软肋**（非功能缺口）与候选处置，只作为长期风险检查表，不代表当前排期、性能阈值或已冻结方案。正式立项前应按当前实现重新 benchmark，并由对应 roadmap / ADR 决定是否处理。

最大卖点（§15：下沉到可连接、JSON、后端中立的通用图元）与最大软肋（大数据、响应式交互、动态布局）是**同一决策的两面**。

### 16.1 六条固有软肋

当前实现核对入口是 `packages/viz/plot/src/providers/mark/` 与 `packages/viz/plot/src/pipeline/`；下列判断描述结构代价，不把具体 helper 文件当长期契约：

1. **高基数性能天花板**：当前 point / interval provider 通常让每行下沉成**一个 `IRNode`**，IR 体积 O(数据点数) 个重对象 → Scene O(N) primitive → SVG O(N) DOM。「一切可见物是 Node」直接与「大数据合批渲染」相冲（可连接 ⊥ 合批）。
   - _已缓解的一半_：颜色不逐 node 写，按色分组到 O(色数) 子 Scope（`colorGroupedScope`），样式不是 O(N)；但 node 数量仍 O(行数)。§8.1 风险备注已点出 datum 逐点绑 id 的同类问题（locator 不预注册即对此的缓解）。
2. **JSON 可序列化 IR 的物理代价**：禁 typed-array（数值只能 `number[]`/对象，内存/GC 重于 Float64Array）；禁 function（**无 in-spec escape hatch**，自定义 mark/stat 只能改包源码，不能像 Vega 在 spec 塞表达式/lambda）。这是 §3.1「数据不进 IR」+ IR 全 JSON-safe 的必然代价。
3. **Plot 仍是批量急切 lowering**：Core 已有受限的 incremental program，但 Plot 尚未提供领域 incremental program；数据变化仍重跑 Plot pipeline，再交给 Core compile。对比 Vega 细粒度响应式，数据过滤型交互仍会触及这道墙。
4. **像素尺寸 lower 期钉死**：`lowerPlots` 必须知道 `width/height`（`pipeline/expand`），scale range 即像素区间 `[0,width]`。plot 不能参与 intrinsic sizing；响应式 resize = 整张重 lower（SVG `viewBox` + CSS 那种纯浏览器缩放默认拿不到）。
5. **当前纯 `expand` lowering 无文字度量**：`fontSize`/`margin` 是输入参数，现有管线仍依赖字符估算和固定预留，无法完成测量驱动的 tick label 防重叠/旋转/抽稀与 Legend 自适应宽度。metrics 不进入 JSON IR，但可以作为 Core compile capability 由 layout-aware composite 消费；这是当前 Plot 主链尚未接入通用测量的问题，不再视为永久结构上限。
6. **Tier1/Tier2 双层 = 表达力被 Kernel 词汇量门控**：plot 每个能力都得能用 Tier 1 图元表达；表达不了就必须由 core owner 补通用原语，并经 `next-kernel → next → next-viz` 集成。这是 PGFPlots/TikZ 税——既是表达力上限也是组织延迟。**这是设计原则本身（§1 / §8 / §9），不是 bug。**

### 16.2 候选处置（2026-06-07 快照）

| #   | 软肋               | 处置                                                                                                                                                   | 关键约束                                                                                                                                                                                                                                   |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | O(N) Node 物化     | 评估配置化稠密 primitive 或 renderer batching；不需独立连接时减少 N 个 Node 的物化                                                                     | 「可连接」与「独立物化」的取舍必须显式；若需要新 primitive，先证明其后端中立性并补 Core 契约。可达到的规模由 benchmark 决定，不在本文预设                                                                                                  |
| 2   | JSON IR 物理代价   | typed-array 收益**跟随 #1**（稠密 primitive 的扁平数组即收益）；in-spec 函数**永不做**（自觉取舍），扩展点在创作层（§5.3 Plot API 组件 / 新 mark 包）  | 后续只增内置 mark/stat，不开放 spec 内函数                                                                                                                                                                                                 |
| 3   | Plot 无响应式/增量 | 后续性能 milestone 接入 `@retikz/runtime` program                                                                                                      | 守住「纯函数 + 稳定 identity 可得」——provenance 的 `transformedIndex` / `sourceIndex` / id 是 diff 候选 key，后续不能破坏。**展示类交互（hover / tooltip / 高亮 / 选区）用 locator + overlay，不重 lower**；只有数据过滤型交互才需重 lower |
| 4   | 像素尺寸耦合       | 双机制：**viewBox 等比缩放兜底**（免费、纯 resize 不重 lower，代价文字等比缩放）+ **debounce 重 lower**（要文字不变、布局重排时）                      | API/文档讲清「resize 是等比缩放还是重排」                                                                                                                                                                                                  |
| 5   | 无文字度量         | 迁移到 Core layout-aware composite 的约束测量与同次 replay；Legend 的通用视觉结构和内部布局消费 Standard Box Layout / Legend，Plot 保留 guide 领域解析 | metrics 永不进 IR；不走两遍渲染回灌，不长期停在「字符数×fontSize」或固定带宽估算，也不在 Plot 建立第二套容器 solver                                                                                                                        |
| 6   | Tier1/Tier2 门控   | 不处理——这是设计原则（§1 / §9）                                                                                                                        | 守纪律：缺能力**下沉补 core**，不在 plot 绕开自造（AGENTS.md 已成硬规）                                                                                                                                                                    |

### 16.3 候选处置仍逆风的边界（定位声明）

把 §16.2 全部落实后，定位内的架构风险基本覆盖。**唯一仍逆风的组合**：

> **「大数据 + 重度数据过滤型交互」同时要**（百万点级 + 60fps brush / zoom-to-filter）。

因为稠密 primitive 解决了「画」（#1），但数据过滤型交互要重 lower（#3 延后），大数据下「先重 lower 整图再 diff」本身就贵——真要做得靠增量 lowering，那是纯函数批处理范式的硬改造。

而这个组合**不是 retikz/plot 的定位**：它是 **publication / 图解层**（中小数据量、强可组合、可嵌入更大图解），**不是** Highcharts/ECharts 那种大数据 + 强交互 dashboard（§14 已明确不做 dashboard 性能引擎）。因此明确划定：

- **目标数据规模**：中小；稠密 primitive 或 batching 能把上限提高到哪里，必须由当前环境 benchmark 决定，不预先承诺“几万点流畅”。百万点 + 实时过滤交互 = **明确不支持 / 逆风**，不作为「待修」。
- **目标交互档**：展示类（hover/tooltip/高亮，locator+overlay 可做）；重度数据过滤型大数据交互不在目标内。

这条边界写明后，日后有人拿 retikz 去打 dashboard 场景再回头怪架构，可直接指回本声明——边界是自觉取舍，不是缺陷。

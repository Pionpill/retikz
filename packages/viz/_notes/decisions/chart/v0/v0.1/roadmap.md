# chart v0.1 Roadmap

## 版本目标

建立按图表 family 组织的声明式 recipe。

## 重点功能

| 重点能力            | 目标                                                                          | 相关 ADR                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Point family        | 覆盖 Scatter、Bubble、Regression、Connected Scatter、Ranged Dot 与 Strip      | [004](./004-scatter.md)、[005](./005-connected-scatter.md)、[006](./006-regression.md)、[007](./007-ranged-dot.md)、[008](./008-strip.md)、[013](./013-bubble.md)、[014](./014-point-radius-domain-padding.md)、[017](./017-regression-definition-and-trend-curves.md)                                                   |
| Line / Area family  | 覆盖 Line、Slope、Bump、Area、Range Area 与 Streamgraph                       | [018](./018-line.md)                                                                                                                                                                                                                                                                                                     |
| Bar / Column family | 规划 Bar / Column 系列                                                        | —                                                                                                                                                                                                                                                                                                                        |
| 主链与外观          | 统一精确 recipe、字段映射、声明式入口、Theme 与呈现                           | [003](./003-presentation-standard-layout.md)、[009](./009-family-recipe-chart-schema.md)、[010](./010-chart-plot-declaration-authoring.md)、[011](./011-chart-encoding-field-mapping.md)、[012](./012-chart-react-declaration-authoring.md)、[016](./016-vanilla-input-embed.md)、[015](./015-theme-source-fragments.md) |
| 声明式入口          | 保持直接 IR、React 与 Vanilla 的 recipe 表达一致，Vanilla 采用标准 InputEmbed | [010](./010-chart-plot-declaration-authoring.md)、[011](./011-chart-encoding-field-mapping.md)、[012](./012-chart-react-declaration-authoring.md)、[016](./016-vanilla-input-embed.md)                                                                                                                                   |

## 功能规划

### Point family

主要场景：

- 作者希望直接表达散点、气泡、回归或范围点图。
- 离散角色需要抖动显示，而不是修改输入数据。

规划内容：

- 覆盖 Scatter、Bubble、Regression、Connected Scatter、Ranged Dot 与 Strip。
- Regression 统一内置与外部拟合方法，支持固定采样与统一的过点趋势曲线。
- 半径、domain padding 与 placement 依赖 Plot 的公开能力。

预期效果：

常见点图可以由简明 recipe 表达，复杂位置计算仍复用 Plot。

### Line / Area family

主要场景：

- 时间、数值或有序类别上的指标变化需要折线与面积呈现。
- 两阶段变化、逐期排名和上下界区间需要明确的数据角色与阅读方式。
- 多系列的总量、占比及构成变化需要堆叠或居中面积呈现。

规划内容：

| 图表        | 功能目标                                                               |
| ----------- | ---------------------------------------------------------------------- |
| Line        | 有序序列趋势；支持单／多系列、可选观测点、曲线与阶梯、缺值连接及分面   |
| Slope       | 两阶段数值变化；明确阶段顺序、实体配对、缺失端点与两端标签             |
| Bump        | 逐期排名变化；区分已有排名与原始指标计算排名，保持排名轴及并列语义明确 |
| Area        | 趋势量级与构成；统一普通、重叠、堆叠及百分比堆叠模式                   |
| Range Area  | 随序列变化的上下界区间；可组合中心线与边界线                           |
| Streamgraph | 多系列构成随序列变化；以居中堆叠及相应坐标展示表达流动趋势             |

优先完成 Line，再扩展 Slope 与 Bump；面积方向依次覆盖 Area、Range Area 与 Streamgraph。具体 recipe 与 family 归属由后续 ADR 明确，本规划不代表已经实现。

必要边界与依赖：

- 绘制主要复用 Plot PathMark，按需组合 Point 与标签；曲线、闭合、缺值连接及坐标语义不在 Chart 重建。
- 明确连接顺序、重复位置、系列身份与颜色／线型的分工；缺失值和缺失整行分别处理，不隐式补零。
- 堆叠复用 Data，统一系列顺序与采样位置；稀疏序列补齐、排名计算及并列规则的缺口由 Data 承担。居中堆叠不等同于 wiggle 布局。
- Sparkline 作为 Line 的紧凑配置与示例，不单独抽象；平滑、阶梯、带点、多系列、分面及坐标方向不单独建立 chartType 或 Chart mark。
- Connected Scatter 与 Regression 保留 Point 归属；统计分布、雷达及平行坐标不因使用 PathMark 纳入本方向。

预期效果：

每种 Chart 与 Chart mark 具有明确功能划分，共享样式和适用场景通过配置与组合表达；序列、变化、排名、区间和构成图复用同一 Plot 绘制主链。

### Bar / Column family

主要场景：

- 离散类别需要柱状或条状比较。
- 作者希望用统一 family 理解不同方向的呈现。

规划内容：

- 保留 Bar / Column family 的功能范围。
- 后续设计仍以 Plot mark、scale 和 coordinate 的实际能力为基础。

预期效果：

条形与柱形图按共同 family 演进，不以相似外观拆出平行机制。

### 主链与外观

主要场景：

- 简单图表需要精确且易理解的 recipe 配置。
- 图表内容需要与外框、主题及通用呈现组合。

规划内容：

- 统一 family recipe、字段映射、Theme 与呈现职责。
- Chart 拥有使用意图，通用绘图与数据处理继续交给既定 owner。

预期效果：

新手友好的入口与底层图形能力保持单向关系，复杂需求有明确去向。

### 声明式入口

主要场景：

- 直接 IR、React 与 Vanilla 作者需要等价表达。
- 熟悉声明式组合的作者希望控制 Plot 声明。

规划内容：

- 统一 recipe 入口和 Chart / Plot 声明式 authoring。
- 让不同入口共享精确输入与相同下沉结果，不建立适配器私有能力。

预期效果：

作者可以选择适合宿主的入口，而不损失 recipe 的表达能力。

## 边界与依赖

消费 Data、Plot、Standard 与 Core；通用 mark、映射和 placement 缺口由 Plot 补齐，Chart 不复制 Plot 主链。

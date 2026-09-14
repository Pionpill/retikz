# chart v0.1 Roadmap

## 版本目标

建立按图表 family 组织的声明式 recipe。

## 重点功能

| 重点能力            | 目标                                                                     | 相关 ADR                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Point family        | 覆盖 Scatter、Bubble、Regression、Connected Scatter、Ranged Dot 与 Strip | [004](./004-scatter.md)、[005](./005-connected-scatter.md)、[006](./006-regression.md)、[007](./007-ranged-dot.md)、[008](./008-strip.md)、[013](./013-bubble.md)、[014](./014-point-radius-domain-padding.md)                                                                      |
| Line / Area family  | 规划 Line、Area、Range Area 与相关 Pattern                               | —                                                                                                                                                                                                                                                                                   |
| Bar / Column family | 规划 Bar / Column 系列                                                   | —                                                                                                                                                                                                                                                                                   |
| 主链与外观          | 统一精确 recipe、字段映射、声明式入口、Theme 与呈现                      | [003](./003-presentation-standard-layout.md)、[009](./009-family-recipe-chart-schema.md)、[010](./010-chart-plot-declaration-authoring.md)、[011](./011-chart-encoding-field-mapping.md)、[012](./012-chart-react-declaration-authoring.md)、[015](./015-theme-source-fragments.md) |
| 声明式入口          | 保持直接 IR、React 与 Vanilla 的 recipe 表达一致                         | [010](./010-chart-plot-declaration-authoring.md)、[011](./011-chart-encoding-field-mapping.md)、[012](./012-chart-react-declaration-authoring.md)                                                                                                                                   |

## 功能规划

### Point family

主要场景：

- 作者希望直接表达散点、气泡、回归或范围点图。
- 离散角色需要抖动显示，而不是修改输入数据。

规划内容：

- 覆盖 Scatter、Bubble、Regression、Connected Scatter、Ranged Dot 与 Strip。
- 半径、domain padding 与 placement 依赖 Plot 的公开能力。

预期效果：

常见点图可以由简明 recipe 表达，复杂位置计算仍复用 Plot。

### Line / Area family

主要场景：

- 时序或连续趋势需要 Line 与 Area 呈现。
- 一个区间需要 Range Area 或关联 Pattern 表达。

规划内容：

- 保留 Line / Area family 的功能规划。
- 具体 recipe 在既有 Plot 能力之上形成，不因目录存在视为已实现。

预期效果：

趋势图 family 具有清晰的后续目标，而不是预发布批次占位清单。

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

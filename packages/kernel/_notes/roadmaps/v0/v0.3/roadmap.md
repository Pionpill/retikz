# kernel v0.3 Roadmap

## 版本目标

建立多渲染后端、跨宿主入口与 Tier 2 支撑。

## 重点功能

| 重点能力   | 目标                                                | 相关 ADR                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 多后端     | 拆分 Render，使 SVG 与 Canvas 消费同一 Scene        | [001](../../../decisions/settled/scene-rendering.md)、[002](../../../decisions/settled/scene-rendering.md)、[005](../../../decisions/settled/scene-rendering.md)                                                                                                                                                                                                                                                    |
| 宿主入口   | 提供 Vanilla runtime、命令式 authoring 与 hydration | [003](../../../decisions/settled/authoring-adapters.md)、[004](../../../decisions/settled/authoring-adapters.md)、[008](../../../decisions/settled/runtime-interaction.md)                                                                                                                                                                                                                                          |
| 可组合绘图 | 建立 Tier 2 composite 的统一编译与 authoring 支撑   | [006](../../../decisions/settled/compile-composite.md)、[007](../../../decisions/settled/compile-composite.md)                                                                                                                                                                                                                                                                                                      |
| 图元形态   | 完善参数化 Shape、连接面、圆角与 provenance         | [009](../../../decisions/settled/node-shapes.md)、[010](../../../decisions/settled/node-shapes.md)、[011](../../../decisions/settled/node-shapes.md)、[012](../../../decisions/settled/node-shapes.md)、[013](../../../decisions/settled/node-shapes.md)、[014](../../../decisions/settled/node-anchors.md)、[015](../../../decisions/settled/node-shapes.md)、[016](../../../decisions/settled/scene-rendering.md) |
| 时间轴动画 | 统一声明式动画、后端播放、触发与降级                | [017](../../../decisions/settled/animation-playback.md)、[018](../../../decisions/settled/animation-playback.md)、[019](../../../decisions/settled/animation-playback.md)、[020](../../../decisions/settled/animation-playback.md)、[021](../../../decisions/settled/animation-playback.md)、[024](../../../decisions/settled/animation-playback.md)                                                                |

## 功能规划

### 多后端

主要场景：

- 同一图形既需要 SVG，也需要 Canvas 输出。
- 宿主根据输出环境选择后端，而不改写绘图描述。

规划内容：

- 建立独立 Render 边界和统一 Scene 消费方式。
- 明确后端能力差异与可观察降级，不建立两套图形语义。

预期效果：

同一绘图描述可以在 SVG 和 Canvas 之间选择输出，领域包保持不变。

### 宿主入口

主要场景：

- 无框架页面需要创建、挂载和更新绘图。
- 静态内容需要在客户端接入事件与运行时行为。

规划内容：

- 提供 Vanilla runtime、命令式 authoring 和静态输出入口。
- 统一 SVG / Canvas hydration 与 React 的双后端接入。

预期效果：

无框架、React 和静态输出场景可以共享绘图与运行时语义。

### 可组合绘图

主要场景：

- Plot 等上层包需要把领域图形嵌入通用绘图树。
- 复合内容需要与基础图元共享编译环境。

规划内容：

- 支持可注册的 Tier 2 composite 展开与上下文传递。
- 提供 authoring 支撑，保持上层包拥有领域输入而 Core 拥有通用编译。

预期效果：

领域包能保留自己的高层输入，并成为通用绘图树的一部分。

### 图元形态

主要场景：

- 作者调整圆、椭圆、多边形、扇形和星形的参数。
- 连接、圆角和来源信息需要随图形形态保持一致。

规划内容：

- 完善参数化 Shape 与统一连接面。
- 补齐通用圆角和 provenance，使图元可用于更复杂的组合。

预期效果：

常用形状能按参数复用，连接与外观不再依赖固定模板。

### 时间轴动画

主要场景：

- 图形需要按时间变化，并在不同后端保持共同含义。
- 动画需要手动、事件或可见性触发以及静态展示。

规划内容：

- 覆盖声明式时间轴、SVG / Canvas 播放、控制与预设。
- 统一关闭动画、能力不足和静态输出下的行为。

预期效果：

动画能被播放、控制或静态展示，后端差异有明确边界。

## 边界与依赖

承接既有 Scene、资源与 compile 边界；数据过渡和增量处理不纳入本中版本。

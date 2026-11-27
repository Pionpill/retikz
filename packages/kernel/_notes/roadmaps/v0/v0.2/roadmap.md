# kernel v0.2 Roadmap

## 版本目标

完善分组、样式继承与开放绘图扩展。

## 重点功能

| 重点能力   | 目标                                             | 相关 ADR                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分组与继承 | 支持 Scope、局部定位、样式继承与标签样式         | [001](../../../decisions/settled/scope-boundaries.md)、[002](../../../decisions/settled/scope-boundaries.md)、[003](../../../decisions/settled/scope-boundaries.md)、[004](../../../decisions/settled/node-anchors.md)、[005](../../../decisions/settled/scope-boundaries.md)、[006](../../../decisions/settled/label-placement.md) |
| 开放扩展   | 统一 Shape、Arrow、PathGenerator 与 Pattern 接入 | [007](../../../decisions/settled/node-shapes.md)、[023](../../../decisions/settled/path-arrows.md)、[024](../../../decisions/settled/path-ribbon.md)、[026](../../../decisions/settled/paint-stroke.md)                                                                                                                             |
| 定位与路径 | 完善结构化锚点、Path sugar、曲线变换与标记       | [012](../../../decisions/settled/path-geometry.md)、[015](../../../decisions/settled/authoring-adapters.md)、[016](../../../decisions/settled/node-anchors.md)、[017](../../../decisions/settled/node-anchors.md)、[025](../../../decisions/settled/path-geometry.md)、[027](../../../decisions/settled/node-anchors.md)            |
| 文字与外观 | 支持 Paint、文字宽度、pin、裁剪与 viewBox        | [019](../../../decisions/settled/paint-stroke.md)、[020](../../../decisions/settled/text-layout.md)、[021](../../../decisions/settled/label-placement.md)、[028](../../../decisions/settled/scope-boundaries.md)、[029](../../../decisions/settled/scene-rendering.md)                                                              |
| 编译顺序   | 保持图元顺序、层叠与文本输出一致                 | [008](../../../decisions/settled/scene-rendering.md)、[009](../../../decisions/settled/scene-rendering.md)、[010](../../../decisions/settled/text-layout.md)、[011](../../../decisions/settled/label-placement.md)                                                                                                                  |

## 功能规划

### 分组与继承

主要场景：

- 一组图元共同移动、旋转或应用样式。
- 嵌套内容需要局部定位与可控制的引用范围。

规划内容：

- 覆盖 Scope 容器、命名边界、组包围盒与局部定位。
- 将节点和路径默认样式、标签样式纳入一致的继承模型。

预期效果：

复合图形可以作为整体定位和设定样式，同时保留内部局部表达。

### 开放扩展

主要场景：

- 作者需要使用内置目录之外的形状、箭头或填充。
- 上层包希望通过公开能力加入新的绘图表达。

规划内容：

- 提供 Shape、Arrow、PathGenerator 与 Pattern 的开放接入。
- 使内置和自定义能力共享注册、解析与编译入口。

预期效果：

新增绘图能力不必修改内置目录，也不要求绕过核心编译流程。

### 定位与路径

主要场景：

- 路径要连接形状边界的特定位置。
- 图形需要圆弧、局部圆、矩形路径或曲线标记。

规划内容：

- 覆盖结构化 target / anchor、路径简写与相对目标。
- 发展路径变换和标记能力，保持简写与基础图元等价。

预期效果：

作者可以用更贴近图形意图的定位与路径表达完成复杂连接。

### 文字与外观

主要场景：

- 文字在有限宽度内换行，并与节点说明共同展示。
- 图形需要渐变、纹理、裁剪或显式可视范围。

规划内容：

- 覆盖 Paint、文字宽度、pin、Pattern 与 clip。
- 允许作者表达 viewBox 和绘图外观，而不直接操作 renderer。

预期效果：

常见文字和外观需求通过绘图输入表达，不需要宿主绘制补丁。

### 编译顺序

主要场景：

- 重叠图元按输入顺序或显式层级显示。
- 节点文字、标签旋转与容器样式在组合后仍保持预期。

规划内容：

- 统一 IR 顺序与 zIndex 的绘制结果。
- 收敛文本分组、标签旋转和外层样式的消费方式。

预期效果：

嵌套和重叠内容具有稳定、可解释的最终绘制顺序。

## 边界与依赖

继承基于 Scope，结构化锚点基于 Shape 契约；扩展统一进入既有编译链。

# standard v0.1 Roadmap

## 版本目标

建立通用 Tier 2 绘图组件与动画效果工厂，官方 Core provider 由独立 Extension 包提供。

## 重点功能

| 重点能力           | 目标                                                     | 相关 ADR                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 开放接入           | 官方与自定义能力通过 Definition 直接接入                 | [021](./021-direct-definition-loading.md)、[023](./023-core-minimal-builtins-and-standard-provider-entrypoints.md)                                                                  |
| 通用呈现           | 提供 Grid、Axes、Frame 与 Legend                         | [001](./001-grid-composite.md)、[002](./002-axes-composite.md)、[003](./003-frame-composite.md)、[014](./014-generic-legend.md)                                                     |
| 集合结构扩展       | 规划 Matrix、Chain、Stack、Queue，并评估 Tree 的能力归属 | —                                                                                                                                                                                   |
| Schema 原子组合    | 全包组合优先，保留各 owner 的领域契约                    | [035](./035-path-schema-atomic-reuse.md)                                                                                                                                            |
| Surface 与内容组合 | 让面板承载任意已有绘图内容                               | [015](./015-presentation-composite-reuse.md)、[022](./022-arbitrary-child-surface.md)                                                                                               |
| 图形与端点         | 补齐可选 Shape、Ribbon、Clip 与端点 Marker               | [024](./024-ribbon-as-standard-path-kind.md)、[025](./025-sector-shape-unification.md)、[027](./027-single-clip-definition.md)、[028](./028-diagram-shapes-and-endpoint-markers.md) |
| 所有权收敛         | 排版布局归 Layout，关系图语义归 Graph                    | —                                                                                                                                                                                   |

## 功能规划

### 包边界

Standard 保留 Tier 2，官方节点形状、箭头、裁剪与流带迁入单根入口 Extension；文档与消费者同步迁移。相关决策：[032](./032-extension-package-boundary.md)。

### 动画效果预设

Core 保留基础预设和通用轨道工具，Standard 提供生长、循环与状态强调等可选效果，统一生成 Core 动画轨道并复用现有播放机制。相关决策：[031](./031-animation-preset-migration.md)。

### 形状

为圆、椭圆、矩形、正多边形、星形、圆弧和扇形建立可持久化的 Tier 2 语义，统一 Vanilla `shape.xxx` 与 React 入口；与 Node 的节点形状扩展保持独立。相关决策：[029](./029-shape-composites.md)。

### 开放接入

主要场景：

- 作者只安装所需的可选绘图能力。
- 官方和第三方 composite 需要同样的注册与编译方式。

规划内容：

- 统一 Definition 直接接入和可选 provider 入口。
- 沿 Core 的公开扩展路径消费能力，不建立 Standard 私有渲染机制。

预期效果：

按需引入图形扩展即可完成消费，不必加载整个官方能力目录。

### 通用呈现

主要场景：

- 普通图形需要网格、坐标辅助线或外框。
- Plot、Table 等领域结果需要通用图例呈现。

规划内容：

- 提供 Grid、Axes、Frame 与已解析的 Legend 呈现。
- 提供可引用单元格的一维 Array 与键值 Map 呈现，复用 Layout 与 Surface；见 [ADR-030](./030-array-map-presentation.md)。
- 统一选择嵌套对象与数组的组件展开或 JSON 文本呈现；见 [036](./036-nested-data-expansion.md)。
- 为 Array、Map 提供无真实数据的示意骨架、空单元格、格内符号和自定义索引标号；见 [037](./037-collection-skeleton.md)。
- 保留领域包的数据信息所有权，只接收通用绘图输入。

预期效果：

多个领域包能共享呈现组件，同时各自保留领域数据解释权。

### 集合结构扩展

面向数据结构教学、算法示意与论文插图，在 Array、Map 基础上补齐二维单元格和链式连接。各结构应能表达无真实数据的示意骨架，单元可承载文字、空内容或已有绘图组件。

| 优先级   | 规划能力      | 目标与边界                                                                                                                                  |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Matrix · 矩阵 | 提供二维单元格、行列索引与单元格引用，服务二维数组、矩阵和动态规划表；不承担矩阵运算或数据表分析                                            |
| P1       | Chain · 链    | 以显式串并联结构连接内容单元，支持有序分叉、重新汇合、两层对齐与正交连接；不承担任意跨分支连边、自动图布局或避障                            |
| P2       | Stack · 栈    | 表达堆叠顺序、栈顶与开放端；支持操作示意，不承担真实入栈、出栈状态管理                                                                      |
| P2       | Queue · 队列  | 表达队首、队尾与进出方向；双端和循环形式在后续设计中评估，不承担真实队列操作                                                                |
| 独立方向 | Tree · 树     | 规划层次结构呈现，为树、BST、Heap、Trie 等示意提供复用基础；先确认与 Graph 的父子关系、树布局及绘图职责边界，不预设归入 Standard collection |

Matrix 的三种输入、行列索引与单元格引用方案见 [038](./038-matrix-presentation.md)，Chain 的串并联与对齐方案见 [039](./039-chain-presentation.md)。Matrix、Chain 优先补齐现有组件缺少的表达能力；Stack、Queue 复用已有单元格与排布能力。连接、标注和绘制复用 Core / Layout 的公开机制，不在 Standard 建立平行关系模型或算法布局。各项公开契约另行通过 ADR 确定。

### Surface 与内容组合

主要场景：

- 一个面板要承载已有的任意绘图 child。
- 标题、图例或内容块需要共同参与外层呈现。

规划内容：

- 提供任意 child Surface 与通用呈现组合。
- 完整 Scope、空间关系和排版复用 Core / Layout 的公开能力。

预期效果：

面板内容可以继续使用已有绘图组件，不需要换成专用内容模型。

### 图形与端点

主要场景：

- 关系图需要可选的形状与端点 Marker。
- 作者需要 Ribbon、扇形或比默认矩形更丰富的裁剪。

规划内容：

- 扩展可选 Shape、Ribbon、Clip 与端点目录。
- 共享图形实现由 Standard 拥有，领域包只选择和组合。

预期效果：

Graph 与直接作者可以复用同一形状和端点实现。

### 所有权收敛

主要场景：

- 领域包需要分清通用绘图与排版、关系语义的职责。
- 既有消费者需要迁往独立能力 owner。

规划内容：

- 排版布局交由 Layout，关系图语义交由 Graph。
- Standard 保留跨领域绘图能力，不通过旧入口维持双重所有权。

预期效果：

消费方能够按职责选择依赖，Standard 不再同时承担三类能力 owner。

## 边界与依赖

按需消费 Layout 与 Core；不反依赖 Plot、Table、Graph 或 Diagram。

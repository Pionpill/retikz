# diagram v0.1 Roadmap

## 版本目标

建立完整 Diagram 外层表达与 Flow 自动制图能力。

## 重点功能

| 重点能力    | 目标                                                         | 相关 ADR                                                                                                                                               |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 外层表达    | 统一 Presentation、Frame、间距、外观与 Theme                 | [001](./001-diagram-assembly-presentation.md)、[002](./002-diagram-frame-spacing-appearance.md)、[008](./008-theme-source-fragments.md)                |
| Flow Source | 声明实体、关系、分组、布局意图与可复用目录                   | [003](./003-flow-source-model.md)、[007](./007-flow-catalog-source-layout-groups.md)、[009](./009-flow-graph-rules.md)                                 |
| 布局        | 建立开放布局接入，支持网格、边界计算与节点宽度               | [004](./004-flow-layout-definition-registry.md)、[010](./010-flow-grid-layout.md)、[012](./012-flow-layout-bounds.md)、[013](./013-flow-item-width.md) |
| 路由        | 支持正交折线路由                                             | [011](./011-flow-elbow-routing.md)                                                                                                                     |
| 结果与绘图  | 编排布局结果和 artifact，复用 Graph materialization 与富文本 | [005](./005-flow-orchestration-result-artifact.md)、[006](./006-flow-entity-rich-text.md)                                                              |

## 功能规划

### 外层表达

主要场景：

- 完整图示需要标题、说明、图例和外框。
- 同一 Flow 内容需要不同外层布局与主题。

规划内容：

- 统一 Presentation、Frame、间距和 Diagram Theme。
- 外层内容角色由 Diagram 表达，排版与 Surface 消费下层能力。

预期效果：

绘图内容可以作为带完整说明和外观的图示交付，而非零散图元集合。

### Flow Source

主要场景：

- 作者或 LLM 以平级实体和关系描述流程。
- 多个流程需要复用目录、默认配置和分组方式。

规划内容：

- 声明实体、关系、Group / Layout、默认规则与正式实例配置。
- 保留明确的布局意图，使 Source 不承担求解后的几何结果。

预期效果：

流程输入更适合直接创作和生成，同时保留可复用的业务描述。

### 布局

主要场景：

- 流程节点需要按网格组织并对齐。
- 分组边界和节点宽度需要参与整个图示布局。

规划内容：

- 建立开放布局接入，并覆盖 Grid、布局边界与条目宽度。
- 让布局结果可用于后续路由和绘制，不建立 docs 专用布局模型。

预期效果：

常见流程排列、分组和宽度控制可以通过布局意图表达。

### 路由

主要场景：

- 流程关系需要清晰的水平、竖直和折线连接。
- 路由需要与已确定的节点位置和边界配合。

规划内容：

- 提供正交折线路由及其 Flow 接入。
- 保持路径生成与关系语义分工，绘制继续消费下层 Path 能力。

预期效果：

流程连线与节点位置保持协调，关系语义无需为路由方式改写。

### 结果与绘图

主要场景：

- 自动制图后仍需识别实体、关系和对应结果。
- 节点与关系需要复用 Graph 的内容和富文本表达。

规划内容：

- 编排布局、routing、geometry result 与 artifact。
- 将结果 materialize 为 Graph / Core 绘图内容，保持确定性和身份对应。

预期效果：

自动图示既能绘制，也能按来源识别结果，为消费方提供清晰边界。

## 边界与依赖

依赖 Graph、Layout、Standard 与 Kernel 的公开能力；不复制下层图元、关系语义或布局基础，也不拥有 renderer 与 Editor。

# Graph v0.1 alpha.2 Roadmap

> 状态：进行中；本 milestone 把 Block 重塑为开放内容的 Graph 布局容器，保留整体宽度约束，并让 Group / Block shell 继承同一 Graph Theme style。关联：[Graph v0.1 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md)

## 主题

alpha.2 建立第五类 Graph Source composite `Block`，用于表达具有 Graph identity、可见 Surface 与统一内部布局的图节点容器。Block 接受任意 Core / Tier 2 children，并按单一纵向布局保留作者顺序；Header、Section、Row 作为独立可选 Graph composite，Row 直接接受任意 children，不再构成固定 Block Source grammar

代码、工程和节点图是 Block 基础能力的主要使用场景。类图、数据结构、服务结构等官方封装属于后续 Tier 3；Blender、Gaea 等节点图继续作为实际覆盖性验证，不把执行、值传播、socket 类型或编辑器语义带入 Graph

## ADR

| 编号                                      | 主题                                | 依赖                                                     | 状态       |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------------------- | ---------- |
| [01](./01-block-composition.md)           | Block 固定结构与局部 endpoint       | Graph alpha.1、Core Node / Scope、Layout Flex、Surface   | Superseded |
| [02](./02-block-sizing.md)                | Block 整体宽度约束                  | Block 开放内容、Core/Layout proposal、Surface allocation | Proposed   |
| [03](./03-block-open-content.md)          | Block 开放 children、布局与扩展边界 | Graph alpha.1、Core Scope、Layout Flex、Standard Surface | Accepted   |
| [04](./04-container-theme-inheritance.md) | Group / Block 继承 Graph Theme 外观 | Graph Theme style、Standard Surface、Diagram Flow        | Accepted   |

## 完成标准

- `Block` 是独立 `namespace: 'graph'`、`type: 'block'` 的 JSON-safe Source composite，不降格为 Entity role，也不与 Group 合并
- Block 接受零个或多个任意合法 `IRChild`，以纵向 FlexLayout 保留 authored order；Graph 不建立 Graph-only 通用 child union
- Block 复用完整 Core Scope，包括 `localNamespace`；Block id、child identity、NodeTarget、anchor、boundary 与 namespace 沿用 Core，不建立 Port IR 或第二套 resolver
- Block 外框、padding、背景、边框、圆角与 overflow 复用 Standard Surface；gap、proposal、allocation、artifact、measurement 与内部排版复用 Layout
- Header、Section、Row 是可独立进入任意 Core 内容树的 Graph composite，Row children 直接保存任意 `IRChild`；它们不得回到 `IRBlock` 固定 grammar，并保持 Direct / React / Vanilla parity
- 类图等官方 Tier 3 与用户自定义 Tier 3 使用同一个 Core composite Definition / provider 方向并 lower 到 Block；Block 不增加 kind、role 或内置白名单
- width / minWidth 只约束最外层 Surface 总宽度，不复制到 child，也不写入 Diagram layout result
- Graph Theme 的 named style 为 Entity / Relation 与 Group / Block 根 shell 提供统一 Graph-owned appearance baseline；`graphTheme` Source rules 仍只影响可见 children 中的 Entity / Relation
- Direct IR、React 与 Vanilla 产生同一 Block Source；compile / renderer 只消费既有 Core / Layout / Standard 主链
- 双语 Docs 的基础用法覆盖 Block 全部基础能力；内置实现留给官方 Tier 3，扩展用法说明用户如何构建自己的 Tier 3

## 非目标

- 不在 alpha.2 实现类图、数据结构、服务结构或其它 Tier 3 内置模型
- 不设计工作流执行、值传播、socket 类型检查、连接数量、Editor、交互连线或运行时节点状态
- 不实现 Diagram 自动 layout / routing，也不把 endpoint 所属索引、几何结果或 port constraint 写入 Graph Source
- 不建立 Block role / kind registry、Port schema、成员数据库、固定 Header / Section grammar 或新旧兼容层

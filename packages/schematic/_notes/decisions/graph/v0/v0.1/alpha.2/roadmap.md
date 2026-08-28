# Graph v0.1 alpha.2 Roadmap

> 状态：设计中；本 milestone 只新增结构化 Block，不改变 alpha.1 已确认的 Graph / Group / Entity / Relation 契约。关联：[Graph v0.1 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md)

## 主题

alpha.2 建立第五类 Graph Source composite `Block`，用于表达代码与工程结构图中具有固定内部层次、可以被 Relation 连接的结构化图节点。Blender、Gaea 等节点图只作为连接点抽象的覆盖性验证，不把执行、数据流或编辑器语义带入 Graph

Block 采用非递归的 `Header → Section → Row → Cell` grammar：Header 固定表达 icon、title / description 与 trailing；Section / Row 组织有序内容；Cell 承载单个任意 `IRChild`，并直接复用 Layout Flex item 的宽度、伸缩、边距与对齐契约。Block、Section 与 Row 的显式 id 继续进入 Core identity / namespace，Relation 仍通过 `NodeTarget + anchor / boundary` 连接，不新增 Port IR

## ADR

| 编号                            | 主题                                       | 依赖                                                   | 状态     |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------ | -------- |
| [01](./01-block-composition.md) | Block 结构化内容、局部 endpoint 与复用边界 | Graph alpha.1、Core Node / Scope、Layout Flex、Surface | Proposed |

## 完成标准

- `Block` 是独立 `namespace: 'graph'`、`type: 'block'` 的 JSON-safe Source composite，不降格为 Entity role，也不与 Group 合并
- Header 的长期槽位固定为左侧 icon、中间必填 title 与可选 description、右侧 trailing；icon / trailing 与 Cell 都接受任意合法 `IRChild`
- Section 至少包含一个 Row，Row 至少包含一个 Cell；Block 不允许递归 Section grammar，复杂嵌套通过 Cell 内已有 Core / Tier 2 child 表达
- Cell 的排版字段直接组合 Layout Flex item schema；Graph 不复制 Flex solver、item schema、artifact 或宽度算法
- Block、Section、Row 的显式 id 可以成为 Core NodeTarget endpoint；Section / Row 通过与最终 allocation 一致的 Core Node host 发布 anchor / boundary，不建立 `IRPort`、Port registry 或第二套 resolver
- `localNamespace`、重复 id、unresolved target、anchor 与 boundary 完整沿用 Core；省略 id 时不得生成公共 identity
- Block 的结构呈现复用 Standard Surface、Layout 与 Core Node；Graph Theme 仍只影响固定槽位或 Cell 中可见的 Entity / Relation，不直接样式化 Block shell、Header、Section 或 Row
- direct IR、React 与 Vanilla 产生同一 Block Source，compile / renderer 只消费既有 Core / Layout / Standard 主链
- 双语 Docs 以代码与工程结构图为主示例，并用节点图验证局部 endpoint 的表达覆盖面

## 非目标

- 不设计工作流执行、值传播、socket 类型检查、连接数量、Editor、交互连线或运行时节点状态
- 不实现 Diagram 自动 layout / routing，也不把内部 endpoint 所属索引写入 Graph Source；未来 Diagram 从 Block 内容树派生所需投影
- 不建立完整 UML class、Blender、Gaea 或其它产品专属模型
- 不建立递归 Section、Block role / Definition registry、Port schema、连接方向字段或预防性的 extension layer

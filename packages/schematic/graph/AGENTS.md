# @retikz/graph 工作指南

本文件覆盖 `packages/schematic/graph/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。涉及 Schematic 能力归属时先读 [`Schematic 制图能力域设计`](../../../notes/architecture/schematic-design.md) 与 [`Schematic Graph 完备设计`](../_notes/architecture/schematic-graph-complete.md)。

## 包职责

Graph 接收 JSON-safe 的语义元素与局部上下文，通过 Definition 确定性下沉为 Core IR。复用 Core、Layout 与 Standard 的公开能力；不拥有自动布局、renderer、成员数据库或编辑器。

- 正式、可持久化的 Graph 元素保留 semantic IR；lower target 复杂度只决定使用普通 expansion 还是 layout-aware Definition。没有独立持久化语义的便捷写法才直接输出 Core IR
- Graph 不复制 Layout FlexLayout、artifact、spacing、axis sizing、clip 或 geometry 算法；公共面不足时先在 Layout owner 冻结并实现最小 composition contract
- public IR 必须 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不得进入 Graph schema
- Group、Block、BlockHeader、BlockSection、BlockRow、Entity 与 Relation 是可独立放入任意 Core 内容树的 semantic composite；Graph、Group、Block、BlockSection 与 BlockRow 组合完整 Core Scope surface，Graph、Group 与 Block 可提供局部 `graphDefaults` / `graphRules`。Group 复用 Standard Surface、Layout 与 Core Node labels 表达可见边界且不自动排列 authored children；Block 复用 Layout 与 Surface 按作者顺序纵向排列任意 children，Header / Section / Row 只是可选组合。Row 的 `children` 直接接受任意 child，并在 lowering 中按相同默认值均分空间
- Graph Theme style 按 role、kind、predicate 与 direction 等真实语义为 Entity / Relation 提供稀疏 appearance 默认，并为 Group / Block 根 Surface 提供无 selector 的 `background`、`border`、`cornerRadius` baseline；单例精确外观继续使用 Core-compatible 字段，Graph 发布包只维护 Neutral baseline，命名 reference styles 由消费方通过公开 Definition 注入
- Relation endpoint 直接复用 Core NodeTarget 与 namespace，可以引用 Core 已公开寻址的 Node、Coordinate、resolved Scope 及下沉为这些 target 的上层 composite；Graph 不建立第二套 endpoint 或 lookup
- Graph、Group、Block、Entity 与 Relation 的 id 均为显式 authoring identity；省略时不得由 resolve、lowering 或 adapter 自动生成。Block、Section 与 Row 的显式 id 发布到当前 Core namespace，不自动添加 Block 前缀

Entity / Relation 分别复用 Core Node / Path 的下沉字段。`graphDefaults` 为可见后代 Entity / Relation / Group / Block 提供默认，`graphRules` 只匹配 Entity / Relation。

## 代码实体组合

- `src/code/` 拥有代码实体共享 Source、CodeBlockDefinition 与完整 provider contribution；组合层级为 Tier 3，发布归属仍是 Graph
- 输入为严格、JSON-safe 的实体事实，输出为唯一基础 Block 与生成内容；Core Scope 负责局部主题，Graph Theme 的有限 codeBlockTokens 负责内部视觉
- 不拥有源码解析、执行器、编辑器或自动布局；具体实体组合在 code owner 内扩展，不修改基础 Block 的开放 children 契约

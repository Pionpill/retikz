# @retikz/graph-react 工作指南

本文件覆盖 `packages/schematic/graph-react/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

将 Graph JSX / props 通过 Graph Vanilla 归一为同一 Source IR。standalone Graph 复用 React Layout 建立 Scene，embedded Graph 只贡献局部 Scope；与 Scope 同名的 props 始终进入 Source，host-only props 仅在 standalone 合法。 不解析布局或端点，不生成默认 Source id；匿名 embed identity 仅用于运行时挂载，不可作为 Relation endpoint。

Block 接受任意有序 children，Header / Section / Row 独立组合；Row 同时接受文本与直接 children。持久化语义和字段归属见 [Graph 指南](../graph/AGENTS.md)。

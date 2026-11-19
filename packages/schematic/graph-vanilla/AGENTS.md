# @retikz/graph-vanilla 工作指南

本文件覆盖 `packages/schematic/graph-vanilla/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

将类型化 Graph Input 归一为 Graph Source / embed；builder 和 adapter 不拥有 Scene 宿主，不把 standalone runtime 字段写入持久化 IR。宿主复用 Kernel Vanilla / React Layout。 不解析布局或端点，不生成默认 Source id；匿名 embed identity 仅用于运行时挂载，不可作为 Relation endpoint。

Block 接受任意有序 children，Header / Section / Row 独立组合；Row 同时接受文本与直接 children。持久化语义和字段归属见 [Graph 指南](../graph/AGENTS.md)。

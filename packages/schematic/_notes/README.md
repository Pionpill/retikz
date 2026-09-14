# schematic 内部文档

这里放当前仍位于 `packages/schematic/` 的 Schematic 分组内部协作文档。Graph 三包作为首个 foundation package family；未来 `@retikz/diagram` 是 Graph 之上的自动图示能力包，`flow` 只是其中一种布局类型或 preset。Graph editor adapter 继续由独立 roadmap / ADR 决定。

## 目录

- [`architecture`](./architecture)：Schematic Graph / Diagram 的长期边界与完备性准入
- [`decisions`](./decisions)：各 family 的中版本能力 roadmap 与独立 ADR；保留 `v0/v0.x/`，不设预发布子目录
- `plans/`：与 ADR 相对路径镜像的 ignored implementation plan、测试契约、任务状态与评审记录；不 stage / commit

## 当前入口

- [`architecture/schematic-graph-complete.md`](./architecture/schematic-graph-complete.md)：可复用图式元素、Standard / Core 复用与 Graph 排除边界
- [`decisions/graph/v0/roadmap.md`](./decisions/graph/v0/roadmap.md)：Graph v0 总路线
- [`decisions/graph/v0/v0.1/roadmap.md`](./decisions/graph/v0/v0.1/roadmap.md)：Graph v0.1 package family 路线
- [`decisions/_template.md`](./decisions/_template.md)：Schematic ADR 模板

ADR 在同一 family / 中版本内用三位连续编号；Accepted 表示设计接受，不代表实现或发布完成。Roadmap 不按预发布序号分配任务，具体实施证据在 ignored plan，发布按实际交付及依赖确定。

跨包长期边界以根 [`../../../notes/architecture/schematic-design.md`](../../../notes/architecture/schematic-design.md) 与 [`../../../notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。

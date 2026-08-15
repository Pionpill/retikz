# schematic 内部文档

这里放当前仍位于 `packages/diagram/` 的 Schematic 分组内部协作文档。Graph 三包作为首个 foundation package family；未来 `@retikz/diagram` 是 Graph 之上的自动图示能力包，`flow` 只是其中一种布局类型或 preset。Graph editor adapter 继续由独立 roadmap / ADR 决定。

## 目录

- [`architecture/`](./architecture)：Schematic Graph / Diagram 的长期边界与完备性准入
- [`decisions/`](./decisions)：Graph 等 family 的版本路线、milestone roadmap 与 ADR
- `plans/`：与 ADR 相对路径镜像的 ignored implementation plan、测试契约、任务状态与评审记录；不 stage / commit

## 当前入口

- [`architecture/schematic-graph-complete.md`](./architecture/schematic-graph-complete.md)：可复用图式元素、Standard / Core 复用与 Graph 排除边界
- [`decisions/graph/v0/roadmap.md`](./decisions/graph/v0/roadmap.md)：Graph v0 总路线
- [`decisions/graph/v0/v0.1/roadmap.md`](./decisions/graph/v0/v0.1/roadmap.md)：Graph v0.1 package family 路线
- [`decisions/graph/v0/v0.1/alpha.1/roadmap.md`](./decisions/graph/v0/v0.1/alpha.1/roadmap.md)：首批迁移 milestone 与 ADR 索引
- [`decisions/_template.md`](./decisions/_template.md)：Schematic ADR 模板

跨包长期边界以根 [`notes/architecture/schematic-design.md`](../../../notes/architecture/schematic-design.md) 与 [`notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。

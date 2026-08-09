# diagram 内部文档

这里放 Diagram 分组的内部协作文档。Notation 三包作为首个 foundation package family；Graph、Flow 与 Graph editor adapter 只在各自 roadmap / ADR 确认后建包。

## 目录

- [`architecture/`](./architecture)：Diagram Notation 的长期边界与完备性准入
- [`decisions/`](./decisions)：Notation 等 family 的版本路线、milestone roadmap 与 ADR
- `plans/`：与 ADR 相对路径镜像的 ignored implementation plan、测试契约、任务状态与评审记录；不 stage / commit

## 当前入口

- [`architecture/diagram-notation-complete.md`](./architecture/diagram-notation-complete.md)：可复用图式元素、Standard / Core 复用与 Graph 排除边界
- [`decisions/notation/v0/roadmap.md`](./decisions/notation/v0/roadmap.md)：Notation v0 总路线
- [`decisions/notation/v0/v0.1/roadmap.md`](./decisions/notation/v0/v0.1/roadmap.md)：Notation v0.1 package family 路线
- [`decisions/notation/v0/v0.1/alpha.1/roadmap.md`](./decisions/notation/v0/v0.1/alpha.1/roadmap.md)：首批迁移 milestone 与 ADR 索引
- [`decisions/_template.md`](./decisions/_template.md)：Diagram ADR 模板

跨包长期边界以根 [`notes/architecture/diagram-design.md`](../../../notes/architecture/diagram-design.md) 与 [`notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。

# library 内部文档

这里放 Library 分组的内部协作文档。`@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 已初始化，并按独立 `standard` release group lockstep 维护。

## 目录

- [`architecture/`](./architecture)：Standard Drawing Library 的长期边界与准入标准
- [`decisions/`](./decisions)：Standard 版本路线、milestone roadmap 与后续 ADR

## 当前入口

- [`architecture/standard-library-design.md`](./architecture/standard-library-design.md)：Standard 包家族、Core 扩展机制与领域包的边界
- [`decisions/standard/v0/roadmap.md`](./decisions/standard/v0/roadmap.md)：Standard v0 总路线
- [`decisions/standard/v0/v0.1/roadmap.md`](./decisions/standard/v0/v0.1/roadmap.md)：Standard v0.1 milestone 与能力边界
- [`decisions/standard/v0/v0.1/alpha.1/roadmap.md`](./decisions/standard/v0/v0.1/alpha.1/roadmap.md)：首批 Grid / Axes / Frame ADR 索引
- [`decisions/standard/v0/v0.1/alpha.2/roadmap.md`](./decisions/standard/v0/v0.1/alpha.2/roadmap.md)：通用 Box Layout 与 Legend 规划
- [`decisions/standard/v0/v0.1/alpha.2/09-generic-legend.md`](./decisions/standard/v0/v0.1/alpha.2/09-generic-legend.md)：Plot / Table / 直接作者复用的通用 Legend ADR
- [`decisions/standard/v0/v0.1/alpha.3/roadmap.md`](./decisions/standard/v0/v0.1/alpha.3/roadmap.md)：已被取代的旧 Legend milestone 记录

roadmap 只安排能力顺序；既有 package / release group 以 Accepted ADR 与当前实现为准，后续新增 schema、公开 API 与实现契约仍由对应能力 ADR 冻结。

跨包能力边界以根 [`notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。

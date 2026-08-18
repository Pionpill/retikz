# library 内部文档

这里放 Library 分组的内部协作文档。Standard 与 Layout 三包均已实现，并分别使用独立的 `standard`、`layout` release group；Layout v0.1 alpha.1 ADR 是当前排版布局 owner 的长期真源。

## 目录

- [`architecture/`](./architecture)：Library、Standard 与 Layout 的长期边界与准入标准
- [`decisions/`](./decisions)：各 package family 的版本路线、milestone roadmap 与 ADR

## 当前入口

- [`architecture/library-design.md`](./architecture/library-design.md)：Library 分组、Standard / Layout 能力轴与依赖方向
- [`architecture/standard-library-design.md`](./architecture/standard-library-design.md)：Standard 横向绘图拓展与 Layout 消费边界
- [`architecture/layout-library-design.md`](./architecture/layout-library-design.md)：Layout 排版模型、composition、inspection 与算法布局边界
- [`decisions/layout/v0/roadmap.md`](./decisions/layout/v0/roadmap.md)：Layout v0 总路线
- [`decisions/layout/v0/v0.1/roadmap.md`](./decisions/layout/v0/v0.1/roadmap.md)：Layout v0.1 package family 路线
- [`decisions/layout/v0/v0.1/alpha.1/01-layout-package-family.md`](./decisions/layout/v0/v0.1/alpha.1/01-layout-package-family.md)：Layout owner 迁移 ADR
- [`decisions/standard/v0/roadmap.md`](./decisions/standard/v0/roadmap.md)：Standard v0 总路线
- [`decisions/standard/v0/v0.1/roadmap.md`](./decisions/standard/v0/v0.1/roadmap.md)：Standard v0.1 milestone 与能力边界
- [`decisions/standard/v0/v0.1/alpha.1/roadmap.md`](./decisions/standard/v0/v0.1/alpha.1/roadmap.md)：首批 Grid / Axes / Frame ADR 索引
- [`decisions/standard/v0/v0.1/alpha.2/roadmap.md`](./decisions/standard/v0/v0.1/alpha.2/roadmap.md)：通用 Box Layout 与 Legend 规划
- [`decisions/standard/v0/v0.1/alpha.2/09-generic-legend.md`](./decisions/standard/v0/v0.1/alpha.2/09-generic-legend.md)：Plot / Table / 直接作者复用的通用 Legend ADR
- [`decisions/standard/v0/v0.1/alpha.3/roadmap.md`](./decisions/standard/v0/v0.1/alpha.3/roadmap.md)：Standard 横向绘图拓展合并发布 milestone
- [`decisions/standard/v0/v0.1/alpha.3/roadmap-graph-history.md`](./decisions/standard/v0/v0.1/alpha.3/roadmap-graph-history.md)：已迁入 Graph 的历史逻辑图组件 milestone

roadmap 只安排能力顺序；既有 package / release group 以 Accepted ADR 与当前实现为准。Standard 历史布局 ADR 原地保留，当前 owner、namespace 与公开入口以 Layout alpha.1 ADR 为准。

跨包能力边界以根 [`notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。

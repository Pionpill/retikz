# library 内部文档

这里放 Library 分组的内部协作文档。Standard 与 Layout 三包均已实现，并分别使用独立的 `standard`、`layout` release group；Layout v0.1 alpha.1 ADR 是当前排版布局 owner 的长期真源。

## 目录

- [`architecture`](./architecture)：Library、Standard 与 Layout 的长期边界与准入标准
- [`decisions`](./decisions)：各 family 的中版本能力 roadmap 与独立 ADR；保留 `v0/v0.x/`，不设预发布子目录

## 当前入口

- [`architecture/library-design.md`](./architecture/library-design.md)：Library 分组、Standard / Layout 能力轴与依赖方向
- [`architecture/standard-library-design.md`](./architecture/standard-library-design.md)：Standard 横向绘图拓展与 Layout 消费边界
- [`architecture/layout-library-design.md`](./architecture/layout-library-design.md)：Layout 排版模型、composition、inspection 与算法布局边界
- [`decisions/layout/v0/roadmap.md`](./decisions/layout/v0/roadmap.md)：Layout v0 总路线
- [`decisions/layout/v0/v0.1/roadmap.md`](./decisions/layout/v0/v0.1/roadmap.md)：Layout v0.1 package family 路线
- [`decisions/layout/v0/v0.1/001-layout-package-family.md`](./decisions/layout/v0/v0.1/001-layout-package-family.md)：Layout owner 迁移 ADR
- [`decisions/standard/v0/roadmap.md`](./decisions/standard/v0/roadmap.md)：Standard v0 总路线
- [`decisions/standard/v0/v0.1/roadmap.md`](./decisions/standard/v0/v0.1/roadmap.md)：Standard v0.1 milestone 与能力边界
- [`decisions/standard/v0/v0.1/014-generic-legend.md`](./decisions/standard/v0/v0.1/014-generic-legend.md)：Plot / Table / 直接作者复用的通用 Legend ADR

roadmap 只管理中版本能力目标和依赖，不分配预发布批次任务；ADR 在同一 family / 中版本内用三位连续编号。Accepted 表示设计接受，不代表实现或发布完成。Standard 历史布局决策保留，当前 owner、namespace 与公开入口以 Layout ADR-001 及当前公开契约为准。

跨包能力边界以根 [`../../../notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。

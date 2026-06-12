# v0.1 Roadmap

> 本文件汇总 v0.1 minor 的路线与 milestone 索引。具体执行记录放在各 milestone 的 `roadmap.md`，长期决策放在同目录的 `NN-*.md` ADR。

## 定位

v0.1 用来确认 retikz 的基础架构：core IR、Scene primitive、React DSL、Node / Path / Coordinate 基础能力、文档站结构，以及第一条可发布的稳定线。

## Milestones

| Milestone | 主题 | 记录 |
|---|---|---|
| v0.1-alpha.4 | 节点关系层：`at` 相对定位、`Coordinate` 占位、Node label | [`alpha.4/`](./alpha.4/) |
| v0.1-alpha.5 | alpha 收尾破坏性扩张：结构化 Scene primitive、StepLabel position、arrow detail、offset position | [`alpha.5/`](./alpha.5/) |
| v0.1-beta.1 | 非破坏性优化与类型 / 注释 / 测试收口 | [`beta.1/roadmap.md`](./beta.1/roadmap.md) |
| v0.1-beta.2 | 公开命名与 renderer-neutral 收口 | [`beta.2/roadmap.md`](./beta.2/roadmap.md) |
| v0.1-rc.1 | 文档站与发布候选验收 | [`rc.1/roadmap.md`](./rc.1/roadmap.md) |
| v0.1-rc.2 | 示例库与搜索体验 | [`rc.2/roadmap.md`](./rc.2/roadmap.md) |

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态或 supersede 信息，不改历史决策内容。

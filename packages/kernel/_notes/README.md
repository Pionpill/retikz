# kernel 内部文档

这里放 kernel 发布组的内部协作文档。kernel 发布组包含 `@retikz/math`、`@retikz/runtime`、`@retikz/core`、`@retikz/render`、`@retikz/react`、`@retikz/vanilla`、`@retikz/tex`，版本按发布组 lockstep。

## 目录

- [`decisions/`](./decisions)：版本路线、milestone roadmap、ADR。
- `plans/`：与 ADR 相对路径镜像的 ignored implementation plan、测试契约、任务状态与评审记录；不 stage / commit。
- [`architecture/`](./architecture)：kernel / core 长期架构设计与能力准入标准。
- [`analysis/`](./analysis)：kernel / core 相关一次性分析。

跨包长期架构原则仍放在根 [`notes/architecture`](../../../notes/architecture)。

## 当前入口

- [`decisions/v0/roadmap.md`](./decisions/v0/roadmap.md)：kernel v0 总路线。
- [`decisions/v0/v0.4/roadmap.md`](./decisions/v0/v0.4/roadmap.md)：上一条 kernel v0.4 路线。
- [`decisions/v0/v0.5/roadmap.md`](./decisions/v0/v0.5/roadmap.md)：当前 v0.5 路线；alpha.1 / alpha.2 已完成，alpha.3 交付上下文颜色，Concurrent + generation 尚未排期，alpha.4 保留 Headless Interaction 候选边界
- [`decisions/v0/v0.4/backlog.md`](./decisions/v0/v0.4/backlog.md)：未排期候选、边界与启动条件。
- [`decisions/v0/v0.4/history.md`](./decisions/v0/v0.4/history.md)：v0.4 早期路线讨论与已完成方向快照。
- [`decisions/_template.md`](./decisions/_template.md)：kernel ADR 模板。
- [`architecture/core-drawing-complete.md`](./architecture/core-drawing-complete.md)：core 绘图完备检测设计。
- [`analysis/core-compare-analysis.md`](./analysis/core-compare-analysis.md)：core 底座横向对比。

## 规则

- roadmap 可持续更新；ADR Accepted 后只增补状态 / supersede，不改历史判断。
- ADR 长期一致性与发版审计规则以 `.agents/skills/package-publish/SKILL.md` 为准。
- 本目录不进入 npm 包；发布包由各自 `package.json` 的 `files` 白名单控制。

# kernel 内部文档

这里放 kernel 发布组的内部协作文档。kernel 发布组包含 `@retikz/math`、`@retikz/core`、`@retikz/render`、`@retikz/react`、`@retikz/vanilla`、`@retikz/tex`，版本按发布组 lockstep。

## 目录

- [`decisions/`](./decisions)：版本路线、milestone roadmap、ADR。
- [`analysis/`](./analysis)：kernel / core 相关一次性分析。

跨包长期架构原则仍放在根 [`notes/architecture`](../../../notes/architecture)。

## 当前入口

- [`decisions/v0/roadmap.md`](./decisions/v0/roadmap.md)：kernel v0 总路线。
- [`decisions/v0/v0.4/roadmap.md`](./decisions/v0/v0.4/roadmap.md)：当前 kernel v0.4 路线。
- [`decisions/_template.md`](./decisions/_template.md)：kernel ADR 模板。
- [`analysis/core-compare-analysis.md`](./analysis/core-compare-analysis.md)：core 底座横向对比。

## 规则

- roadmap 可持续更新；ADR Accepted 后只增补状态 / supersede，不改历史判断。
- 发版后的 ADR 压缩规则以 `.agents/skills/package-publish/SKILL.md` 为准。
- 本目录不进入 npm 包；发布包由各自 `package.json` 的 `files` 白名单控制。

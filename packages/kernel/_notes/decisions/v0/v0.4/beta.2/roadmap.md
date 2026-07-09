# v0.4-beta.2 roadmap

> beta.2 聚焦 beta 阶段的公开 API 收敛与实现契约澄清。该阶段允许在 0.x 内做破坏性整理，但每项必须先落 ADR，再进入实现。

| ADR                                      | 范围    | 目标                                                                                         | 状态     |
| ---------------------------------------- | ------- | -------------------------------------------------------------------------------------------- | -------- |
| [ADR-01](./01-vanilla-plain-spec-api.md) | vanilla | 将 vanilla 作者 API 收敛为 plain spec，为 Tier2 嵌入、diff、bailout 与分层渲染预留稳定边界。 | Proposed |

## 不在 beta.2 默认范围

- 不改 core IR / Scene schema。
- 不实现真实增量渲染引擎、SVG DOM diff、Canvas bitmap layer 或 scheduler。
- 不新增 plot 专属 API；plot / plot-vanilla 消费 vanilla Tier2 边界时另走 viz ADR。

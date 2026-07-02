---
name: develop-implement
description: Use when implementing a retikz alpha ADR or beta TODO after design or roadmap scope is fixed, including schema, public API, compile, adapter, test, and docs-visible behavior changes.
---

# Stage 2: 实现

把 ADR 实现契约或 beta TODO 落到代码和测试。alpha 红色改动走 Spec-First；黄色按规模决定；绿色直接实现。

## 必读

- 根 `AGENTS.md` 与就近 `AGENTS.md`。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取对应 `standard-*` skill。
- beta TODO 由 `flow-beta` 调用本 skill 时，以 `flow-beta` 的简化规则覆盖本阶段的 Spec-First 要求。

## 输入

- alpha：状态为 `Proposed`、实现契约完整的 ADR。
- beta：已登记的 roadmap TODO，scope 与预估 level 已明确。
- 当前受影响文件、已有测试、相关 docs 页面。

## 判级

按 `flow-alpha` 的 red / yellow / green 表判断；跨级取最高级。

- **red**：IR schema、public API、compile 核心、包公共入口等，强制 Spec-First。
- **yellow**：adapter / parser / renderer 接线等，按风险和 step 数决定是否 Spec-First。
- **green**：纯文档、注释、配置或测试整理，直接实现。

## Spec-First 路径

### Spec Writer

先写 schema stub 与测试，不写实现。输入只给 ADR、相关 schema、少量无关测试样例和必要 AGENTS / standard skill 规则。

产物要求：

- schema 字段名、类型、默认值、describe 与 ADR 表一致；发现 ADR 自相矛盾则 halt。
- 测试覆盖 ADR 测试象限，并至少包含 JSON round-trip 与 zod parse 错误路径。
- 不读或改 compile / adapter 实现。
- 测试此时可以失败；这是实现未完成的预期。

主 AI 审查 spec 产物后，再进入实现。未经用户授权不 commit；若授权，spec commit 可作为预期失败的测试提交。

### Implementer

实现任务只负责让 spec 测试通过。

- 不改 spec 测试、schema 字段名、字段类型或 describe；认为 spec 错时 halt 报告。
- 不用 `as any`、`@ts-ignore`、跳测、粗暴 lint disable 绕过问题。
- 每个 ADR step 或 beta TODO 子任务保持可 review 的提交粒度。
- 受影响包按根 AGENTS 运行 `eslint --fix`、`tsc --noEmit`、必要 vitest。
- 连续 3 轮修不动同一 step，halt 并报告失败 case、错误日志和判断。

## 常规路径

黄色轻量改动或绿色改动可由主 AI 直接实现，但仍遵守：

- 行为变化需要测试；bug fix 先写能复现的失败测试。
- 用户可见改动同步 docs。
- React / Vanilla 或 plot-react / plot-vanilla authoring 面对等检查；只做一套时说明原因。

## 完成标志

- ADR / TODO scope 内代码已实现。
- 相关测试、lint、类型检查通过，或阻塞原因已明确报告。
- 用户可见改动已有 docs 同步计划或已进入 `develop-document`。
- 非明确功能类代码完工并提交或准备提交后，询问用户是否需要子 agent review。
- 未经当前对话授权不 commit / push / publish。

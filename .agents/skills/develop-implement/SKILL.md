---
name: develop-implement
description: Use when implementing a retikz alpha ADR or beta TODO after design or roadmap scope is fixed, including schema, public API, compile, adapter, test, and docs-visible behavior changes.
---

# Stage 2: 实现

把 reviewed implementation plan 或 Beta TODO 落到代码和测试。Alpha ADR 负责长期功能契约，镜像 plan 负责文件、逻辑、测试和执行细节；红色改动走 Spec-First，黄色按规模决定，绿色直接实现。

## 必读

- 根 `AGENTS.md` 与就近 `AGENTS.md`。
- Alpha 必须阅读全文 ADR、镜像 `PLAN.md`、`TEST_CONTRACT.md` 与适用 `TASK_STATE.md` / `REVIEW.md`。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取对应 `standard-*` skill。
- beta TODO 由 `flow-beta` 调用本 skill 时，以 `flow-beta` 的简化规则覆盖本阶段的 Spec-First 要求。

## 输入

- alpha：状态为 `Proposed` 的长期 ADR，Architecture Gate 与 Plan Gate 已 PASS，人工已确认 ADR 并授权实现；镜像 `PLAN.md` / `TEST_CONTRACT.md` 完整且可未提交。
- beta：已登记的 roadmap TODO，scope 与预估 level 已明确。
- 当前受影响文件、已有测试、相关 docs 页面。

## 判级

Alpha 按 reviewed `PLAN.md` 的文件 scope 使用 `flow-alpha` red / yellow / green 表；跨级取最高级。

- **red**：IR schema、public API、compile 核心、包公共入口等，强制 Spec-First。
- **yellow**：adapter / parser / renderer 接线等，按风险和 step 数决定是否 Spec-First。
- **green**：纯文档、注释、配置或测试整理，直接实现。

## Spec-First 路径

### Spec Writer

先写 schema stub 与测试，不写实现。输入给长期 ADR、reviewed `PLAN.md`、`TEST_CONTRACT.md`、相关 schema、少量必要测试样例和适用 AGENTS / standard skill 规则。

产物要求：

- 公开字段、类型、默认值与 ADR 的基础契约一致；文件位置、Zod 拼装和 describe 等实施细节与 plan 一致。发现 ADR、plan 或当前权威契约冲突时 halt。
- 测试覆盖测试契约矩阵，并至少包含适用的 JSON round-trip、zod parse 错误路径、adapter parity、跨层组合或 docs 用户路径。
- 不读或改 compile / adapter 实现。
- 测试此时可以失败；这是实现未完成的预期。

主 AI 审查 spec 产物后，再进入实现。未经用户授权不 commit；若授权，spec commit 可作为预期失败的测试提交。

### Implementer

实现任务只负责让 spec 测试通过。

- 不擅改 spec 测试、基础契约、plan 已冻结的 schema 映射或 describe；认为 spec 错时 halt 报告。
- 为矩阵每行映射具名测试或可复用的既有测试；认为行为、不变量或反例需要变化时 halt，请人工更新设计。
- 不用 `as any`、`@ts-ignore`、跳测、粗暴 lint disable 绕过问题。
- 每个 plan task 或 Beta TODO 子任务保持可 review 的提交粒度。
- 不因 ADR / plan 未提交而扩大 scope。文件、私有逻辑、测试点或命令变化先更新 plan；公开契约、能力归属或功能边界变化必须 halt，回到 ADR 与 Architecture Gate。
- 受影响包按根 AGENTS 运行 `eslint --fix`、`tsc --noEmit`、必要 vitest。
- 连续 3 轮修不动同一 step，halt 并报告失败 case、错误日志和判断。

## 常规路径

黄色轻量改动或绿色改动可由主 AI 直接实现，但仍遵守：

- 行为变化需要测试；bug fix 先写能复现的失败测试。
- 为行为变化补齐镜像 plan 内的测试契约矩阵，不能用覆盖率或私有实现断言代替。
- 用户可见改动同步 docs。
- React / Vanilla 或 plot-react / plot-vanilla authoring 面对等检查；只做一套时说明原因。

## 完成标志

- ADR 功能边界和 reviewed plan / TODO scope 内代码已实现。
- Alpha 的 plan、测试契约与任务状态已按真实执行更新，未把施工细节回写 ADR。
- 相关测试、lint、类型检查通过，或阻塞原因已明确报告。
- 用户可见改动已有 docs 同步计划或已进入 `develop-document`。
- Review、subagent 和循环次数按任务开始时确认的执行计划完成；实现结束后不临时追加询问。小型任务默认由主 agent 自审。
- 未经当前对话授权不 commit / push / publish。

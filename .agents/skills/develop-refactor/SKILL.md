---
name: develop-refactor
description: Use when retikz work is primarily refactoring, reorganization, renaming cleanup, modularization, or internal simplification and should start from a reviewed implementation plan before code changes.
---

# 重构流程

面向不新增公开能力的重构：搬迁、拆分、合并、重命名、依赖收敛、内部抽象调整、测试或类型结构整理。若需要新增 DSL / API / IR / schema / renderer 可见行为，停止并转 `flow-alpha` / `develop-design`；若来自 beta roadmap TODO，按 `flow-beta` 对齐 scope。

## 启动确认

长任务执行前先按根规则判定风险。非 ADR、scope 明确且仅涉及文档、文案、链接、格式或机械性调整，并且不改变公开契约、schema、runtime 行为或跨包边界时，可跳过 subagent review 并记录理由。需要或适合评审时再问用户：

1. plan 写完是否派子 agent / 外部模型评审。
2. 代码写完是否派子 agent / 外部模型评审。

用户未确认前不派 subagent / 外部模型。用户同意 review 后按 `cross-review` 使用同一固定快照、2–3 个不同可用模型并发评审；用户拒绝时由主 AI 自审并说明退化路径。只有一个模型可用时不称为交叉评审；仅可选 plan / 完工 review 可由人工决定是否接受单模型退化，`flow-long-task` 的批量自动 commit gate 不允许退化。

## Plan First

- 先写 plan，通常使用 `superpowers:writing-plans`。
- plan 放 `.gitignore` 已覆盖的临时目录：`notes/plans/` 或就近 `**/_notes/plans/`，默认不 stage / commit。
- plan 至少写清：目标、非目标、文件 scope、分步策略、行为等价性、验证命令、回滚点、预期提交粒度。
- plan 写完后，按风险与用户选择执行 1–9 轮 `cross-review` 或主 AI 自审，再润色 plan；同轮模型并发且互不可见结论，无问题时立即 PASS，只有修订后才用 fresh agents 复审。未经 review / 自审润色不进入实现。

## Review 重点

评审只看 plan 或代码 diff，不替主 AI 做最终决策。重点检查：

- 是否混入新功能、公开行为变化或 schema/API 变化。
- 文件 scope、分层边界和依赖方向是否合理。
- 是否有隐藏回归、测试弱化、public surface 漏迁移。
- 验证命令是否覆盖受影响模块。
- 大重构的提交切分是否便于 review。

## 执行规则

- 小重构：review / 自审后直接执行，跑受影响验证，完工后不 commit，留给用户 review。
- 大重构：实现前需要用户批准 scope；允许按步骤提交代码，但每步 commit 前仍需用户确认。
- 若大重构属于用户批准的批量执行，且授权 LLM 自行 commit，每次 commit 前按 `flow-long-task` 与 `cross-review` 并发评审固定 staged diff，重点查文件结构、命名规范、barrel 是否默认用 `export *` 而非 `export { ... }`、JSDoc 完备性和中文注释。用户明确认可的小任务单次 commit 不触发该要求；改动面大或核心功能不适用该豁免。
- 用户要求代码完工 review 时，固定完整 diff / commit range，并按 `cross-review` 并发使用 2–3 个不同可用模型；不得串行把一个模型的结论喂给同轮其它模型。
- 完工并提交或准备提交后按根规则重新判定 review 风险；低风险明确改动可跳过 subagent，改动面大、核心功能或高风险提交必须询问用户，其余可选评审按用户选择执行。
- 发现必须改公开契约、文档可见行为或 roadmap 外目标时，halt 并请用户裁决是否换流。

## 验证

按根 `AGENTS.md` 的受影响模块策略验证。常见组合：

```bash
pnpm --filter <pkg> exec eslint . --fix
pnpm --filter <pkg> exec tsc --noEmit
pnpm --filter <pkg> exec vitest run [test-file]
```

纯文档或 notes 改动至少跑 `git diff --check`。用户可见行为变化必须补 docs 或转对应 docs skill。

## 完成标志

- plan 已写入忽略目录，并按用户选择完成并发多模型 review 或主 AI 自审。
- 实现未超出 scope；若超出，已有用户裁决。
- 受影响验证通过或阻塞原因明确。
- 小重构未 commit；大重构只在用户逐步确认后 commit。

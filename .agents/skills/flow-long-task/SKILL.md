---
name: flow-long-task
description: Use when retikz work is a large, long-running, batch, multi-commit, or context-compaction-prone task that needs a durable execution reference, staged commit review, and final whole-change review.
---

# 长任务总入口

面向会跨多轮上下文、批量执行或产生多次 commit 的任务。它只负责编排、恢复和 review gate；具体实现仍分流到 `flow-alpha` / `flow-beta` / `flow-rc` / `develop-refactor` / `package-publish` 等 skill。

## 启动关卡

执行前先确认：

1. 任务 source of truth：Alpha 功能的长期契约用 ADR，执行用其 ignored 镜像 `PLAN.md` / `TEST_CONTRACT.md`；非功能重构用 `superpowers:writing-plans` 产出的 plan；Beta / RC / 发布用 roadmap、plan 或发布清单。
2. 是否允许批量执行、是否允许 LLM 分步 commit。
3. Architecture / Plan Gate 使用根规则的常驻只读授权；其它批量自动 commit 前 review、最终整体 review 仍按根规则确认授权。
4. 临时状态文件位置。Alpha 必须使用 ADR 的 `**/_notes/plans/` 镜像目录；其它任务使用 `.gitignore` 覆盖的 `notes/plans/` 或就近 `**/_notes/plans/`。

未确认 source of truth 前不改代码；Alpha 必须在 Architecture Gate、人工 ADR 确认、镜像 plan 与 Plan Gate 均通过且已有实现授权后执行。未授权 commit 前不 commit；常驻 Gate 之外未授权 subagent / 外部模型前不调度 review。

## 分流

- 功能迭代：读 `flow-alpha`，再按 ADR 阶段读取 `develop-design` / `develop-implement` / `develop-test` / `develop-document` / `develop-wrapup`。
- 非功能重构：读 `develop-refactor`，plan 作为执行参考。
- beta / rc：读 `flow-beta` / `flow-rc`。
- 发布：读 `package-publish`。
- 涉及分层、schema、contract、providers、pipeline、compile 时，按 `standard-structure` 读取对应 `standard-*`。

## 状态文件

为防上下文压缩失忆，长任务必须维护 ignored 状态文件。Alpha 使用镜像 plan：

```text
packages/<group>/_notes/decisions/<relative>/<NN>-<slug>.md
-> packages/<group>/_notes/plans/<relative>/<NN>-<slug>/TASK_STATE.md

# 非 ADR 长任务
notes/plans/<task>/TASK_STATE.md
```

状态文件至少包含：

- 目标、非目标、source docs、当前阶段。
- 文件 scope、分步计划、commit 切分。
- 已完成 commit、验证命令、review 结论。
- 人工裁决、阻塞点、风险和下一步。
- 恢复指令：下一轮先读哪些文件、从哪一步继续。

每次 commit 后、停止前、预计可能压缩前都更新。状态文件默认不 stage / commit；不要把文件索引、LLM 执行 checklist、review prompt 等临时材料塞进最终 ADR。

## 恢复流程

上下文恢复或接手长任务时，按顺序读取：

1. 根 `AGENTS.md` 与本 skill。
2. source docs：ADR / roadmap / 发布清单。
3. reviewed `PLAN.md`、`TEST_CONTRACT.md`、`TASK_STATE.md`、`REVIEW.md`；不适用的文件跳过。
4. `git status --short`、最近 commits、当前 staged diff。
5. 本阶段需要的具体 flow / develop / standard skill。

恢复后先复述当前阶段、下一步和风险；发现状态文件与 git 不一致时 halt，先对齐事实。

## Commit 前 Review

用户批准批量执行并授权 LLM 自行 commit 时，每个 commit 必须单独过 gate。用户在当前对话明确认可的小任务单次 commit 不走本 review gate；改动面大或核心功能不适用该豁免：

1. 只 stage 本 commit 文件，不用 `git add -A`。
2. 跑受影响验证；验证失败不进入 review。
3. 按 `cross-review` 冻结 staged diff，同轮并发派发 2–3 个实际可用的不同模型。
4. 主 AI 收齐同轮结果后归并；修复 BLOCKING 后冻结新 staged snapshot，用 fresh agents 复审。WARNING 需要人工裁决或记录理由。
5. commit 成功后更新 `TASK_STATE.md`。

Review 输入只给：长期 ADR / source doc、reviewed plan、相关 AGENTS / standard skill、staged diff、验证结果。所有模型得到相同输入，同轮互不可见结论；不要传主 AI 的预判。

Review 固定检查：

- 文件结构、依赖方向、分层位置是否符合就近 AGENTS 和 `standard-structure`。
- 命名是否符合项目规则；barrel 是否默认 `export *`，避免无必要的 `export { ... }` 聚合。
- 导出类型、接口、函数、组件、重要 helper、public props、复杂字段的 JSDoc 是否完备。
- 注释 / JSDoc 是否中文；Zod `.describe(...)` 是否英文契约描述。
- 是否偏离 ADR / plan、混入额外目标、弱化测试或漏同步 docs。

Review 输出只分：

- `BLOCKING`：必须修或人工裁决后才能 commit。
- `WARNING`：可由人工裁决或记录风险。
- `INFO`：可选建议。

每个 commit review 最多 3 轮。最新一轮至少两个不同模型完成、无 BLOCKING、WARNING 已裁决时 PASS；只有一个模型、快照漂移或第三轮未通过时 halt。

## 最终整体 Review

全部实现完成后，按用户授权和 `cross-review` 对固定完整 working-tree diff 或 commit range 并发派发 2–3 个不同模型。没有 commit 授权时使用 working-tree diff，不得为了整体 review 提前 commit；已有多个 commit 时使用固定 range。输入包含 ADR / source docs、reviewed plan、`TASK_STATE.md`、commit list（如有）、完整 diff 与验证结果。

整体 review 检查：

- source docs 与最终实现、测试、docs / changelog 是否一致。
- 多 commit 间是否命名漂移、结构不一致、重复抽象或 public surface 漏迁移。
- 是否有遗漏的 `standard-*` 约束、JSDoc、中文注释、barrel 规则。
- 验证范围是否足够；是否需要补测或扩大到跨包验证。

最终 BLOCKING 清空后，再进入 wrapup、roadmap / ADR 状态更新或交付汇报。

整体 review 同样按轮次归并；修订后使用新的完整 working-tree diff 或 commit range 与 fresh agents 进入下一轮，最多 3 轮。不得串行把一个模型的结论喂给同轮其它模型。

## 失败与暂停

- ADR / plan 自相矛盾、scope 膨胀、git 状态不明、连续 3 轮验证失败、第三轮 review 仍有 BLOCKING：halt，汇报事实和选项。
- 不 push / tag / publish；这些始终需要单独授权。
- 不提交临时 plan、状态文件、review 报告，除非用户明确要求转为正式文档。

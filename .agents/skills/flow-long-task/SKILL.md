---
name: flow-long-task
description: Use when retikz work is a large, long-running, batch, multi-commit, or context-compaction-prone task that needs a durable execution reference, staged commit review, and final whole-change review.
---

# 长任务总入口

面向会跨多轮上下文、批量执行或产生多次 commit 的任务。它只负责编排、恢复和 review gate；具体实现仍分流到 `flow-alpha` / `flow-beta` / `flow-rc` / `develop-refactor` / `package-publish` 等 skill。

## 启动关卡

执行前先确认：

1. 任务 source of truth：功能迭代用一篇或多篇 ADR 草案或 roadmap 项；非功能重构用 `superpowers:writing-plans` 产出的 plan；beta / rc / 发布用 roadmap、plan 或发布清单。
2. 是否允许批量执行、是否允许 LLM 分步 commit。
3. 是否授权 plan / ADR 草案 review、批量自动 commit 前 review、最终整体 review。
4. 临时状态文件位置，必须在 `.gitignore` 覆盖的 `notes/plans/` 或就近 `**/_notes/plans/`。

未确认 source of truth 前不改代码；ADR 草案人工 ack 后可执行但默认不提交；未授权 commit 前不 commit；未授权子 agent / 外部模型前不调度 review。

## 分流

- 功能迭代：读 `flow-alpha`，再按 ADR 阶段读取 `develop-design` / `develop-implement` / `develop-test` / `develop-document` / `develop-wrapup`。
- 非功能重构：读 `develop-refactor`，plan 作为执行参考。
- beta / rc：读 `flow-beta` / `flow-rc`。
- 发布：读 `package-publish`。
- 涉及分层、schema、contract、providers、pipeline、compile 时，按 `standard-structure` 读取对应 `standard-*`。

## 状态文件

为防上下文压缩失忆，长任务必须维护一个 ignored 状态文件，例如：

```text
notes/plans/<task>/TASK_STATE.md
<module>/_notes/plans/<task>/TASK_STATE.md
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
2. source docs：ADR / plan / roadmap / 发布清单。
3. `TASK_STATE.md`。
4. `git status --short`、最近 commits、当前 staged diff。
5. 本阶段需要的具体 flow / develop / standard skill。

恢复后先复述当前阶段、下一步和风险；发现状态文件与 git 不一致时 halt，先对齐事实。

## Commit 前 Review

用户批准批量执行并授权 LLM 自行 commit 时，每个 commit 必须单独过 gate。用户在当前对话明确认可的小任务单次 commit 不走本 review gate；改动面大或核心功能不适用该豁免：

1. 只 stage 本 commit 文件，不用 `git add -A`。
2. 跑受影响验证；验证失败不进入 review。
3. 派子 agent review staged diff。
4. 修复 BLOCKING 并按需复审；WARNING 需要人工裁决或记录理由。
5. commit 成功后更新 `TASK_STATE.md`。

子 agent review 输入只给：source doc 摘要、相关 AGENTS / standard skill 要点、staged diff、验证结果。不要传主 AI 的结论。

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

## 最终整体 Review

所有 commit 完成后，按用户授权派子 agent review commit range。输入包含 source docs、`TASK_STATE.md`、commit list、关键 diff、验证结果。

整体 review 检查：

- source docs 与最终实现、测试、docs / changelog 是否一致。
- 多 commit 间是否命名漂移、结构不一致、重复抽象或 public surface 漏迁移。
- 是否有遗漏的 `standard-*` 约束、JSDoc、中文注释、barrel 规则。
- 验证范围是否足够；是否需要补测或扩大到跨包验证。

最终 BLOCKING 清空后，再进入 wrapup、roadmap / ADR 状态更新或交付汇报。

## 失败与暂停

- source docs 自相矛盾、scope 膨胀、git 状态不明、连续 3 轮验证失败、review BLOCKING 反复不收敛：halt，汇报事实和选项。
- 不 push / tag / publish；这些始终需要单独授权。
- 不提交临时 plan、状态文件、review 报告，除非用户明确要求转为正式文档。

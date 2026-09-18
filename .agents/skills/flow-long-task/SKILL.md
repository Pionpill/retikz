---
name: flow-long-task
description: Use when an approved large Retikz task needs durable execution state and recovery across long-running phases or context compaction.
---

# 长任务状态与恢复

只用于已判为大型且执行计划获批的任务；多文件、多步骤或多个 commit 本身不构成触发理由。规模、授权与 Git 边界以根 AGENTS 为准，阶段流程读 flow-development；本入口只负责执行状态。

## 状态

Alpha 使用 ADR 对应的 ignored 镜像 plan 目录，其他大型任务使用 notes/plans/<task>/ 或就近 _notes/plans/。维护 TASK_STATE.md，记录：

- 目标/非目标、source docs、获批范围与操作权限。
- 当前阶段、任务依赖、文件所有权、已完成与下一步。
- 实际验证命令和结果、findings/人工裁决、未验证风险。
- 暂停原因、恢复入口；关联 PLAN/TEST_CONTRACT/REVIEW，不重复抄全文。

阶段结束、暂停前或预期上下文压缩前更新。状态与报告默认 ignored，不 stage/commit。

## 恢复

读取根/就近 AGENTS、获批 plan、状态与必要 source docs，再检查当前 git 状态。简述当前阶段、下一步和风险；状态与代码不一致时先对齐事实，不从旧记录推定授权或验证仍有效。

## 评审与停止

常规评审按 [单 reviewer 循环](../flow-development/references/review-cycle.md)。最终整体检查使用计划已声明的主 agent 自审或获准 cross-review，不临时追加代理。

同一步连续三轮验证失败、达到计划评审上限、scope/公开契约/授权变化或 git 状态无法归属时停止交人工。Contract Auditor 的更严格阈值按 develop-wrapup。获准多次 commit 时按功能闭环、风险和验证边界切分，不自动 push/tag/publish。

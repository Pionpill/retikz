---
name: flow-development
description: Use when Retikz work follows an Alpha ADR, Beta cleanup milestone, or RC API-freeze and release-readiness process.
---

# 阶段开发流程

先按根 AGENTS 判断任务规模与授权，不按文件数或版本名自动升级。普通局部 bugfix / 文档改动按对应任务执行，不为套流程补造 ADR。

| 阶段  | 范围                                               | 必读                         |
| ----- | -------------------------------------------------- | ---------------------------- |
| Alpha | 新公开能力、ADR 设计或执行                         | [Alpha](references/alpha.md) |
| Beta  | 已有能力的优化、重构、质量 TODO；可有获批 breaking | [Beta](references/beta.md)   |
| RC    | API 冻结后的兼容修复、文档和安装验收               | [RC](references/rc.md)       |

- 设计获准不等于实施获准；Accepted 只表示接受决策，不表示实现或发布完成。
- 新能力不混入 Beta，破坏性调整不混入 RC；需要改变阶段或范围时先交人工。
- 完整计划授权后连续执行，未授权 subagent / commit / push / tag / publish 不随流程自动获得。
- 大型任务另外使用 [长任务状态](../flow-long-task/SKILL.md)；常规评审按 [单 reviewer 规则](references/review-cycle.md)，多模型评审仍独立授权。
- 批量 worktree 仅在明确要求并确认布局后读 [批量规则](references/batch-worktrees.md)。
- 实际发包使用 [package-publish](../package-publish/SKILL.md)，本入口不维护第二套发布命令或 tag 规则。

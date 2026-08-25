---
name: develop-refactor
description: Use when retikz work is primarily refactoring, reorganization, renaming cleanup, modularization, or internal simplification and needs a size-appropriate execution strategy.
---

# 重构流程

面向不新增公开能力的重构：搬迁、拆分、合并、重命名、依赖收敛、内部抽象调整、测试或类型结构整理。若需要新增 DSL / API / IR / schema / renderer 可见行为，停止并转 `flow-alpha` / `develop-design`；若来自 beta roadmap TODO，按 `flow-beta` 对齐 scope。

## 启动确认

先按根规则判级：变量 / 私有命名和机械搬迁通常为小型，优化型重构通常为中型，改变功能结构、跨包架构或公开能力的功能型重构为大型。小型直接执行；中大型在动代码前一次确认计划、review、subagent 与 Git 权限，执行中不分别询问 plan review 和完工 review。

中型默认由主 agent 实现和自审；计划已授权时使用一个只读 reviewer 循环。大型功能型重构读取 `flow-long-task`，只有最终整体 review 已在计划中授权或用户明确要求时使用 `cross-review`。

## Plan First

- 中大型先写 plan，通常使用 `superpowers:writing-plans`；小型不强制临时 plan。
- plan 放 `.gitignore` 已覆盖的临时目录：`notes/plans/` 或就近 `**/_notes/plans/`，默认不 stage / commit。
- plan 至少写清：目标、非目标、文件 scope、分步策略、行为等价性、验证命令、回滚点、预期提交粒度。
- plan 写完后由主 agent 自审；已授权常规 reviewer 时交一个只读 subagent，修订后复用同一 reviewer，直到通过或达到计划循环上限。常规 plan review 不使用 `cross-review`。

## Review 重点

评审只看 plan 或代码 diff，不替主 AI 做最终决策。重点检查：

- 是否混入新功能、公开行为变化或 schema/API 变化。
- 文件 scope、分层边界和依赖方向是否合理。
- 是否有隐藏回归、测试弱化、public surface 漏迁移。
- 验证命令是否覆盖受影响模块。
- 大重构的提交切分是否便于 review。
- 涉及命名或重命名时，按 [`standard-name`](../standard-name/SKILL.md) 做命名语义专项检查：函数采用动宾短语，导出函数使用完整领域语义，私有 helper 仅在上下文明确时简化；变量、参数和属性使用形容词或分类限定词 + 类别名，并检查名称能否直接推断用途。

## 执行规则

- 小型重构：主 agent 直接执行并跑受影响验证，不自动派 agent。
- 中型优化重构：按已确认计划连续执行；计划有 reviewer 时使用单 reviewer 循环。
- 大型功能型重构：按 `flow-long-task` 执行；计划已授权自动 commit 时按确认粒度提交，不在每个 commit 前重新询问。
- 常规 staged diff / 完工 review 不使用 `cross-review`；计划已授权时固定快照给一个 reviewer，主 agent 修改验证后复用该 reviewer。只有大型任务最终整体 review 或用户明确要求时才进入 `cross-review`。
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

- 中大型 plan 已写入忽略目录并完成主 agent 自审或计划内单 reviewer 循环；小型任务已记录直接执行依据。
- 实现未超出 scope；若超出，已有用户裁决。
- 受影响验证通过或阻塞原因明确。
- Git 操作未超出任务开始时确认的权限；未经授权不 commit。

---
name: flow-long-task
description: Use when an approved large retikz task is functionally or architecturally significant, ADR-backed, long-running, batch-executed, or context-compaction-prone and needs durable execution state.
---

# 长任务总入口

只编排已判定为大型的功能性或架构性任务。中小型任务、多文件但范围清楚的调整、普通多步骤工作或仅可能产生多个 commit，不因此启动本 skill。具体设计与实现仍分流到 `flow-alpha` / `flow-beta` / `flow-rc` / `develop-refactor` / `package-publish`。

## 启动关卡

执行前必须先按根 `AGENTS.md` 在对话中给出并取得用户对完整执行计划的确认。计划至少确认：

1. 规模依据、source of truth、目标 / 非目标、文件与包 scope、阶段和依赖。
2. 是否批量执行、是否使用状态文件、预期 commit 切分和验证命令。
3. 是否调度 subagent、角色 / 模型 / 数量 / 并发波次、常规单 reviewer 的时点与最大循环次数。
4. 是否在最终阶段执行 `cross-review`、预计轮数和最大轮数。
5. Git 身份以及 stage / commit 权限；push / tag / publish 仍分别授权。

未完成确认不读作“默认同意”，不改产品文件、不派 agent。确认后按计划连续执行；常规阶段不重复询问。scope、架构、公开契约或授权动作超出计划，或达到失败阈值时才停止交人工。

## 分流

- ADR / Alpha 功能：`flow-alpha`，再按阶段读取对应 `develop-*`
- 优化 / 重构：`develop-refactor`；只有功能型大型重构留在本 flow
- beta / rc：`flow-beta` / `flow-rc`
- 发布：`package-publish`
- 分层、schema、contract、providers、pipeline、compile：按 `standard-structure` 读取对应 `standard-*`

主模型为 Sol 且执行计划已授权多 agent 分工时，再读取 `codex-develop-flow`；该 skill 只映射模型角色，不新增 gate。

## 状态文件

大型任务维护 ignored 状态文件。Alpha 使用 ADR 镜像目录；其它任务使用 `.gitignore` 覆盖的 `notes/plans/` 或就近 `**/_notes/plans/`：

```text
packages/<group>/_notes/decisions/<relative>/<NN>-<slug>.md
-> packages/<group>/_notes/plans/<relative>/<NN>-<slug>/TASK_STATE.md

# 非 ADR 大型任务
notes/plans/<task>/TASK_STATE.md
```

至少记录目标 / 非目标、source docs、当前阶段、文件 scope、计划、依赖、已完成验证、review finding、人工裁决、风险和恢复指令。每个计划阶段完成后、停止前和预计压缩前更新；默认不 stage / commit。

## 恢复流程

恢复时依次读取根 `AGENTS.md` 与本 skill、source docs、确认过的 plan / 测试契约 / 状态 / review 记录、当前 git 状态与本阶段具体 skill。先复述当前阶段、下一步和风险；状态与 git 不一致时停止并对齐事实。

## 常规单 Reviewer 循环

plan、实现阶段、阶段性 diff 和 commit 前 review 默认不使用 `cross-review`。只有执行计划已授权时才调度一个只读 reviewer：

1. 固定当前 plan、diff 或 staged diff，附 source docs、适用规则和验证结果。
2. reviewer 输出 `BLOCKING / WARNING / INFO`，不修改仓库。
3. 主 agent 核实 finding，在已确认 scope 内修改并验证。
4. 有修订时复用同一 reviewer 检查新快照；无 BLOCKING 且 WARNING 已处置时结束循环。

循环次数不得超过执行计划声明的上限；达到上限、快照无法固定或 finding 要求扩大 scope 时停止交人工。未授权 reviewer 时由主 agent 自审。commit 是否执行仍取决于已确认的 Git 权限，不因 review 通过自动获得授权。

长任务在计划已获得 commit 授权后，允许执行者按功能闭环、风险和验证边界自行拆分多个本地 commit；不得把全部功能、测试、文档和收尾改动堆进一个 commit。每个 commit 仍须精确 stage 并审计范围，push、tag、publish 继续单独授权。

常规 reviewer 重点检查文件结构与依赖方向、命名 / barrel / JSDoc / 中文注释、计划偏差、测试弱化和 docs 遗漏。命名检查必须按 [`standard-name`](../standard-name/SKILL.md) 重点确认名称可推断用途：函数采用动宾短语，导出函数使用完整领域语义，私有 helper 仅在上下文明确时简化；变量、参数和属性采用形容词或分类限定词 + 类别名，布尔值使用谓词形式。每个 checkpoint 使用单 reviewer，不为“更多视角”临时追加 agent。

## 最终整体 Review

全部实现和验证完成后，由计划决定最终检查：

- 未授权 `cross-review`：主 agent 做整体一致性检查并交付
- 已授权大型任务最终 `cross-review`：冻结完整 working-tree diff 或 commit range，按 `cross-review` 使用计划内阵容和轮数
- 用户在任务过程中明确新增交叉验证要求：先确认快照、阵容和轮数，再执行

最终检查覆盖 source docs、实现、测试、docs / changelog、多阶段命名与 public surface 一致性。`cross-review` 不用于逐 commit 或普通阶段 gate。

## 失败与暂停

- ADR / plan 自相矛盾、scope 或授权超出确认、git 状态不明、连续 3 轮验证失败、单 reviewer 循环达到计划上限或最终 review 达到授权上限时停止并报告事实与选项。
- 不提交 ignored plan、状态或 review 报告；不自动 push / tag / publish。

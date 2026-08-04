---
name: flow-beta
description: Use when retikz beta-stage roadmap TODO work needs refactoring, renaming, test hardening, error-message, performance, or documentation cleanup after alpha feature work.
---

# beta 优化主流程

`flow-beta` 是 beta 期 plan TODO 编排器。beta 只做修改类工作：重构、命名、注释、测试加固、错误信息、性能、文档整理。它允许破坏性改名，但不接新功能。

## 边界

启动前确认：

1. 当前任务确属 beta 阶段或用户明确要求按 beta TODO 做。
2. 当前 milestone 已有 roadmap / plan 目标；Stage 0 可生成或刷新候选 TODO。
3. 进入 Stage 1 前，获批 TODO 已登记在对应 roadmap / plan，并已取得当前任务的实施授权。
4. 任务不是“净新增公开能力 / 公开组件 / IR 形态 / schema 字段 / 用户可见行为契约”。

发现需要新功能时立即 halt，登记到下个 alpha 窗口，改走 `flow-alpha`。

Beta 优化通常是中型任务；执行前按根规则一次确认 scope、步骤、验证和是否使用一个常规 reviewer。长重构或 scope 不清时先走 `develop-refactor` 写 plan；不在 plan 与代码完成后分别追加询问。

## 阶段

| #   | 阶段         | 执行                                | 通过条件                                                                |
| --- | ------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| 0   | 全局入口审计 | `develop-completeness` `code-audit` | 三能力域结论完成；候选 TODO scope 经人工确认                            |
| 1   | 实现         | `develop-implement` 简化路径        | 受影响模块 lint / tsc / 测试全过                                        |
| 2   | TODO 评估    | 主 agent 或计划内单 reviewer        | BLOCKING 清空，WARNING 经人工裁决                                       |
| 3   | TODO 收尾    | `develop-wrapup` 简化路径           | roadmap TODO 标完成；breaking / visible 按需 changelog；人工授权 commit |
| 4   | 全局出口复审 | `develop-completeness` `code-audit` | 最新三能力域结论均 PASS；或熔断后等待人工裁决                           |

beta 不开新功能 ADR，不走 alpha 的设计 / adversarial 自测 / 必选文档阶段。用户可见改动仍按 docs skills 补文档。Stage 0 / 4 是 milestone 级门禁，不替代每条 TODO 的 Stage 2。

## Stage 0 全局入口审计

任何 beta TODO 实施、建批量 worktree 或修改 roadmap 状态前，检查三个能力域：

| 能力域        | `develop-completeness` 参数                   | 范围                                          |
| ------------- | --------------------------------------------- | --------------------------------------------- |
| Drawing       | `code-audit` + `beta-entry` + `Drawing`       | math / core / render / react / vanilla / tex  |
| Data          | `code-audit` + `beta-entry` + `Data`          | data 及其消费边界                             |
| Visualization | `code-audit` + `beta-entry` + `Visualization` | plot / plot-react / plot-vanilla 及上下游接口 |

默认由主 agent 基于同一 HEAD 审计三个能力域。中型执行计划已授权常规 reviewer 时，只派一个只读 subagent 审计全部三个域，并在修订后复用同一 reviewer；不为能力域分别派 agent。报告保持 ignored，不修改产品文件、roadmap 或暂存区。主 agent 汇总：

- 能力矩阵与 `BLOCKING / WARNING / INFO / ESCALATE_ALPHA`。
- 跨域重复所有权、依赖方向和 public surface 问题。
- 去重、可执行的 beta TODO 候选及建议顺序。

候选 TODO scope 必须经人工确认后才能进入 Stage 1。`ESCALATE_ALPHA` 不得伪装成 beta cleanup；交人工决定退回 Alpha 或延期。存在修订时按执行计划复用同一 reviewer 检查新快照；达到计划循环上限仍不收敛则停止交人工。

若本次任务只负责 Stage 0 生成候选 TODO，交付候选后结束；确认 TODO 后的 Stage 1–4 作为新的中型执行计划一次授权。执行既有已确认 TODO 时不重复确认 scope。

## 判级

| Level    | 范围                                                                       | 收尾要求                           |
| -------- | -------------------------------------------------------------------------- | ---------------------------------- |
| internal | 内部搬迁、私有重命名、注释、类型层重构，不改 public surface                | commit message 说明即可            |
| visible  | 错误信息、默认行为、性能或 docs 变化，用户可观察但不改 public export       | 视影响写 changelog / docs          |
| breaking | 修改、重命名或移除既有 public API、schema 字段、组件、公开 type / 函数签名 | 必写 BREAKING changelog + 迁移路径 |

beta 允许调整既有契约的 breaking，不允许用 breaking 包装净新增能力、组件、IR、schema 字段或用户可见行为契约；后者转 Alpha。

## Stage 1 实现规则

- 不走 alpha red 的 Spec-First TDD，除非 TODO 本身是 bugfix 或风险足够高；visible / breaking、跨包契约或测试加固 TODO 必须先用 `test-contract` 补行为、不变量、反例与最低测试层。
- 既有测试可跟随 rename / 类型迁移修改，但不得弱化断言语义。
- bugfix 必加回归测试；性能优化应有基准或复杂度测试；纯内部搬迁可依赖既有测试。
- 只跑受影响模块验证，除非跨包契约、CI 复现、发布门禁或用户要求全量。

## Stage 2 TODO 评估

beta 的核心风险是重构回归和 breaking 漏迁移。Stage 2 始终由主 agent 评估；只有执行计划已授权时才使用一个常规 reviewer，不在此阶段临时询问或升级为 `cross-review`。至少准备以下材料：

- TODO 原文。
- 适用时的 `test-contract` 矩阵与每行证据。
- 完整 diff。
- public API surface diff，重点看 `packages/*/*/src/index.ts`。
- 关键文件改前 / 改后 snapshot（足够判断等价性即可）。

评估角色：

| 角色       | 何时必跑                               | 关注点                                                           |
| ---------- | -------------------------------------- | ---------------------------------------------------------------- |
| 等价性审计 | 所有 level                             | 未声明回归、public surface 漏迁移、schema / 默认值变化、测试弱化 |
| 收益审计   | breaking / visible 必跑，internal 可选 | 是否真的解决 TODO、是否过度工程、是否更贴合项目惯例              |

用户也可手动跑评估并把结论贴回。主 AI 合并为 BLOCKING / WARNING / INFO：

- BLOCKING：必须修或回退。
- WARNING：人工裁决。
- INFO：可选采纳。

执行计划已授权 reviewer 时，固定 TODO、完整 diff / commit range、public surface diff 与测试证据交给一个只读 subagent。主 agent 核实 finding、修改并验证后，复用同一 reviewer 检查新快照。无 BLOCKING、WARNING 已处置时 PASS；达到计划循环上限仍有 BLOCKING 时停止并交人工。

## Stage 3 TODO 收尾规则

- breaking：changelog zh/en 必写 BREAKING 段 + 迁移路径。
- visible：按用户影响决定是否写 changelog / docs。
- internal：通常只在 commit message 体现。
- 不改 ADR 状态；beta 无新 ADR。
- roadmap TODO 标完成并记录 commit hash。
- commit 必须等待当前对话人工授权；多 TODO 可按 review 友好的逻辑块分批 commit。
- 完工 review 按任务开始时确认的计划执行，不在提交前重新追加 subagent 询问。

## Stage 4 全局出口复审

所有获批 TODO 完成并集成到同一 beta milestone 分支后：

1. 记录当前 milestone HEAD，由主 agent 对同一快照复核 Drawing、Data、Visualization；执行计划已授权 reviewer 时，交同一个只读 subagent 做三域复核。
2. 任一能力域为 `ESCALATE_ALPHA` 时立即停止，交人工决定退回 Alpha 或延期。
3. 有 BLOCKING 时，仅在已批准 TODO scope 与实现授权内修复，重新执行 Stage 1 验证和 Stage 2 评估；计划有 reviewer 时复用同一 reviewer 检查新快照。
4. 三个能力域都为 `PASS` 且 WARNING 已处置时通过；达到计划循环上限、报告冲突或需要扩大 beta 边界时停止交人工。

Beta 不提供自动 subagent 权限。只有用户明确要求交叉验证时才使用 `cross-review`；普通 Beta 收尾不自动升级为多模型评审。

## 批量 worktree

批量逻辑复用 `flow-alpha` 的 worktree 规则，把 “ADR” 替换为 “plan TODO”。Stage 0 在建立 worktree 前对共同 base 执行；Stage 4 只在人工 review 并集成所有 worktree 后对 milestone 分支执行。单个 worktree 只跑 Stage 1-3，并仍需：

- 读全部 TODO，分析文件 scope / 依赖。
- 呈现平行 / 堆叠 / 混合布局，人工 ack 后建 worktree。
- 每个 worktree 写 `REVIEW.md` 并 halt。
- 不 push / merge / 切回 base / 删除 worktree / 删除 `REVIEW.md`。
- 若批量执行计划授权 LLM 自行 commit，逐 commit 复用计划内的常规单 reviewer 循环；不逐 commit 使用 `cross-review`。

## 失败与换流

- 净新增公开能力、公开组件、IR 形态、schema 字段或用户可见行为契约：halt，转下个 alpha。
- Stage 2 达到计划循环上限仍有任一 BLOCKING：停止并交人工决策。
- 评估意见冲突：halt，人工裁决并记录理由。
- 发现测试被弱化：halt，恢复断言或重新评估 TODO 范围。

## 完成标准

- Stage 0 三能力域入口结论已完成，候选 TODO scope 已获人工确认。
- 实现和必要测试已落。
- 受影响模块验证通过。
- 评估 / 自审合并，BLOCKING 清空，WARNING 已裁决。
- roadmap TODO 标完成。
- breaking 有 changelog + 迁移路径；visible 按需文档同步。
- Stage 4 最新 Drawing / Data / Visualization 结论均 PASS；或已熔断并停止等待人工，未伪装完成。
- 用户明确 ack 后才 commit / 进入下一条 TODO。

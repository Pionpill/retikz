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

长重构或 scope 不清时，先走 `develop-refactor` 写 plan；启动时询问用户 plan 写完是否评审、代码写完是否评审。

## 阶段

| #   | 阶段         | 执行                                | 通过条件                                                                |
| --- | ------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| 0   | 全局入口审计 | `develop-completeness` `code-audit` | 三能力域报告完成；候选 TODO scope 经人工确认                            |
| 1   | 实现         | `develop-implement` 简化路径        | 受影响模块 lint / tsc / 测试全过                                        |
| 2   | TODO 评估    | 本 skill 按用户选择调度             | BLOCKING 清空，WARNING 经人工裁决                                       |
| 3   | TODO 收尾    | `develop-wrapup` 简化路径           | roadmap TODO 标完成；breaking / visible 按需 changelog；人工授权 commit |
| 4   | 全局出口复审 | `develop-completeness` `code-audit` | 最新三能力域审计均 PASS；或熔断后等待人工裁决                           |

beta 不开新功能 ADR，不走 alpha 的设计 / adversarial 自测 / 必选文档阶段。用户可见改动仍按 docs skills 补文档。Stage 0 / 4 是 milestone 级门禁，不替代每条 TODO 的 Stage 2。

## Stage 0 全局入口审计

任何 beta TODO 实施、建批量 worktree 或修改 roadmap 状态前，自动并行派遣三个新的只读 subagent：

| 能力域        | `develop-completeness` 参数                   | 范围                                          |
| ------------- | --------------------------------------------- | --------------------------------------------- |
| Drawing       | `code-audit` + `beta-entry` + `Drawing`       | math / core / render / react / vanilla / tex  |
| Data          | `code-audit` + `beta-entry` + `Data`          | data 及其消费边界                             |
| Visualization | `code-audit` + `beta-entry` + `Visualization` | plot / plot-react / plot-vanilla 及上下游接口 |

三个审计使用同一 HEAD 基线，各自写 ignored report，不修改产品文件、roadmap 或暂存区。主 AI 汇总：

- 能力矩阵与 `BLOCKING / WARNING / INFO / ESCALATE_ALPHA`。
- 跨域重复所有权、依赖方向和 public surface 问题。
- 去重、可执行的 beta TODO 候选及建议顺序。

候选 TODO scope 必须经人工确认后才能进入 Stage 1。`ESCALATE_ALPHA` 不得伪装成 beta cleanup；交人工决定退回 Alpha 或延期。审计 subagent 不可用或报告互相矛盾时，最多重新派遣 3 轮，仍不收敛则 halt 交人工。

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

beta 的核心风险是重构回归和 breaking 漏迁移。Stage 0 / 4 的自动授权不覆盖本阶段；派 TODO review subagent / 外部模型前必须先得到用户确认。用户拒绝或工具不可用时由主 AI 自审并说明退化路径，但自审结论必须经人工明确接受后才能通过 Stage 2。至少准备以下评估材料：

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

Stage 2 最多 3 轮，不因 finding 改名、拆分或出现新 ID 重新计数；第 3 轮仍有任一 BLOCKING 时 halt，交给人工决定继续、缩 scope 或放弃。

## Stage 3 TODO 收尾规则

- breaking：changelog zh/en 必写 BREAKING 段 + 迁移路径。
- visible：按用户影响决定是否写 changelog / docs。
- internal：通常只在 commit message 体现。
- 不改 ADR 状态；beta 无新 ADR。
- roadmap TODO 标完成并记录 commit hash。
- commit 必须等待当前对话人工授权；多 TODO 可按 review 友好的逻辑块分批 commit。
- 非明确功能类代码完工并提交或准备提交后，询问用户是否需要子 agent review；改动面大、核心功能或高风险提交仍需询问；小任务且用户已明确认可本次单次 commit 时不再额外询问。

## Stage 4 全局出口复审

所有获批 TODO 完成并集成到同一 beta milestone 分支后，自动执行：

1. 记录当前 milestone HEAD，重新并行派遣三个新的只读 subagent，分别以 `code-audit` + `beta-exit` 审计 Drawing、Data、Visualization；三者必须使用该轮同一 HEAD，不能复用 Stage 0 或上一轮主体。审计期间 HEAD 变化则本轮作废并计入轮次。
2. 主 AI 汇总最新报告。任一能力域为 `ESCALATE_ALPHA` 时立即 halt，交人工决定退回 Alpha 或延期。
3. 有 BLOCKING 时，仅当修复属于人工已批准 TODO scope、已有当前任务实施授权，且不净新增公开能力、公开组件、IR 形态、schema 字段或用户可见行为契约，主 AI 才自动修复。修复后重新执行适用的 Stage 1 验证与 Stage 2 评估，再派三个新的 subagent 全量复审；超出原 scope 或授权时先 halt 请求人工扩 scope。
4. 只有最新一轮三个能力域都明确 `PASS`，且 WARNING 已记录处置或风险归属，Stage 4 才通过。任何修复都必须由下一轮新的三域审计验证，不能由主 AI 自审放行。
5. 最多 3 轮。第 3 轮未 PASS、其后仍需修复、subagent 不可用或报告冲突时 halt，交人工决策；禁止第 4 轮、降低 finding 等级或扩大 beta 边界。

自动授权只覆盖 Stage 0 / 4 的只读审计 subagent。主 AI 的 beta 范围修复仍不得自动 commit、push、改变发布授权或实施 `ESCALATE_ALPHA` 项。

## 批量 worktree

批量逻辑复用 `flow-alpha` 的 worktree 规则，把 “ADR” 替换为 “plan TODO”。Stage 0 在建立 worktree 前对共同 base 执行；Stage 4 只在人工 review 并集成所有 worktree 后对 milestone 分支执行。单个 worktree 只跑 Stage 1-3，并仍需：

- 读全部 TODO，分析文件 scope / 依赖。
- 呈现平行 / 堆叠 / 混合布局，人工 ack 后建 worktree。
- 每个 worktree 写 `REVIEW.md` 并 halt。
- 不 push / merge / 切回 base / 删除 worktree / 删除 `REVIEW.md`。
- 若批量执行中用户授权 LLM 自行 commit，每次 commit 前先派子 agent review 单个 commit，重点查文件结构、命名规范、barrel 是否默认用 `export *` 而非 `export { ... }`、JSDoc 完备性和中文注释。用户明确认可的小任务单次 commit 不触发该要求；改动面大或核心功能不适用该豁免。

## 失败与换流

- 净新增公开能力、公开组件、IR 形态、schema 字段或用户可见行为契约：halt，转下个 alpha。
- Stage 2 第 3 轮仍有任一 BLOCKING：halt。
- 评估意见冲突：halt，人工裁决并记录理由。
- 发现测试被弱化：halt，恢复断言或重新评估 TODO 范围。

## 完成标准

- Stage 0 三能力域入口报告已完成，候选 TODO scope 已获人工确认。
- 实现和必要测试已落。
- 受影响模块验证通过。
- 评估 / 自审合并，BLOCKING 清空，WARNING 已裁决。
- roadmap TODO 标完成。
- breaking 有 changelog + 迁移路径；visible 按需文档同步。
- Stage 4 最新一轮 Drawing / Data / Visualization 报告均 PASS；或已熔断并停止等待人工，未伪装完成。
- 用户明确 ack 后才 commit / 进入下一条 TODO。

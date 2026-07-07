---
name: flow-beta
description: Use when retikz beta-stage roadmap TODO work needs refactoring, renaming, test hardening, error-message, performance, or documentation cleanup after alpha feature work.
---

# beta 优化主流程

`flow-beta` 是 beta 期 plan TODO 编排器。beta 只做修改类工作：重构、命名、注释、测试加固、错误信息、性能、文档整理。它允许破坏性改名，但不接新功能。

## 边界

启动前确认：

1. 当前任务确属 beta 阶段或用户明确要求按 beta TODO 做。
2. TODO 已登记在对应 roadmap / plan。
3. 任务不是“新增公开能力 / 新 IR 形态 / 新 schema 字段 / 新组件”。

发现需要新功能时立即 halt，登记到下个 alpha 窗口，改走 `flow-alpha`。

长重构或 scope 不清时，先走 `develop-refactor` 写 plan；启动时询问用户 plan 写完是否评审、代码写完是否评审。

## 阶段

| #   | 阶段        | 执行                         | 通过条件                                                                |
| --- | ----------- | ---------------------------- | ----------------------------------------------------------------------- |
| 1   | 实现        | `develop-implement` 简化路径 | 受影响模块 lint / tsc / 测试全过                                        |
| 2   | 评估 / 自审 | 本 skill 按用户选择调度      | BLOCKING 清空，WARNING 经人工裁决                                       |
| 3   | 收尾        | `develop-wrapup` 简化路径    | roadmap TODO 标完成；breaking / visible 按需 changelog；人工授权 commit |

beta 不开新功能 ADR，不走 alpha 的设计 / adversarial 自测 / 必选文档阶段。用户可见改动仍按 docs skills 补文档。

## 判级

| Level    | 范围                                                                 | 收尾要求                           |
| -------- | -------------------------------------------------------------------- | ---------------------------------- |
| internal | 内部搬迁、私有重命名、注释、类型层重构，不改 public surface          | commit message 说明即可            |
| visible  | 错误信息、默认行为、性能或 docs 变化，用户可观察但不改 public export | 视影响写 changelog / docs          |
| breaking | public API、schema 字段、组件名、公开 type / 函数签名变化            | 必写 BREAKING changelog + 迁移路径 |

beta 允许 breaking；rc 起禁止。

## Stage 1 实现规则

- 不走 alpha red 的 Spec-First TDD，除非 TODO 本身是 bugfix 或风险足够高。
- 既有测试可跟随 rename / 类型迁移修改，但不得弱化断言语义。
- bugfix 必加回归测试；性能优化应有基准或复杂度测试；纯内部搬迁可依赖既有测试。
- 只跑受影响模块验证，除非跨包契约、CI 复现、发布门禁或用户要求全量。

## Stage 2 评估 / 自审

beta 的核心风险是重构回归和 breaking 漏迁移。派子 agent / 外部模型前必须先得到用户确认；用户拒绝或工具不可用时，由主 AI 自审并说明退化路径。至少准备以下评估材料：

- TODO 原文。
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

同一 BLOCKING 3 轮不收敛：halt，交给人工决定继续、缩 scope 或放弃。

## Stage 3 收尾规则

- breaking：changelog zh/en 必写 BREAKING 段 + 迁移路径。
- visible：按用户影响决定是否写 changelog / docs。
- internal：通常只在 commit message 体现。
- 不改 ADR 状态；beta 无新 ADR。
- roadmap TODO 标完成并记录 commit hash。
- commit 必须等待当前对话人工授权；多 TODO 可按 review 友好的逻辑块分批 commit。
- 非明确功能类代码完工并提交或准备提交后，询问用户是否需要子 agent review；改动面大、核心功能或高风险提交仍需询问；小任务且用户已明确认可本次单次 commit 时不再额外询问。

## 批量 worktree

批量逻辑复用 `flow-alpha` 的 worktree 规则，把 “ADR” 替换为 “plan TODO”，把 “5 阶段” 替换为 “3 阶段”。仍需：

- 读全部 TODO，分析文件 scope / 依赖。
- 呈现平行 / 堆叠 / 混合布局，人工 ack 后建 worktree。
- 每个 worktree 写 `REVIEW.md` 并 halt。
- 不 push / merge / 切回 base / 删除 worktree / 删除 `REVIEW.md`。
- 若批量执行中用户授权 LLM 自行 commit，每次 commit 前先派子 agent review 单个 commit，重点查文件结构、命名规范、barrel 是否默认用 `export *` 而非 `export { ... }`、JSDoc 完备性和中文注释。用户明确认可的小任务单次 commit 不触发该要求；改动面大或核心功能不适用该豁免。

## 失败与换流

- 新功能、新 IR 形态、新公开字段 / 组件 / 行为：halt，转下个 alpha。
- 评估 / 自审 BLOCKING 3 轮不收敛：halt。
- 评估意见冲突：halt，人工裁决并记录理由。
- 发现测试被弱化：halt，恢复断言或重新评估 TODO 范围。

## 完成标准

- 实现和必要测试已落。
- 受影响模块验证通过。
- 评估 / 自审合并，BLOCKING 清空，WARNING 已裁决。
- roadmap TODO 标完成。
- breaking 有 changelog + 迁移路径；visible 按需文档同步。
- 用户明确 ack 后才 commit / 进入下一条 TODO。

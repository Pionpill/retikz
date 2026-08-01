---
name: flow-alpha
description: Use when retikz alpha-stage work needs to execute an ADR-backed feature through long-lived design, reviewed implementation planning, code, adversarial testing, documentation, and wrapup.
---

# Alpha 功能开发主流程

`flow-alpha` 编排 Alpha 功能的 ADR、plan 与执行关卡。ADR 是长期功能和架构真源；ignored plan 是执行真源。任何 plan 都不能替实现者重新决定 ADR 的公开契约、所有权或功能边界。

## 适用边界

使用：

- 开始新的 Alpha ADR 或执行已有 Proposed ADR。
- roadmap 的 Alpha 功能需要设计、实现、测试、文档和收尾。
- 单条或多条 ADR 需要批量 worktree 执行。

不用：

- bugfix、纯文档孤改、发版、Beta / RC / stable。
- 发包走 `package-publish`；Beta / RC 走 `flow-beta` / `flow-rc`。

## 启动关卡

人工未明示前不进实现阶段、不建 worktree、不改产品文件。

| 模式          | 适用                                            |
| ------------- | ----------------------------------------------- |
| 单条          | 一次完成一条 ADR 的六阶段                       |
| 批量 worktree | 多条已确认 ADR，各自使用 reviewed plan 独立执行 |

含“批量 / 一次跑完 / 离线”或至少两个 ADR 编号时，先呈现候选 ADR、依赖与 base 分支，等人工确认。Architecture Gate 与 Plan Gate 是根 `AGENTS.md` 的常驻只读授权；不授权产品修改、commit、push 或其它 review。

## 六阶段

| #   | 阶段     | 执行                                                           | 通过条件                                                               |
| --- | -------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | ADR 设计 | `develop-design` + `develop-completeness` + `cross-review`     | ADR 为长期形态；Architecture Gate PASS；人工确认 ADR                   |
| 2   | 实施计划 | `superpowers:writing-plans` + `test-contract` + `cross-review` | 镜像 plan 完成；Plan Gate PASS；已获得实现授权                         |
| 3   | 实现     | `develop-implement`                                            | 按 plan 完成 Spec-First / 常规实现；lint / tsc / 必要测试通过          |
| 4   | 自测     | `develop-test`                                                 | Adversarial Bug Hunter 的 BLOCKING 清空                                |
| 5   | 文档     | `develop-document`                                             | 用户可见能力有 zh / en 文档、demo 与 API 表                            |
| 6   | 收尾     | `develop-wrapup`                                               | 长期 ADR 与最终行为一致；changelog、Accepted、roadmap、commit 授权完成 |

文档不是可选项。用户可见功能必须补 docs；完工汇报先给文档页和访问路由，再讲代码。

## Stage 1：ADR 与 Architecture Gate

ADR 内容和位置以 `develop-design` 为准。它只保留核心功能、基础数据结构 / 公开契约、行为与兼容性、功能边界、被否决方案、测试策略摘要和架构验证。

草案完成后按 `cross-review` 执行 1–3 轮 Architecture Gate：

1. 每轮冻结 ADR、HEAD、工作区、适用 architecture / completeness / AGENTS 与必要代码证据。
2. 并发派发 2–3 个实际可用的不同模型，每个按 `develop-completeness` 的 `adr-gate` rubric 只读审查。
3. 主 AI 收齐同轮结果后归并 `BLOCKING / WARNING / INFO`；同轮评审员互不可见结论。
4. 修订 ADR 后使用新快照和 fresh agents 开启下一轮。
5. 最新一轮至少两个不同模型完成、无 BLOCKING、WARNING 已处置时 PASS。
6. 最多 3 轮；第 3 轮未通过、只有一个模型、快照漂移或分歧无法裁决时 halt。

Gate 不得要求 ADR 增加文件 scope、私有逻辑、测试 case、命令或 commit 切分。Architecture Gate PASS 后仍须人工确认 ADR；确认 ADR 不等于授权实现。

## Stage 2：镜像 implementation plan

人工确认 ADR 并授权进入实现准备后，执行者必须重新阅读全文 ADR，再创建镜像目录：

```text
packages/<group>/_notes/decisions/<relative>/<NN>-<slug>.md
-> packages/<group>/_notes/plans/<relative>/<NN>-<slug>/
   PLAN.md
   TEST_CONTRACT.md
   TASK_STATE.md      # 长任务需要
   REVIEW.md
```

`**/_notes/plans/` 由 `.gitignore` 覆盖，默认不 stage、不 commit。

### `PLAN.md`

至少包含：

- ADR 路径、目标、非目标和当前代码基线。
- 精确文件 scope 与新增 / 修改 / 删除动作。
- 基础契约到 schema / contract / provider / pipeline / adapter / docs 的映射。
- 私有数据结构、业务逻辑、算法与 merge / resolution 顺序。
- 分步任务、依赖、Spec-First 路径和完成条件。
- docs / changelog、验证命令、commit 边界、风险与回滚。

详细代码片段只在能消除实现歧义时写入 plan；不得把可由当前代码直接读取的全文复制进 plan。

### `TEST_CONTRACT.md`

由 `test-contract` 维护行为、可观察结果、不变量、反例、最低测试层、上层证据、正式测试证据和验证命令。测试 case、路径与命令只在这里或 `PLAN.md`，不回写 ADR。

### `TASK_STATE.md` 与 `REVIEW.md`

长任务按 `flow-long-task` 维护 `TASK_STATE.md`。`REVIEW.md` 记录每轮快照、实际模型、失败 / 超时、合并 findings、人工裁决和最终 Plan Gate 状态。

## Plan Gate

修改产品代码前必须按 `cross-review` 对同一份 ADR + `PLAN.md` + `TEST_CONTRACT.md` + HEAD 执行 1–3 轮并发多模型评审：

1. 检查 plan 是否完整追溯 ADR，且没有重定义公开契约、能力归属或功能边界。
2. 检查文件 scope、代码 / 业务逻辑、任务依赖、测试、docs、命令、commit、风险和回滚是否可执行。
3. 每轮并发 2–3 个不同可用模型；主 AI 收齐后才修订 plan，同轮不串行喂结论。
4. 修订只涉及实现细节时更新 plan；涉及公开契约或架构边界时停止，回到 ADR 和 Architecture Gate。
5. 最新一轮至少两个不同模型完成、无 BLOCKING、WARNING 已处置时 PASS。
6. 最多 3 轮；未通过、只有一个模型、快照漂移或分歧无法裁决时 halt。

Plan Gate PASS 与实现授权两者都存在时，才能进入 Stage 3。它们都不授权 commit / push。

## 自动判级

以 reviewed `PLAN.md` 的文件 scope 为准，命中最高级即采用：

| Level  | 触发范围                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| red    | `packages/kernel/core/src/schemas/**`、`packages/kernel/core/src/compile/**`、`packages/*/*/src/index.ts`、public API / IR schema / compile 核心 |
| yellow | adapter、parser、renderer 接线与 contract / provider / pipeline 的中风险行为                                                                     |
| green  | `apps/docs/**`、纯测试、注释或配置                                                                                                               |

red 走 Spec-First；yellow 按风险决定；green 直接实现并按受影响模块验证。跨级取最高 level。

## 执行偏差

- 文件、私有命名、业务逻辑、测试点、命令或 commit 切分变化：更新 plan；超出已确认 scope 时先请人工确认。
- 公开契约、默认 / 失败语义、能力归属、包边界或非目标变化：halt，修订 ADR，重跑 Architecture Gate，再重建 Plan Gate 快照。
- 计划与代码事实冲突：先对齐当前代码证据，不用实现方便反向篡改 ADR。

## 其它独立视角

Architecture Gate 与 Plan Gate 之外的 subagent / 外部模型仍须先获用户确认。Spec Writer、Bug Hunter、Contract Auditor 各自按对应 develop skill 执行；需要多模型交叉评审时复用 `cross-review`，不得串行传递同轮结论。

## 批量 worktree

批量模式只在人工确认后启动：

1. 每条 ADR 先完成 Architecture Gate、人工确认、镜像 plan 和 Plan Gate。
2. 根据 reviewed plan 的文件 scope、显式依赖和产物依赖判断平行 / 堆叠 / 混合布局。
3. 人工确认布局与 base 后创建 worktree / 分支。
4. 把对应 ignored plan 目录复制到目标 worktree，校验内容 hash，再执行 Stage 3–5。
5. 每个 worktree 在 plan 目录更新 `TASK_STATE.md` / `REVIEW.md` 并 halt；不单独做 Stage 6。

无交叉、无依赖可并发；有依赖按链串行；混合模式主链串行、独立支线并发。

每个 worktree：

- 只动自身 scope，不 push / merge / 切回 base / 删除 worktree。
- 未获当前对话授权不 commit；获授权也只按 plan 粒度。
- 自动 commit 场景按 `flow-long-task` 用 `cross-review` 评审 staged diff。
- 所有分支经人工 review、合并后，统一执行 Stage 6。

## 失败阈值

- Architecture Gate 或 Plan Gate 最多 3 轮；第三轮未 PASS 必须 halt。
- 任一实施 step 连续 3 轮验证失败，halt 并记录失败输入、日志和判断。
- Contract Auditor 发现 ADR / plan / 测试 / docs / 行为不一致且一轮修不动，halt 交人工。
- 批量 worktree 失败时更新其 `TASK_STATE.md` / `REVIEW.md` 并停止，不伪装完工。

## 完成检查

- ADR 始终保持长期形态；Proposed → Accepted 只更新状态、最终摘要和真实遗留风险。
- Architecture Gate 与 Plan Gate 都在实现前 PASS，且每个有效轮次至少两个不同模型实际完成。
- 实现按 reviewed plan 执行；偏差进入正确真源，没有把施工细节回写 ADR。
- Spec-First 需要时能证明测试先于实现，且实现未擅改基础契约。
- Adversarial BLOCKING 清空，docs / changelog zh-en 对齐。
- roadmap 状态与实际完成一致；commit、push、发布均有独立授权。

---
name: flow-alpha
description: Use when retikz alpha-stage work needs to execute an ADR-backed feature or alpha roadmap feature through design, implementation, adversarial testing, documentation, and wrapup.
---

# alpha 功能开发主流程

`flow-alpha` 是 alpha 期 ADR 端到端编排器。它只负责模式选择、阶段关卡和批量 worktree 红线；具体阶段执行交给 `develop-*` skills。

## 适用边界

使用：

- 用户说“开 alpha.N+1”、“开始下个 ADR”、“上 X 功能”。
- v0 roadmap 的 alpha 项未完成，且需要走 ADR / 实现 / 文档 / 收尾。
- 已有 plan / 设计共识，要把单条或多条 ADR 跑完。

不用：

- bugfix、纯文档孤改、发版、beta / rc / stable 阶段。
- 发包走 `package-publish`；beta / rc 走 `flow-beta` / `flow-rc`。

## 启动关卡

每次启动先确认执行模式，人工未明示前不进 stage、不建 worktree、不动文件。

| 模式          | 适用                                                        |
| ------------- | ----------------------------------------------------------- |
| 单条          | 一次 1 条 ADR，在当前 worktree 跑完 5 阶段后停止            |
| 批量 worktree | 一次多条 ADR，每条独立 worktree + 分支；适合用户离线 review |

含“批量 / 一次跑完 / 离线 / 睡觉 / 健身”或 ≥2 个 ADR 编号时，先呈现候选 ADR、推荐布局和 base 分支，等人工确认。ADR Architecture Gate 自动执行，不询问是否 review；长任务启动时只按根规则确认代码完工后的其它 review 需求。

## 5 阶段

| #   | 阶段 | 子 skill            | 通过条件                                                                            |
| --- | ---- | ------------------- | ----------------------------------------------------------------------------------- |
| 1   | 设计 | `develop-design`    | ADR 草案含实现契约段，Architecture Gate PASS，人工 ack，不默认提交                  |
| 2   | 实现 | `develop-implement` | spec test / lint / tsc / 必要测试全过                                               |
| 3   | 自测 | `develop-test`      | Adversarial Bug Hunter 的 BLOCKING 清空                                             |
| 4   | 文档 | `develop-document`  | 用户可见能力有 zh/en 文档、demo、API 表                                             |
| 5   | 收尾 | `develop-wrapup`    | ADR 压缩为长期决策记录，changelog 草稿、ADR Accepted、roadmap 勾选、人工授权 commit |

文档不是可选项。用户可见功能必须补 docs；完工汇报先给文档页和访问路由，再讲代码。

## 自动判级

以 ADR 的“文件 scope”段为准，命中最高级即采用：

| Level  | 触发范围                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| red    | `packages/kernel/core/src/schemas/**`、`packages/kernel/core/src/compile/**`、`packages/*/*/src/index.ts`、public API / IR schema / compile 核心 |
| yellow | `packages/kernel/react/src/{kernel,sugar,render}/**`、`packages/kernel/core/src/parsers/**`、adapter 行为                                        |
| green  | `apps/docs/**`、`**/*.test.ts`、`**/*.md`、配置文件                                                                                              |

red 走 Spec-First TDD；yellow 按风险决定是否 Spec-First；green 直接实现并按受影响模块验证。跨级 ADR 取最高 level。

## 自动 Architecture Gate

每条 Alpha ADR 草案完成后、人工 review 与实现授权前，强制执行：

1. 以 `adr-gate` 模式调用 `develop-completeness`，自动派遣一个新的只读 subagent，轮次从 `1/3` 开始。
2. subagent 只返回 `BLOCKING / WARNING / INFO`；主 AI按 findings 修订 ADR，不让 subagent 修改文件。
3. ADR 因 BLOCKING 或 WARNING 发生修订后，必须派新的 subagent 复检；不能由同一 subagent 或主 AI自审代替下一轮。
4. 只有最新 subagent 明确返回 `PASS`，且该轮无 BLOCKING、WARNING 均已处置时，Gate 才 PASS。
5. 最多 3 轮。第 3 轮未 PASS、其后仍需修订、审计意见无法调和或 subagent 不可用时 halt，交人工决策。

该 Gate 具有根 AGENTS 规定的常驻自动授权，不因用户离线、赶进度、已有实现或 green level 跳过；它不授权实现、commit、push、外部写操作或扩大 ADR scope。

## 其它独立视角

Architecture Gate 之外的 subagent、外部模型或新线程仍须先得到用户确认；用户拒绝或工具不可用时，由主 AI自审并说明退化路径。可选独立视角包括：

- Spec Writer：设计 spec test。
- Bug Hunter：构造失败输入。
- Contract Auditor：对账 ADR / changelog / docs / 实际行为。

多份意见取并集、去重后形成 BLOCKING / WARNING / INFO。先文档再执行的阶段，文档草案完成后先按用户选择 review 并润色，再进入执行。

## 批量 worktree 模式

批量只在人工确认后启动。

流程：

1. 读每条 ADR 全文，至少读“实现契约段 / 文件 scope / 依赖的现有元素”。
2. 判断依赖：文件 scope 交叉、显式依赖、引用另一 ADR 产物都算有依赖。
3. 输出布局图：平行 / 堆叠 / 混合，并建议 base（kernel 通常 `next-kernel`，viz 通常 `next-viz`，跨域 `next`）。
4. 人工 ack 后创建 worktree 和分支。
5. 每个 worktree 只跑自己的 ADR，结束后写 `REVIEW.md` 并 halt。

并发规则：

- 无交叉、无依赖：平行 worktree，可并发。
- 有依赖：按链堆叠，串行。
- 混合：主链串行，独立支线并发。

每个 worktree 的硬红线：

- 只动本 worktree。
- 不 push、不 merge、不切回集成基线、不删 worktree、不删 `REVIEW.md`。
- 不跑 `develop-wrapup`；批量 wrapup 等所有分支人工 review 并合并后统一跑。
- 未获当前对话授权时，不 commit；获授权后也只按本 ADR 粒度 commit。
- ADR 草案仍不作为默认 commit；worktree 结束前若要提交，只提交压缩后的 ADR / roadmap / changelog 与代码同一改动集。
- 若批量执行中用户授权 LLM 自行 commit，每次 commit 前先派子 agent review 单个 commit，重点查文件结构、命名规范、barrel 是否默认用 `export *` 而非 `export { ... }`、JSDoc 完备性和中文注释。用户明确认可的小任务单次 commit 不触发该要求；改动面大或核心功能不适用该豁免。

`REVIEW.md` 放 worktree 根目录，不 stage / commit，至少包含：

- branch、base、commits。
- lint / tsc / vitest 结果。
- 关键改动、偏离 ADR、文件清单、风险、建议 review 顺序。

人工 review 后的 merge / rebase / worktree 删除必须再次获得人工 ack。

## 失败阈值

- 任一阶段连续 3 轮不收敛：halt，汇报当前状态和阻塞点。
- Architecture Gate 最多 3 轮；第 3 轮仍未 PASS 时必须交人工，不能开始第 4 轮或降低 finding 等级。
- Contract Auditor 发现 ADR / docs / 行为不一致且 1 轮修不动：halt，交给人工裁定。
- 批量模式任一 worktree 失败：该 worktree 写 `REVIEW.md` 标明失败并 halt，不伪装完工。

## 完成检查

单条完成前检查：

- 执行阶段曾有完整实现契约，最终 ADR 保留稳定契约摘要。
- 每条 ADR 在实现前均有 Architecture Gate PASS；3 轮未通过的 ADR 保持 Proposed 并停止实施。
- ADR 已删除临时文件索引、LLM 执行 checklist、review prompt 等只服务执行的材料；保留背景、关键决策、被否决选项、兼容性、最终摘要和验证结果。
- Spec-First 需要时能从历史看出测试先于实现。
- 实现未擅改 spec test 或 schema 字段名。
- Adversarial 两关 BLOCKING 清空或经人工裁决。
- docs / changelog zh-en 对齐。
- roadmap 勾选，ADR 状态 Proposed -> Accepted。

批量追加检查：

- 每个 worktree 都有未追踪 `REVIEW.md`。
- 每个 worktree 均未 push / merge / 切回 base / wrapup。
- 所有 worktree 人工 review 合并后，整 milestone 再跑一次 `develop-wrapup`。

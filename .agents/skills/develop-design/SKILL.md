---
name: develop-design
description: Use when planning a retikz architecture direction, version roadmap, or alpha feature that may need a long-lived ADR before implementation.
---

# 功能设计

先判断当前产物是 architecture design、版本 roadmap 还是 ADR。ADR 从 Proposed 起就是长期功能与架构文档；设计检查与实现细节始终写入 ignored plan，不经过“施工蓝图再压缩”的阶段。

## 产物边界

| 产物                | 负责                                                                | 不负责                                               |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Architecture design | 长期问题、整体结构、能力归属、功能边界、关键原则与演进方向          | 版本字段、具体实现和执行步骤                         |
| 版本 roadmap        | 版本目标、milestone、候选 ADR、依赖顺序与退出条件                   | API、算法、文件和测试 case                           |
| ADR                 | 单项功能、核心决策、基础数据结构 / 公开契约、行为、失败语义与兼容性 | 设计检查材料、文件 scope、测试策略和执行过程         |
| Mirror plan         | 设计检查结论；ADR 确认后再细化文件 scope、逻辑、测试、命令和风险    | 改写 ADR 的公开契约、默认 / 失败语义或 breaking 行为 |

当前任务只要求 architecture design 或 roadmap 时，完成对应文档并交人工 review 后停止，不提前进入 ADR 或 plan。进入 ADR 设计时，ADR 与镜像简略 `PLAN.md` 是同一阶段的配套产物。

## 必读

- 根 `AGENTS.md` 的设计原则、IR / Schema / 分层规则。
- 能力性迭代读取 `notes/architecture/capability-design.md` 和所属能力域 completeness 文档。
- 涉及 Core / Plot、Vanilla、框架 adapter、authoring Input、Source IR 规范化或 DOM 子入口时，读取 `notes/architecture/package-responsibility-design.md`。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取适用 `standard-*` skill。
- 对应分组的 `_notes/decisions/_template.md` 与当前 milestone `roadmap.md`。

## ADR 位置

新建 ADR 的 milestone 以主责 package 当前 `package.json` 的 `version` 为准：

- 按实际 major、minor 与 prerelease channel 定位；例如 `0.5.0-alpha.4` 只能进入 `v0/v0.5/alpha.4/`
- 不得根据最大目录编号、旧 roadmap、其它 checkout 或计划中的下一版本猜测位置；选定 milestone 后再计算 ADR 编号
- 跨 package ADR 先确认主责 package；主责不清、协作 package 版本不一致或 roadmap 与 package version 冲突时，停止创建并先完成对齐

```text
packages/kernel/_notes/decisions/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/<NN>-<slug>.md
packages/viz/_notes/decisions/<FAMILY>/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/<NN>-<slug>.md
```

其它分组沿用同形态。模板来自所属分组的 `_notes/decisions/_template.md`；编号在 milestone 目录内从 `01` 起。创建 ADR 时同步创建镜像目录和简略 plan：

```text
packages/viz/_notes/decisions/chart/v0/v0.1/alpha.1/01-example.md
-> packages/viz/_notes/plans/chart/v0/v0.1/alpha.1/01-example/PLAN.md
```

`**/_notes/plans/` 由 `.gitignore` 覆盖；简略 plan 默认不 stage、不 commit。

## ADR 内容契约

ADR 至少包含：

1. 背景、目标和必须解决的问题。
2. 核心决策及不可让步的理由。
3. 基础数据结构、公开 DSL / API 或稳定跨层契约；只写理解功能必需的最小形态。
4. 用户可观察行为、默认值、失败语义和兼容性。

理解核心决策所必需的跨包接口或依赖方向可以写入相关决策段，但 ADR 不另设功能与包边界、能力完备性检查、同类设计验证、被否决方案、测试策略摘要或不在本 ADR 范围章节。

ADR 不得写：

- 具体源文件、测试文件、文档文件白名单。
- 私有函数、helper、class、内部模块名或临时类型名。
- 逐步业务逻辑、算法施工顺序、object spread / merge 等实现过程。
- 测试标题、逐项 case、测试路径、验证命令或覆盖率 checklist。
- commit 切分、执行 checklist、review prompt、轮次状态和临时裁决。
- 功能与包边界、能力完备性检查、同类设计验证、被否决方案、测试策略摘要和不在本 ADR 范围等设计检查材料；它们进入同步创建的简略 plan。
- “实现后再删除 / 压缩”的临时段或只存在于 Git 历史的施工全文。

Schema 或数据结构只有在它是基础公开契约、跨包接口或非法状态边界时进入 ADR；文件位置、Zod 拼装方式、private intermediate 和逐字段操作进入 plan。

新增或修改 authoring API 时，ADR 必须说明 React 与 Vanilla 是否表达同一契约；某套不适用时写明理由。

## 简略 plan

ADR 草拟时同步创建镜像 `PLAN.md`，至少包含：

- ADR 路径、目标与非目标。
- 功能与包边界。
- 能力完备性检查及明确结论。
- 同类设计验证。
- 被否决方案。
- 测试策略摘要。
- ADR 人工确认后需要补齐的实施信息。

这些检查必须真实执行并保留结论，不能因 ADR 变短而省略。简略 plan 可以引用当前代码和外部资料，但不必提前冻结文件清单、任务顺序、验证命令或 commit；这些内容在 ADR 确认后细化。

## Alpha Architecture Gate

ADR 与简略 plan 完成后、人工 ack 前，使用 `develop-completeness` 的 `adr-gate` rubric 执行 Architecture Gate：

1. 冻结 ADR、简略 plan、当前 HEAD、工作区摘要、适用 architecture / completeness / AGENTS 与必要代码证据。
2. 主 agent 先自审；大型任务执行计划已授权常规 reviewer 时，派一个只读 subagent，并在修订后复用同一 reviewer 循环。
3. reviewer 只返回 `BLOCKING / WARNING / INFO`，以 ADR 检查核心契约，以简略 plan 检查问题归属、包边界、define-registry、端到端闭环、同类设计、否决方案、测试策略与非目标。
4. Gate finding 写回正确真源：公开契约、默认 / 失败语义和 breaking 行为修订 ADR；设计检查与实施准备修订 plan。
5. 主 agent 核实 finding 并修订对应产物；发生修订时冻结新快照，在计划循环上限内交同一 reviewer 复核。
6. 无 BLOCKING、WARNING 已修订或有可验证人工裁决时 PASS。
7. 达到计划循环上限、快照漂移或分歧无法裁决时停止并交人工。

该 Gate 不提供自动 subagent 授权，也不授权实现、commit、push、扩大功能 scope 或其它外部写操作。多模型 `cross-review` 只在大型任务最终整体 review 或用户明确要求时使用。

## Implementation plan 细化

人工确认 ADR 并授权进入实现准备后，执行者必须重新阅读全文 ADR 与简略 plan，再在同一镜像目录细化 `PLAN.md` 并创建其它执行产物：

```text
packages/viz/_notes/decisions/chart/v0/v0.1/alpha.1/01-example.md
-> packages/viz/_notes/plans/chart/v0/v0.1/alpha.1/01-example/
   PLAN.md
   TEST_CONTRACT.md
   TASK_STATE.md      # 长任务需要
   REVIEW.md          # 记录 Plan Gate 轮次摘要
```

细化后的 `PLAN.md` 在原有设计检查结论上补充：当前代码基线、文件 scope、基础契约到代码的映射、业务逻辑与任务顺序、docs / changelog、验证命令、commit 边界、风险与回滚。详细测试矩阵由 `test-contract` 写入同目录 `TEST_CONTRACT.md`。

Plan 可以细化实现，不能改变 ADR 的公开契约、所有权和功能边界；发现冲突时停止 plan，回到 ADR 修订和 Architecture Gate。

Plan 写完后必须完成 Plan Gate；默认由主 agent 自审，执行计划已授权时使用一个 reviewer 循环。通过前不得修改产品代码，具体编排由 `flow-alpha` 负责。

## 完成标志

- ADR 为长期形态且状态为 `Proposed`，不含施工细节或临时压缩段。
- ADR、roadmap 与镜像 plan 的 milestone 均与主责 package 当前版本一致，且没有指向错误版本目录的残留引用。
- 镜像简略 `PLAN.md` 已同步创建并承载完整设计检查结论。
- 能力性迭代已完成 Architecture Gate PASS；或达到计划循环上限后已停止等待人工。
- 人工明确确认 ADR；是否进入实现另行授权。
- 需要实现时，人工确认后再细化 plan 并创建 `TEST_CONTRACT.md`，且未用 plan 反向改写 ADR。
- 未经当前对话授权不 commit / push。

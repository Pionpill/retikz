---
name: develop-design
description: Use when planning a retikz architecture direction, version roadmap, or alpha feature that may need an ADR before implementation.
---

# 功能设计

retikz 功能设计入口。先判断当前需要 architecture design、版本 roadmap 还是具体 ADR；不同阶段只写当前层级需要冻结的内容。

## 责任边界

- **人工主导设计决策**：问题范围、方案取舍、schema 字段名、默认值、测试 case 由人工拍板。
- **AI 辅助整理与校验**：查现有概念、起草 ADR、补齐实现契约、指出缺口与风险。
- 不跳过本阶段直接实现；ADR 未获人工确认前不进入 `develop-implement`。
- ADR 草案默认不提交；提交前的长文件索引、测试计划、执行 checklist、review prompt 等 LLM 执行材料只服务当前任务，放 ignored plan / report 文件或 ADR 临时段，收尾时压缩。

## 设计产物粒度

| 当前产物            | 回答的问题                                                                 | 细节归宿                  |
| ------------------- | -------------------------------------------------------------------------- | ------------------------- |
| Architecture design | 长期解决什么问题、整体结构、能力归属、功能边界、关键原则与演进方向         | 具体契约留给后续 ADR      |
| 版本 roadmap        | 本版本目标、里程碑边界、候选 ADR 主题、依赖顺序与阶段退出条件              | API、算法与文件留给各 ADR |
| ADR                 | 单项能力的精确行为、公开契约、默认值、失败语义、兼容性、测试摘要与实施边界 | 执行步骤和命令留给 plan   |
| Implementation plan | 基于已确认 ADR 拆文件、任务、测试命令、commit 边界与执行顺序               | 实现阶段按 plan 执行      |

Architecture design 的正文由定位、整体关系、功能边界、关键取舍、不变量和演进方向组成。版本 roadmap 由版本目标、里程碑 / ADR 主题、依赖与验收边界组成。当前任务只要求前两者时，完成对应文档并交人工 review 后停止，不提前设计字段、类型、函数、文件结构、逐项测试或实现步骤。

以下 ADR 规则仅在已经进入具体功能设计时适用。

## 必读

- 根 `AGENTS.md` 的设计原则、IR / Schema / 分层规则。
- 能力性迭代读取 `notes/architecture/capability-design.md` 和所属能力域的 completeness 文档；纯 bugfix、文案或行为等价重构只需声明不改变能力边界。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取对应 `standard-*` skill。
- 对应分组的 `_notes/decisions/_template.md` 与当前 milestone `roadmap.md`。

## ADR 位置

按被改模块所属分组选择目录：

```text
packages/kernel/_notes/decisions/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/<NN>-<slug>.md
packages/viz/_notes/decisions/<FAMILY>/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/<NN>-<slug>.md
```

其它分组以后新增时沿用同形态。模板来自该分组的 `_notes/decisions/_template.md`。编号在 milestone 目录内从 `01` 起，起新 ADR 前查对应 `_notes/README.md` 或 roadmap。

## ADR 必填内容

叙述部分按模板写，至少覆盖：背景、决策、DSL / API 表面、测试设计、影响、能力完备性检查、不在范围。ADR 草案完成后、Architecture Gate 前必须用 `test-contract` 写 ignored 测试契约矩阵；ADR 保留稳定测试设计摘要，不保留临时测试文件索引。

能力完备性检查必须写清所属能力域与能力面、解决的问题、主责 / 协作包、内部表达与外部扩展链路、依赖域和下游闭环，以及本轮结论。不能用“先局部实现”代替组合、扩展当前域、下沉、上移、不支持或延期中的明确选择。

实现契约段必须完整：

| 项           | 要求                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Level        | `red` / `yellow` / `green`，判级见 `flow-alpha`                                                                              |
| Schema 改动  | 文件 / 操作 / 字段名 / 类型 / 默认值 / describe；无改动写“无”                                                                |
| 文件 scope   | 白名单列出允许触碰的文件或目录；偏离需要人工确认                                                                             |
| 测试契约矩阵 | 每项行为的可观察结果、不变量、反例、最低测试层与必要的 adapter / renderer / docs 证据；仍覆盖 happy / 边界 / 错误路径 / 交互 |
| 依赖现有元素 | 引用、扩展或修改的现有 IR / API / 工具，并说明用途                                                                           |

新增或修改 authoring API 时，ADR 必须同时考虑 React 与 Vanilla 两套入口；若某套不适用，在“不在范围”写明理由。

## Alpha Architecture Gate

ADR 草案完成后，先执行 `develop-completeness` 的 `adr-gate`，再交人工 review 或请求进入实现：

1. 自动派遣一个新的只读 subagent；这是 `flow-alpha` 的常驻授权，不询问用户，也不因用户离线、赶进度或已有实现而跳过。
2. subagent 读取 ADR、测试契约矩阵、适用 completeness / AGENTS、当前代码与必要 standard skills，检查能力完备性、包边界、define-registry、端到端闭环，以及每项新增或变更能力是否有行为、不变量、反例和最低测试层。
3. 主 AI按 findings 修订 ADR 或测试契约矩阵；只要任一项因 BLOCKING 或 WARNING 发生修订，就必须派新的 subagent 复检，不能由主 AI判断自己的修订已经通过。
4. Gate 只接受最新 subagent 明确返回 `PASS`；该轮必须无 BLOCKING，且每个 WARNING 已修复或 ADR 已记录可验证的接受理由。
5. 最多执行 3 轮。第 3 轮未 PASS、其后仍需修订，或 subagent 不可用时，立即停止并交人工决策，不退化为主 AI自审放行。

Gate 只校验并修订 ADR，不授权实现、commit、push 或扩大文件 scope。其它目的的子 agent / 外部模型评审仍按根 AGENTS 单独征求授权。

## 草案落盘规则

- ADR 草案状态保持 `Proposed`，允许未提交；人工 ack 是进入实现的冻结点。
- 实现前 ADR 必须足够指导执行，但可以包含临时执行材料；这些材料不作为最终 git 记录。
- 文件索引、分步执行计划、临时测试矩阵、LLM review prompt 优先写入 `.gitignore` 覆盖的 `notes/plans/`、`notes/reports/` 或就近 `_notes/plans/` / `_notes/reports/`。
- 只有用户明确要求跨分支 / 跨人提前 review、长期搁置或单独归档设计稿时，才在本阶段提交 ADR 草案。

## 完成标志

- ADR 文件已创建，状态为 `Proposed`。
- 能力性迭代已完成适用 completeness 检查；不适用时已写明理由。
- Alpha Architecture Gate 已 PASS；或 3 轮后已停止并等待人工决策。
- 实现契约段五项齐全。
- 人工明确确认“可以进入实现”。
- ADR 草案未提交，或用户明确要求时已按根 AGENTS 的 Git 规则单独提交。

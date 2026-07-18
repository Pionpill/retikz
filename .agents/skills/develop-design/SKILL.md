---
name: develop-design
description: Use when starting a retikz alpha feature that needs an ADR before implementation, especially changes to IR, public API, compile behavior, DSL surface, renderer-observable behavior, or docs-visible feature design.
---

# Stage 1: 设计

alpha 功能开发入口。目标是产出一份状态为 `Proposed` 的 ADR，并让下游 implement / test / document / wrapup 有足够明确的契约可执行。

## 责任边界

- **人工主导设计决策**：问题范围、方案取舍、schema 字段名、默认值、测试 case 由人工拍板。
- **AI 辅助整理与校验**：查现有概念、起草 ADR、补齐实现契约、指出缺口与风险。
- 不跳过本阶段直接实现；ADR 未获人工确认前不进入 `develop-implement`。
- ADR 草案默认不提交；提交前的长文件索引、测试计划、执行 checklist、review prompt 等 LLM 执行材料只服务当前任务，放 ignored plan / report 文件或 ADR 临时段，收尾时压缩。

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

叙述部分按模板写，至少覆盖：背景、决策、DSL / API 表面、测试设计、影响、能力完备性检查、不在范围。

能力完备性检查必须写清所属能力域与能力面、解决的问题、主责 / 协作包、内部表达与外部扩展链路、依赖域和下游闭环，以及本轮结论。不能用“先局部实现”代替组合、扩展当前域、下沉、上移、不支持或延期中的明确选择。

实现契约段必须完整：

| 项           | 要求                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Level        | `red` / `yellow` / `green`，判级见 `flow-alpha`                                                                  |
| Schema 改动  | 文件 / 操作 / 字段名 / 类型 / 默认值 / describe；无改动写“无”                                                    |
| 文件 scope   | 白名单列出允许触碰的文件或目录；偏离需要人工确认                                                                 |
| 测试象限     | happy / 边界 / 错误路径 / 交互；kernel 红黄改动通常不少于 9 case，plot 可按 milestone roadmap 的规则按复杂度裁剪 |
| 依赖现有元素 | 引用、扩展或修改的现有 IR / API / 工具，并说明用途                                                               |

新增或修改 authoring API 时，ADR 必须同时考虑 React 与 Vanilla 两套入口；若某套不适用，在“不在范围”写明理由。

## Alpha Architecture Gate

ADR 草案完成后，先执行 `develop-completeness` 的 `adr-gate`，再交人工 review 或请求进入实现：

1. 自动派遣一个新的只读 subagent；这是 `flow-alpha` 的常驻授权，不询问用户，也不因用户离线、赶进度或已有实现而跳过。
2. subagent 读取 ADR、适用 completeness / AGENTS、当前代码与必要 standard skills，检查能力完备性、包边界、define-registry 和端到端闭环。
3. 主 AI按 findings 修订 ADR；只要 ADR 因 BLOCKING 或 WARNING 发生修订，就必须派新的 subagent 复检，不能由主 AI判断自己的修订已经通过。
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

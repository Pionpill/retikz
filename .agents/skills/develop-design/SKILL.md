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
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取对应 `standard-*` skill。
- 对应分组的 `_notes/decisions/_template.md` 与当前 milestone `roadmap.md`。

## ADR 位置

按被改模块所属分组选择目录：

```text
packages/kernel/_notes/decisions/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/<NN>-<slug>.md
packages/viz/_notes/decisions/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/<NN>-<slug>.md
```

其它分组以后新增时沿用同形态。模板来自该分组的 `_notes/decisions/_template.md`。编号在 milestone 目录内从 `01` 起，起新 ADR 前查对应 `_notes/README.md` 或 roadmap。

## ADR 必填内容

叙述部分按模板写，至少覆盖：背景、决策、DSL / API 表面、测试设计、影响、不在范围。

实现契约段必须完整：

| 项           | 要求                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Level        | `red` / `yellow` / `green`，判级见 `flow-alpha`                                                                  |
| Schema 改动  | 文件 / 操作 / 字段名 / 类型 / 默认值 / describe；无改动写“无”                                                    |
| 文件 scope   | 白名单列出允许触碰的文件或目录；偏离需要人工确认                                                                 |
| 测试象限     | happy / 边界 / 错误路径 / 交互；kernel 红黄改动通常不少于 9 case，plot 可按 milestone roadmap 的规则按复杂度裁剪 |
| 依赖现有元素 | 引用、扩展或修改的现有 IR / API / 工具，并说明用途                                                               |

新增或修改 authoring API 时，ADR 必须同时考虑 React 与 Vanilla 两套入口；若某套不适用，在“不在范围”写明理由。

## 多视角设计评估

ADR 草案写完、进入实现前，先问用户是否派子 agent / 外部模型评审。用户确认后再调度；用户拒绝或工具不可用时，由主 AI 自审并说明退化路径。

涉及先写文档再执行的流程，都按同一规则处理：文档草案完成后先确认是否评审，采纳结论后再进入执行。

评审重点看：

- schema / API 是否 LLM 友好、JSON 可序列化、命名不含含糊缩写。
- 是否已有更小的复用路径，避免重复造能力。
- 测试象限是否漏掉用户或 LLM 容易误用的边界。

记录结论进 ADR：采纳项写入“决策”，拒绝或延期项写入“待决策点”或“不在范围”并注明理由。

## 草案落盘规则

- ADR 草案状态保持 `Proposed`，允许未提交；人工 ack 是进入实现的冻结点。
- 实现前 ADR 必须足够指导执行，但可以包含临时执行材料；这些材料不作为最终 git 记录。
- 文件索引、分步执行计划、临时测试矩阵、LLM review prompt 优先写入 `.gitignore` 覆盖的 `notes/plans/`、`notes/reports/` 或就近 `_notes/plans/` / `_notes/reports/`。
- 只有用户明确要求跨分支 / 跨人提前 review、长期搁置或单独归档设计稿时，才在本阶段提交 ADR 草案。

## 完成标志

- ADR 文件已创建，状态为 `Proposed`。
- 实现契约段五项齐全。
- 人工明确确认“可以进入实现”。
- ADR 草案未提交，或用户明确要求时已按根 AGENTS 的 Git 规则单独提交。

---
name: develop-wrapup
description: Use when retikz implementation, adversarial testing, and docs are complete, and an ADR or beta TODO needs changelog, contract consistency review, roadmap status updates, or final human acknowledgement.
---

# Stage 5: 收尾

把已实现、已测试、已文档化的改动封口：changelog、对账、人工确认、ADR / roadmap 状态更新。commit / push / publish 仍按根 AGENTS 的当次授权规则。

## 输入

- alpha：状态为 `Proposed` 的 ADR、实现 / 测试 / 文档 diff、Bug Hunter 结果。
- alpha 镜像 `PLAN.md`、`TEST_CONTRACT.md`、`TASK_STATE.md` / `REVIEW.md`。
- beta：已完成的 roadmap TODO、diff、多 LLM 评估结果。
- 文档页和 demo 路径。

## Changelog

用户可见改动起草 `apps/docs/src/modules/docs/data/changelog.ts` 条目，zh / en 同步。changelog 是数据驱动；不要维护旧的 changelog MDX 页面。

写法按 `package-publish` 中当前 changelog 数据结构；若该 skill 与 `types.ts` 不一致，以源码类型为准。

internal-only 改动通常不写 changelog；breaking 必写迁移说明。

## Contract Auditor

Alpha 红黄改动做第二关对账。默认由主 agent 执行；大型任务执行计划已授权常规 reviewer 时，使用一个只读 subagent，并在修订后复用同一 reviewer。Contract Auditor 本身不启动 `cross-review`；大型任务最终整体交叉评审由 `flow-long-task` 按已确认计划执行。目标不是找代码 bug，而是检查六方一致：

1. ADR 承诺。
2. reviewed `PLAN.md` 与执行偏差。
3. 测试契约矩阵及每行的具名证据。
4. changelog 草稿。
5. docs mdx + demo。
6. 实际代码 + 测试。

输入包含 ADR、plan、测试契约矩阵、changelog 草稿、commit / diff、相关 docs、schema / public API / tests diff。使用 reviewer 时记录实际模型、固定快照和计划循环上限，不追加第二个 reviewer。

结果处理：

| 结果     | 处理                                                                 |
| -------- | -------------------------------------------------------------------- |
| BLOCKING | 修 ADR / changelog / docs / 实现中真正不一致的一方；修完重跑 Auditor |
| WARNING  | 本轮修或登记 backlog，由人工裁决                                     |
| INFO     | 可并入 changelog 措辞                                                |

Contract 偏差通常涉及承诺取舍；1 轮后仍不一致时，halt 给人工，不让 AI 自行调和。

## ADR 长期一致性

ADR 从 Proposed 起就应是长期功能与架构记录。收尾不执行“施工蓝图压缩”，只做一致性对账：

- 对账 ADR 的核心决策、基础数据结构 / 公开契约、默认 / 失败语义与兼容性，以及 reviewed plan 的功能边界和架构检查是否与最终实现一致。
- 补充简短最终实现摘要、验证层级与真实遗留风险；不写具体文件、私有命名、业务步骤、测试 case、命令或 commit 历史。
- 若发现 Proposed ADR 已混入设计检查或施工细节，把仍服务当前执行的内容迁回镜像 plan 后再更新状态；不要把膨胀全文保存在 Proposed commit 或等待发布阶段清理。审计历史 Accepted ADR 时，若 ignored plan 已丢失，只清除或重述不属于长期契约的内容，不要求从 git 历史复原临时执行材料。
- 若最终行为改变了公开契约、能力归属或功能边界，不能用收尾摘要掩盖；回到 ADR 修订、Architecture Gate 和必要的 Plan Gate。
- plan、测试矩阵、状态与 review 记录始终 ignored，不因 ADR Accepted 而提交。

## 人工确认后落盘

收到人工确认后再改最终状态文件：

- alpha：确认 ADR 为长期形态并与最终行为一致，再将 `Proposed` -> `Accepted`，补完工摘要；对应 roadmap 勾选或标完成；changelog 写入最终稿。
- beta：roadmap TODO 标完成并记录 commit；breaking / visible 按需写 changelog；不改 ADR 状态。

这些文件可按逻辑分块提交。每块提交前展示文件清单和建议 message；没有当前对话授权不提交。

## 不发布

本 skill 不执行 npm publish、tag 或 push。需要发版时另走 `package-publish`。

## 完成标志

- changelog、ADR / roadmap 状态与实际行为一致。
- ADR 始终保持长期功能与架构记录，不含只服务执行的临时材料。
- 镜像 plan、测试矩阵、状态与 review 记录保持 ignored，未被误提交。
- Contract Auditor BLOCKING 清空或人工明确裁决。
- 人工 ack 已记录在对话中。
- 如获授权，相关提交已按根 AGENTS 粒度完成；否则工作区改动清楚可 review。

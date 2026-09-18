---
name: develop-wrapup
description: Use when retikz implementation, adversarial testing, and docs are complete, and an ADR or beta TODO needs changelog, contract consistency review, or final human acknowledgement.
---

# 收尾

把已实现、已测试、已文档化的改动封口：changelog、对账、人工确认与 plan 完成证据。commit / push / publish 仍按根 AGENTS 的当次授权规则。

## 输入

- alpha：状态为 `Accepted` 的 ADR、实现 / 测试 / 文档 diff、Bug Hunter 结果。
- alpha 镜像 `PLAN.md`、`TEST_CONTRACT.md`、`TASK_STATE.md` / `REVIEW.md`。
- beta：已完成的实施 plan TODO、diff、计划内评估结果。
- 文档页和 demo 路径。

## Changelog

用户可见改动起草 `apps/docs/src/modules/docs/data/changelog/` 中的对应 release 数据文件 条目，zh / en 同步。changelog 是数据驱动；不要维护旧的 changelog MDX 页面。

写法按 [发布准备](../package-publish/references/preparation.md) 与当前 changelog 数据结构；若该 skill 与 `types.ts` 不一致，以源码类型为准。

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

逐篇按 [长期一致性检查](references/adr-consistency.md) 核对；发布审计复用同一标准，不只检查状态。

## 人工确认后落盘

人工接受设计或执行批准时已经记录 Accepted；收尾不把决策状态当作实现或发布状态，只更新最终摘要、plan 进度与 changelog：

- alpha：逐段审计 ADR 与最终行为一致性，补完工摘要；实施任务在镜像 plan 记录完成证据；用户可见改动写入待发布 changelog，不提前指定 alpha 批次。
- beta：实施 plan 的 TODO 标完成，获准提交后记录真实 commit；breaking / visible 按需写 changelog，不改 ADR 状态。
- 仅当重点功能、目标或必要依赖发生获批变化时，按 `develop-design` 更新 roadmap；不追加完工记录、ADR 摘要或发布日志。

这些文件可按逻辑分块提交。每块提交前展示文件清单和建议 message；没有当前对话授权不提交。

## 不发布

本 skill 不执行 npm publish、tag 或 push。需要发版时另走 `package-publish`。

## 完成标志

- changelog、ADR 契约与 plan 完成证据和实际行为一致。
- ADR 始终保持长期功能与架构记录，不含只服务执行的临时材料。
- 镜像 plan、测试矩阵、状态与 review 记录保持 ignored，未被误提交。
- Contract Auditor BLOCKING 清空或人工明确裁决。
- 人工 ack 已记录在对话中。
- 如获授权，相关提交已按根 AGENTS 粒度完成；否则工作区改动清楚可 review。

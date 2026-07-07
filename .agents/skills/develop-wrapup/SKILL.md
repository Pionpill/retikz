---
name: develop-wrapup
description: Use when retikz implementation, adversarial testing, and docs are complete, and an ADR or beta TODO needs changelog, contract consistency review, roadmap status updates, or final human acknowledgement.
---

# Stage 5: 收尾

把已实现、已测试、已文档化的改动封口：changelog、对账、人工确认、ADR / roadmap 状态更新。commit / push / publish 仍按根 AGENTS 的当次授权规则。

## 输入

- alpha：状态为 `Proposed` 的 ADR、实现 / 测试 / 文档 diff、Bug Hunter 结果。
- beta：已完成的 roadmap TODO、diff、多 LLM 评估结果。
- 文档页和 demo 路径。

## Changelog

用户可见改动起草 `apps/docs/src/modules/docs/data/changelog.ts` 条目，zh / en 同步。changelog 是数据驱动；不要维护旧的 changelog MDX 页面。

写法按 `package-publish` 中当前 changelog 数据结构；若该 skill 与 `types.ts` 不一致，以源码类型为准。

internal-only 改动通常不写 changelog；breaking 必写迁移说明。

## Contract Auditor

alpha 红黄改动建议做第二关对账。目标不是找代码 bug，而是检查四方一致：

1. ADR 承诺。
2. changelog 草稿。
3. docs mdx + demo。
4. 实际代码 + 测试。

优先用独立线程、子代理或外部模型；不可用时主 AI 自己执行并说明退化。输入给 ADR、changelog 草稿、commit / diff、相关 docs、schema / public API / tests diff。

结果处理：

| 结果     | 处理                                                                 |
| -------- | -------------------------------------------------------------------- |
| BLOCKING | 修 ADR / changelog / docs / 实现中真正不一致的一方；修完重跑 Auditor |
| WARNING  | 本轮修或登记 backlog，由人工裁决                                     |
| INFO     | 可并入 changelog 措辞                                                |

Contract 偏差通常涉及承诺取舍；1 轮后仍不一致时，halt 给人工，不让 AI 自行调和。

## ADR 压缩

alpha 收尾必须先把 ADR 从执行草案压缩成长期决策记录，再更新状态：

- 保留：背景问题、关键决策、被否决选项与理由、公开契约 / 兼容性、最终实现摘要、验证结果、遗留风险。
- 删除或移出：临时文件索引、逐步执行 checklist、LLM review prompt、过细测试计划、已经由代码和测试历史承载的实现过程。
- 若压缩会丢失重要审计信息，移到 ignored `notes/reports/` 或 `_notes/reports/`，不要默认提交。
- 不把“压缩前全文”留给发版阶段处理；本阶段提交的是压缩后的 ADR。

## 人工确认后落盘

收到人工确认后再改最终状态文件：

- alpha：先压缩 ADR，再将 `Proposed` -> `Accepted`，补完工摘要；对应 roadmap 勾选或标完成；changelog 写入最终稿。
- beta：roadmap TODO 标完成并记录 commit；breaking / visible 按需写 changelog；不改 ADR 状态。

这些文件可按逻辑分块提交。每块提交前展示文件清单和建议 message；没有当前对话授权不提交。

## 不发布

本 skill 不执行 npm publish、tag 或 push。需要发版时另走 `package-publish`。

## 完成标志

- changelog、ADR / roadmap 状态与实际行为一致。
- ADR 已压缩成长期决策记录，不含只服务 LLM 执行的临时材料。
- Contract Auditor BLOCKING 清空或人工明确裁决。
- 人工 ack 已记录在对话中。
- 如获授权，相关提交已按根 AGENTS 粒度完成；否则工作区改动清楚可 review。

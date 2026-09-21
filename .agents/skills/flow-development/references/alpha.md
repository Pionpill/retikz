# Alpha ADR 流程

设计任务只覆盖 ADR 与同步简略 plan；交付后等待明确实施授权。人工接受设计或批准执行时置为 Accepted。执行 ADR 按大型任务计划推进，设计内容和产物位置由 develop-design 负责。

## 阶段与门槛

| 阶段     | 使用入口                                          | 出口                                                    |
| -------- | ------------------------------------------------- | ------------------------------------------------------- |
| 设计     | develop-design + develop-completeness 的 adr-gate | 长期 ADR、简略 PLAN；Architecture Gate PASS             |
| 实施准备 | develop-design 的计划细化 + test-contract         | reviewed PLAN、TEST_CONTRACT；Plan Gate PASS 且实施获准 |
| 实现     | develop-implement                                 | 按风险选择 Spec-First，受影响验证通过                   |
| 自测     | cross-test 的 Alpha 模式                          | red/yellow 的 adversarial BLOCKING 清空，green 可跳过   |
| 文档     | develop-document                                  | 公开行为 zh/en、demo、API 与实现一致                    |
| 收尾     | develop-wrapup                                    | 契约对账、changelog、plan 完成证据                      |

Architecture Gate 检查 ADR 的长期契约与 plan 的设计检查，rubric 由 develop-completeness 拥有；不要求 ADR 填入施工步骤。设计与实施准备的细节读 [ADR 与镜像计划](../../develop-design/references/adr.md)。

## Plan Gate

同一快照的 ADR、PLAN、TEST_CONTRACT 与 HEAD 必须在改产品代码前核对：

- plan 完整追溯 ADR，不重新决定公开契约、能力归属或功能边界。
- 文件 scope、逻辑与依赖顺序、测试、docs、验证、commit 边界、风险和回滚可执行。
- 仅实施细节变化时更新 plan；公开契约或架构边界变化时停止，回到 ADR 与 Architecture Gate。
- 按 [常规评审](review-cycle.md) 在计划轮次内完成；Gate PASS 不自动授权实现或 commit。

## 风险等级

风险由语义与受影响面决定，不因改 docs UI 就直接算低风险：

| 等级   | 范围                                                                | 实现方式           |
| ------ | ------------------------------------------------------------------- | ------------------ |
| red    | public API、IR schema、compile 核心、公共入口                       | Spec-First         |
| yellow | adapter/parser/renderer 接线、contract/provider/pipeline 中风险行为 | 按风险选择         |
| green  | 行为不变的正文、注释、配置或测试整理                                | 直接执行受影响验证 |

跨级取最高级；开发中发现范围升级，重新对齐计划。

## 偏差与结束

文件、私有逻辑、测试或命令变化更新 plan；超出授权范围先确认。公开契约、默认/失败语义与能力边界变化不得用实现便利反向改 ADR。

大型任务按 flow-long-task 保持状态；最终整体检查只执行计划已声明的主 agent 自审或 cross-review。同一步连续三轮验证失败，或 Contract Auditor 一轮修订仍无法对齐，停止并报告证据。

完工证据写 plan；roadmap 只概览重点功能。文档不是可选项，完工汇报包含页面与访问路由。批量 worktree 按 [批量规则](batch-worktrees.md)，不另造完成标准。

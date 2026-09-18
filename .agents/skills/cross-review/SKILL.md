---
name: cross-review
description: Use when an approved large Retikz task reaches final whole-change review, or the user explicitly requests independent LLM cross-validation of a fixed snapshot.
---

# 多模型交叉评审

只读检查固定材料，不自动授权修复、测试写入或 Git 操作。常规 plan/阶段/commit 检查使用主 agent 或已授权单 reviewer，不自动进入本流程。

## 启动条件

仅在大型任务计划已明确授权最终 cross-review，或用户明确要求本次交叉验证时执行。确认范围、阵容与最大轮数；未声明只授权一轮。已有 subagent 权限、风险高或其他 skill 引用不等于 cross-review 授权。

## 不变量

- 每轮 2–3 个 fresh、独立上下文、不同于主模型的 reviewer 并发检查同一快照；主 agent 不计入 reviewer。
- 优先不同模型；只有一个非主模型可用时用两个 fresh 实例，明确标注同模型降级。少于两个完成不能宣称 cross-review 通过。
- 使用工具实际暴露的模型名。已批准具体模型/强度优先；Astra/Sol 编排的默认角色与强度统一读 codex-develop-flow，其他场景在计划中选定实际可用档位，本 skill 不另设冲突默认。
- 以 fork_turns: none 或等价方式隔离历史；只给固定材料、适用规范、目标、输出契约与只读限制，不给主 agent 预判或其他 reviewer 结论。
- 一轮内收齐全部结果后裁决；不能因某位先返回问题而取消其他评审。快照漂移使本轮失效。

## 执行

1. 记录 HEAD、工作区状态、准确文件/commit range/内容版本与本轮编号。给 reviewer 完整相关 ADR/plan，不只摘要。
2. 按对象读取 [评审维度](references/rubrics.md)，所有 reviewer 使用同一范围与重点。
3. 优先会话内代理。确无此能力、且替代通道已授权时，读 [外部 CLI](references/cli.md)；不可用或未授权就报告阻塞。
4. 逐份读取原始输出，记录失败/超时/空输出，不代写 finding。
5. 按 [裁决与报告](references/report.md) 核实位置、成因与影响；主 agent 裁决和外部结论分开。
6. 无 BLOCKING 且 WARNING 已处置则结束。有问题先报告；只有修复已授权时才修改和验证。复审还需在已授权轮数内，冻结新快照并使用 fresh reviewers；不对未修订快照凑轮次。
7. 达到轮数上限、无法完成阵容、意见无法裁决或需扩大范围时停止交人工。核对评审前后工作区，保证 reviewer 未改文件。

报告保留实际阵容与多样性局限，不要求赞扬项或虚构共识。需要留档时使用 ignored notes/reports 或调用方 REVIEW；不 stage/commit。

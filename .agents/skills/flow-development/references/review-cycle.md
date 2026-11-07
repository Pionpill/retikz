# 常规评审循环

用于计划、实现、阶段性 diff 和收尾；不是 cross-review。

1. 主 agent 先自审固定材料。只有计划已授权时使用只读 reviewer，提供 scope、HEAD/内容版本、适用规则与验证证据；未提交内容也须固定版本，HEAD 不能代替工作区快照。
2. reviewer 输出位置、事实、成因、影响和建议，按 BLOCKING / WARNING / INFO 分级；不改仓库，不自行扩大范围。
3. 主 agent 汇总、去重并核实 finding，集中修订获准范围并验证；修订后复用各角色的同一 reviewer，复核受影响部分。
4. 无 BLOCKING 且 WARNING 已修复或有可验证裁决时结束。不得超过计划的轮次上限；快照漂移、无法裁决或需要扩大 scope 时停止交人工。

未授权 reviewer 时只做主 agent 自审，不将其称为独立评审。命名按 standard-name、分层按 standard-structure 的适用 references，不复制检查表。评审通过不提供 Git 或发布权限。

## 角色与授权

- 保留一个整体 reviewer 的原有职责与检查时点，负责功能、契约、异常路径、回归及集成风险；专项结论由主 agent 汇总，不替代整体 review 或最终 cross-review。
- 中大型任务的计划默认纳入一个[代码范式 reviewer](review-code-paradigm.md)；性能 reviewer 由主 agent 根据热点、算法、分配、缓存、增量路径或性能目标的变化[按需判断](review-performance.md)，在计划中记录是否纳入及理由。
- 两个专项角色均须用户批准后才能启动；默认纳入计划不等于自动授权。计划写明实际模型、角色、数量、串并行方式、检查时点和循环上限；执行中新增角色须先获批。
- 专项 review 放在阶段实现完成、结构与入口基本成形后，不为每个 commit 重复启动。默认串行，各角色独立形成结论；每轮使用同一候选快照，主 agent 收齐结果后统一修订。
- 各角色复审遵守计划统一声明的轮次上限，不因拆成专项增加轮数；不因专项 review 自动加载长任务流程。模型映射见 codex-develop-flow，默认专项角色使用独立 Sol 实例、high；模型不可用时先按计划的获批降级策略处理，不静默替换。

需要留档时，结果写入调用方 ignored PLAN/REVIEW 或 notes/reports；不为每次局部自审创建报告。

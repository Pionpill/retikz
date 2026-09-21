# 常规评审循环

用于计划、实现、阶段性 diff 和收尾；不是 cross-review。

1. 主 agent 先自审固定材料。只有计划已授权时使用一个只读 reviewer，提供 scope、HEAD/内容版本、适用规则与验证证据。
2. reviewer 输出位置、事实、成因、影响和建议，按 BLOCKING / WARNING / INFO 分级；不改仓库，不自行扩大范围。
3. 主 agent 核实 finding，修订获准范围并验证；修订后复用同一 reviewer。
4. 无 BLOCKING 且 WARNING 已修复或有可验证裁决时结束。不得超过计划的轮次上限；快照漂移、无法裁决或需要扩大 scope 时停止交人工。

未授权 reviewer 时只做主 agent 自审，不将其称为独立评审。命名按 standard-name、分层按 standard-structure 的适用 references，不复制检查表。评审通过不提供 Git 或发布权限。

需要留档时，结果写入调用方 ignored PLAN/REVIEW 或 notes/reports；不为每次局部自审创建报告。

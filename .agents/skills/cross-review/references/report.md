# 裁决与报告

每条 finding 保留文件位置/文档段落、事实、成因、用户影响、提出实例、证据与建议。BLOCKING 是已坐实缺陷或契约断链；WARNING 是待核实风险或非阻断问题；INFO 是可选建议。偏好不升级成缺陷。

同位置同成因去重；两个独立实例都提出才称实例共识，不同模型才称跨模型共识。单点不等于误报，共识也不代替主 agent 核实。冲突记录原始观点与主 agent 的裁决依据。

报告包含范围与快照、计划/完成阵容和实际强度、失败与多样性局限、分级 findings、未验证项及下一步。无问题明确写“本轮未发现”，不声称不存在缺陷，不强制良好实践或总分。

ADR Gate reviewer 只返回调用方；Plan Gate 结果进入镜像 REVIEW。其他报告有 BLOCKING/WARNING 或用户要求留档时写 notes/reports/cross-review-YYYY-MM-DD-<scope>.md。报告不 stage/commit。

仅审查的授权不包含修复。已有实施授权时，修复记录 finding → 修改 → 验证，再在批准轮数内复审；达到上限仍未收敛则交人工。

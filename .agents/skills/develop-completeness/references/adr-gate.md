# ADR Gate

## `adr-gate`

### 输入要求

- 读取完整待审 ADR（Proposed，或获批设计的修订），检查核心决策、基础数据结构 / 公开契约、行为与失败语义；Accepted 不代替本轮证据或实现授权。
- 读取同步简略 `PLAN.md`，检查目标与非目标、功能与包边界、能力完备性、同类设计、被否决方案和测试策略摘要。
- 对照当前代码判断 ADR 是否复用既有机制；尚未实现不妨碍设计门禁。
- 调用方提供固定快照和当前检查轮次；默认由主 agent 执行，执行计划已授权常规 reviewer 时记录其实际模型与循环上限。

### Gate 重点

- 简略 plan 必须选择明确结论：组合、扩展当前域、下沉、上移、不支持或延期。
- 新增开放语义时，ADR 冻结必要公开 contract；简略 plan 验证内置与自定义同路的 define-registry 链路。能力天然闭合时，理由记录在 plan。
- 基础数据结构、公开契约、默认 / 失败语义和跨包接口必须足以冻结功能，不能让 plan 或 implementer 再决定所有权或公开字段。
- 发现需要另一个能力域先补底座时，当前 ADR 不得用局部 adapter / renderer patch 绕过。
- 简略 plan 必须保留测试策略摘要，说明需要哪些证据层和关键不变量；具体 case、文件、路径、命令和数量在 ADR 确认后进入细化 plan / `TEST_CONTRACT.md`，不是当前 Gate 缺失项。
- Gate 不得要求 ADR 增加文件 scope、private helper、业务逻辑步骤、Zod 拼装、测试 case、验证命令、commit 切分或 review 过程。
- Gate finding 必须写入正确真源：公开契约、默认 / 失败语义和 breaking 行为属于 ADR；设计检查与实施准备属于 plan。

### 输出契约

只返回以下结构，不创建报告文件：

```md
ReviewerVerdict: REVIEWER_PASS | BLOCKED
Round: <current>/<plan-limit>
Reviewer: <actual-model>
Snapshot: HEAD=<sha>; ADR=<path-and-content-version>; PLAN=<path-and-content-version>

## BLOCKING

- ID：AG-<序号>
  检查轴：<共同检查矩阵中的一项>
  问题：<会导致错误实现或边界破坏的具体事实>
  证据：<ADR / plan 段落 + 1-2 个当前代码 / 契约路径>
  必须修订：<明确应修订 ADR 还是 plan；实现细节留在 plan>

## WARNING

- ID：AW-<序号>
  风险：<非阻断但必须处置的风险>
  处置：修订正确真源 | 镜像 plan 已记录可验证的人工裁决

## INFO

- <可选建议>
```

单个评审员无 BLOCKING，且每个 WARNING 已修复或在镜像 plan 中记录可验证的人工裁决时可以返回 `REVIEWER_PASS`。该值只表示 reviewer 输出合格；Architecture Gate 的 `GateVerdict: PASS` 由主 agent 结合固定快照、rubric、自审或执行计划已授权的单 reviewer 结果裁决。时间压力、已有实现、用户离线或“后续再补”都不能降低 finding 等级。

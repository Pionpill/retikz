---
name: develop-completeness
description: Use when an Alpha ADR needs a pre-implementation capability gate, or a Beta milestone needs code-based completeness and package-boundary auditing.
---

# 能力完备审计

使用同一套能力归属、内部表达、外部扩展和端到端闭环标准，执行 Alpha 设计门禁或 Beta 代码审计。审计本身只读，不修改 ADR、产品代码、roadmap 或暂存区。

## 模式

| 模式         | 输入                                                       | 输出                                      | 用途                             |
| ------------ | ---------------------------------------------------------- | ----------------------------------------- | -------------------------------- |
| `adr-gate`   | 长期形态的 Alpha ADR、当前代码、适用 completeness / AGENTS | 返回调用方的结构化 findings，不写报告文件 | 人工确认前阻止错误归属和局部闭环 |
| `code-audit` | 能力域、当前完整代码、公开表面与架构文档                   | ignored completeness report               | Beta 入口规划或出口验收          |

调用方必须明确模式；不要把代码评分报告代替 ADR gate，也不要用 ADR 自述代替 Beta 代码证据。

## 共同准备

1. 读取根与被审计包就近 `AGENTS.md`。
2. 读取 `notes/architecture/capability-design.md` 和所属能力域 completeness 文档。
3. 记录 `git rev-parse HEAD` 与 `git status --short`；结束时确认除 ignored report 外没有写入。
4. 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 读取适用 `standard-*` skill。
5. 读取与结论直接相关的当前代码、测试、公开 barrel 和下游消费方；不能只复述 ADR 或架构文档。

## 共同检查矩阵

每次审计必须逐项给出结论和最小代码证据：

| 检查轴          | 必答问题                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 问题与归属      | 解决的根问题是什么；能力域、主责包、协作包是否正确；是否突破包的“不拥有”边界                                                |
| 内部表达        | schema / IR、纯计算、pipeline / compile 能否通用表达；是否依赖 adapter、demo、chart type 或 renderer 特判                   |
| 外部扩展        | 内置与自定义是否经过同一 contract、registry、resolver、options 和消费路径；错误是否可诊断                                   |
| define-registry | 开放能力是否具备 `XxxDefinition`、`defineXxx`、内置 + 自定义 registry 合并和统一 dispatch；不适用时是否有明确、可验证的理由 |
| 端到端闭环      | 输入、主责包处理、产物、下游执行 / adapter 等价性、tests、docs、provenance / locator 是否覆盖适用边界                       |
| 边界与阶段      | 不支持范围是否清楚；缺口应组合、扩展当前域、下沉、上移、延期还是转 Alpha；当前阶段是否允许该动作                            |

“已有一个内置实现”“某个 adapter 能展示”或“当前代码恰好在该包”都不能作为完备或所有权证据。

## `adr-gate`

### 输入要求

- 读取完整 Proposed ADR，尤其是核心决策、基础数据结构 / 公开契约、行为与失败语义、功能边界、被否决方案和架构验证。
- 对照当前代码判断 ADR 是否复用既有机制；尚未实现不妨碍设计门禁。
- 调用方提供固定快照、评审模型与当前轮次 `1/3`、`2/3` 或 `3/3`；同轮并发与多模型归并由 `cross-review` 负责。

### Gate 重点

- ADR 必须选择明确结论：组合、扩展当前域、下沉、上移、不支持或延期。
- 新增开放语义时，ADR 必须定义内置与自定义同路的 define-registry 链路；若能力天然闭合，必须写出不采用 registry 的契约理由。
- 基础数据结构、公开契约、默认 / 失败语义和跨包接口必须足以冻结功能，不能让 plan 或 implementer 再决定所有权或公开字段。
- 发现需要另一个能力域先补底座时，当前 ADR 不得用局部 adapter / renderer patch 绕过。
- ADR 必须保留稳定测试策略摘要，说明需要哪些证据层和关键不变量；具体 case、文件、路径、命令和数量属于镜像 plan，不是 Gate 缺失项。
- Gate 不得要求 ADR 增加文件 scope、private helper、业务逻辑步骤、Zod 拼装、测试 case、验证命令、commit 切分或 review 过程。

### 输出契约

只返回以下结构，不创建报告文件：

```md
ReviewerVerdict: REVIEWER_PASS | BLOCKED
Round: <1|2|3>/3
Reviewer: <actual-model>
Snapshot: HEAD=<sha>; ADR=<path-and-content-version>

## BLOCKING

- ID：AG-<序号>
  检查轴：<共同检查矩阵中的一项>
  问题：<会导致错误实现或边界破坏的具体事实>
  证据：<ADR 段落 + 1-2 个当前代码 / 契约路径>
  必须修订：<ADR 应补齐或改写的长期契约；实现细节写 plan>

## WARNING

- ID：AW-<序号>
  风险：<非阻断但必须处置的风险>
  处置：修订 ADR | ADR 已记录接受理由

## INFO

- <可选建议>
```

单个评审员无 BLOCKING，且每个 WARNING 已修复或在 ADR 中记录可验证的接受理由时可以返回 `REVIEWER_PASS`。该值只表示一份 reviewer 输出合格，不能解析为 Gate PASS。Architecture Gate 的 `GateVerdict: PASS` 只能由编排者在 `cross-review` 最新一轮至少两个不同模型实际完成并归并通过后产生。时间压力、已有实现、用户离线或“后续再补”都不能降低 finding 等级。

## `code-audit`

### 能力域范围

| 能力域        | 主责与协作包                                       | 完备目标               |
| ------------- | -------------------------------------------------- | ---------------------- |
| Drawing       | math / core / render / react / vanilla / tex       | Drawing Complete       |
| Data          | data 及其 plot 等消费边界                          | Data Complete          |
| Visualization | plot / plot-react / plot-vanilla 及 data/core 接口 | Visualization Complete |

Beta 调用方还必须传入阶段：`beta-entry` 或 `beta-exit`。每个能力域独立审计，主 AI负责汇总跨域重复所有权和依赖方向。

### 报告

写入：

```text
notes/reports/develop-completeness-YYYY-MM-DD-<domain>-<beta-entry-or-beta-exit>.md
```

报告必须包含：

```md
# Completeness Report: <domain>

日期：
检测范围：
完备性目标：
基准快照：
阶段：beta-entry | beta-exit
覆盖率声明：

## Gate 结论

PASS | BLOCKED | ESCALATE_ALPHA

## 能力矩阵

| 能力面 | 现状简述 | 内置功能 | 扩展功能 | 整体评价 | 边界结论 | 优化方向 |

## Findings

| ID | 等级 | 能力面 | 问题 | 为什么影响完备性 / 边界 | 建议动作 | 坐实依据 |

## 跨包与公开表面

## 建议排期

## 不建议纳入当前能力域
```

`整体评价` 使用 10 分制双分数，单元格固定为三行：

```text
内置分数/扩展分数
<0-10 整数>/<0-10 整数>
<简短评价>
```

不得改用 5 分制、百分制或把两个分数分别写成 `x/10`。证据只列最关键的 1-2 个路径或文档段落，不把报告写成代码索引。

等级定义：

- **BLOCKING**：错误所有权、平行 IR / registry / pipeline、内置与自定义分叉、端到端断链、公开契约与实现不一致。
- **WARNING**：不阻断当前边界，但影响下一能力轴、迁移质量或扩展体验。
- **INFO**：文档、可诊断性或长期质量建议。
- **ESCALATE_ALPHA**：修复必须净新增公开能力、公开组件、IR 形态、schema 字段或用户可见行为契约；Beta 不得实施。修改、重命名或移除既有契约仍按 Beta breaking 判定。

`beta-entry` 把 findings 转成候选 TODO，但不修改 roadmap 或产品代码；scope 由人工确认。`beta-exit` 只有无 BLOCKING / ESCALATE_ALPHA 才能 PASS。

## 完成标志

### `adr-gate`

- 覆盖共同检查矩阵，使用当前代码证据而非只读 ADR 自述。
- 只检查长期功能和架构契约，不把 plan 细节反向写入 ADR。
- 输出严格符合 findings 契约，没有修改任何文件。
- 单模型结论已明确；最终多模型 PASS 由调用方按 `cross-review` 汇总。

### `code-audit`

- 能力矩阵覆盖适用 completeness 能力面和所有作用域包。
- 同时检查内部通用性、外部扩展、define-registry、包边界、公开表面与下游闭环。
- ignored report 已写入，产品文件与暂存区相对基线不变。
- Gate 结论与 findings 等级一致。

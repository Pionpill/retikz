---
name: develop-completeness
description: Use when an Alpha ADR needs a pre-implementation capability gate, or a Beta milestone needs code-based completeness and package-boundary auditing.
---

# 能力完备审计

使用同一套能力归属、内部表达、外部扩展和端到端闭环标准，执行 Alpha 设计门禁或 Beta 代码审计。审计本身只读，不修改 ADR、产品代码、roadmap 或暂存区。

## 模式

| 模式         | 输入                                                                      | 输出                                      | 用途                             |
| ------------ | ------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------- |
| `adr-gate`   | 长期形态的 Alpha ADR、同步简略 plan、当前代码、适用 completeness / AGENTS | 返回调用方的结构化 findings，不写报告文件 | 人工确认前阻止错误归属和局部闭环 |
| `code-audit` | 能力域、当前完整代码、公开表面与架构文档                                  | ignored completeness report               | Beta 入口规划或出口验收          |

调用方必须明确模式；不要把代码评分报告代替 ADR gate，也不要用 ADR 自述代替 Beta 代码证据。

## 共同准备

1. 读取根与被审计包就近 `AGENTS.md`。
2. 读取 `notes/architecture/capability-design.md` 和所属能力域 completeness 文档。
3. 记录 `git rev-parse HEAD` 与 `git status --short`；结束时确认除 ignored report 外没有写入。
4. 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 读取适用层级 references。
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

## 模式细则

- adr-gate：读 [设计门禁](references/adr-gate.md)，只返回 findings，不写报告。
- code-audit：读 [代码完备审计](references/code-audit.md)，包含 beta-entry / beta-exit 与报告格式。

默认主 agent 执行；代理仅按获批计划。结论必须对应当前代码与同一快照，单 reviewer PASS 不代替主 agent 的 Gate 裁决。审计不改产品、roadmap 或暂存区。

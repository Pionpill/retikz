# ADR-NN：<一句话标题>

> 起新 ADR：`cp _template.md <FAMILY>/v<MAJOR>/v<MAJOR>.<MINOR>/<channel.N>/NN-<slug>.md`
>
> - 目录层级为 family / major / minor / channel；PATCH 不开 ADR 目录。
> - 编号在 milestone 内从 `01` 重新开始，slug 用 kebab-case；各 viz family 独立演进。
> - 本模板对应 [`develop-design`](../../../../../../../../.agents/skills/develop-design/SKILL.md)；结构变化时同步更新。
> - ADR 从 Proposed 起就是长期功能与架构文档，不写施工细节，也不在 Accepted / 发布前再做“压缩”。
> - 进入实现后，将 `decisions` 替换为 `plans`、文件名变为目录，在 ignored 镜像路径维护 `PLAN.md`、`TEST_CONTRACT.md`、必要的 `TASK_STATE.md` 与 `REVIEW.md`。

- 状态：Proposed
- 决策日期：YYYY-MM-DD
- 关联：[所属家族 v0 roadmap §<段>](../../roadmap.md) · [能力域 completeness 文档](../../../../../architecture/<...>.md) · [架构设计 §<段>](../../../../../architecture/<...>.md)

## 背景与目标

<当前问题、为什么现有能力不够、必须达成什么。只写长期成立的约束>

## 决策：<最终方案一句话>

<写核心方案、关键取舍与代价，不写文件或施工顺序>

理由：

1. <不可让步的理由>
2. <不可让步的理由>

## 基础数据结构与公开契约

<只保留理解功能所必需的 IR / schema / DSL / API 或跨包数据结构。可以给 1–2 个最小示例；不写文件位置、Zod 拼装方式、private intermediate 或逐字段操作>

```ts
// 最小公开或跨包契约；不适用时删除代码块并说明“无新增基础数据结构”
```

## 行为、失败语义与兼容性

- 默认行为：
- 失败与诊断：
- 兼容性 / breaking：
- React / Vanilla 等价性：

## 功能与包边界

- 所属能力域与解决的问题：
- 主责包与协作包：
- 拥有：
- 不拥有：
- 外部扩展与下游闭环：
- 不支持边界：

## 架构验证

- 是否可由现有能力组合：
- Data / Plot / Table / Chart / Standard / Core 责任切分：
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：
- pipeline / lowering / renderer / diagnostics 如何闭环：
- provenance / lineage / locator 是否适用：
- 结论：组合 / 扩展当前域 / 下沉 / 上移 / 不支持或延期

## 被否决方案

- <方案>：<否决理由>

## 测试策略摘要

<只写需要 schema、pipeline、adapter parity、renderer、docs 等哪些证据层及关键不变量，不写 case、路径、命令或数量；详细矩阵进入镜像 plan 的 TEST_CONTRACT.md>

## 不在本 ADR 范围

- <明确延期或不支持的相邻能力>

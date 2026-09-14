---
description: 本决策解决的问题与检索边界，复制后替换为具体摘要
keywords: 中文术语、EnglishTerm
---

# ADR-NNN：<一句话标题>

> 起新 ADR：复制本模板到 `<FAMILY>/v<MAJOR>/v<MAJOR>.<MINOR>/NNN-<slug>.md`
>
> - 保留 family / major / minor，不设 patch / alpha / beta / rc 子目录。
> - 同一 family / minor 从 `001` 连续编号，后续取最大编号加一，不复用、不随发布重排；slug 用 kebab-case。
> - 本模板遵循 `develop-design`；复制后按目标位置填写关联链接并删除本说明。
> - Roadmap 只管理中版本能力目标，可关联 ADR，但不按预发布序号分配任务；Accepted 表示设计获批，不表示实现或发布完成。
> - ADR 从 Proposed 起就是长期功能与架构文档，不写施工细节，也不在 Accepted / 发布前再做“压缩”。
> - 起 ADR 时同步在 ignored 镜像路径创建简略 `PLAN.md`；人工确认 ADR 后再细化 plan，并创建 `TEST_CONTRACT.md`、必要的 `TASK_STATE.md` 与 `REVIEW.md`。
> - 简略 plan 记录目标 / 非目标、功能与包边界、能力完备性、同类设计、被否决方案、测试策略和待细化项。

- 状态：Proposed
- 决策日期：YYYY-MM-DD
- 关联：<目标中版本 roadmap、适用 completeness 与架构设计的有效相对链接>

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

---
description: '根级变换先生成共享视图，mark-local 变换只作用于当前图元，不能反向污染同图的其它图元'
keywords: 'Mark-local、transform、for、all、marks、spec.transform、rootRows、mark.transform'
---

# ADR-071：Mark-local transform for all marks

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md)、[ADR-062 transform registry](./062-transform-registry.md)、[ADR-064 custom mark registry](./064-mark-custom-registry.md)、[ADR-070 relation derived data](./070-relation-derived-data-routing.md)
- 后续决策：[plot v0.2/015](../v0.2/015-scoped-data-execution.md)、[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)

## 保留的决策

根级变换先生成共享视图，mark-local 变换只作用于当前图元，不能反向污染同图的其它图元。两层应共享相同的数据操作语义。

## 修订边界

旧 transform 字段形态与 RelationMark 特例不再定义作用域。Plot 区分 root 与 marks 的执行配置，Data 负责单步操作和执行。

---
description: '聚合、行选择、关系派生及统计输出是有序的数据操作，而非图元 lowering 的副作用'
keywords: 'Statistical、transform、algebra、relate、summarize、select、annotate'
---

# ADR-072：Statistical transform algebra

- 状态：Partially Superseded
- 决策日期：2026-06-27
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md)、[ADR-057 bin + aggregate](./057-bin-aggregate.md)、[ADR-062 transform registry](./062-transform-registry.md)、[ADR-070 relation derived data](./070-relation-derived-data-routing.md)、[ADR-071 mark-local transform](./071-mark-local-transform.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

聚合、行选择、关系派生及统计输出是有序的数据操作，而非图元 lowering 的副作用。输出模型与来源必须能供多个图元复用；不为每张统计图另造一种计算过程。

## 修订边界

通用操作及 reducer/selector 的定义与执行由 Data 拥有；Plot 消费结果，旧的 Plot-local 字段和回调签名不再适用。

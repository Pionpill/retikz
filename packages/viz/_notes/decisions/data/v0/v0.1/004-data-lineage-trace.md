---
description: '行来源回答“从哪几行来”，lineage 解释“经过哪些计算”'
keywords: 'data、TransformContext.lineage、rowSamples、calculationDetails、tagSourceIndex'
---

# ADR-004：data 提供可配置的数据链路追踪

- 状态：Partially Superseded
- 决策日期：2026-07-08
- 关联：[data v0.1 roadmap](./roadmap.md)、[data ADR-002](./002-shared-provider-boundary.md)、[plot ADR-103](../../../plot/v0/v0.1/103-plot-mark-lineage-trace.md)
- 后续决策：[data v0.2/002](../v0.2/002-transform-execution.md)

## 保留的决策

行来源回答“从哪几行来”，lineage 解释“经过哪些计算”。追踪是可选的运行时输出，不写入业务行或 JSON IR，也不改变变换结果。来源摘要与完整索引分开；字段流、统计操作、行样本和计算细节可分别开启。行样本与计算细节必须限制行数并指定非空字段白名单；使用 sink 不意味着必须在内存中保留全部事件。

## 修订边界

早期 applyTransforms 的调用示例不是当前执行协议。来源建立、事件启用及同步返回结构归统一的数据执行入口。

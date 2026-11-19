---
description: '作者显式绑定的尺度优先；没有显式选择时，依据字段测量类型与消费角色选择默认映射，让轴、标签与图元能共享域解释'
keywords: 'type-driven、scale、guide、continuous、categorical、temporal、scales'
---

# ADR-030：type-driven scale 默认选型 + guide 格式化

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md)、[plot v0 roadmap 阶段二](../roadmap.md)、[plot-design §3.4 Scale / §3.5 Coordinate / §3.9 Guide](../../../../architecture/plot-design.md)、[ADR-028 数据模型类型层](./028-data-model.md)、[ADR-029 可移植契约](./029-data-portability.md)
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

作者显式绑定的尺度优先；没有显式选择时，依据字段测量类型与消费角色选择默认映射，让轴、标签与图元能共享域解释。

## 修订边界

Data 定义映射，Plot 选择满足本通道约束的结果。从 position/channel 两个互斥算法家族挑选不是现行契约。

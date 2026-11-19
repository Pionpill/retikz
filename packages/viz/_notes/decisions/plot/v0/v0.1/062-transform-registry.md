---
description: '数据声明只保存有序操作，不嵌入实现函数；注册身份、匹配定义和执行计算是不同职责'
keywords: 'transform、registry、dataTransforms、defineTransform、applyTransforms、collectTransformFields'
---

# ADR-062：transform registry

- 状态：Partially Superseded
- 决策日期：2026-06-18
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md)、[ADR-057 bin / aggregate](./057-bin-aggregate.md)、[ADR-058 derive / normalize / jitter](./058-derive-normalize-jitter.md)、[ADR-061 coordinate registry](./061-coordinate-registry.md)、[ADR-063 scale registry](./063-scale-registry.md)
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

数据声明只保存有序操作，不嵌入实现函数；注册身份、匹配定义和执行计算是不同职责。相同操作在 Plot 与其它数据宿主上应有相同的数据语义。

## 修订边界

注册与执行契约归 Data。操作用 kind 和对象 params 表达，执行策略独立于 operation；Plot 不再维护默认变换集合。

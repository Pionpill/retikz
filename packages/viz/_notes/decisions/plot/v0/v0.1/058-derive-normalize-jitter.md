---
description: 'normalize、derive-interval、jitter 表达的是保留行身份的数据操作：分别形成归一化量、派生区间和可复现的扰动'
keywords: 'normalize、derive-interval、jitter、stack、BuiltinDataTransform.Normalize'
---

# ADR-058：normalize + derive-interval + jitter

- 状态：Partially Superseded
- 后续决策：[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)、[data v0.2/002](../../../data/v0/v0.2/002-transform-execution.md)、[data v0.2/004](../../../data/v0/v0.2/004-transform-parameters.md)

## 保留的决策

normalize、derive-interval、jitter 表达的是保留行身份的数据操作：分别形成归一化量、派生区间和可复现的扰动。调用者显式声明顺序，不因图元类型隐式重排数据操作。

normalize 在同组内计算 fraction 或 percent；组和为零时不应产生 NaN。百分比堆叠是先归一化、再堆叠，而非改变 stack 本身的定义。

## 修订边界

三者的声明与通用执行归 Data；不要在 Plot 再注册一份默认实现。数据扰动与投影后的图元位置偏移是不同能力。

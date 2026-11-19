---
description: '视觉通道决定字段如何解析、需要何种输出，以及如何把结果交付给图元'
keywords: 'visual、channel、registry、channel.ts、VisualChannelDefinition、defineVisualChannel、ordinal'
---

# ADR-066：visual channel registry

- 状态：Partially Superseded
- 后续决策：[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

视觉通道决定字段如何解析、需要何种输出，以及如何把结果交付给图元。数学映射本身不能决定输出是否是半径、颜色还是形状。

## 修订边界

内置与自定义通道仍共享消费入口；尺度算法由 Data 定义，字段绑定与固定属性在 Plot Source 中分开表达。

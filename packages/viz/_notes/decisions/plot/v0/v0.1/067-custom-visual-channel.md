---
description: '自定义视觉通道与内置通道应走同一条解析及交付路径，只把结果送入已有的 Core 图形能力'
keywords: 'custom、visual、channel、encoding.channels、defineVisualChannel、options.visualChannelDefinitions、VisualChannelDefinition.deliver'
---

# ADR-067：custom visual channel

- 状态：Partially Superseded
- 后续决策：[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

自定义视觉通道与内置通道应走同一条解析及交付路径，只把结果送入已有的 Core 图形能力。新增绘制语义不是注册一个通道就能绕开 Core 的理由。

## 修订边界

历史 encoding.channels 示例不是现行分组结构。封闭 Mark 种类不等于禁止扩展已有图元的视觉通道。

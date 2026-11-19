---
description: '内置与自定义尺度应沿相同注册路径，不能为每种算法在坐标或视觉通道中再开分支'
keywords: 'scale、registry、标度、注册'
---

# ADR-063：scale registry

- 状态：Partially Superseded
- 后续决策：[data v0.2/006](../../../data/v0/v0.2/006-scale-mapping.md)、[plot v0.2/029](../v0.2/029-scale-mapping-contract.md)

## 保留的决策

内置与自定义尺度应沿相同注册路径，不能为每种算法在坐标或视觉通道中再开分支。注册映射本身不自动赋予某个位置或通道新的语义。

## 修订边界

defineScale 与 ScaleDefinition 归 Data；Plot 不保留 definePlotScale 别名，也不要求定义选择 position 或 channel 家族。

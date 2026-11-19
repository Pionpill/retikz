---
description: '内置和第三方箭头通过同一 Definition 表达几何，编译器据此确定箭头与宿主路径的接触，后端只执行生成的图元'
keywords: 'ArrowDefinition、arrow、MarkerPrimitive、lineContactX、hollow、PaintValue.contextStroke'
---

# ADR-023：ArrowDefinition 注册面（自定义 arrow + MarkerPrimitive + 内置 7 降注册项）

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[ADR-007 Shape Registry](./007-shape-registry.md)、[ADR-019 Paint](./019-paint-basics.md)、[ADR-024](./024-path-generator-definition.md)、[ADR-025](./025-curve-transform-marking.md)
- 后续决策：[kernel v0.5/070](../v0.5/070-marker-scene-primitives.md)

## 保留的决策

内置和第三方箭头通过同一 Definition 表达几何，编译器据此确定箭头与宿主路径的接触，后端只执行生成的图元。

## 修订边界

专属 MarkerPrimitive 集合不再是 Definition 的输出限制。箭头内容使用基础 Scene 图元，首尾声明与沿线 marks 分开。

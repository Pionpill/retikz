---
description: 'PatternDefinition 负责重复单元的 motif；内置与扩展图案走同一注册和编译流程'
keywords: 'PatternDefinition、pattern、motif、MarkerPrimitive、pattern.shape、paintDefs.tsx'
---

# ADR-026：PatternDefinition 注册面（自定义 pattern motif + 内置 3 降注册项）

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[ADR-023 ArrowDefinition](./023-arrow-definition.md)、[ADR-022 pattern/image](./022-pattern-image-deferred.md)
- 后续决策：[kernel v0.5/070](../v0.5/070-marker-scene-primitives.md)

## 保留的决策

PatternDefinition 负责重复单元的 motif；内置与扩展图案走同一注册和编译流程。后端只消费解析后的绘制资源，不根据图案名重做领域判断。

## 修订边界

原来限定的 motif 图元子集不是现行边界。图案与箭头内容都使用基础 Scene 图元，资源实例由容器区分。

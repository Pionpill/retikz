---
description: '颜色可直接作为绘制值；渐变等需要共享的 paint 应以渲染器中立的资源表达，由图元引用'
keywords: 'Paint、PaintValue、SceneResource、discriminated、gradient、PaintValue.contextStroke、IRPaint'
---

# ADR-019：Paint 基础（PaintValue 词汇表 + SceneResource discriminated 资源表 + gradient）

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[alpha.2 样式继承](./)、[v0.2 ADR-023 ArrowDefinition](./)、[v0.2 ADR-028 clip](./)、[ADR-020](./020-max-text-width.md)、[ADR-021](./021-pin.md)、[ADR-022](./022-pattern-image-deferred.md)
- 后续决策：[kernel v0.5/085](../v0.5/085-scene-resources.md)

## 保留的决策

颜色可直接作为绘制值；渐变等需要共享的 paint 应以渲染器中立的资源表达，由图元引用。后端负责物化和去重，不让作者提供 SVG defs 或 CanvasGradient。

多处图元引用同一渐变不应产生多个不同的视觉定义。Scene 保存资源及其引用，后端将其物化，而非由 renderer 重新解释作者输入。

## 修订边界

旧混合资源集合不再是结构真源。最终 Scene 将 paints 与 clips 分开组织，消费方按类别解析。

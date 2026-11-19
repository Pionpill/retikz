---
description: '图元参考应分别说明可见范围和命中范围：投影可能扩展视觉范围，却不会扩大 hit area'
keywords: 'ScenePrimitive、reference、shadow、blendMode、RectPrim、EllipsePrim'
---

# ADR-031：ScenePrimitive reference 与发布文案收口

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[ADR-028](./028-drawing-complete-alpha4-closeout.md)、[ADR-030](./030-group-scope-effect-boundary.md)
- 参见：[kernel v0.4/009](009-scene-drop-shadow.md)、[kernel v0.4/010](010-blend-mode.md)

## 决策

图元参考应分别说明可见范围和命中范围：投影可能扩展视觉范围，却不会扩大 hit area。矩形、椭圆和路径的图元级效果不能被读成 Text 或 Group 整体效果；SVG 的 filter region 需要覆盖投影后的绘制范围。

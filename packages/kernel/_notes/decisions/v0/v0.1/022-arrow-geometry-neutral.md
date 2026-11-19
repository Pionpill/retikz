---
description: '箭头与线身的接触位置和可见几何必须来自同一形状定义；如果线身裁切与箭头绘制各算一次尺寸，缩放后会出现缝隙或过度重叠'
keywords: 'arrow、shrink、viewBox、refX、lineContactX、tipX'
---

# ADR-022: arrow shrink 几何中性化

- 状态：Partially Superseded
- 决策日期：2026-05-14
- 关联：[ADR-008 renderer-neutral core](./008-core-comments-renderer-neutral.md)
- 后续决策：[kernel v0.5/070](../v0.5/070-marker-scene-primitives.md)、[kernel v0.5/075](../v0.5/075-path-arrows-and-marks.md)

## 保留的决策

箭头与线身的接触位置和可见几何必须来自同一形状定义；如果线身裁切与箭头绘制各算一次尺寸，缩放后会出现缝隙或过度重叠。

## 修订边界

早期借用 SVG marker 的组织方式不是后端契约。箭头定义输出基础 Scene 图元，首尾端点按各自声明处理。

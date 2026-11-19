---
description: '图案填充与图像填充不能被当成普通颜色处理'
keywords: 'pattern、image、IRPaint、PaintValue、SceneResource、PaintSchema'
---

# ADR-022：pattern / image 填充

- 状态：Partially Superseded
- 决策日期：2026-05-24
- 关联：[ADR-019 Paint 基础](./019-paint-basics.md)
- 后续决策：[kernel v0.2/026](026-pattern-definition.md)、[kernel v0.5/085](../v0.5/085-scene-resources.md)

## 保留的决策

图案填充与图像填充不能被当成普通颜色处理。可重复的 motif 属于绘制资源；图片是否可加载、如何取得并非一个 pattern 形状名称能够决定。

首版 image 保存 URL，不嵌入图像对象。fill 拉伸至边界，contain 保持比例完整放入，cover 保持比例铺满；pattern 的重复周期以绘图单位衡量，不随每个节点的尺寸重算。

## 修订边界

当时限定的图案词汇不是永久白名单。现行 pattern 由 Definition 注册，资源进入 paints；这不自动承诺新的图片加载机制。

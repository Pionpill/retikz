---
description: '矩形的拐角与正多边形的边数、方向都是形状参数'
keywords: 'rectangle、polygon、diamond、preset'
---

# ADR-012：rectangle/polygon 参数化与 diamond preset

- 状态：Partially Superseded
- 决策日期：2026-06-06
- 关联：[ADR-009 shape 参数化机制](./009-shape-params-generalization.md)
- 后续决策：[kernel v0.5/076](../v0.5/076-shape-circumscribed-geometry.md)

## 保留的决策

矩形的拐角与正多边形的边数、方向都是形状参数。正多边形至少三边；菱形可复用四边形几何，连接锚点须与实际轮廓一致。

## 修订边界

早期关于顶层圆角字段的过渡约定不是永久兼容承诺。外接几何以 Shape 的统一回调表达尺寸与偏移。

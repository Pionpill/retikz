# ADR-03：任意顶点环 contour shape

- 状态：Accepted（已实现）
- 决策日期：2026-06-15
- 关联：[ADR-01 Path 圆角](./01-polyline-rounded-corners.md) · [ADR-02 smooth step](./02-smooth-curve-through-points.md)

## 背景

自定义坐标系投影可能产生四边均为曲线的任意闭合轮廓。raw Path 虽能绘制，却没有 Node 的 anchor 和 boundaryPoint，导致投影 mark 无法保持可连接性。Core 已有 contour fillet 和边界求交，只缺接受任意顶点环的 builtin shape。

## 决策

新增 builtin contour，使用参数 points: Array<Position> 和可选 cornerRadius。points 为隐式闭合的直线环，至少三个点，可以在任意局部原点给出；shape 内按 points 的 AABB 中心自动归一化，使 Node.position 对齐几何中心。circumscribe 使用平移不变的 AABB 半轴；emit、boundaryPoint 和圆角复用 contour 几何引擎。

contour 的 boundaryPoint 对轮廓精确求交；anchor 暂不提供专属命名，compass 回退 AABB。scaleParams 对 points 逐轴缩放、cornerRadius 按几何均值缩放。IR 不需新增字段，开放 ShapeRef 的 type/params 已足以表达该 builtin；JSON-safe 和 params 校验沿用既有双护栏。

## 兼容性与实现结果

contour 作为 builtin 直接可用于 React、Vanilla、SSR 和 Tier 2，不需要各 consumer 注册；renderer 继续消费 PathPrim，既有 IR/Scene 不变。

## 遗留风险

精确弧/Arc segments、语义 anchor、按真实角点选择性倒角和高基数采样优化仍归后续；当前 points 轮廓可能产生较大的 O(N) IR。

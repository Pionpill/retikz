# ADR-07：统一 cornerRadius 与 rounded-contour 几何

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-04 rectangle/polygon](./04-rectangle-polygon.md) · [ADR-05 star](./05-star.md) · [ADR-03 arc/sector](./03-arc-sector.md) · [ADR-06 connection surface](./06-connection-surface.md)

## 背景

rectangle 已有圆角，polygon、star、sector 只有尖角；且 Node/ShapeStyle 使用 roundedCorners，而 primitive 使用 cornerRadius。视觉倒角和 boundaryPoint 必须共享同一轮廓，否则绘制边界与连接边界会不一致。

## 决策

统一使用 cornerRadius，并以闭合段序列作为轮廓模型：

- contour 由 Line 或 Arc 段组成；filletContour 对 line-line、line-arc、arc-line 接缝生成相切 fillet，按相邻段长度逐角夹紧，半径无效时该角退化为尖角
- emit、contourCommands 和 boundaryFromContour 共享 fillet 后的同一轮廓；boundaryPoint 从调用方明确提供的 rayOrigin 求最近正向交点。sector 使用质心而非 AABB 中心
- rectangle、polygon、star、sector 均可感知圆角。polygon/star/sector 输出含 fillet arc 的 PathPrim；rectangle 保留 RectPrim 和原生 rx；circumscribe/AABB 使用尖角轮廓，专属 anchor 和原始 edgePoint 不随倒角移动，compass 仍按 AABB
- cornerRadius 省略或为 0 时，不执行 fillet，emit 与 boundary 行为等价于原实现；长度参数随 node scale 按几何均值缩放
- Node rectangle params 的 cornerRadius 优先于迁移期顶层 cornerRadius；polygon/star/sector 只读取各自 params

该命名迁移同时覆盖 Node rectangle、ShapeStyle、path rectangle step 和 React/Vanilla 相应 authoring surface；旧 roundedCorners 是 breaking rename，不保留别名。

## 兼容性与实现结果

统一 contour、四种 shape 的视觉/连接圆角已实现；rectangle 仍保留原 primitive 语义，renderer 无需新增圆角后端。

## 遗留风险

arc-arc fillet、逐角不同半径、path/shape 的中途 sharp/round 切换和更复杂的轮廓仍未定义；这些不能通过静默近似加入。

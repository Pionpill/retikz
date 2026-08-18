# ADR-06：连接面与视觉形状解耦

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-01 shape 参数化](./01-shape-params-generalization.md) · [ADR-02 circle/ellipse](./02-circle-ellipse.md)

## 背景

视觉形状不总是适合作为连接面：星形的尖角会使连线跳动，polar/sector 也需要稳定 compass 锚点。已有 ShapeDefinition 已将 emit 与 boundaryPoint/anchor 分开，连接面可以复用已注册 shape 的边界函数，而无需新增几何体系。

## 决策

Node 增加可选 boundary，端点引用增加同名的单边覆盖；默认是 shape。取值为 shape、circle 或已注册 shape 名/ShapeRef：

| boundary | boundary 类与数字角度 | compass 锚点 | 专属 anchor / edgePoint |
| --- | --- | --- | --- |
| shape | 视觉 shape | AABB 矩形 | 视觉 shape |
| circle | 真圆，半径为 AABB 较长半轴 | 真圆 | 视觉 shape |
| 其他已注册 shape | 借用该 shape 作用于本节点 AABB 的 boundaryPoint | 该 shape 的 compass | 视觉 shape |

关键语义：

- 连接面只改变边界求交和 compass/角度 anchor，不改变 layout、AABB、bbox 或视图范围；借用 shape 从不调用其 circumscribe
- shape 默认保持原有 boundary 类和专属 anchor；compass 统一在 compile 层按连接面解析。sector/arc 因此获得 AABB compass 支持，这是 additive 修正
- 专属命名 anchor（tip-N、outer-arc-mid 等）与 edgePoint 永远解析视觉 shape，不受 boundary 借用影响
- edge.boundary ?? node.boundary ?? shape 决定作用面。它只在 path endpoint auto-clip 以及该端点的 compass/数字角度 anchor 生效；无 toward 的中心引用、between endpoint、offset.of 等场景没有可裁剪对象时 no-op，不报错
- boundary-dependent anchor cache key 必须包含稳定的 boundary 判别；视觉专属 anchor 和 edgePoint 不需要加入
- shape、circle 是保留关键字；其他字符串或 ShapeRef 未注册时按注册表错误处理

## 兼容性与实现结果

默认 shape 下，既有 boundary 类、专属 anchor 和 edgePoint 保持逐字段行为；sector/arc 的 compass 支持是新增合法行为，不破坏已有合法输入。Node/endpoint boundary 和自定义连接面已实现。

## 遗留风险

带参借用 shape 不自动从 AABB 反推参数，outer sep/间距、连接面动画和更复杂的 group 语义仍未定义。

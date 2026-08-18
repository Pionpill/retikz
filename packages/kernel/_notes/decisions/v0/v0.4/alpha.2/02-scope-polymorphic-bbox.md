# ADR-02：scope.id 的矩形/圆形多态包络

- 状态：Accepted（MVP 已实现；polygon/ellipse 缓做）
- 决策日期：2026-06-13
- 关联：[scope-id-bbox 前身](../../v0.2/alpha.1/03-scope-id-bounding-box.md) · [ADR-01 可嵌入 Tier 2](./01-embeddable-tier2-in-layout.md)

## 背景

scope.id 会注册 synthetic layout，供 name.north、name.30 和连线使用。原先包络固定为矩形；polar、venn 等面板需要真实圆形边界。普通开放 ShapeRegistry 不能直接承担任意子树点集的最小外接算法，因此包络取闭集枚举。

## 决策

Scope 增加 boundingShape?: rectangle | circle，缺省 rectangle：

- rectangle 继续使用子树 outerRect 四角点的 AABB
- circle 对同一点集计算最小外接圆（MEC），synthetic layout 使用中心为 MEC 圆心、正方形 rect 和 ellipse equal 形状参数；anchor/boundaryPoint 复用 Node circle 的既有路径
- synthetic layout 只进入 NameStack，不产生 ScenePrimitive；boundingShape 不改变渲染子树
- schema 在 parse 边界拒绝 polygon、ellipse 和未知值，不在 compile 阶段 fallback
- math 提供最小外接圆算法，core 只消费闭集结果

## 兼容性与实现结果

缺省 rectangle 逐字兼容既有 scope bbox；circle 是 additive 能力，MVP 已实现。

## 遗留风险

rotation-aware 包络、padding/inset、polygon 的任意凸包和 ellipse 的最小面积/外接算法仍未定义；它们不能由当前闭集字段静默扩展。

# core v0.4 ADR：scope 多态 bounding shape —— `scope.id` 包络支持矩形之外的 circle

- 状态：Accepted（MVP = rectangle + circle，2026-06-15 已实现；polygon / ellipse 缓做）
- 记录日期：2026-06-13
- 关联：[v0.4 路线讨论](../roadmap.md) · [core v0.2-alpha.1 ADR-03 scope-id-bbox（矩形版前身）](../../v0.2/alpha.1/03-scope-id-bounding-box.md) · [core v0.2-alpha.3 ShapeRegistry（precondition）](../../v0.2/alpha.3/01-shape-registry.md) · [plot v0.1-alpha.10 ADR-02 可被组合（首个消费方）](../../../../../../viz/_notes/decisions/plot/v0/v0.1/alpha.10/02-plot-composable.md) · [plot-design §7 多坐标组合](../../../../../../viz/_notes/architecture/plot-design.md)

## 背景（塑造决策的硬约束）

- `scope.id` 设值时，core 在父 namespace frame 注册 synthetic `NodeLayout` 作 bbox 锚（ADR-03），外部可 `name.north` / `name.30` / 画线到其边界，对应 TikZ `local bounding box=name`。
- ADR-03 把包络形状**写死为 rectangle**，并把「非矩形包络」deferred 至 ShapeRegistry 落地后另开 ADR。
- ShapeRegistry 已于 v0.2-alpha.3 落地，但「包络任意子树点集」需逐形状的最小外接算法，**不能复用普通 Node shape 的开放注册表**——故 `boundingShape` 不设计成开放 ShapeRegistry 引用，而是闭集枚举。
- 直接需求来自 plot ADR-02：多坐标信息图（放射状 / venn / polar）的连线 / 标注要落在面板**真实形状边界**，矩形 AABB 锚点会落在形状外的角上、连线穿空。这是纯 core 纵向底座能力（机制），符合「core 0.4 只做纵向底座深化」。

## 决策

`scope.id` 的 synthetic layout 包络形状可多态，经**闭集算法**生成对应 shape layout：

- `<Scope>` 加可选入口 `boundingShape?: 'rectangle' | 'circle'`，**闭集枚举**；缺省 `'rectangle'` → 逐字回退现状、向后兼容、additive。
- compile 注册 scope synthetic layout 时按 `boundingShape` 算包络：
  - `rectangle`（默认）：现状 AABB（ADR-03 不变）。
  - `circle`：子树点集的**最小外接圆**（MEC，圆心 + 半径）。
- **包络点集**复用现状 `computeScopeBoundingBox` 的子树各 layout outerRect 四角点集；rectangle → AABB，circle → 该点集 MEC。
- **circle 落地形态**：synthetic layout 用 `shapeName:'ellipse'` + `shapeParams:{ circumscribe:'equal' }` + 正方 `rect`（中心 = MEC 圆心、边长 = 2·半径）；anchor / boundaryPoint 走与 `<Node shape="circle">` **完全一致**的既有路径，**零新 anchor 代码**（延续 ADR-03「无新 anchor 代码路径」取向）。
- **math 接线**：core→math 正向依赖；math 新增 `minimalEnclosingCircle`（Welzl）——现有仅三点 `triangle.circumcircle`，不足以求点集 MEC。
- **非法 boundingShape**（polygon / ellipse / 未知名）：schema 在 parse 边界直接拒绝，compile 只处理合法枚举值，不提供 compile 阶段 fallback。

关键设计 / 代价：

- **一字段一职责**：`boundingShape`（闭集包络算法名）与 `clip`（裁剪区，渲染语义）分离，形状可不同、职责不同。
- **synthetic layout 不发 ScenePrimitive**：同 ADR-03，只进 NameStack、不影响渲染输出。
- **与 plot ADR-02 非阻塞**：plot ADR-02 MVP 只用矩形 bbox，不依赖本能力；本能力落地后 polar / 圆形面板可声明 `boundingShape='circle'` 让连线落圆周，是富化后续而非前置。

数据结构定稿形态：

```ts
boundingShape?: 'rectangle' | 'circle' // 缺省 'rectangle'
```

## 被否决 / 缓做的选项

- **`boundingShape` 作开放 ShapeRegistry 引用**：否决。包络任意子树点集需逐形状最小外接算法，无法复用普通 Node shape 的开放注册表；故收敛为闭集枚举。
- **`polygon` 包络**：缓做。内置 `polygon` 是正多边形（`sides` 参数），无法承载任意凸包顶点；需新增「显式顶点凸多边形」ShapeDefinition（自带 anchor / boundaryPoint），独立一坨，另起。
- **`ellipse` 包络**：缓做。缺「轴对齐外接椭圆 / 最小面积椭圆」算法（math 无）。
- **padding / inset**：缓做。包络外扩 padding（连线留白）TikZ `local bounding box` 无，但组合标注常要，后续再议。

## 不在本 ADR 范围

- scope.id 用于 Scene 渲染（visibility / animation target）——ADR-03 已划走，仍另议。
- rotation-aware 包络——沿用 ADR-03，留后续（circle 无所谓；polygon / ellipse 的 rotate-aware 同 ADR-03 留后）。
- 横向成品（具体「圆形面板组件」）——归 plot / domain，core 只出机制。

## 实现指针

`@retikz/math` `minimalEnclosingCircle`（Welzl）+ core schema `boundingShape` 字段 + compile 圆形 MEC 构造 synthetic ellipse(`circumscribe:'equal'`) layout；Scope 文档与 demo 已同步。

> 🔖 本文件压缩前完整施工蓝图 = `git show 13765be7:_notes/decisions/core/v0/v0.4/alpha.2/02-scope-polymorphic-bbox.md`（封板全文）。

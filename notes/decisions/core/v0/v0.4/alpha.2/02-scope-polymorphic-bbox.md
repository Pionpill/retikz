# core v0.4 设计note：scope 多态 bounding shape —— `scope.id` 包络支持矩形之外的 circle / ellipse / polygon

- 状态：Accepted（MVP = rectangle + circle，2026-06-14 实现中；polygon / ellipse 缓做。详见下「实现决策」）
- 记录日期：2026-06-13
- 关联：[v0.4 路线讨论](../roadmap.md) · [core v0.2-alpha.1 ADR-03 scope-id-bbox（本能力的矩形版前身）](../../v0.2/alpha.1/03-scope-id-bounding-box.md) · [core v0.2-alpha.3 ShapeRegistry（precondition）](../../v0.2/alpha.3/01-shape-registry.md) · [plot v0.1-alpha.10 ADR-02 可被组合（首个消费方）](../../../../plot/v0/v0.1/alpha.10/02-plot-composable.md) · [plot-design §7 多坐标组合](../../../../../architecture/plot-design.md)
> ⚠️ Draft：本文件是 v0.4 候选方向的设计 note，记录方向 / 边界 / 取舍；正式启动走 brainstorm → spec → plan（[v0.4 roadmap 约定](../roadmap.md)）。

## 背景

`scope.id` 设值时，core 在父 namespace frame 注册一个 synthetic `NodeLayout` 作 bbox 锚（[v0.2-alpha.1 ADR-03](../../v0.2/alpha.1/03-scope-id-bounding-box.md)），外部可 `name.north` / `name.30` / 画线到其边界——对应 TikZ `local bounding box=name`。

但该 ADR **把包络形状写死为 rectangle**，并明确把「非矩形包络」deferred（ADR-03 line 33 / 38）：

> - line 33：「v0.2 alpha.1 只 rectangle，自定义 boundingShape（circle / ellipse 包络）**待 ShapeRegistry 落地后另开 ADR**。」
> - line 38：「scope.id 自定义 boundingShape（rectangle 以外）→ ShapeRegistry 落地后另开 ADR。」

**precondition 现已满足**：ShapeRegistry 于 [v0.2-alpha.3](../../v0.2/alpha.3/01-shape-registry.md) 落地。本 note 即承接该 deferred 项。

## 动机（为什么 v0.4 要做）

直接需求来自 [plot ADR-02「让 `<Plot>` 可被组合」](../../../../plot/v0/v0.1/alpha.10/02-plot-composable.md)：单 svg 多坐标信息图（如放射状布局、venn 圈、气泡、polar 面板）里，连接线 / 标注要落在面板的**真实形状边界**——圆形面板要圆周锚点、polar 图要圆/扇锚点。矩形 AABB 锚点会落在形状外的角上，连线穿空。

但这是**纯 core 纵向底座能力**（机制 / 引擎 / 契约），符合 [v0.4 切分原则](../roadmap.md)「core 0.4 只做纵向底座深化」：core 提供「scope 包络可多态」的机制，plot / 任意 Tier2 复用，core 不关心「圆形面板」这种横向成品。

## 方向：`scope.id` 的 synthetic layout 包络形状可多态，经 ShapeRegistry 解析，anchor 走对应 shape 的同一路径

- 给 `<Scope>` 加一个**可选**包络形状入口（形如 `boundingShape?: string`，取 ShapeRegistry 注册名；缺省 `'rectangle'` → **逐字回退现状、向后兼容**）。
- compile 注册 scope synthetic layout 时，按 `boundingShape` 算**对应形状的包络**而非 AABB：
  - `rectangle`（默认）：现状 AABB（ADR-03 不变）。
  - `circle`：子树点集的**最小外接圆**（圆心 + 半径）。
  - `ellipse`：轴对齐外接椭圆（或最小面积椭圆，取舍见待议）。
  - `polygon`：子树点集的**凸包**。
- synthetic layout 用该 shape 构造（复用 ShapeRegistry 的 anchor / boundaryPoint），外部 `name.north` / `name.30` / `boundaryPoint` 解析走与「同形状普通 Node」**完全一致**的路径——延续 ADR-03「无新 anchor 代码路径」的设计取向。
- 包络计算可消费 **`@retikz/math`**（v0.4 候选 A：凸包 / 外接圆 / 内切圆等纯计算几何）——两个 v0.4 子项天然协同（math 出算法、core scope 出 IR/compile 接线）。

## 与 plot ADR-02 的关系（非阻塞）

- plot ADR-02 **MVP 只用矩形 bbox**（嵌套 `scope.id` 既有能力），**不依赖本 note 落地**。
- 本能力落地后，plot 侧可让 polar / 圆形面板的 `scope.id` 声明 `boundingShape='circle'`，连线自动落圆周——是 ADR-02 的**富化后续**，非前置。

## 约束 / 取舍

- **向后兼容**：缺省 `rectangle`，现有所有 scope.id 行为逐字不变；新字段 optional、additive。
- **一字段一职责**：包络形状走 `boundingShape`（ShapeRegistry 名），不与 `clip`（裁剪区，渲染语义）混用——两者形状可不同、职责不同。
- **rotate-aware**：ADR-03 默认 axis-aligned 全局 bbox，rotation-aware 留后续；本 note 沿用（circle 无所谓，polygon / ellipse 的 rotate-aware 同 ADR-03 留后）。
- **synthetic layout 不发 ScenePrimitive**：同 ADR-03，只进 NameStack、不影响渲染输出。

## 待议 🔻

- **字段形态**：`boundingShape?: string`（ShapeRegistry 名）单字段够不够？circle 半径 / ellipse 轴比是否要参数（`{ shape, padding? }`）？倾向先「形状名 + 可选 padding」，参数化按需。
- **包络算法选型**：circle = 最小外接圆（Welzl）？ellipse = 轴对齐 vs 最小面积？polygon = 凸包够用还是要 concave？倾向 MVP：circle=最小外接圆、polygon=凸包、ellipse 缓做。均落 `@retikz/math`。
- **与候选 A `@retikz/math` 的依赖方向**：core 是否反向依赖 math？v0.4-A 拍板「math 不反依赖 core」，但 core 消费 math 是正向、允许；需确认 math 首切范围含外接圆 / 凸包（A 首切已列「三角形内切 / 外接圆、凸包」，吻合）。
- **padding / inset**：包络是否支持外扩 padding（连线留白）？TikZ `local bounding box` 无，但组合标注常要。

## 实现决策（2026-06-14，alpha.2 MVP）

直接实现（用户授权，末尾 review）。基于代码核验收敛待议：

- **MVP 范围 = `rectangle`（现状不变）+ `circle`（最小外接圆）**。`polygon` / `ellipse` **本轮缓做**：
  - `polygon`：内置 `polygon` shape 是**正多边形**（`sides` 参数），无法承载任意凸包顶点；需新增「显式顶点凸多边形」ShapeDefinition（自带 anchor/boundaryPoint），是独立一坨，另起。
  - `ellipse`：缺「轴对齐外接椭圆」算法（math 无），ADR 本就「缓做」。
- **字段形态**：`boundingShape?: string`，取值同 Node `shape` 词汇（`rectangle` / `circle` / …）；缺省 → rectangle，逐字回退现状。**padding 本轮不做**（待议保留）。
- **circle 落地**：synthetic layout 用 `shapeName:'ellipse'` + `shapeParams:{ circumscribe:'equal' }` + 正方 `rect`（中心 = MEC 圆心、边长 = 2·半径）；anchor/boundaryPoint 走与 `<Node shape="circle">` **完全一致**的既有路径，零新 anchor 代码。
- **包络点集**：复用现状 `computeScopeBoundingBox` 的子树各 layout outerRect 四角点集；rectangle → AABB（不变），circle → 该点集的最小外接圆。
- **math 接线**：core→math 正向依赖（已定）。math **新增 `minimalEnclosingCircle`（Welzl）**——现有仅三点 `triangle.circumcircle`，不足以求点集 MEC。
- **未支持的 boundingShape**（polygon/ellipse/未知名）：compile **warn + 回退 rectangle**，前向兼容、不报错。

## 不在本 note 范围

- scope.id 用于 Scene 渲染（visibility / animation target）——ADR-03 已划走，仍另议。
- rotation-aware 包络——沿用 ADR-03，留后续。
- 横向成品（具体「圆形面板组件」）——归 plot / domain，core 只出机制。

## 下一步

正式启动时走 brainstorm → spec → plan，定字段形态 + 算法选型 + 与 `@retikz/math` 的接线，落 v0.4 某 alpha milestone 的正式 ADR（红级：动 compile + ShapeRegistry 接线 + Scope schema 加 optional 字段）。

# ADR-02：`{ side, t }` 边上比例点几何（真实边界 + ShapeDefinition.edgePoint）

- 状态：Proposed
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.6 plan §`{ side, t }` 边上比例点几何](../../../plans/v0/v0.2-alpha.6.md) · 本 milestone [ADR-01](./01-structured-target-anchor.md)（schema + compile 分发）· [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（`ShapeDefinition` / anchor 接口）· [v0.1-beta.1 ADR-03 geometry 共享 transform](../v0.1-beta.1/03-geometry-shared-transform-dead-anchor-cleanup.md)

> **承接**：[ADR-01](./01-structured-target-anchor.md) 把 `{ side, t }` 纳入 `AnchorRefSchema` 并在 compile 分发到 `resolveEdgePoint`；本篇定义 `resolveEdgePoint` / `ShapeDefinition.edgePoint` 算什么几何。alpha.3 ADR-01 §不在范围 已拍板：「`{side,t}` 留作内置 shape 专属，第三方 shape 仅必须支持命名 anchor」——本篇据此把 `edgePoint` 设为**可选**方法。

## 背景

alpha.3 把 anchor 解释面收敛到 `ShapeDefinition`：命名 anchor 走 `anchor(rect, name)`、数字角度走 `boundaryPoint` generic。但"边上某比例处"（TikZ 无直接习语，但流程图 / 时序图常要"从某节点上边 1/4 处引线"）现仓库**零实现**——`{ side, t }` 是 alpha.6 引入的新 anchor 形态（ADR-01 schema 已含）。

需要回答两件事：

1. **`side` 的"边"指什么**——是 shape 的**真实边界**，还是外接矩形（bounding box）的边？对 rectangle 两者一致，对 circle / ellipse / diamond 差别明显。
2. **谁来算**——所有 shape 通用一份，还是各 shape 自报？自定义 shape（alpha.3 registry）是否必须支持？

## 选项

### A. 真实边界 + `ShapeDefinition.edgePoint?` 可选方法，内置 4 shape 必实现（**推荐**）

`{ side, t }` 落在 shape 的**真实边界**上，各 shape 自报几何；自定义 shape 不强制。

```ts
// shapes/types.ts —— ShapeDefinition 加可选方法
export type ShapeDefinition = {
  // ...circumscribe / boundaryPoint / anchor / emit 不变...
  /**
   * 边上比例点：side 真实边界从约定起点起 t∈[0,1] 处（轴对齐空间求出后由 layout 投回世界系）。
   * 可选；不实现的 shape 收到 { side, t } 时 resolveEdgePoint 抛明确错。内置 4 shape 必实现。
   */
  edgePoint?: (rect: Rect, side: 'north' | 'south' | 'east' | 'west', t: number) => Position;
};

// geometry/_edge.ts —— rect 方向约定单一真源（仅 rect 用两角端点；circle/ellipse 用角度表、diamond 用过顶点折线）
export const EDGE_ENDS = {
  north: ['north-west', 'north-east'],   // t=0 在 west 端 → t=1 在 east 端（西→东）
  south: ['south-west', 'south-east'],   // 西→东
  east:  ['north-east', 'south-east'],   // 北→南
  west:  ['north-west', 'south-west'],   // 北→南
} as const;
```

每条 side 的 t=0 / t=0.5 / t=1 三点（**全部落真实边界**，与现有 9-anchor 对齐；方向 north/south=西→东、east/west=北→南）：

| shape | side 的"边" | t=0 → t=0.5 → t=1 | 几何 |
| --- | --- | --- | --- |
| rectangle | 矩形四直边 | 角 → 边中点 → 角 | `lerp(rectAnchor(a), rectAnchor(b), t)`，`[a,b]=EDGE_ENDS[side]` |
| circle / ellipse | 该侧 90° 可见**周长弧段** | 对角 anchor → cardinal anchor → 对角 anchor | 局部角 θ(t) 等角插值（下表），点 = `localToWorld(rect, [rx·cosθ, ry·sinθ])`，`rx=width/2, ry=height/2` |
| diamond | 该侧两条可见斜边的**上/外半段**（过 cardinal 顶点的两段折线） | 邻边中点 anchor → cardinal 顶点 anchor → 邻边中点 anchor | t∈[0,0.5] 沿 `lerp(mid0, vertex, 2t)`、t∈[0.5,1] 沿 `lerp(vertex, mid1, 2t−1)`（见决策细节 #4） |
| 自定义 shape | **不强制** | — | `edgePoint?` 缺省；`resolveEdgePoint` 抛 `shape 'X' does not support side anchors` |

**circle / ellipse 局部角 θ(t)**（约定：geometry 既有 `(cosθ, sinθ)` + y 轴向下 ⇒ east=0° / south=90° / west=180° / north=270°，顺时针为正；θ 单位度）：

| side | θ(t) | t=0 | t=0.5 | t=1 |
| --- | --- | --- | --- | --- |
| north | `225 + 90·t` | 225°(NW) | 270°(N) | 315°(NE) |
| south | `135 − 90·t` | 135°(SW) | 90°(S) | 45°(SE) |
| east | `−45 + 90·t` | −45°(NE) | 0°(E) | 45°(SE) |
| west | `225 − 90·t` | 225°(NW) | 180°(W) | 135°(SW) |

> 三点均与 circle/ellipse 现有 9-anchor 数值重合（如 north t=0 == `anchor('north-west')`、t=0.5 == `anchor('north')`），保证 `{side,t}` 端点与命名 anchor 无缝。

- 优：`{ side, t }` 落真实边界（圆上点真在圆周上、菱形上点真在斜边上），视觉符合直觉；rect / diamond 复用现有 9-anchor（已含 `localToWorld`）、circle/ellipse 端点与 anchor 重合；几何下沉 `geometry/`，与未来 node shape `emit` / `boundaryPoint` 并列复用；自定义 shape 可选符合 alpha.3 已拍板。
- 缺：circle/ellipse/diamond 各需一份 `edgePoint`（但都是小函数，且复用现有 anchor / 角度数学）。

### B. 外接矩形边（bounding box edge），所有 shape 通用一份

`{ side, t }` 落外接矩形边，generic 实现（不进 `ShapeDefinition`）。

- 优：一份代码、所有 shape 免费、自定义 shape 也免费。
- 缺：圆 / 椭圆 / 菱形的"上边点"落在**外接矩形**上而非真实边界——视觉上点悬空在形状外（圆的 north 边变成切线段），与"边上比例点"语义不符。用户已拍板要真实边界。否决。

### C. `{ side, t }` 序列化成字符串 anchor 名复用 `anchor(rect, name)`

把 `{ side: 'north', t: 0.25 }` 编码成 `"north:0.25"` 走现有 `anchor(rect, name)`。

- 缺：违背对象化初衷（又把结构塞回字符串）；`anchor` 契约是离散命名点，硬塞连续参数语义混乱。否决。

## 决策：A

理由（用户已拍板决策 1）：

1. **真实边界**：rect 直边 / circle·ellipse 周长弧段 / diamond 斜边——点真正落在形状边界上。
2. **方向约定固定**：north/south = 西→东（t=0 在 west 端），east/west = 北→南（t=0 在 north 端），写进 `geometry/_edge.ts` `EDGE_ENDS` 单一真源。
3. **自定义 shape 不强制**（对齐 alpha.3 ADR-01 §不在范围）：`edgePoint?` 可选，内置 rect/circle/ellipse/diamond 必实现；不支持的 shape 收到 `{ side, t }` 抛明确错。
4. **几何下沉复用**：`edgePoint` 几何写 `geometry/*.ts` 纯函数，与未来 node shape 数学并列消费（v0.1-beta.1 ADR-03 / alpha.5 ADR-04 同口径）。

## 决策细节

> 主选项已锁，以下随 review 收敛。

1. **`edgePoint` 收带 rotate 的 `Rect`**：与 `boundaryPoint` / `anchor` 同语义（**非** emit 的轴对齐 rect）；shape 用 `worldToLocal` / `localToWorld` 处理旋转。rect 复用 `rectAnchor`（已 `localToWorld`），circle/ellipse/diamond 在局部系算点再 `localToWorld`。
2. **`resolveEdgePoint` 在 anchor-cache**：`compile/anchor-cache.ts` 加 `resolveEdgePoint(layout, side, t)`——缺 `edgePoint` 时抛 `shape '<name>' does not support side anchors ({ side, t })`；命中则缓存。**缓存 key = `${side}:${t}`**，与命名 anchor 共用 layout 的 Map（`'north'` vs `'north:0.5'` 命名空间不冲突）。
3. **circle / ellipse 弧段（角度表已固化）**：每条 side 是一段 90° 弧，局部角 θ(t) 见上「circle / ellipse 局部角 θ(t)」表，**等角**插值（t 线性映射到 θ）；点 = `localToWorld(rect, [rx·cos θ, ry·sin θ])`，`rx=width/2, ry=height/2`。圆 = `rx=ry` 的椭圆，`edgePoint` 委托 ellipse（沿用 alpha.3 circle.emit 复用 ellipse 模式）。四段弧端点（θ=45/135/225/315）= 对角 anchor，相邻 side 在此无缝衔接。
4. **diamond 折线（已固化）**：菱形 4 顶点 = N/S/E/W cardinal anchor（极值点），4 边中点 = NE/NW/SE/SW anchor。每条 side 不是单条直边而是**过 cardinal 顶点的两段折线**（避免「直连两边中点会穿过内部、不在边界上」的错误）：
   - north：`north-west` anchor → `north` 顶点 → `north-east` anchor（t∈[0,0.5] 走前段、[0.5,1] 走后段，t=0.5 恰在顶点）
   - south：`south-west` → `south` 顶点 → `south-east`
   - east：`north-east` → `east` 顶点 → `south-east`
   - west：`north-west` → `west` 顶点 → `south-west`

   三点全是现有 diamond anchor（边中点 / 顶点），全落真实斜边；方向与 rect / circle 一致（north/south 西→东、east/west 北→南）。每条边中点被相邻两 side 共享为 t=0/1 端点（如 `north-east` 是 north 的 t=1、east 的 t=0），与 rect 角点共享同构。
5. **offset 不在本 ADR**：`{ side, t }` 解析出点后的 offset 叠加由 ADR-01 compile 路径处理（世界系，最后叠加）。

## 待决策点

- **circle/ellipse 端点角度归一表示**：θ 用 `225 + 90t` 这类含 >360° / 负值的连续式，还是先归一到 [0,360)——纯实现细节，不影响坐标结果（`cos`/`sin` 周期），实现时取可读者。
- **`{ side, t }` 视觉等角而非等弧长（已选等角）**：椭圆（rx≠ry）下等角 ≠ 等弧长，t=0.5 不是弧长中点。已接受（与角度 anchor 同心智、实现简单）；若后续有"沿边均匀打点"需求再开新 ADR 加等弧长选项。

## DSL 表面

```tsx
{/* 圆周上边 1/4 处（真实弧段，不是外接矩形边） */}
<Circle center={[0, 0]} radius={2} id="c" />
<Path><Step kind="line" to={{ id: 'c', anchor: { side: 'north', t: 0.25 } }} /></Path>

{/* 矩形左边三等分点引线 */}
<Node id="box" shape="rectangle">Box</Node>
<Path><Step kind="line" to={{ id: 'box', anchor: { side: 'west', t: 1 / 3 } }} /></Path>
```

## 测试设计

`packages/core/tests/geometry/edge-point.test.ts`（新建）+ `packages/core/tests/compile/anchor-cache.test.ts`（扩 `resolveEdgePoint`）+ `packages/core/tests/shapes/shape-definition.test.ts`（扩 `edgePoint` 契约）覆盖：rect 四边端点、旋转、circle/ellipse 弧段在周长上、diamond 斜边、不支持 shape 报错、缓存。具体见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/shapes/types.ts`：`ShapeDefinition` 加可选 `edgePoint?`。
- `packages/core/src/shapes/{rectangle,circle,ellipse,diamond}.ts`：内置 4 shape 实现 `edgePoint`（circle 委托 ellipse）。
- `packages/core/src/geometry/_edge.ts`（新建）：`EDGE_ENDS` 方向约定 + 共享 helper（lerp / 弧角插值）。
- `packages/core/src/geometry/{rect,circle,ellipse,diamond}.ts`：各加 `edgePoint` 纯函数（rect 复用 `anchor`；circle/ellipse 弧角；diamond 斜边）。
- `packages/core/src/compile/anchor-cache.ts`：加 `resolveEdgePoint(layout, side, t)` + 缓存 key `${side}:${t}` + 缺 `edgePoint` 抛错。
- 文档：`core/concepts/anchors/` 加 `{ side, t }` 边上比例点小节（含真实边界 vs 外接矩形对比图）；新增 example `core/examples/edge-proportional-anchor/`。
- 对外 API：`ShapeDefinition` 加可选 `edgePoint`（**向后兼容**：第三方现有 shape 不实现仍合法，仅不支持 `{side,t}`）。

## 不在本 ADR 范围

- **`{ side, t }` 的 schema 定义 + compile 分发**→ [ADR-01](./01-structured-target-anchor.md)（本篇只定义 `resolveEdgePoint` / `edgePoint` 几何）。
- **offset 叠加**→ ADR-01 compile 路径（世界系最后叠加）。
- **第三方 shape 的 `{side,t}` 支持**：本篇设 `edgePoint?` 可选 + 不支持报错；不为第三方 shape 提供 generic 兜底（外接矩形边已在选项 B 否决）。
- **角度 anchor / 命名 anchor**：沿用 alpha.3，不动。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/shapes/**`（types.ts `edgePoint` + 4 内置实现）
- 动 `packages/core/src/compile/**`（anchor-cache.ts `resolveEdgePoint`）
- 动 `packages/core/src/geometry/**`（`_edge.ts` + 4 shape edgePoint，属新增纯函数）
- 跨级取最高 = red（`ShapeDefinition` 是 alpha.3 公开扩展面，加方法即契约改动）

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `shapes/types.ts` | 加方法 | `ShapeDefinition.edgePoint?` | `(rect: Rect, side: 'north'\|'south'\|'east'\|'west', t: number) => Position` | undefined（可选） | 边上比例点：真实边界 side 边 t∈[0,1] 处；可选，内置 4 shape 必实现，缺省时 resolveEdgePoint 抛错 |

> `{ side, t }` 的 IR schema（`AnchorRefSchema`）在 ADR-01。本表仅 `ShapeDefinition`（宿主运行时对象、不进 IR）的方法增补。

### 文件 scope

- `packages/core/src/shapes/types.ts`（修改：加 `edgePoint?`）
- `packages/core/src/shapes/{rectangle,circle,ellipse,diamond}.ts`（修改：实现 `edgePoint`）
- `packages/core/src/geometry/_edge.ts`（新建：`EDGE_ENDS` + helper）
- `packages/core/src/geometry/{rect,circle,ellipse,diamond}.ts`（修改：加 `edgePoint` 纯函数）
- `packages/core/src/compile/anchor-cache.ts`（修改：`resolveEdgePoint` + 缓存 + 抛错）
- `packages/core/tests/geometry/edge-point.test.ts`（新建）
- `packages/core/tests/compile/anchor-cache.test.ts`（扩）
- `packages/core/tests/shapes/shape-definition.test.ts`（扩 `edgePoint` 契约）
- `apps/docs/src/contents/core/concepts/anchors/index.{zh,en}.mdx`（修改：`{side,t}` 小节）
- `apps/docs/src/contents/core/examples/edge-proportional-anchor/**`（新建）

### 测试象限

#### Happy path（≥ 3）

- `rect_edge_t_endpoints`：rect `edgePoint('north', 0)` = NW 角、`('north', 1)` = NE 角、`('north', 0.5)` = 上边中点
- `rect_edge_west_north_to_south`：rect `edgePoint('west', 0)` = NW、`('west', 1)` = SW（北→南方向）
- `circle_edge_on_perimeter`：circle `edgePoint('north', 0.5)` 到圆心距离 == radius（点在圆周上，非外接矩形边）；t=0.5 == `anchor('north')`
- `ellipse_edge_on_perimeter`：ellipse（rx≠ry）`edgePoint('east', 0.5)` 满足椭圆方程 `(x/rx)²+(y/ry)²=1`（在周长上）
- `diamond_edge_via_vertex`：diamond `edgePoint('north', 0.5)` == `anchor('north')` 顶点；t=0.25 落在 `north-west` anchor→`north` 顶点连线上（共线校验，在真实斜边上、非内部）

#### 边界（≥ 2）

- `rect_edge_t_zero_one`：t=0 / t=1 精确落两端角（不溢出）
- `circle_edge_arc_endpoints`：circle north 弧 t=0 / t=1 落相邻象限分界角（与 east/west 弧端点重合、无缝）
- `edge_cache_same_ref`：同 `(layout, side, t)` 第二次 `resolveEdgePoint` 返回同一引用（`===`，缓存命中）

#### 错误路径（≥ 2）

- `custom_shape_no_edgepoint_throws`：注入未实现 `edgePoint` 的 shape + `{ side, t }` target → `resolveEdgePoint` 抛 `does not support side anchors`
- `cache_key_namespace_no_collision`：同 layout 先 `resolveAnchor('north')` 再 `resolveEdgePoint('north', 0.5)` → 两结果不串（key `north` vs `north:0.5`）

#### 交互（≥ 2）

- `rotated_rect_edge_local_to_world`：rect `rotate=30°` 的 `edgePoint('north', 0.25)` == 局部边点经 `localToWorld`（旋转正确）
- `edge_point_with_offset`：`{ id, anchor: { side:'north', t:0.5 }, offset:[1,-1] }` → 边点 + offset 世界系（ADR-01 路径，端到端）
- `circle_delegates_ellipse`：circle `edgePoint` 与 `rx=ry` 的 ellipse `edgePoint` 数值一致（委托正确）

### 依赖的现有元素

- `packages/core/src/shapes/types.ts` 的 `ShapeDefinition`（alpha.3）—— **修改**：加可选 `edgePoint`
- `packages/core/src/geometry/rect.ts` 的 `rectAnchor` / `RECT_ANCHORS` / `Rect` —— **引用**：rect `edgePoint` 复用 9-anchor 取两角端点
- `packages/core/src/geometry/{circle,ellipse,diamond}.ts` 的结构 + ops —— **引用 / 扩展**：加 `edgePoint` 弧 / 斜边数学
- `packages/core/src/geometry/_transform.ts` 的 `localToWorld` / `worldToLocal` —— **引用**：旋转处理
- `packages/core/src/compile/anchor-cache.ts` 的 cache WeakMap / `resolveAnchor` —— **修改 / 引用**：加 `resolveEdgePoint` 共用缓存结构
- `packages/core/src/compile/path/anchor.ts`（ADR-01 改）的 `{side,t}` 分发 —— **被调用**：`resolveEdgePoint` 的 compile 调用方

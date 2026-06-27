# ADR-02：`{ side, t }` 边上比例点几何（真实边界 + ShapeDefinition.edgePoint）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.6 plan](./roadmap.md) · 本 milestone [ADR-01](./01-structured-target-anchor.md)（schema + compile 分发）· [alpha.3 ADR-01 Shape Registry](../alpha.3/01-shape-registry.md)（`ShapeDefinition` / anchor 接口）

> **范围**：[ADR-01](./01-structured-target-anchor.md) 把 `{ side, t }` 纳入 schema 并分发到 `resolveEdgePoint`；本篇定义 `resolveEdgePoint` / `ShapeDefinition.edgePoint` 算什么几何。

## 背景 / 约束

- alpha.3 已把 anchor 解释面收敛到 `ShapeDefinition`（命名 anchor + 数字角度），但"边上某比例处"（流程图 / 时序图常要"从节点上边 1/4 处引线"）仓库零实现。需回答：(1) `side` 的"边"是 shape **真实边界**还是外接矩形？(对 rect 一致、对 circle/ellipse/diamond 差别明显) (2) 通用一份还是各 shape 自报、自定义 shape 是否必须支持？
- alpha.3 ADR-01 已拍板「`{side,t}` 留作内置 shape 专属，第三方仅必须支持命名 anchor」——故 `edgePoint` 设为**可选**方法。

## 决策：真实边界 + `ShapeDefinition.edgePoint?` 可选方法，内置 4 shape 必实现

`{ side, t }` 落 shape **真实边界**，各 shape 自报几何（`edgePoint?(rect, side, t)`，签名见 `core/src/shapes/types.ts`）；自定义 shape 不强制，缺省时 `resolveEdgePoint` 抛 `shape 'X' does not support side anchors`。方向约定单一真源 `core/src/geometry/_edge.ts` 的 `EDGE_ENDS`：**north/south = 西→东**（t=0 在 west 端）、**east/west = 北→南**（t=0 在 north 端）。三点（t=0/0.5/1）全落真实边界、与现有 9-anchor 数值重合（保证 `{side,t}` 端点与命名 anchor 无缝）：

- **rectangle**：四直边，`lerp(rectAnchor(a), rectAnchor(b), t)`，`[a,b]=EDGE_ENDS[side]`（角→边中点→角）。
- **circle / ellipse**：该侧 90° 周长弧段，局部角 θ(t) 等角插值（north `225+90t` / south `135−90t` / east `−45+90t` / west `225−90t`，约定 east=0°/south=90°/west=180°/north=270°、顺时针正），点 = `localToWorld(rect, [rx·cosθ, ry·sinθ])`；圆 = rx=ry 椭圆，委托 ellipse。
- **diamond**：该侧**过 cardinal 顶点的两段折线**（邻边中点 anchor → cardinal 顶点 → 邻边中点 anchor，t=0.5 在顶点）——直连两边中点会穿内部、不在边界上。

理由：

1. **真实边界**——圆上点真在圆周、菱形上点真在斜边，视觉符合直觉（外接矩形边会让点悬空在形状外）。
2. **方向约定固定**写进 `EDGE_ENDS` 单一真源。
3. **自定义 shape 不强制**（对齐 alpha.3）：`edgePoint?` 可选、不支持即抛明确错。
4. **几何下沉复用**——`edgePoint` 写 `geometry/*.ts` 纯函数，与 node shape 数学并列消费。

设计细节（具体决策）：

- `edgePoint` 收带 rotate 的 `Rect`（与 `boundaryPoint`/`anchor` 同语义），shape 用 `worldToLocal`/`localToWorld` 处理旋转。
- `resolveEdgePoint` 在 `core/src/compile/anchor-cache.ts`，**缓存 key `${side}:${t}`** 与命名 anchor 共用 layout Map（`'north'` vs `'north:0.5'` 不冲突）。
- circle/ellipse/diamond 三点端点全是现有 anchor，相邻 side 在分界角 / 边中点无缝衔接。
- **等角而非等弧长**（已选）：椭圆 rx≠ry 下 t=0.5 不是弧长中点——与角度 anchor 同心智、实现简单；若后续需"沿边均匀打点"另开 ADR 加等弧长选项。

### 被否决的选项

- **B：外接矩形边、所有 shape 通用一份**——一份代码免费，但圆/椭圆/菱形的"上边点"落外接矩形上、悬空在形状外，与"边上比例点"语义不符。用户拍板要真实边界。
- **C：`{ side, t }` 序列化成字符串 anchor 名复用 `anchor(rect, name)`**——违背对象化初衷，且 `anchor` 契约是离散命名点、硬塞连续参数语义混乱。

## 不在本 ADR 范围

- `{ side, t }` 的 schema + compile 分发 → ADR-01；offset 叠加 → ADR-01 compile 路径。
- 第三方 shape 的 `{side,t}` generic 兜底（选项 B 已否决）；角度 / 命名 anchor 沿用 alpha.3。

---

> **实现指针**：level `red`（`ShapeDefinition` 是 alpha.3 公开扩展面，加方法即契约改动）、向后兼容（第三方现有 shape 不实现仍合法、仅不支持 `{side,t}`）。真源以代码为准——`ShapeDefinition.edgePoint?`（`core/src/shapes/types.ts`）、内置 4 实现（`core/src/shapes/{rectangle,circle,ellipse,diamond}.ts`）、`EDGE_ENDS` + 弧角/斜边纯函数（`core/src/geometry/_edge.ts` 及各 `geometry/*.ts`）、`resolveEdgePoint` + 缓存（`core/src/compile/anchor-cache.ts`）。测试在 `core/tests/{geometry,compile,shapes}/`。完整施工契约（角度表推导 / diamond 折线 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `e6db894b`；压缩前完整施工蓝图 = `git show e6db894b^:notes/decisions/core/v0/v0.2/alpha.6/02-side-t-edge-point.md`。

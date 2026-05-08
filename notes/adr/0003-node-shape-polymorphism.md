# ADR-0003：Node shape 多态与扩展机制

- 状态：Proposed
- 决策日期：2026-05-08
- 关联：[v0-roadmap §v0.1.0-alpha.1](../plans/v0-roadmap.md) · [tikz-gap-analysis §1 P0](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

retikz 当前所有 Node 都是矩形——`compile/node.ts` 的 `layoutNode` / `emitNodePrimitives` 强假设 rect，`geometry/` 也只有 rect 工具。这是流程图 / UML / 网络图最大的阻塞点：

| 场景 | 必需 shape |
|---|---|
| UML 类图 | rectangle |
| 流程图 | rectangle / rounded rectangle / **diamond**（判定）/ **circle**（起止） |
| 状态机 | **circle** / **ellipse** |
| 集合图 | **circle** / **ellipse** |

本 ADR 决定：**首批 shape 集合**、**默认值**、**多态实现机制**。

## 决策

### 1. 首批 shape 集合（4 种）

```
'rectangle' | 'circle' | 'ellipse' | 'diamond'
```

足够覆盖流程图 + UML 95% 场景。`rounded rectangle` 通过给 rectangle 加 `roundedCorners` 字段表达（在 alpha.2 解决），不作为独立 shape。

### 2. 默认值

```ts
shape?: ... // 缺省视为 'rectangle'
```

理由：保持 alpha.0 IR 完全兼容。alpha.0 用户写的 IR 没有 shape 字段，加载 alpha.1 后行为不变。

### 3. 实现机制：起步 switch，v0.4 演进 registry

**alpha.1 起步**：在 `compile/node.ts` 用 switch 分发 shape：

```ts
const layoutNode = (node: IRNode, ...): NodeLayout => {
  switch (node.shape ?? 'rectangle') {
    case 'rectangle': return layoutRectangle(node, ...);
    case 'circle':    return layoutCircle(node, ...);
    case 'ellipse':   return layoutEllipse(node, ...);
    case 'diamond':   return layoutDiamond(node, ...);
  }
};
```

`emitNodePrimitives` 同样按 shape 分发。

**v0.4 演进**：引入 TikZ libraries 概念时（`shapes.geometric` / `shapes.misc` / ...），把 switch 重构为 registry：

```ts
type ShapeImpl = {
  layout: (node, ...) => NodeLayout;
  anchor: (layout, name) => Position;
  boundaryPoint: (layout, toward) => Position;
  emit: (layout, round) => Array<ScenePrimitive>;
};

const shapes: Record<string, ShapeImpl> = {};
// shapes.geometric library: shapes.diamond / shapes.regularPolygon / ...
```

不在 alpha.1 提前做 registry——4 个 shape 用 switch 简单清晰，过早抽象 registry 反而把"shape 边界"提前固化。

## 选项对比

### shape 集合

| 选项 | 内容 | 评价 |
|---|---|---|
| A（推荐） | rectangle / circle / ellipse / diamond | 足够覆盖流程图 + UML 主流；diamond 是流程图判定节点必需 |
| B | A + roundedRectangle | 圆角通过 `rectangle + roundedCorners` 表达更正交，不需独立 shape |
| C | A + regularPolygon | hexagon / triangle 等可由通用 polygon 表达，但 alpha.1 用例不刚需，留 v0.2+ |

### 实现机制

| 选项 | 内容 | 评价 |
|---|---|---|
| A1（推荐） | switch 起步 | 简单清晰，4 个 case 不冗余 |
| A2 | 直接 registry | 提前抽象；shape 边界还没稳定就固化接口 |
| A3 | class 继承 | OOP 反模式，retikz IR 是数据 + 函数，不引入 class |

## 理由

1. **首批 4 个 shape 是流程图 + UML 主流"够用"**：少了不行（diamond 是流程图判定刚需），多了 alpha.1 完不成
2. **默认 rectangle 保持向后兼容**：alpha.0 → alpha.1 升级零改 IR
3. **switch 起步避免抽象债**：v0.4 自然遇到 libraries 边界时再抽 registry，那时知道哪些接口稳定、哪些会变；现在抽 registry 等于猜
4. **roundedCorners 不作为独立 shape**：圆角是 rectangle 的视觉属性，不是几何形状本身——分离正交

## 影响

### IR Schema

`packages/core/src/ir/node.ts`：

```ts
export const NodeShapeSchema = z.enum(['rectangle', 'circle', 'ellipse', 'diamond']);
export type NodeShape = z.infer<typeof NodeShapeSchema>;

export const NodeSchema = z.object({
  // ...
  shape: NodeShapeSchema.optional()
    .describe('节点形状；省略视为 rectangle'),
  // ...
});
```

### Geometry 新增

- `packages/core/src/geometry/circle.ts`：`{ center: [x,y], radius }` + `boundaryPoint` + 9 anchor
- `packages/core/src/geometry/ellipse.ts`：`{ center, rx, ry, rotate? }` + `boundaryPoint` + 9 anchor
- `packages/core/src/geometry/diamond.ts`：4 顶点菱形（外接 width × height）+ `boundaryPoint`（射线法求交线段）+ anchor

每个 geometry 模块导出与 `rect` 同形 API（`anchor` / `boundaryPoint` / `contains` / `center`）。

### Compile 重构

`packages/core/src/compile/node.ts`：

- `NodeLayout` 加 `shape: NodeShape`，按 shape 各自存几何参数（rect 存 width/height，circle 存 radius，ellipse 存 rx/ry，diamond 存 width/height）
- `layoutNode` switch 分发到 `layoutRectangle` / `layoutCircle` / `layoutEllipse` / `layoutDiamond`
- `emitNodePrimitives` 按 shape 分发：rectangle 走 RectPrim；circle/ellipse 走新 EllipsePrim 或 path d；diamond 走 path d

### Primitive 新增 / 调整

权衡：

| 选项 | 评价 |
|---|---|
| 新增 `EllipsePrim` / `PolygonPrim` | 语义清晰；renderer 可针对性优化（SVG `<ellipse>` / `<polygon>` 比 `<path>` 短） |
| 全部走 `PathPrim` 的 d 字符串 | 简化 primitive 类型；renderer 只认 path——但失去标签语义、Canvas 反而要解析 d |

**选择**：alpha.1 引入 `EllipsePrim`（覆盖 circle + ellipse），diamond 走 `PathPrim`。

```ts
// packages/core/src/primitive/ellipse.ts
export type EllipsePrim = {
  type: 'ellipse';
  cx: number; cy: number;
  rx: number; ry: number;
  rotate?: number;  // 度数，绕中心
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  // ... 其他视觉属性同 RectPrim
};
```

### Compile path.ts 改动

`emitPathPrimitive` 中的 `boundaryPoint` 调用要按 shape 多态：

```ts
const node = nodeIndex.get(target);
points.push(boundaryPointForShape(node, neighbor));  // 按 shape 分发
```

### React renderer

`packages/react/src/render/renderPrim.tsx` 加 `'ellipse'` case → `<ellipse cx cy rx ry transform>`。

### React DSL

- `Node.tsx` `NodeProps` 加 `shape?`
- `_builder.ts` / `_unbuilder.ts`：透传

## 等价性测试

- 不传 shape == 传 `'rectangle'`
- circle 节点的 boundaryPoint：从中心向 toward 方向射线，交点距中心 = radius
- ellipse 节点的 boundaryPoint：旋转后用本地坐标求与单位圆的交，再缩放回去
- diamond 节点的 boundaryPoint：射线与 4 条边求交，取最近交点
- 所有 shape 的 9 anchor 与 `rect.anchor` 同名同义

## 待办

- [ ] geometry 三个新模块
- [ ] EllipsePrim 类型 + renderer
- [ ] compile/node.ts 多态化
- [ ] compile/path.ts boundaryPoint 多态化
- [ ] schema + React DSL 透传
- [ ] 各 shape 测试覆盖

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.1（本 ADR） | 4 shape，switch 分发 |
| v0.2+ | 加 `roundedCorners` 等视觉属性（不增 shape） |
| v0.4 | 引入 libraries 概念，switch → registry，shape 名空间化（`shapes.geometric.diamond` 等） |

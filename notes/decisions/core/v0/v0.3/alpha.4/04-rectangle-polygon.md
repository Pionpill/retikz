# ADR-04：rectangle/polygon——rectangle 参数化（roundedCorners 入 params）+ regular polygon，diamond 收为 polygon 别名

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · 依赖：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)（nested params + defineShape + 双护栏） · 文档页：`apps/docs/src/contents/core/components/shapes/rectangle-polygon/`

> **依赖 ADR-01**：按 01 接口实现；与 02/03/05 并发。rectangle / polygon 是**文本容器形状**——`circumscribe` 从文本内框（`innerHalfWidth/Height`）推外接，params 只调形态（边数 / 圆角 / 自旋），尺寸仍由内框 + `minimumSize` 驱动（区别于 sector / star 的 params-半径驱动）。

## 背景

- rectangle 的 `roundedCorners` 现为 `Node` 顶层字段（「only effective on rectangle」）——形状专属参数错放顶层，[ADR-01](./01-shape-params-generalization.md) 要消除的反模式，本 ADR 迁入 rectangle params。
- core 无 regular polygon；现有 `diamond` 本质是旋转 45° 的正方形（4-gon），与 polygon 几何重复。

## 决策：rectangle 参数化 + regular polygon 新增，diamond 收为 polygon preset 别名

```ts
// rectangle —— roundedCorners 从 Node 顶层迁入 params（文本容器，尺寸仍由内框驱动）
export const rectangle = defineShape({
  paramsSchema: z.strictObject({
    roundedCorners: z.number().finite().nonnegative().optional().describe('Corner radius in user units; 0 / omitted = sharp corners.'),
  }),
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),   // identity（现状）
  // boundaryPoint / anchor / edgePoint / emit 复用现有 rectangle 几何 + roundedCorners
});

// regular polygon —— sides 顶点落外接圆，rotate 定起始角
export const polygon = defineShape({
  paramsSchema: z.strictObject({
    sides: z.number().int().min(3).describe('Number of sides of the regular polygon (≥3).'),
    rotate: z.number().finite().optional().describe('Shape self-rotation in degrees (vertex start direction); default 0. Composes with Node.rotate.'),
  }),
  circumscribe: (hw, hh, p) => /* 能容纳内框的正 p.sides 边形外接圆 → 其 AABB 半轴 */,
  // boundaryPoint：中心向 toward 射线 ∩ 多边形边；anchor：顶点 / 边中点 / 命名 anchor
});
// diamond ≡ { type: 'polygon', params: { sides: 4, rotate: 45 } }
// shape: 'diamond'（裸 string）在 compile/node.ts 规范化为上式
```

- **polygon emit**：`sides` 个顶点在外接圆（circumscribe 派生半径）上、按 `rotate` 定起始角，连成闭合 path；`position` = AABB 中心（正多边形对称，= 内框中心，自然对齐 [ADR-01](./01-shape-params-generalization.md) 的 AABB 中心约束）。
- **rectangle**：现有几何复用，仅 `roundedCorners` 从顶层挪进 params。
- diamond 几何不再独立实现，走 polygon `sides:4, rotate:45`。

**`roundedCorners` 迁移**：params.roundedCorners 优先；迁移期顶层 `Node.roundedCorners` 仍生效（回退、标 deprecated）。最终删顶层待兼容窗口后另议（超本 ADR）。

理由：单一 polygon 几何覆盖 diamond；roundedCorners 归位；与 circle→ellipse、preset 别名一致。

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- 顶层 `roundedCorners` 最终删除（迁移期并存；删除待兼容窗口）。
- 非正多边形 / 任意点列 polygon（仅 regular polygon）。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/alpha.4/04-rectangle-polygon.md`（封板全文）。

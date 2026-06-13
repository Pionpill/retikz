# ADR-05：star——星形 shape（角数 + 内外半径）

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · 依赖：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)（nested params + defineShape + 双护栏 + circumscribe 精确 AABB） · 文档页：`apps/docs/src/contents/core/components/shapes/star/`

> **依赖 ADR-01**：按 01 接口实现；与 02/03/04 并发。star 是 **params-半径驱动的纯几何形状**（像 sector，尺寸由 `outerRadius` 定、忽略文本内框），区别于 rectangle / polygon 的文本容器语义。

## 背景

core 无星形 shape。星形（评分、徽标、标注强调）是常见图元，几何为外径 / 内径交替的 `2×points` 顶点闭合多边形。

## 决策：star 注册 shape，nested params 为角数 + 内外半径

```ts
// packages/core/core/src/shapes/star.ts —— 经 defineShape，params-半径驱动
export const star = defineShape({
  paramsSchema: z.strictObject({
    points: z.number().int().min(3).describe('Number of star points (≥3).'),
    innerRadius: z.number().finite().positive().describe('Inner (notch) radius in user units.'),
    outerRadius: z.number().finite().positive().describe('Outer (tip) radius in user units; must be > innerRadius.'),
    rotate: z.number().finite().optional().describe('Shape self-rotation in degrees; default 0 (first tip at polar 0°=+x). Composes with Node.rotate.'),
  }),
  circumscribe: (_hw, _hh, p) => starGeometry(p).aabbHalfAxes,   // 据顶点 + rotate 算精确 AABB
  // boundaryPoint / anchor / emit 共用同一 starGeometry(p)（单一真源，保坐标一致）
});
```

几何契约（沿 [ADR-01](./01-shape-params-generalization.md) / [ADR-03](./03-arc-sector.md) 同款）：`circumscribe` / `boundaryPoint` / `anchor` / `emit` 共用内部 `starGeometry(params)`，算出 `2×points` 个顶点（外径尖角 / 内径凹角交替、均布、按 `rotate` 定起始）+ 精确 AABB（含尖角，随 rotate 变）；`position` = AABB 中心。

- **emit**：顶点连成闭合 path。
- **boundaryPoint**：中心向 toward 射线 ∩ 星形边。
- **anchor**：`center` / `tip-N`（第 N 尖角）/ `notch-N`（第 N 凹角）/ 角度 / 边上比例点。

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- 非规则星形 / 自定义尖角轮廓（仅规则星形）。
- star 内置文本居中（params 驱动尺寸，不按文本内框；如需另议）。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/alpha.4/05-star.md`（封板全文）。

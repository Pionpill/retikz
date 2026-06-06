# ADR-05：star——星形 shape（角数 + 内外半径）

- 状态：Proposed
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

## DSL 表面（react + vanilla）

```tsx
<Node shape={{ type: 'star', params: { points: 5, innerRadius: 16, outerRadius: 40 } }} />
```

```ts
node('s', { shape: { type: 'star', params: { points: 5, innerRadius: 16, outerRadius: 40 } } });
```

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- 非规则星形 / 自定义尖角轮廓（仅规则星形）。
- star 内置文本居中（params 驱动尺寸，不按文本内框；如需另议）。

---

## 实现契约（必填）🔻

### Level
`red`（动 `src/shapes/**`）。

### Schema 改动
| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/shapes/star.ts` | 新建 paramsSchema | `points`/`innerRadius`/`outerRadius`/`rotate` | `z.strictObject({ points: z.number().int().min(3), innerRadius: pos, outerRadius: pos, rotate: finite.optional() })` | `rotate=0` | 星角数、内外半径、自旋 |

### 文件 scope
- `src/shapes/star.ts`（新建）
- `src/shapes/_shared.ts`（扩：`starGeometry` helper，如需）
- `src/shapes/index.ts`（注册）
- `apps/docs/src/contents/core/components/shapes/star/`（文档 + demo 已存在，校对）
- `tests/geometry/star.test.ts`（新建）

### 测试象限

**Happy path（≥ 3）**：
- `star_2n_vertices_alternating`：`points:5` → 10 顶点、外径 / 内径交替均布
- `star_emit_closed`：emit 产闭合星形 path
- `star_anchors`：`tip-0` / `notch-0` / `center` 坐标符几何
- `star_default_first_tip_at_zero`：`rotate:0` → 第一尖角在 polar 0°（+x）

**边界（≥ 2）**：
- `star_points_3_minimum`：`points:3` → 三角星
- `star_inner_near_outer_degenerates`：`innerRadius→outerRadius` → 近正多边形
- `star_rotate_wraps`：`rotate:360+k` → 与 `rotate:k` 等价

**错误路径（≥ 2）**：
- `star_points_lt_3_rejected`：`points:2` → reject
- `star_outer_le_inner_rejected`：`outerRadius ≤ innerRadius` → reject
- `star_missing_field_rejected`：缺 `outerRadius` → strictObject reject

**交互（≥ 2）**：
- `star_self_rotate_plus_node_rotate`：`params.rotate` + Node `rotate` 叠加 → 顶点 / AABB 正确
- `star_with_scale`：× `scale` → 尺寸协同
- `star_path_connect_tip`：`<Path from={{id:'s', anchor:'tip-0'}}>` → 命中第一尖角

### 依赖的现有元素
- [ADR-01](./01-shape-params-generalization.md) `defineShape` / nested params / circumscribe 精确 AABB—— **依赖**。
- `src/shapes/_shared.ts` 的 anchor / 几何 helper—— **复用 / 扩展**。

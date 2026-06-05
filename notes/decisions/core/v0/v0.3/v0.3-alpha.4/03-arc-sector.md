# ADR-03：arc/sector——弧与环楔 shape（内外半径 + 起止角），plot polar 扇形的下沉目标

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · 依赖：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)（nested params + defineShape + 双护栏 + circumscribe 返回精确 AABB） · 下游：[plot v0.1-alpha.4](../../../../plot/v0/v0.1/roadmap.md)（polar bar→sector）· 文档页：`apps/docs/src/contents/core/components/shapes/arc-sector/`

> **依赖 ADR-01**：按 01 接口实现；与 02/04/05 并发。本形状是 plot polar 闭环的 core 侧前置——plot bar 在极坐标下沉为**可连接 sector Node**（plot 选 (i) 投影整形路线）。

## 背景

core 无弧 / 扇形 shape。极坐标图（plot polar bar / pie / donut / rose）与角度标注需要：

- **sector（环楔）**：内半径→外半径、起始角→终止角围成的 2D 区域（填充）；`innerRadius=0` 退化为扇片。
- **arc（弧）**：单半径上起止角之间的 1D 曲线（描边、可选闭合）。

retikz 要求图元一等可连接，故 sector 必须是带 `boundaryPoint` / `anchor` 的 Node shape，而非裸 Path。

## 决策：sector / arc 两个注册 shape，nested params 为内外半径 + 起止角

```ts
// packages/core/core/src/shapes/sector.ts —— 经 defineShape，nested params
export const sector = defineShape({
  paramsSchema: z.strictObject({
    innerRadius: z.number().finite().nonnegative().describe('Inner radius (user units); 0 = solid pie slice.'),
    outerRadius: z.number().finite().positive().describe('Outer radius (user units); must be > innerRadius.'),
    startAngle: z.number().finite().describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
    endAngle: z.number().finite().describe('End angle in degrees; swept counterclockwise in screen space from startAngle.'),
  }),
  // 见「几何契约」：四函数共用同一 sectorGeometry(params)
  circumscribe: (_hw, _hh, p) => sectorGeometry(p).aabbHalfAxes,
  boundaryPoint: (rect, toward, p) => /* 质心向 toward 求 ∩ 轮廓 */,
  anchor: (rect, name, p) => /* apex / centroid / inner-arc-mid / outer-arc-mid / start-edge-mid / end-edge-mid */,
  emit: (rect, style, round, p) => /* path：外弧 + 径向边 + 内弧 */,
});

// arc：单半径曲线（描边、可选闭合）
export const arc = defineShape({
  paramsSchema: z.strictObject({
    radius: z.number().finite().positive().describe('Arc radius (user units).'),
    startAngle: z.number().finite().describe('Start angle in degrees (polar 0°=+x, 90°=+y screen y-down).'),
    endAngle: z.number().finite().describe('End angle in degrees.'),
    close: z.boolean().optional().describe('When true, close the arc into a chord/segment outline (fillable); default false = open stroked arc.'),
  }),
  /* ... */
});
```

**几何契约（钉死 P2-1）**：sector / arc 的 `circumscribe` / `boundaryPoint` / `anchor` / `emit` **共用同一个内部 `sectorGeometry(params)`**（单一真源），它据 params 算出：

- **精确 AABB**：含整个环楔的轴对齐外接框——不止四角，还要**含弧跨过 0°/90°/180°/270° 处的 `outerRadius` 极值点**（否则 viewBox / scope.id bbox 裁掉弧顶）。`circumscribe` 返回其半轴；**`Node.position` = AABB 中心**（对齐 `compile.ts:487-493` 只累积 `layout.rect` 四角的 bbox 机制）。
- **圆心 / 质心在 AABB 局部坐标的偏移**：圆心（apex）常在 AABB 外、非 position；质心在环楔内，供 `boundaryPoint` 作向外射线起点。
- sector 的尺寸来自 params 半径，**不依赖文本内框**（`innerHalfWidth/Height` 入参忽略）；anchor 用极坐标语义命名。

理由：单一 `sectorGeometry` 保证四函数坐标一致（评审 P2-1：避免裁剪 / bbox / 贴边不一致）；position=AABB 中心对齐现有 bbox，plot lowering 与 core 不互猜（plot 给 sector 的 position 就是其 AABB 中心）。

## DSL 表面（react + vanilla）

```tsx
<Node shape={{ type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } }} />
<Node shape={{ type: 'arc', params: { radius: 50, startAngle: 30, endAngle: 150 } }} />
<Path from={{ id: 'wedge', anchor: 'outer-arc-mid' }} to={[120, -20]} />   {/* 扇形可连接 */}
```

```ts
node('wedge', { shape: { type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } }, position: [0, 0] });
node('a', { shape: { type: 'arc', params: { radius: 50, startAngle: 30, endAngle: 150 } } });
```

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- plot 侧 polar coordinate / bar→sector lowering（plot v0.1-alpha.4）；本 ADR 只给 core shape。
- 圆心偏移形状的相对定位深度适配——position=AABB 中心 + circumscribe 精确 AABB 已满足现有 bbox / 裁剪 / 连接。

---

## 实现契约（必填）🔻

### Level
`red`（动 `src/shapes/**`，可能 `src/compile/**` 若 emit 需新增 ScenePrimitive；倾向复用 core path 弧能力，不新增 primitive）。

### Schema 改动
| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/shapes/sector.ts` | 新建 paramsSchema | `innerRadius`/`outerRadius`/`startAngle`/`endAngle` | `z.strictObject({...})` 全 finite number | — | 环楔内外半径与起止角（polar 约定） |
| `src/shapes/arc.ts` | 新建 paramsSchema | `radius`/`startAngle`/`endAngle`/`close` | `z.strictObject({...})`，close `z.boolean().optional()` | `close=false` | 弧半径、起止角、是否闭合 |

### 文件 scope
- `src/shapes/sector.ts` / `src/shapes/arc.ts`（新建）
- `src/shapes/_shared.ts`（扩：`sectorGeometry` + 极坐标 anchor helper）
- `src/shapes/index.ts`（注册）
- `packages/core/render/**`（若 emit 用现有 path 弧则零改动；如需新 prim 则补 svg/canvas，实现时确认）
- `apps/docs/src/contents/core/components/shapes/arc-sector/`（文档 + demo 已存在，校对）
- `tests/geometry/sector.test.ts` / `tests/geometry/arc.test.ts`（新建）

### 测试象限

**Happy path（≥ 3）**：
- `sector_emit_outline`：emit 产「外弧 + 两径向边 + 内弧」闭合 path（innerRadius>0）
- `sector_anchors_correct`：`outer-arc-mid` / `inner-arc-mid` / `apex`（圆心）/ `centroid` 坐标符几何
- `sector_pie_slice`：`innerRadius=0` → 扇片（径向边交于圆心、无内弧）
- `arc_open_stroke`：arc `close:false` → 开放描边弧；`close:true` → 闭合弓形

**边界（≥ 2）**：
- `sector_aabb_includes_axis_extrema`：弧跨 90°（如 start=45,end=135）→ circumscribe AABB 含 +y 方向 `outerRadius` 极值点（不止四角）
- `sector_near_full_circle`：end−start 接近 360° → AABB 近 `2·outerRadius` 方框
- `sector_end_before_start`：`endAngle<startAngle` → 按约定（取模 / 反向）产合法环楔

**错误路径（≥ 2）**：
- `sector_outer_le_inner_rejected`：`outerRadius ≤ innerRadius` → paramsSchema reject
- `sector_non_finite_angle_rejected`：`startAngle: Infinity` → reject
- `sector_missing_field_rejected`：缺 `outerRadius` → strictObject reject

**交互（≥ 2）**：
- `sector_with_rotate`：Node `rotate` × sector → AABB / anchor 经 rotate 正确（rotate 施于 AABB 中心）
- `sector_path_connect_outer_arc`：`<Path from={{id:'w', anchor:'outer-arc-mid'}}>` → 命中外弧中点
- `sector_position_is_aabb_center`：sector 的 viewBox / scope.id bbox 与其 `layout.rect` 四角一致（position=AABB 中心，验证 `compile.ts:487` 路径不裁弧）

### 依赖的现有元素
- [ADR-01](./01-shape-params-generalization.md) `defineShape` / nested params / 双护栏 / circumscribe 精确 AABB 契约—— **依赖**。
- core path 弧能力（`src/ir/path/**`，现有 arc 段）—— **复用**：emit 弧段。
- 现有 polar 约定（`src/ir/position/polar-position.ts`，0°=+x / 90°=+y screen-down）—— **复用**：角度语义一致。
- bbox 累积（`src/compile/compile.ts:487-493`）—— **依赖**：position=AABB 中心 + circumscribe 精确 AABB 的约束来源。

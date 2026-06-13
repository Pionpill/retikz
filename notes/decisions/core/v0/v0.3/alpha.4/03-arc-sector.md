# ADR-03：arc/sector——弧与环楔 shape（内外半径 + 起止角），plot polar 扇形的下沉目标

- 状态：Accepted
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

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- plot 侧 polar coordinate / bar→sector lowering（plot v0.1-alpha.4）；本 ADR 只给 core shape。
- 圆心偏移形状的相对定位深度适配——position=AABB 中心 + circumscribe 精确 AABB 已满足现有 bbox / 裁剪 / 连接。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/alpha.4/03-arc-sector.md`（封板全文）。

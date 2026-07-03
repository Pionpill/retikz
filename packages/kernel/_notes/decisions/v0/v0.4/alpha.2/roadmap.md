# v0.4.0-alpha.2 实施待办

> 写于 2026-06-14；2026-06-15 收尾对账；2026-07-03 回填 changelog 封口状态。本 stage 两个独立子项目均已实现、通过验证并同步 changelog。
>
> 关联：[`ADR-01 可嵌入 Tier2`](./01-embeddable-tier2-in-layout.md)（Accepted MVP）· [`ADR-02 scope 多态 bbox`](./02-scope-polymorphic-bbox.md)（Accepted MVP）· [`v0.4 roadmap`](../roadmap.md)

## 进度看板

| # | 子项 | ADR | 状态 |
|---|---|---|---|
| S | scope 多态 bbox（MVP: rectangle + circle） | [ADR-02](./02-scope-polymorphic-bbox.md) | ✅ 已实现并同步 changelog |
| E | 可嵌入 Tier2 in `<Layout>` | [ADR-01](./01-embeddable-tier2-in-layout.md) | ✅ 已实现并同步 changelog |

## S — scope 多态 bounding shape（MVP）

MVP = `rectangle`（现状逐字不变）+ `circle`（子树点集最小外接圆）。`polygon` / `ellipse` 缓做（理由见 ADR-02「实现决策」）。circle 复用 `<Node shape="circle">` 的既有 anchor/boundary 路径，零新 anchor 代码。

实现切片（每片单独 commit）：

- **S1 · math**：`@retikz/math` 新增 `minimalEnclosingCircle(points): Circle | null`（Welzl），复用 `triangle.circumcircle`；单测（含退化：空/单点/两点/共线/随机点集正确性）。
- **S2 · IR schema**：`ir/scope.ts` 加受控枚举 `boundingShape?: 'rectangle' | 'circle'`（IRScope + ScopeSchema，`.describe` 英文）；react `_fields.ts` 的 `SCOPE_FIELDS` 加 `'boundingShape'`（过 exhaustiveness check）；`Scope.tsx` 的 `ScopeProps` 加字段。vanilla 自动透传（结构别名）。schema 单测覆盖合法值与非法值拒绝。
- **S3 · compile**：`compile/scope.ts` 抽 `collectScopeCornerPoints(layouts)`；`registerScopeAsLayout` 接 `boundingShape`：缺省/`rectangle` → 现状 AABB；`circle` → ellipse def + `{circumscribe:'equal'}` + 正方 rect(MEC)。枚举外值由 schema 在 parse 边界拒绝，不进入 compile 回退。
- **S4 · 测试**：`tests/compile/scope-bbox-shape.test.ts`——circle 包络的 compass/角度 anchor 落圆周、boundaryPoint 正确；rectangle 缺省逐字不变；schema 测试覆盖枚举外 boundingShape 拒绝；下游 `tsc` + 全仓 lint。
- **S5 · 文档**：`apps/docs` Scope 页（`core/components/layout/scope`）加 `boundingShape` prop（双语 + 必要 demo：圆形包络连线落圆周 vs 矩形 AABB 对比）。

### 验收（S）

- `boundingShape='circle'` 时 `name.north` / `name.30` / 连线端点落**圆周**；缺省/`rectangle` 行为逐字不变（既有 scope-bbox 测试全过）。
- math MEC 单测过；core + 下游 tsc/lint 全绿；docs 同步。
- 向后兼容：新字段 optional、additive，不破坏现有 IR/测试。

### 待决（S，留后）

- `polygon` 包络：需新增「显式顶点凸多边形」ShapeDefinition（anchor/boundaryPoint over 任意凸包）。
- `ellipse` 包络：需「轴对齐外接椭圆」算法。
- `padding` / inset 外扩。

## E — 可嵌入 Tier2

已实现。外部 LLM 评审已过（2026-06-13，6 findings 全采纳）；适配器注册形态 2026-06-15 人工签字 = **组件静态属性**（MVP），`<Layout embeddables>` 显式 prop 作可选逃生舱。core-react 机制（builder + collect-hydration-handlers + Layout + `EmbeddableTier2Adapter` 接口）按 ADR-01「影响」段落落地；plot 侧 `<Plot>` 嵌入态归 plot ADR-02 L2-a，不在本切片。

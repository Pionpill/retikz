# v0.4.0-alpha.2 实施待办

> 写于 2026-06-14。本 stage 两个独立子项目，状态不同：scope 多态 bbox 已收敛进实现；可嵌入 Tier2 仍 Draft、待人工签字 + 外部评审，未启动。
>
> 关联：[`ADR-01 可嵌入 Tier2`](./01-embeddable-tier2-in-layout.md)（Draft）· [`ADR-02 scope 多态 bbox`](./02-scope-polymorphic-bbox.md)（Accepted MVP）· [`v0.4 roadmap`](../roadmap.md)

## 进度看板

| # | 子项 | ADR | 状态 |
|---|---|---|---|
| S | scope 多态 bbox（MVP: rectangle + circle） | [ADR-02](./02-scope-polymorphic-bbox.md) | 实现中 |
| E | 可嵌入 Tier2 in `<Layout>` | [ADR-01](./01-embeddable-tier2-in-layout.md) | Draft / 待人工签字 + 外部评审，未启动 |

## S — scope 多态 bounding shape（MVP）

MVP = `rectangle`（现状逐字不变）+ `circle`（子树点集最小外接圆）。`polygon` / `ellipse` 缓做（理由见 ADR-02「实现决策」）。circle 复用 `<Node shape="circle">` 的既有 anchor/boundary 路径，零新 anchor 代码。

实现切片（每片单独 commit）：

- **S1 · math**：`@retikz/math` 新增 `minimalEnclosingCircle(points): Circle | null`（Welzl），复用 `triangle.circumcircle`；单测（含退化：空/单点/两点/共线/随机点集正确性）。
- **S2 · IR schema**：`ir/scope.ts` 加 `boundingShape?: string`（IRScope + ScopeSchema，`.describe` 英文）；react `_fields.ts` 的 `SCOPE_FIELDS` 加 `'boundingShape'`（过 exhaustiveness check）；`Scope.tsx` 的 `ScopeProps` 加字段。vanilla 自动透传（结构别名）。schema 单测。
- **S3 · compile**：`compile/scope.ts` 抽 `collectScopeCornerPoints(layouts)`；`registerScopeAsLayout` 接 `boundingShape`：缺省/`rectangle` → 现状 AABB；`circle` → ellipse def + `{circumscribe:'equal'}` + 正方 rect(MEC)；未知名 → warn + rectangle 回退。`compile.ts` 调用点传 `child.boundingShape`。compile warning code 视需要加。
- **S4 · 测试**：`tests/compile/scope-bbox-shape.test.ts`——circle 包络的 compass/角度 anchor 落圆周、boundaryPoint 正确；rectangle 缺省逐字不变；未知 boundingShape warn + 回退；下游 `tsc` + 全仓 lint。
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

未启动。Draft + RED + 待人工签字（适配器注册形态）+ 必走外部 LLM 评审，且是 plot ADR-02 硬依赖。正式做时走 brainstorm → spec → plan + 签字 + 评审。

# ADR-01：coordinate frame N 通道泛化 + 位置 encoding 角色化 + 每坐标系维度契约 + guide 维度校验

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.5 CoordinateSystem / §8.3 投影分层 / §3.6 Encoding](../../../../../architecture/plot-design.md) · 前身：[alpha.4 ADR-01 coordinate 抽象](../v0.1-alpha.4/01-coordinate-polar.md)（polar 逼出 frame）· 下游：[ADR-02 cartesian1D](./02-cartesian1d.md) / [ADR-03 ternary2D](./03-ternary2d.md)

## 背景

alpha.4 用 polar 逼出 coordinate frame 抽象（scale 归一化 → 投影 → mark 几何的可替换中间层）。该抽象有两处「2 通道」写死，挡住 1 通道（cartesian1D）/ 3 通道（ternary2D）坐标系：

1. **frame 投影写死 2 入参**：`project(primaryValue, secondaryValue)` 恰好两个位置值；cartesian1D 只投 1 个、ternary 要投 3 个（a/b/c → 重心 → 2D），签名装不下。
2. **位置 encoding 双必填 x/y、无角色通道**：`PositionEncodingSchema` 仅 x/y 且都必填。polar 靠 coordinate 把 x→angle / y→radius 映射够用，但 ternary 要绑 3 字段装不下、cartesian1D 要 y 可省（评审 P1）。

外加 alpha.4 遗留 cross-review P2：guide 维度不按坐标系校验，`<Axis dimension="angle">` 在 cartesian 下不被拒、渲杂散轴线。

本 ADR 是 alpha.9 唯一真叶子（同 alpha.4 ADR-01）：把缝切干净、**不新增坐标系**（cartesian1D / ternary 由 ADR-02/03 接入），cartesian / polar 零回归。

## 决策

**(1) frame N 通道泛化**：`CoordinateFrame` 加 `roles: ReadonlyArray<DimensionRole>`（位置角色序）+ `projectRoles(values)`（按 roles 序投影成屏幕点）。cartesian/polar 的 projectRoles 内部解构 `[primary, secondary]` 调既有逻辑，2 入参 `project` 保留为便捷别名，投影数值零变化。`DimensionRole` 与 `GuideDimension` 复用同名字面量（x/y/angle/radius/a/b/c），值对齐、类型各自管。

**(2) 位置 encoding 角色化**（评审 P1）：`PositionEncodingSchema` 的 x/y 从必填转**可选**（schema 层放宽，非 breaking）；必填性下放 coordinate 级校验——lowering 在建 frame 前按坐标系要求的角色集校验 encoding，缺角色 fail-loud。cartesian2D 需 x+y、polar2D 需 x+y（映射 angle/radius），靠 coordinate 校验补回必填语义，存量 spec 不破。新增角色通道（ternary a/b/c）由 ADR-03 落。

**(3) 每坐标系合法 dimension 集 + guide 校验**（修 cross-review P2）：每坐标系声明合法维度集——cartesian2D `{x,y}`、polar2D `{angle,radius,x,y}`（含 alpha.4 x/y 别名，勿删）。lowerGuide 前校验 `guide.dimension ∈ 合法集`，否则 fail-loud，消灭杂散轴线。

理由：N 通道角色是 1D/ternary 数据进入 frame 的前提（本轮全部下游地基，同 alpha.4 ADR-01 之于 polar）；x/y 可选靠 coordinate 校验补回、projectRoles 包装既有投影，零回归；维度校验把「静默出怪图」改成 fail-loud（修正方向，不破合法 spec）。

> 起草期决策点已定：projectRoles 取**数组按 roles 序**（非 Record）；2 入参 project **保留别名**、mark 侧逐步迁；必填角色校验落 **expand 建 frame 前**（与 scale 绑定校验同处）；位置角色与 guide dimension 复用同名字面量、类型各自管。

## 影响

- **Plot IR**：`PositionEncodingSchema` x/y 转 `.optional()`（放宽，非 breaking——既有带 x/y 的 spec 仍合法）；`GuideDimension` 本 ADR 不改（ternary a/b/c 由 ADR-03）。
- **对外 API**：x/y 可选（放宽）；cartesian/polar 缺位置通道 / 非法 guide 维度从「静默出怪图」变 **fail-loud**——行为收紧但此前是 bug，不破合法 spec。
- **core**：无影响（纯 plot 内）。

## 不在本 ADR 范围

- cartesian1D / ternary2D 坐标系本身 → [ADR-02](./02-cartesian1d.md) / [ADR-03](./03-ternary2d.md)。
- a/b/c encoding 角色通道 → [ADR-03](./03-ternary2d.md)（ternary 专属）。
- React / vanilla mark props 角色化（x/y 可选 + a/b/c）→ [ADR-04](./04-dsl-docs.md)（schema 契约在此定、表面在 04 落）。

## 实现指针

最终形态见 `packages/plot/plot/src/lower/project.ts`（frame `roles` / `projectRoles` / `createCartesianFrame` / `createPolarFrame`）、`src/lower/coordinate-meta.ts`（`VALID_GUIDE_DIMENSIONS` 每坐标系合法维度集）、`src/lower/expand.ts`（`assertValidGuideDimensions` + 必填角色校验）、`src/ir/encoding.ts`（x/y `.optional()`）；测试 `tests/lower/coordinate-frame.test.ts` + `tests/ir/encoding.schema.test.ts`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 329fb8b7:notes/decisions/plot/v0/v0.1/v0.1-alpha.9/01-coordinate-frame-roles.md`（封板全文）。

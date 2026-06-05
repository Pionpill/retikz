# ADR-03：geometry 4 shape 共享 `localToWorld` / `worldToLocal` + 死 `*Anchor` 类型清理

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-8](./roadmap.md) · [packages/core/AGENTS.md "geometry 是跨平台纯数学"](../../../../../../packages/core/AGENTS.md)

> **范围**：`geometry/{rect,circle,ellipse,diamond}.ts` 四份一字不差的 `localToWorld` / `worldToLocal` 抽成共享 helper；三个与 `RectAnchor` 字面量完全相同、且零消费方的 `*Anchor` 类型删除。

## 背景 / 约束

- 四份 `localToWorld` / `worldToLocal` 实现一字不差，只是参数类型名不同（`Rect` / `Circle` / `Ellipse` / `Diamond`），共享接口都是 `{ x; y; rotate? }`——典型 DRY 缺口，改其中一处的 rotate 逻辑会漏改其余三处。
- `CircleAnchor` / `EllipseAnchor` / `DiamondAnchor` 字面量集合与 `RectAnchor` 完全相同，全仓 grep 除自定义文件 + `index.ts` re-export 外**零消费方**。

## 决策：抽 `_transform.ts` 共享函数 + 三 anchor 类型 alias 到 `RectAnchor`

新建 `geometry/_transform.ts`，导出 `CenteredShape = { x; y; rotate? }`（任何"中心 + 可选旋转"形状的共享几何契约）+ 共享 `localToWorld` / `worldToLocal`；四 shape 文件删本地实现、import 共享版。被否决的备选：(B) 把共享函数加进 `point.ts`——`point.ts` 只管纯坐标向量运算，加 shape-aware 函数概念上不合身；(C) 保留 4 处复制——未来加新 shape 继续复制、改一处漏三处。

理由：DRY 价值清晰；为 v0.2 Shape Registry 铺路（`CenteredShape` 是 ShapeDefinition 的基础几何契约）；`_transform.ts` 是纯内部 helper、不进 barrel，前缀 `_` 表意清楚。

### 决策细节

- **`CenteredShape` 暂不导出**（仅 geometry 内部 helper）——v0.2 Shape Registry 阶段再决定是否进公开 API。
- **`RectAnchor` 保留**——在 anchor 名 lookup 处有实际消费，不是死代码。
- **三个 `*Anchor` 直接删除、不留 alias**（含 `geometry/index.ts` re-export）——零消费方、字面量与 `RectAnchor` 重复。

## 不在本 ADR 范围

- 整体 Shape Registry 改造（roadmap §v0.2 预备）——另一篇 ADR。
- `RECT_ANCHORS` 常量去重 / 与 NodeShape 联动——不是死代码，留 v0.2 Shape Registry 重设计时一并。

---

> **实现指针**：level `green`、理论 breaking（删 3 个 type export，实际零消费方、零影响）。真源以代码为准——`CenteredShape` / `localToWorld` / `worldToLocal`（`core/src/geometry/_transform.ts`，不进 barrel），四 shape 文件（`core/src/geometry/{rect,circle,ellipse,diamond}.ts`）import 共享版。验证靠既有 `geometry/{rect,circle,ellipse,diamond}.test.ts` 守门（抽函数行为完全等价）。完整原文（示例代码 / 文件 scope）见本文件 git 历史。

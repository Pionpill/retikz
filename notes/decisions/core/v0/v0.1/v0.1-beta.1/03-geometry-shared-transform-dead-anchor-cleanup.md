# ADR-03：geometry 4 shape 共享 `localToWorld` / `worldToLocal` + 死 `*Anchor` 类型清理

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-8](./roadmap.md) · [packages/core/AGENTS.md "geometry 是跨平台纯数学"](../../../../../../packages/core/AGENTS.md)

## 背景

`packages/core/src/geometry/{rect,circle,ellipse,diamond}.ts` 各自一份 `localToWorld(shape, local)` / `worldToLocal(shape, world)` 函数：

- `rect.ts:30-51` —— 22 行实现
- `circle.ts:27-43` —— 同上
- `ellipse.ts:29-45` —— 同上
- `diamond.ts:27-43` —— 同上

四份实现一字不差，只是参数类型名不同（`Rect` / `Circle` / `Ellipse` / `Diamond`）。共享接口是相同的：`{ x: number; y: number; rotate?: number }`——四个 shape type 都至少包含这三个字段。

同时三个 `*Anchor` 类型字面量集合与 `RectAnchor` 完全相同：
- `circle.ts:16` `CircleAnchor` —— 9 个字面量
- `ellipse.ts:18` `EllipseAnchor` —— 同 9 个
- `diamond.ts:16` `DiamondAnchor` —— 同 9 个

全仓 grep 三者除自定义文件 + `index.ts` re-export 外**零消费方**。

## 选项

### A. 抽 `_transform.ts` 共享函数 + 三 anchor 类型 alias 到 `RectAnchor`（**推荐**）

```ts
// packages/core/src/geometry/_transform.ts（新建）
import type { Position } from './point';

/** 任何"中心 + 可选旋转"形状的共享 local↔world 工具 */
export type CenteredShape = { x: number; y: number; rotate?: number };

export const localToWorld = (s: CenteredShape, local: Position): Position => { ... };
export const worldToLocal = (s: CenteredShape, world: Position): Position => { ... };
```

```ts
// circle.ts / ellipse.ts / diamond.ts —— 删除本地 localToWorld/worldToLocal、import 共享版
import { localToWorld, worldToLocal } from './_transform';

// 三个 *Anchor 类型直接删除（零消费方、字面量与 RectAnchor 重复）
// 用户外部 import：从 CircleAnchor 改为 RectAnchor
```

beta.1 不考虑兼容性——直接删除 `CircleAnchor` / `EllipseAnchor` / `DiamondAnchor`（包括 `geometry/index.ts` 的 re-export）。

文件名前缀 `_` 表示"内部 helper，不进 barrel"——与 `_builder.ts` / `_unbuilder.ts` 用法一致（ADR-10 会把 `_builder` 的 `_` 清掉，但 `_transform.ts` 是纯内部 helper、不公开导出，前缀合理）。

### B. 把共享函数加在 `geometry/point.ts` 末尾

避免新建文件，但 `point.ts` 当前只管纯坐标向量运算（`add` / `sub` / `scale` / `equal`），加 shape-aware 的 `localToWorld` 概念上不合身。

### C. 不抽共享，保留 4 处复制

代价：未来加新 shape（hex / pin 等域特化）继续要复制；如果改了 4 处其中之一的 rotate 处理逻辑，3 处会漏改。

## 决策：A

理由：
1. 4 处实现真的一字不差，DRY 价值清晰
2. 公开 API 通过 type alias 保留——三个 `*Anchor` 类型外部 import 不变
3. 为 v0.2 Shape Registry（roadmap §v0.2 预备）铺路——`CenteredShape` 是 ShapeDefinition 的基础几何契约
4. `_transform.ts` 是纯内部 helper、不进 barrel，文件名前缀 `_` 表意清楚

## 决策细节

- ✓ **`CenteredShape` 暂不导出**（仅 `geometry/` 内部 helper），v0.2 Shape Registry 阶段决定是否进公开 API
- ✓ **`RectAnchor` 保留**——在 `compile/parseTarget.ts` 有实际消费（anchor 名 lookup），不是死代码
- ✓ **`CircleAnchor` / `EllipseAnchor` / `DiamondAnchor` 直接删除**（不留 alias）——零消费方、与 `RectAnchor` 字面量重复；beta.1 不考虑兼容性
- ✓ **`geometry/index.ts` 同步移除三个 `*Anchor` 的 re-export**

## DSL 表面

无变化（公开 API 通过 type alias 保留）。

## 测试设计

无新测试。既有 `geometry/{rect,circle,ellipse,diamond}.test.ts` 全过即守门通过——抽函数行为应完全等价。

## 影响

- **代码减少**：~60 行（4 文件 × 15 行 localToWorld+worldToLocal）
- **新增文件**：`geometry/_transform.ts` ~30 行
- **公开 API surface**：删除 3 个 type export（`CircleAnchor` / `EllipseAnchor` / `DiamondAnchor`）；零消费方，无 BREAKING 实际影响
- **外部用户**：理论上 BREAKING（若有人 import 这三个 type），实际预期零影响

## 不在本 ADR 范围

- 整体 Shape Registry 改造（roadmap §v0.2 预备）—— 这是另一篇 ADR
- `RECT_ANCHORS` 常量去重 / 与 NodeShape enum 联动 —— 不是死代码，留 v0.2 Shape Registry 重设计时一并

---

## 实现契约

### Level

`green`（仅 `packages/core/src/geometry/` 内部重构 + 类型 alias，零行为变化、零公开 API 变化）

### Schema 改动

无 zod schema 改动。

### 文件 scope

- `packages/core/src/geometry/_transform.ts`（新建）
- `packages/core/src/geometry/rect.ts` —— 删本地 `localToWorld` / `worldToLocal`，import 共享版
- `packages/core/src/geometry/circle.ts` —— 同上；`CircleAnchor` 改为 `type CircleAnchor = RectAnchor`
- `packages/core/src/geometry/ellipse.ts` —— 同上
- `packages/core/src/geometry/diamond.ts` —— 同上
- `packages/core/src/geometry/index.ts`（barrel）—— 无需改，`_transform.ts` 不进 barrel

### 测试象限

零行为变化，守门即可：

**守门（既有）**：
- `pnpm --filter @retikz/core test:run` 既有 592 测试全过
- 重点关注 `tests/geometry/{rect,circle,ellipse,diamond}.test.ts` 现有 anchor / boundaryPoint / rotate 相关 case 全过
- `tsc --noEmit` 全过（type alias 兼容）

不强凑测试象限——纯抽函数等价改动。

### 依赖的现有元素

- `geometry/point.ts` `Position` —— 引用（共享函数参数 / 返回类型）
- `geometry/rect.ts` `RectAnchor` —— 引用（三个 `*Anchor` 类型 alias 目标）

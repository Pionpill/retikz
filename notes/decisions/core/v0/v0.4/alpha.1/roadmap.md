# v0.4.0-alpha.1 实施待办：新增 `@retikz/math` + core 纯几何下沉

> 写于 2026-06-14。本 stage 拆 3 个聚焦 ADR，各自实现；本文件是 kanban 索引 + 验收，设计细节看各 ADR，逐文件 TDD 步骤在实现各 ADR 时再出。
>
> 关联：[`ADR-01 math 包 + 首切 API`](./01-math-package-and-geometry-api.md) · [`ADR-02 core 纯几何下沉`](./02-core-pure-geometry-sink.md) · [`ADR-03 point 公开面修正`](./03-point-polar-surface-fix.md) · [`v0.4 roadmap`](../roadmap.md)

## 背景与定位

详见三份 ADR。alpha.1 = v0.4 首个落地 milestone，是 scope-bbox（alpha.2 H）与 B（路径补强）的共同前置。本阶段**只做 math 包 + 纯几何下沉 + A 新能力 + point 公开面修正**；不碰形状 `boundaryPoint` 下沉（方案 C）、不建 `curve/` / `matrix/`、不动 `bend.ts`。

切面一锤定音（ADR-02 决策 2）：整体迁 math = `point` 向量运算（含 `shiftToward`）/ `transform` / `edge.lerpPoint` / `arc.ts` 全文件 / `contour` 私有求交；新增 math = `point.dot`/`cross`、`intersect.segmentSegment`、`triangle.incircle`/`circumcircle`、`polygon.containsPoint`、`convexHull`；留 core = `anchor` / `polar` / `edge` 业务 / 形状 / `contour` fillet·emit / `bend`。

## 进度看板

| # | ADR | 标题 | 依赖 | 工作量 | 优先级 | 状态 |
|---|---|---|---|---|---|---|
| T1 | [ADR-01](./01-math-package-and-geometry-api.md) | 新建 `@retikz/math` 包 + 首切几何 API | — | 大 | P0 | ☐ |
| T2 | [ADR-02](./02-core-pure-geometry-sink.md) | core 纯几何下沉 + 公开面 re-export | T1 | 中 | P0 | ☐ |
| T3 | [ADR-03](./03-point-polar-surface-fix.md) | `point` 公开面修正：toPolar/equalPolar 迁 polar | T1 | 小 | P0 | ☐ |

实现序：**T1 先**（build math 底座）→ **T2 + T3 并行**（均 core 侧，依赖 T1；T3 可并入 T2 实现窗口）。每个 ADR 实现时单独走 plan（subagent-driven / inline）+ 单独 commit 序列。

约定：类型检查只用 `pnpm --filter <pkg> exec tsc --noEmit`（禁 emit）；`Array<T>`、箭头函数、`Position=[number,number]`、`DEFAULT_EPSILON=1e-9`；「迁移」= 从指定 core 源逐字搬函数体、仅改 import；禁 `eslint-disable`/`as any`/`@ts-ignore` 绕过。

## TODO-1 — `@retikz/math` 包 + 首切 API（ADR-01）

详 [`ADR-01`](./01-math-package-and-geometry-api.md)。要点：

- scaffold `packages/core/math`（package.json 零依赖 / tsconfig / vite.config external 守卫 `?? {}` / index）。
- `geometry/` 七模块：`point`（向量 + `dot`/`cross` 新增 + `shiftToward` + `lerp`，迁自 core point/edge）、`transform`（迁自 core）、`arc`（全文件迁自 core）、`intersect`（contour 私有求交提出 + `segmentSegment` 新增；`rayArc` 留 `arc` 模块、不并入——返回标量参数语义不同）、`triangle`（incircle/circumcircle 新增）、`polygon.containsPoint`（新增）、`hull.convexHull`（新增）。
- 返回形态（ADR-01 决策 4）：`lineLine`/`segmentSegment` → `Position | null`；`lineCircle`/`circleCircle` → `Array<Position>`；`triangle.*` 退化 → `null`。
- 每模块 TDD 单测；退化 case（平行 / 相切 / 共线 / 零长 / 三点共线 / hull 共线剔除）。现成库（kld / robust-predicates）仅作正确性参考、不进依赖。
- **文档**：`apps/docs` 新增 `@retikz/math` 包介绍 / 首切 API 能力页（双语 + contents/data/i18n，按 `docs-doc-principle`）——新增公开包必须同步（AGENTS）。
- **发布分组**（ADR-01 决策 7）：math 加入 core 组 lockstep；更新 `packages/core/AGENTS.md` 发布规则（4 包 → 5 包）；发布版本对齐 core 组 v0.4 线。
- 闭环：`pnpm --filter @retikz/math exec tsc --noEmit` + `vitest run` + `eslint` 全过。

## TODO-2 — core 纯几何下沉 + re-export（ADR-02）

详 [`ADR-02`](./02-core-pure-geometry-sink.md)。要点：

- core `package.json` 加 `@retikz/math: workspace:*`（`pnpm install`）。
- re-export：`geometry/point.ts` → `export { Position, point, DEFAULT_EPSILON } from '@retikz/math'`；`transform.ts` → re-export math；`edge.ts` → `export { lerp as lerpPoint } from '@retikz/math'` + 保留 `Side`/`EDGE_ENDS`/`edgeAngleDeg`/`polylineViaVertex`（内部 `lerpPoint` 调用改 math `lerp`）。
- `arc` 收尾：删 `geometry/arc.ts`、`geometry/index.ts` 去 `export * from './arc'`、**7 个**消费方（`compile/{node,position,path/relative,path/shrink,path/index}`、`shapes/{arc,shared}`）改引 `@retikz/math`；测试侧 `tests/geometry/{arc,rounded-contour}.test.ts` 也改引 `@retikz/math`（rounded-contour 直接 import `arcAngleInRange`/`rayArc`，漏改会断链）。
- `contour.ts`：删私有 intersectLineLine/LineCircle/CircleCircle，改 `intersect.*`（`null` vs `undefined` 判空兼容）；arc import 改 math；`filletContour`/emit/`footOnLine` 留 core。
- `geometry/index.ts` 收口；核对 `@retikz/core` 顶层公开导出（Position/point/lerpPoint/localToWorld/worldToLocal/...）逐字不变。
- 闭环：core `tsc --noEmit` + `vitest run` + `eslint`；下游 react/render/vanilla/plot `pnpm lint` + `tsc --noEmit` **零改动**通过（行为不变守卫）。

## TODO-3 — `point` 公开面修正：toPolar/equalPolar 迁 polar（ADR-03）

详 [`ADR-03`](./03-point-polar-surface-fix.md)。要点：

- `polar.ts`：`fromPosition` 内联 atan2/hypot、`equal` 内联 precision 比较（原 `point.toPolar`/`equalPolar` 函数体）；不再委托 `point.*`。
- 从 core `point` 移除 `toPolar` / `equalPolar`（math 的 point 本就不含）。
- 测试迁移：`tests/geometry/point.test.ts` 的 toPolar/equalPolar describe 迁 `polar.test.ts`、改调用 `polar.fromPosition`/`polar.equal`；删「别名等价」断言。
- 文档：`apps/docs` 中 `point.toPolar`/`equalPolar` 引用改写为 `polar.fromPosition`/`polar.equal`（双语，zh 真源）；按 `docs-doc-principle` skill。
- 闭环：全仓无 `point.toPolar`/`equalPolar` 残留调用。

## 验收（alpha.1 闭环）

- 三份 ADR 全 Accepted 并各自实现完。
- `@retikz/math`：零依赖、首切 API 全覆盖（point+dot/cross/shiftToward + lerp + transform + arc + intersect + triangle + polygon + hull）各有单测、`tsc`/`vitest`/`eslint` 全过。
- core 纯几何下沉完成、`geometry/arc.ts` 删除；公开面经 re-export 不变（除 ADR-03 主动移除 toPolar/equalPolar）；下游 react/render/vanilla/plot 零改动通过。
- core 既有 geometry/shapes/compile 测试逐字行为不变全过；无破坏 v0.3 测试；无 lint 绕过。
- `apps/docs` 同步：新增 `@retikz/math` 包说明 + point 公开面变化（双语）。

## 待实施前再决议（不进 ADR，先记此）

- **`segmentSegment` 共线重叠返回形态**：首切取 `Position | null`（共线 / 重叠一律 null）。若 B / scope-bbox 需区分共线重叠区间，升级判别式 `{ kind: 'none'|'point'|'collinear'; ... }`。
- **`polygon.containsPoint` 边界点语义**：首切「边界未定义」。若消费方需 inclusive / exclusive，补 `onBoundary` 参数或 epsilon 容差。
- **`convexHull` 共线策略**：首切 `cross <= 0` → 严格凸包（剔共线）。若 scope-bbox polygon 包络要保留共线点，改 `< 0`。
- **`footOnLine` 是否下沉**：当前留 contour 私有；后续若 intersect 需点到线投影再提 math。
- **math 是否吸收 render oklch / 动画插值数值算**：ADR-01 列为 A 待决，本 alpha 不动。

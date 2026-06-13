# ADR-02：core 纯几何按函数粒度下沉 `@retikz/math`，re-export 保公开面

- 状态：Accepted（设计已拍板，待实现）
- 决策日期：2026-06-13（拆分重写 2026-06-14）
- 关联：[ADR-01 math 包 + 首切 API](./01-math-package-and-geometry-api.md) · [ADR-03 point 公开面修正](./03-point-polar-surface-fix.md) · [alpha.1 roadmap](./roadmap.md) · [v0.4 roadmap 候选 A](../roadmap.md) · core `geometry/`、`compile/`、`shapes/`

> **范围**：core 侧如何接入 [ADR-01](./01-math-package-and-geometry-api.md) 的 `@retikz/math`——依赖方向、下沉切面、公开面 re-export、arc / contour 消费方改线。`point.toPolar` / `equalPolar` 的移除单列 [ADR-03](./03-point-polar-surface-fix.md)。

## 背景 / 约束

- **`@retikz/core` 公开导出 geometry 一批符号**（`core/src/index.ts`）：`Position`、`point`、`worldToLocal` / `localToWorld`、`rect` / `circle` / `ellipse` / `diamond` / `polar`、`lerpPoint` 等；包内外 **56 个文件** import `geometry`（`@retikz/render` / `@retikz/react` / docs 在内）。动 geometry 即动公开面。
- **core 几何纯 / 业务不按文件分**：形状模块（`circle` / `ellipse` / `rect` / `diamond`）把纯射线求交（`contains` / `boundaryPoint`）与 TikZ anchor 语义（`anchor` / `edgePoint`）揉在同一文件。整文件搬走会把 `CompassAnchor` 拖进 math、破红线。
- AGENTS「上层包底层能力源自 `@retikz/core`」：Tier 1 adapter（react / render）几何能力应继续经 core 取。

## 决策

### 1. 依赖方向 = `core → math`（正向，允许）

core 正向依赖 `@retikz/math`（`workspace:*`），math 不反依赖 core。「两个几何的家」消除——core 纯计算几何下沉 math、core re-export。

### 2. 下沉切面 = 函数粒度

| core 模块 | 下沉 math | 留 core |
| --- | --- | --- |
| `point` | 向量运算（add/sub/scale/length/normalize/shiftToward/equal）| `toPolar` / `equalPolar`（→ ADR-03） |
| `transform` | localToWorld / worldToLocal / CenteredShape（整体） | — |
| `edge` | `lerpPoint`（= math `lerp`） | `Side` / `EDGE_ENDS` / `edgeAngleDeg` / `polylineViaVertex` |
| `arc` | 全文件（决策 4） | — |
| `contour` | 私有 intersectLineLine / intersectLineCircle / intersectCircleCircle（改用 math `intersect`） | `filletContour` / `contourCommands` / `ContourCommand` / 私有 `footOnLine`（fillet 内部用） |
| `circle/ellipse/rect/diamond` | —（首切只改 import） | center / contains / boundaryPoint / anchor / edgePoint 整体留 core |
| `polar` / `anchor` | — | 整体留 core（polar=IR、anchor=TikZ 语义） |

### 3. 公开面 = core re-export，上层零改动

- core `geometry/point.ts` → `export { type Position, point, DEFAULT_EPSILON } from '@retikz/math'`；`transform.ts` → re-export math；`edge.ts` → `export { lerp as lerpPoint } from '@retikz/math'` + 保留业务。
- `@retikz/core` 顶层 `index.ts` 对 geometry 的具名导出（`Position` / `point` / `lerpPoint` / `localToWorld` / `worldToLocal` / ...）**逐字不变**。
- react / render / vanilla / plot **继续从 `@retikz/core` import，零改动**——符合 AGENTS「底层源自 core」。只 core 本身 + plot/domain 直接依赖 `@retikz/math`。
- re-export 纯几何原语**不算** 0.x 禁的「旧语法兼容桥」——是 core 正当 surface 底层依赖。

### 4. `arc.ts` 整体下沉 + 消费方改线

- 删 core `geometry/arc.ts`，从 `geometry/index.ts` 去 `export * from './arc'`（arc 非公开 API）。
- **7 个**直接子路径消费方改引 `@retikz/math`：`compile/node.ts`、`compile/position.ts`、`compile/path/relative.ts`、`compile/path/shrink.ts`、`compile/path/index.ts`（多行 import：arcBoundingPoints / arcEndPoint / ellipseArcBoundingPoints / ellipseArcPoint）、`shapes/arc.ts`、`shapes/shared.ts`。
- **测试侧 arc 消费方**：`tests/geometry/arc.test.ts`（随 arc 迁 math，见 ADR-01）与 `tests/geometry/rounded-contour.test.ts`（直接 import `arcAngleInRange` / `rayArc` from `geometry/arc`）都必须改引 `@retikz/math`，否则删 `geometry/arc.ts` 后编译断链。
- **注释路径更新（非编译依赖）**：`geometry/rect.ts`、`tests/geometry/arc-shape.test.ts`、`tests/geometry/sector-shape.test.ts` 注释里有「角度约定同 `geometry/arc`」字样——非 import、不断编译，但路径随 arc 迁走而陈旧；顺手改为指向 `@retikz/math`（或表述为「同 math arc 约定」）。

### 5. `contour.ts` 改用 math `intersect`

- 删 contour 私有 `intersectLineLine` / `intersectLineCircle` / `intersectCircleCircle`，调用处改 `intersect.*`（注意 math `lineLine` 返回 `null`、原私有返回 `undefined`，判空兼容处理）。`arc` 相关 import 改 `@retikz/math`。
- `filletContour` / `contourCommands` / `ContourCommand` / 私有 `footOnLine` 留 core（IR-aligned，B1 复用）。

### 6. 行为不变守卫

core 既有 `tests/geometry`、`tests/shapes`、`tests/compile` 下沉后**逐字行为不变**全过；`pnpm --filter @retikz/core exec tsc --noEmit` + `pnpm lint` + 下游各包 `tsc --noEmit` 全过。

## 被否决的选项

- **下沉切面 · 方案 A（最小）**：math 只接 point/transform/lerp，求交原语留 contour/arc。否决：造成「求交两处实现」（math 新写 + contour 私有），违 DRY。
- **下沉切面 · 方案 C（激进）**：形状 `contains`/`boundaryPoint` 纯射线数学也抽 math。否决：首切偏重、改动面最大；与 anchor 同模块拆解收益不及风险。
- **公开面 · 方案 B（下游全改直依赖 math）**：否决——0.x 中途破 `@retikz/core` 公开面 + churn ~56 文件 + 与「底层源自 core」有张力。
- **公开面 · 方案 C（先 re-export 后迁）**：多一套过渡期约定，收益不及方案 A 直接稳定。

## 不在本 ADR 范围

- math 包本身与首切 API——[ADR-01](./01-math-package-and-geometry-api.md)。
- `point.toPolar` / `equalPolar` 移除——[ADR-03](./03-point-polar-surface-fix.md)。
- 形状 `contains` / `boundaryPoint` 下沉（切面方案 C）、`curve/` / `matrix/` / `bend.ts`——roadmap 后置。

---

> **实现指针**：level `red`（动 core `geometry/` 多文件 + `index.ts` + compile / shapes import）。非 breaking（geometry re-export 保公开面）。文件 scope：core `geometry/{point,transform,edge,contour,index}.ts`（改）、删 `geometry/arc.ts`、**7 个** arc 消费方（`compile/{node,position,path/relative,path/shrink,path/index}`、`shapes/{arc,shared}`，改 import）；core `package.json` 加 `@retikz/math: workspace:*`。测试：`tests/geometry/{arc,rounded-contour}.test.ts` 改引 `@retikz/math`（arc 测试随 arc 迁 math，见 ADR-01）、保留 `tests/shapes`、`tests/compile` 守行为不变；下游 `pnpm lint` 验零改动。逐文件 TDD 步骤见 [alpha.1 roadmap TODO-2](./roadmap.md)。

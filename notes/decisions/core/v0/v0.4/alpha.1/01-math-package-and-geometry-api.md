# ADR-01：新建 `@retikz/math` 零依赖纯计算几何包 + 首切几何 API

- 状态：Accepted（设计已拍板，待实现）
- 决策日期：2026-06-13（拆分重写 2026-06-14）
- 关联：[v0.4 roadmap 候选 A](../roadmap.md#a--retikzmath2026-06-12-拍板) · [alpha.1 roadmap](./roadmap.md) · [ADR-02 core 纯几何下沉](./02-core-pure-geometry-sink.md) · [ADR-03 point 公开面修正](./03-point-polar-surface-fix.md) · core `geometry/`（`packages/core/core/src/geometry/`）

> **范围**：承接 v0.4 roadmap 候选 A（2026-06-12 拍板「新增独立零依赖纯计算几何包」）。本 ADR 只定 **math 侧**——包的存在 / 边界 / API 风格 / 首切几何能力与返回形态。core 如何接入、公开面 re-export 见 [ADR-02](./02-core-pure-geometry-sink.md)；`point.toPolar`/`equalPolar` 的移除见 [ADR-03](./03-point-polar-surface-fix.md)。

## 背景 / 约束

- A 想要的「线 / 线段交点」**已私有存在于 core**：`contour.ts` 私有 `intersectLineLine` / `intersectLineCircle` / `intersectCircleCircle`，`arc.ts` `rayArc`。新建 math 时把这些纯原语提出、连同新能力一起落 math，「下沉已有」与「做新能力」重叠。
- core 几何约定：`Position = [number, number]`、命名空间对象（`point.add(...)`）、纯函数、不写 class、`DEFAULT_EPSILON = 1e-9`。
- 红线（沿用 roadmap A）：纯数学、可独立测试、**无业务语义**——否则不进 math。

## 决策

### 1. 包定位与工程

- 新建 `packages/core/math`，名 `@retikz/math`，`type: module`、`sideEffects: false`、**零运行时依赖**、零 IR、零 zod。
- 一律纯函数 + 普通对象 / `Position` 数组，**不写 class**。
- tsconfig / eslint / Vite（lib + vite-plugin-dts）/ Vitest 配置复用 core 同款（vite.config 的 external 守卫 `Object.keys(pkg.dependencies ?? {})`，零依赖兼容）。

### 2. API 风格与 `Position` 真源

- 命名空间对象风格对齐 core（`point.add(...)` / `intersect.lineLine(...)` / `triangle.incircle(...)`）。
- `Position = [number, number]` 与 `DEFAULT_EPSILON` 的**单一真源迁 math**；core 改 re-export（见 ADR-02）。

### 3. 子模块布局（首切只开 `geometry/`）

| 文件 | 导出 |
| --- | --- |
| `point.ts` | `Position`、`DEFAULT_EPSILON`、`point`（add/sub/scale/dot/cross/length/normalize/shiftToward/equal）、`lerp` |
| `transform.ts` | `CenteredShape`、`localToWorld`、`worldToLocal` |
| `arc.ts` | arcEndPoint / arcAngleInRange / rayArc / ellipseArcPoint / arcBoundingPoints / ellipseArcBoundingPoints |
| `intersect.ts` | `intersect`（lineLine / lineCircle / circleCircle / segmentSegment）；`rayArc` 留 `arc` 模块 |
| `triangle.ts` | `Circle` 类型、`triangle`（incircle / circumcircle） |
| `polygon.ts` | `polygon`（containsPoint） |
| `hull.ts` | `convexHull` |

`curve/`（贝塞尔求交）、`matrix/`（伪三维）首切不建。

### 4. 首切几何能力与返回形态（API 契约）

- **point**：向量运算（迁自 core `point.ts`）+ 新增 `dot` / `cross`（凸包 / 点在多边形 / 求交所需）。`lerp` 迁自 core `edge.ts` 的 `lerpPoint`。
- **transform**：localToWorld / worldToLocal / CenteredShape，迁自 core `transform.ts`。
- **arc**：arc 原语整体迁自 core `arc.ts`（全纯、非公开），角度约定（SVG y-down，0=+x / 90=+y 视觉下）随注释带走、不引用 IR / 渲染语义。
- **intersect**（求交返回形态拍板）：
  - `lineLine(a1,a2,b1,b2): Position | null`——两点定无限直线；平行 / 共线 → `null`。
  - `lineCircle(origin,dir,center,radius): Array<Position>`——0/1/2 交点。
  - `circleCircle(cA,rA,cB,rB): Array<Position>`——0/1/2 交点（重合 / 内含 / 相离 → 空）。
  - `segmentSegment(a1,a2,b1,b2): Position | null`——**首切简化**：真交叉返回交点；平行 / 共线（含重叠）/ 不相交 → `null`（共线重叠区间留后续按需升级判别式，见 roadmap 待决）。
  - `rayArc`（ray∩arc）**不并入 `intersect`**：它返回沿射线的标量参数 `Array<number>`（命中距离），与 intersect 的点返回语义不一致，且 contour 等调用方需要该标量找最近命中——仅从 `arc` 模块导出。
  - `lineCircle` / `circleCircle` 的切线（disc≈0）返回 2 个重合点，调用方自判（不特判 1 点）。
- **triangle**（新能力，退化返回 `null`）：
  - `circumcircle(a,b,c): Circle | null`——外接圆；三点共线（面积 / 行列式 ≈0）→ `null`。
  - `incircle(a,b,c): Circle | null`——内切圆，incenter = 对边长加权顶点、radius = 面积 / 半周长；共线 → `null`。
- **polygon**（新能力）：`containsPoint(vertices, p): boolean`——ray-casting 奇偶规则，不要求凹凸 / 绕向；**边界点结果未定义**（首切不保证，落边界由调用方处理，见 roadmap 待决）。
- **hull**（新能力）：`convexHull(points): Array<Position>`——Andrew monotone chain，CCW、**剔除共线中间点**（叉积 ≤0 弹出）；点数 <3 返回排序去重后的点。

### 5. 数值取向

朴素 epsilon（`DEFAULT_EPSILON = 1e-9`）；退化 case 后续按需升级谓词（参考 `robust-predicates` 的 `orient2d`）。

### 6. 进包红线

纯数学、可独立测试、无业务语义——否则不进 math。

### 7. 版本与发布分组

- `@retikz/math` 加入 **core 组 lockstep**（与 `core` / `render` / `react` / `vanilla` 同版本节奏）——它是 core 的前置底座、低 churn，lockstep 避免 core↔math 版本错配。
- 初始发布版本对齐 core 组 v0.4 线；scaffold 里的 `0.4.0-alpha.1` 是占位，发布时与 core 组实际版本号对齐。
- 实现时**更新 `packages/core/AGENTS.md` 的 lockstep / 发布规则**（core 组由 4 包 → 5 包，纳入 `@retikz/math`）。

## 被否决的选项

- **直接依赖现成库**（`@flatten-js/core` / `kld-intersections` / `bezier-js`）：多为 class-based、自带对象模型，与「纯函数 + 普通对象」约定冲突。现成库仅作正确性 / 退化 case 参考，不进依赖。

## 不在本 ADR 范围

- core 如何接入 math、公开面 re-export、arc / contour 消费方改线——[ADR-02](./02-core-pure-geometry-sink.md)。
- `point.toPolar` / `equalPolar` 移除——[ADR-03](./03-point-polar-surface-fix.md)。
- `curve/`（贝塞尔）、`matrix/`（伪三维）、`bend.ts` 下沉、形状 `contains`/`boundaryPoint` 下沉——roadmap 已列后置。

---

> **实现指针**：level `red`（新建包公开 API 表面）。非 breaking（纯新增包）。文件 scope：`packages/core/math/{package.json, tsconfig.json, vite.config.ts, src/{index,geometry/index,geometry/point,geometry/transform,geometry/arc,geometry/intersect,geometry/triangle,geometry/polygon,geometry/hull}.ts, tests/geometry/**}`；`apps/docs/**`（新增 `@retikz/math` 包介绍 / 首切 API 能力页，zh / en 双语 + contents / data / i18n 同步，按 `docs-doc-principle` skill）；`packages/core/AGENTS.md`（决策 7：lockstep / 发布规则纳入 math）。测试：每模块纯函数单测（求交退化：平行 / 相切 / 共线 / 零长；triangle / hull 退化 → null / 排序去重；现成库仅作正确性参考）。**文档验收**：math 包能力在文档站可见（新增包，用户可见 public API，AGENTS 要求同步）。逐文件 TDD 步骤见 [alpha.1 roadmap TODO-1](./roadmap.md)。

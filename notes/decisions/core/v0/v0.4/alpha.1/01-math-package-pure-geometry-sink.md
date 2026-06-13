# ADR-01：新增 `@retikz/math` 纯计算几何包，core 纯几何按函数粒度下沉、re-export 保公开面

- 状态：Accepted（设计已拍板，实现待 plan）
- 决策日期：2026-06-13
- 关联：[v0.4 roadmap 候选 A](../roadmap.md#a--retikzmath2026-06-12-拍板) · [v0.4 scope 多态 bbox（首个 core 内消费方）](../alpha.2/02-scope-polymorphic-bbox.md) · [core 底座对比分析](../../../../../analysis/core-compare-analysis.md) · core `geometry/`（`packages/core/core/src/geometry/`）

> **范围**：承接 v0.4 roadmap 候选 A（2026-06-12 拍板「新增独立零依赖纯计算几何包 `@retikz/math`」「零 IR / 零 zod / 纯函数不写 class」「首切 = 线/线段交点 + 三角形内切/外接圆 + 点在多边形 + 凸包」「自实现不依赖现成库」「朴素 epsilon」「子模块 `geometry/`（首切）· `curve/` · `matrix/`」）。本 ADR 在 A 段之上定 7 项决策：依赖方向、首切就下沉 core 纯几何、下沉切面、模块布局、公开面契约、`toPolar`/`equalPolar` 迁移、`arc.ts` 下沉。roadmap A 段已同步指向本 ADR。

## 背景 / 约束

塑造方案的现状核验（2026-06-13 读 `packages/core/core/src/geometry/` 13 模块）：

- **`@retikz/core` 公开导出 geometry 的一批符号**：`Position` 类型、`point`、`worldToLocal`/`localToWorld`、`rect`/`circle`/`ellipse`/`diamond`/`polar` 等（`core/src/index.ts`）；包内外 **56 个文件** import `geometry`（`@retikz/render`、`@retikz/react`、docs 在内）。动 geometry 即动公开面。
- **core 纯/业务不按文件分**：形状模块（`circle`/`ellipse`/`rect`/`diamond`）把**纯射线求交**（`contains` / `boundaryPoint`）和 **TikZ anchor 语义**（`anchor(CompassAnchorValue)` / `edgePoint(Side)`）揉在同一文件。整文件搬走会把 `CompassAnchor` 拖进 math、破红线。
- **A 的「求交新能力」已私有存在于 core**：`contour.ts` 私有 `intersectLineLine` / `intersectLineCircle` / `intersectCircleCircle` / `footOnLine`，`arc.ts` `rayArc`。把它们提到 math 并导出，本身就是在实现 A 的求交能力——「下沉已有」与「做新能力」重叠。

硬约束：

- math 红线（沿用 roadmap A）：零运行时依赖、零 IR、零 zod、纯函数 + 普通对象 / `Position` 数组、**不写 class**、**无业务语义**——否则不进 math。
- AGENTS「上层包底层能力源自 `@retikz/core`」：Tier 1 adapter（react / render）的几何能力应继续经 `@retikz/core` 取，不绕道。
- 0.x「正确设计为准、不为兼容旧写法留别名 / 桥」。

## 决策

### 1. 依赖方向 = `core → math`（正向，允许）

roadmap A 原话「math 不反依赖 core；短期接受『两个几何的家』」。本 ADR 明确：依赖方向是 **core 正向依赖 math**，math 仍不反依赖 core。由此「两个几何的家」不再是长期事实——core 纯计算几何下沉 math、core re-export。

### 2. 首切就把 core 纯几何下沉 math（否决「只加新能力、不动 core」）

因「下沉已有」与「做新能力」重叠（见背景）：math 首切**同时**做 A 新能力与接管 core 纯几何，避免「求交两处实现」（math 新写 + contour 私有）的 DRY 违背。

### 3. 下沉切面 = 函数粒度（不是文件粒度）

| core 模块 | 纯数学（→ math） | 业务语义（留 core） |
| --- | --- | --- |
| `point` | 向量运算 add/sub/scale/length/normalize/equal | `toPolar` / `equalPolar`（牵 `PolarPosition`，见决策 6） |
| `transform` | `localToWorld` / `worldToLocal` / `CenteredShape` | — |
| `edge` | `lerpPoint` | `Side` / `EDGE_ENDS` / `edgeAngleDeg` / `polylineViaVertex` |
| `arc` | 全文件（见决策 7）| —（非公开、全纯） |
| `contour` | 私有 `intersectLineLine` / `intersectLineCircle` / `intersectCircleCircle` / `footOnLine` | `filletContour` / `contourCommands` / `ContourCommand`（emit / IR 相关，B1 复用） |
| `circle`/`ellipse`/`rect`/`diamond` | —（首切不动，改 import math 原语）| center / contains / boundaryPoint / anchor / edgePoint 整体留 core |
| `polar` | —（trig 极简） | `PolarPosition`（origin 可为节点 id）= IR，整体留 core |
| `anchor` | — | CompassAnchor / WebAnchor 全业务 |

### 4. math 模块布局与 API（首切只开 `geometry/`）

命名空间对象风格，对齐 core（`point.add(...)`）。`Position` 类型单一真源迁 math。

| 文件 | 导出 |
| --- | --- |
| `point.ts` | `Position` 类型 + `point`（add/sub/scale/length/normalize/equal/**dot**/**cross**）+ `lerp` |
| `transform.ts` | `CenteredShape` + `localToWorld` / `worldToLocal` |
| `intersect.ts` | `intersect.lineLine` / `lineCircle` / `circleCircle` / `rayArc` / **`segmentSegment`** |
| `arc.ts` | arcEndPoint / arcAngleInRange / ellipseArcPoint / bbox 等纯弧原语 |
| `triangle.ts` | `triangle.incircle` / `circumcircle`（A 新能力）|
| `polygon.ts` | `polygon.containsPoint`（点在多边形，A 新能力）|
| `hull.ts` | `convexHull`（A 新能力）|

`curve/`（贝塞尔求交）、`matrix/`（伪三维）首切不建。工程：`packages/math/math`、名 `@retikz/math`、`type: module`、`sideEffects: false`，tsconfig / eslint / 构建复用 core 同款。

### 5. 公开面契约 = core re-export，上层零改动

- math 拥有 `Position` + 纯原语；**core 从 math re-export**（`Position` / `point` / `transform` / `lerp`），`@retikz/core` 公开 API 逐字不变。
- react / render / docs **继续从 `@retikz/core` import**，零改动——符合 AGENTS「底层能力源自 core」。
- 只 **core 本身 + plot / domain** 直接依赖 `@retikz/math`。
- re-export 纯几何原语**不算** 0.x 禁的「旧语法兼容桥」——它是 core 正当地 surface 出底层依赖的基础类型 / 原语，非为兼容旧写法保的别名。

### 6. 修正 core `point` 公开面：`toPolar` / `equalPolar` 迁 `polar`

`point.toPolar` / `point.equalPolar` 牵 `PolarPosition`（IR 类型，origin 可为节点 id），不进零-IR 的 math。二者在 `polar.ts` 已有等价别名（`polar.fromPosition` / `polar.equal`）。决策：**调用方迁到 `polar.*`，从 core 的 `point` 移除这两方法**，使 math 的 `point` 保持纯。属用户可见改动，按 0.x「正确设计为准、不留桥」执行——不包 `point = {...mathPoint, toPolar, equalPolar}` 兼容层。

### 7. `arc.ts` 整体下沉

`arc.ts` 全文件纯几何、非公开（不在 `index.ts`）。整体迁 math `geometry/arc.ts`，core 内消费方改 import math。严格说超「求交原语」，但全纯无业务耦合、整文件移动低风险，纳入首切。

### 数值取向

朴素 epsilon（`DEFAULT_EPSILON = 1e-9`，沿用 core）；退化 case 后续按需升级谓词（参考 `robust-predicates` 的 `orient2d`）。现成库（`kld-intersections` / `robust-predicates` / `bezier-js`）仅作正确性 / 退化 case 参考，不进依赖。

## 被否决的选项

- **下沉切面 · 方案 A（最小）**：math 只接 `point` 向量运算 + `transform` + `lerp`，求交原语暂留 contour / arc。否决：造成「求交两处实现」（math 新写 + contour 私有），违 DRY，且 A 新能力 `segmentSegment` 与 contour 私有 `lineLine` 高度同构。
- **下沉切面 · 方案 C（激进）**：把形状 `contains` / `boundaryPoint` 的纯射线数学也抽到 math（传 shape 参数），core 只留 anchor / edge。否决：首切偏重、改动面最大；形状射线求交与 anchor 同模块、拆解收益不及风险。
- **公开面 · 方案 B（下游全改直依赖 math）**：react / render / plot 纯几何都从 `@retikz/math` import，core 不 re-export 下沉部分。否决：0.x 中途破 `@retikz/core` 公开面 + churn ~56 文件 + 与「底层源自 core」原则有张力。
- **公开面 · 方案 C（混合：先 re-export 后迁）**：多一套过渡期约定，收益不及方案 A 直接稳定。
- **原 roadmap A 倾向「math 加法的、core geometry 留 core 不迁移」**：被「下沉已有 = 做新能力」重叠论证否决（决策 2）。

## 约束 / 取舍

- `contour` 的 `filletContour` / `contourCommands` / `ContourCommand` 留 core（IR-aligned，B1 复用），仅下沉其私有求交 helper。
- core geometry 现有行为下沉后**逐字不变**，由迁移测试 + `pnpm --filter @retikz/core exec tsc --noEmit` + 全量 lint 守。
- `arc.ts` 角度约定（SVG y-down，0=+x / 90=+y 视觉下）注释随文件带走，math 侧表述不引用 IR / 渲染语义。

## 待议 🔻

- **求交返回形态**：`lineLine`（无限直线）返回 `Position | null`（平行 / 重合 → null，沿用 contour 私有契约）；`lineCircle` / `circleCircle` 返回 `Array<Position>`（0/1/2）。`segmentSegment` 的共线重叠首切返回判别式（`{ kind:'none'|'point'|'collinear' }`）还是简化 `Position | null`，plan 段定。
- **`rayArc` 归属**：`arc.ts` 整体下沉后，`rayArc` 留 `arc.ts` 还是同时 surface 到 `intersect` 命名空间，plan 段定。
- **`point` 增 `dot` / `cross`**：凸包 / 点在多边形需叉积，倾向首切一并补。
- **测试迁移粒度**：core `tests/geometry/*` 哪些随函数迁 math、哪些（业务形状）留 core，按移动集对应切。

## 不在本 ADR 范围

- 形状 `contains` / `boundaryPoint` 下沉（切面方案 C）——留后续，首切形状模块只改 import。
- `curve/`（贝塞尔 / path-path 含曲线求交，roadmap B3 桥）、`matrix/`（伪三维投影）——roadmap 已列后置。
- `bend.ts` 下沉——偏 path-edge / 曲线方向，归后续 `curve/` 议题，首切留 core。
- B（路径补强）、D（eval）等其它 v0.4 子项——各自独立 spec。

---

> **实现指针**：level `red`（新建包 `@retikz/math` 公开 API 表面；同时动 core `geometry/` 多文件 + `index.ts` 导出 + 改 core `point` 公开面）。非 breaking 于 `@retikz/core` 的 geometry re-export（方案 A），**breaking 于 `point.toPolar`/`equalPolar`**（决策 6，0.x 接受）。文件 scope（草案）：新建 `packages/math/math/{package.json,tsconfig,src/{point,transform,intersect,arc,triangle,polygon,hull,index}.ts,tests/**}`；改 core `geometry/{point,transform,edge,contour,arc,index}.ts` + 形状模块 import + `index.ts` re-export + `toPolar`/`equalPolar` 调用方迁 `polar`；`pnpm-workspace.yaml` catalog 视需要。测试方向：math 自带纯函数单测（现成库仅作正确性参考）；core 迁移/保留 `tests/geometry/*` 守行为不变；求交退化 case（平行 / 相切 / 共线 / 零长）。下一步走 plan（`writing-plans`）定 scaffold + 逐文件移动集与 re-export 接线顺序 + 求交返回形态 + 测试迁移 + `toPolar`/`equalPolar` 调用方清单。文档同步：core `point` 公开面变化（去 `toPolar`/`equalPolar`）+ 新增 `@retikz/math` 包，属用户可见，需同步 `apps/docs` 与发布说明。

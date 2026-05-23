# ADR-01：arc step 加显式 center + 椭圆弧（radiusX / radiusY）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §IR 改动清单 / §`<Arc>` / §`<Sector>`](../../../plans/v0/v0.2-alpha.5.md) · [本 milestone ADR-04 sugar 设计约定](./04-sugar-conventions.md)

## 背景

现有 `arc` step 语义是「**紧邻前一 step 的 anchor 即圆心**」（`compile/path/index.ts` arc 分支 `const center = prev.anchor`），且只有单 `radius`（正圆弧）。两个缺口：

1. **椭圆弧缺失**：`<Arc>` / `<Sector>` 想画椭圆弧（`radiusX ≠ radiusY`）无从表达。
2. **隐式圆心坑了 `<Sector>`**：扇形 wedge 需要「圆心 → 弧起点 → 弧 → 回圆心」。naive 派发 `move(center) → line(arcStart) → arc → cycle` 会让 arc 的 `prev.anchor` 变成 arcStart（line 的终点）而非 center，扇形整体错位（plan §`<Sector>` 几何断点）。

## 选项（圆心断点，对应 plan §`<Sector>` 三选一）

- **A. arc 加可选显式 `center`（推荐，已选）**：`center` 缺省仍取 `prev.anchor`（向后兼容），给了就用显式值。alpha.5 本就要改 arc schema 加 radiusX/radiusY，顺带加 center 边际成本最小；让 arc 的圆心不再隐式依赖 step 顺序。
- B. `move→arc→line→cycle` 纯 sugar 不改 IR：强依赖 arc 的 startSegment / cycle 内部行为收 wedge，须测试验证，脆。
- C. 新增专门 `sector` step：语义最清晰但 IR 表面最大、工作量最多；扇形并非高频到值得独占一个 step。

## 决策：A

加可选 `center` + radiusX/radiusY 三互斥。**关键**：显式 center 让 arc 圆心不再取 `prev.anchor`，从而能构造一个**用现有 compile 语义就成立**的干净 Sector wedge（无需改 cycle 分支）——

```
move(arcStart)          // 起点 = 弧起点；arcStart = center + polar(radius, startAngle)，sugar 算
→ arc(center=center,…)  // 紧跟 move：startSegment(arcStart) 与游标重合不发 move；显式 center 圆心正确；弧 arcStart→arcEnd；penOverride=arcEnd
→ line(center)          // 消费 penOverride=arcEnd 作 fromClip → 画 arcEnd→center（wedge 第二条边）
→ cycle                 // 此时 prev=line(center)：fromClip=center==lastEnd 且 toClip=arcStart==subPathStart → 命中 emitClose() 闭回 arcStart（wedge 第一条边 + 收口）
```

输出 `M arcStart, arc, L center, Z` —— 干净闭合 wedge，**用 emitClose（Z）收口**（描边接角正确）。代价：Sector 的 center 与 arcStart 都须 literal 笛卡尔（sugar 算 arcStart），与 [ADR-04](./04-sugar-conventions.md)「可计算形态」一致。

> ⚠️ **反例（不要用 `move(center) → line(arcStart) → arc(center) → cycle`）**：cycle 分支用 `findPrev()` 找最近带 `to` 的 step = `line(arcStart)`（arc 不在 hasTo 内），从 `prev.step.to = arcStart`（而非实际笔位 arcEnd）闭合 → 画成 arcStart→center，不连 arcEnd，wedge 断裂（`compile/path/index.ts` cycle 分支语义）。把 arc 紧跟 move、line(center) 放 cycle 之前，正是为了让 cycle 的 prev = line(center)、fromClip=center=lastEnd 命中干净 emitClose 分支。

`<Arc>`（开放弧，不闭合）派发 `move(center) → arc(center=center)`：move 步本身不发命令（compile 对 move `continue`），arc 的 startSegment 发 `M arcStart` 再画弧（输出 `M arcStart, arc`），**sugar 不需算 arcStart**，故 `<Arc>` 的 center 可接任意 Target（透传形态）。

## 待决点（已定）

- **半径三互斥**：`radius`（单值 = 正圆弧）/ `radiusX` + `radiusY`（双值 = 椭圆弧）二选一；`.refine` 校验 `(radius !== undefined) XOR (radiusX !== undefined && radiusY !== undefined)`。
- **center 缺省语义**：缺省 = `prev.anchor`（**完全向后兼容**现有 arc 用法）；给了 = 显式圆心（resolve 经 `refPointOfTarget`，与其它 Target 同路）。
- **椭圆弧角度约定**：沿用 `geometry/arc.ts`（SVG y-down，0=+x，角增 = 屏幕顺时针）；椭圆弧端点 = `[cx + rx·cosθ, cy + ry·sinθ]`（参数角，非真实极角）。
- **圆弧仍走 `emitArc`（零破坏），椭圆弧走 `emitEllipseArc`**：`radius` 分支沿用现有 `emitArc`（输出 `arc` PathCommand，**现有圆弧图逐字节不变**）；`radiusX/radiusY` 分支走 `emitEllipseArc`（`ellipseArc` PathCommand）。不统一，以免改动现有圆弧的命令表示触发快照漂移。
- **bbox**：`geometry/arc.ts` 的 `arcBoundingPoints` 推广到 rx/ry（轴向四点 + 端点）。

## 影响

- `packages/core/src/ir/path/step.ts`：`ArcStepSchema` —— `radius` 改 optional、加 `radiusX` / `radiusY` / `center?: TargetSchema` + `.refine` 三互斥；`IRArcStep` 类型随 zod 推导。
- `packages/core/src/geometry/arc.ts`：端点 / bbox 推广到 rx/ry（`arcEndPoint` 加 ry 版或新 `ellipseArcPoint`）。
- `packages/core/src/compile/path/index.ts`：arc 分支 `center = step.center ? refPointOfTarget(step.center, …) : prev.anchor`；半径取 `radius` 或 `radiusX/Y`；统一 `emitEllipseArc`。
- `packages/react/src/kernel/Step.tsx`：arc 变体 props 加 `center?` / `radiusX?` / `radiusY?`，`radius` 改可选。
- `packages/react/src/kernel/builder.ts`：`readPathChildren` arc 分支透传新字段。
- **零破坏**：新字段 optional，现有 `radius`-only arc 输出逐字节不变。

## 实现契约

### Level

`red`（动 `ir/**` schema + `compile/**` + `geometry/**`）。

### Schema 改动

| 文件 | 操作 | 字段 | 类型 | describe 摘要 |
|---|---|---|---|---|
| `ir/path/step.ts` | 改 | `ArcStepSchema.radius` | `z.number().positive().optional()` | 正圆弧半径；与 radiusX/radiusY 三互斥 |
| `ir/path/step.ts` | 加 | `radiusX` / `radiusY` | `z.number().positive().optional()` | 椭圆弧半轴；两者须同时给 |
| `ir/path/step.ts` | 加 | `center` | `TargetSchema.optional()` | 显式圆心；缺省取游标（前一 step anchor） |
| `ir/path/step.ts` | 加 | `ArcStepSchema.refine` | — | radius 单值 XOR (radiusX + radiusY) 双值 |

### 测试象限（`packages/core/tests/compile/arc-center-elliptical.test.ts`，≥ 8）

- happy：显式 center 的 arc 圆心 = center（非 prev.anchor）；椭圆弧（rx≠ry）端点正确；正圆弧 radius 行为不变（回归）
- 边界：center 缺省退回 prev.anchor（向后兼容）；椭圆弧 bbox 含 rx/ry 轴向四点
- 错误：`radius` + `radiusX` 同给被 refine 拒；只给 `radiusX` 不给 `radiusY` 被拒
- 交互：Sector 派发 `move(arcStart)→arc(center)→line(center)→cycle` 输出 commands = `[move, (ellipse)arc, line, close]`；圆心 = 显式 center（非 arcStart）；末 close 闭回 arcStart（验 path d，非仅段数）

### 依赖

- `geometry/arc.ts` `arcEndPoint` / `arcBoundingPoints` —— 推广 rx/ry。
- `compile/path/index.ts` `emitEllipseArc` / `refPointOfTarget` / `findPrev` —— 复用。

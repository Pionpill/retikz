# ADR-02：circlePath / ellipsePath 部分裁剪（startAngle / endAngle / closed）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §`<Circle>` / §`<Ellipse>`](./roadmap.md) · [本 milestone ADR-01 arc](./01-arc-center-and-elliptical.md)（部分弧几何同源）

> **范围**：让 `circlePath` / `ellipsePath` 能画半圆 / 1/4 椭圆 / 弓形（部分裁剪），而非只能整圆 / 整椭圆。

## 背景 / 约束

原 `circlePath` / `ellipsePath` 只能画整圆 / 整椭圆（compile 走全 sweep `emitEllipseArc(center, r, r, 0, 360)`）。`<Circle>` / `<Ellipse>` 想画部分弧无从表达。

## 决策：两 step 各加 `startAngle` / `endAngle` + `closed`

- **不给角度** → 整圆 / 整椭圆（原行为，逐字节不变）。
- **给角度** → 部分弧，按 `closed` 模式收尾。

字段定型见 `core/src/ir/path/step.ts`（`CirclePathStepSchema` / `EllipsePathStepSchema`）。

**`sweepAngle` 不进 IR**：与 `arc` step 一致（arc 也只有 startAngle / endAngle），「三键（start/end/sweep）求二」是 sugar 层便利，解析后只塞 startAngle / endAngle 进 IR。保持 IR 紧凑 + 与 arc 命名一致。

`closed` 三模式：

| 值 | 含义 | 合法场景 |
|---|---|---|
| `'closed'` | 完整闭合（整圆 / 整椭圆） | 仅无角度时（默认） |
| `'chord'` | 弦闭合（直线连弧两端点 → 半圆 / 弓形） | 有角度时默认 |
| `'open'` | 不闭合（纯弧线，等价 `<Arc>`） | 有角度时可选 |

> wedge（经圆心闭合 = 扇形）**不在此**——那是 `<Sector>` 的形态（[ADR-01](./01-arc-center-and-elliptical.md)）。`<Circle>` 带角度只做 chord / open。

具体决策：

- **角度 both-or-neither + closed 互锁不进 zod**：要么都缺（整圆）、要么都给（部分）。约束不放 zod（同 [ADR-01](./01-arc-center-and-elliptical.md)：保纯 ZodObject 供 discriminatedUnion + docs `<ZodSchema>` 自省）——由 sugar 构造保证 + compile 处理（只给一个角度 → 视整圆 + warn；无角度默认 `'closed'`，有角度默认 `'chord'`，有角度误给 `'closed'` → warn 回退 chord）。schema 仅 `closed: z.enum(['closed','chord','open']).optional()` 字段级。
- **center 透传**：`<Circle>` / `<Ellipse>` 派发 `move(center) → circlePath/ellipsePath(...)`，center 由 compile 解析（圆心 = prev.anchor = move 的 center），sugar 不算 arcStart → center 可接**任意 Target**（透传形态，[ADR-04](./04-sugar-conventions.md)）。
- **角度参数化**：同 [ADR-01](./01-arc-center-and-elliptical.md)（SVG y-down，参数角，非真实极角）；部分弧几何复用 `geometry/{circle,ellipse}.ts` 新增的 partial-outline 函数。
- **fill 语义**：chord 闭合的弓形可被 path 级 `fill` 填充（弦 + 弧围成的区域）；open 不闭合，fill 行为同非闭合 path。

### pen / subpath 语义（逐 closed 模式）

`arcStart = ellipseArcEndPoint(center, rx, ry, startAngle)`、`arcEnd = …endAngle`（圆 rx=ry=radius）。compile 分流的关键是「画完笔位（penOverride）」三模式各异——它决定后续 step / arrow endpoint 从哪续：

| 模式 | 触发 | 画完笔位 | 收尾 |
|---|---|---|---|
| full（closed） | 无角度 | **center**（TikZ circle 回圆心，原行为） | 全 sweep ellipseArc(0→360) |
| open | 有角度 + closed=open | **arcEnd**（停弧终点，等价 `<Arc>`） | 无 close |
| chord | 有角度 + closed=chord | **arcStart**（close 后 lastEnd=subPathStart） | `emitClose()`（Z 画 arcEnd→arcStart 弦 + 收口） |

三模式 bbox 都不能再用整圆四点（partial 只取区间内 90°·k 轴向点 + 端点）；full 维持原行为，整圆 / 整椭圆输出逐字节不变。

## 不在本 ADR 范围

- 扇形 wedge（经圆心闭合）—— `<Sector>` 形态，见 [ADR-01](./01-arc-center-and-elliptical.md)。

---

> **实现指针**：level `red`（动 `core/src/ir/**` + `compile/**` + `geometry/**`）、additive 零破坏（新字段 optional，整圆 / 整椭圆输出不变）。真源以代码为准——`CirclePathStepSchema` / `EllipsePathStepSchema`（`core/src/ir/path/step.ts`）、按角度与 closed 分流（`core/src/compile/path/index.ts`，`emitEllipseArc` 推广到 start..end 部分 sweep）、部分 outline / bbox（`core/src/geometry/{circle,ellipse}.ts`）、两 step 变体 props（`react/src/kernel/Step.tsx` + `builder.ts`）。测试在 `core/tests/compile/partial-circle-ellipse.test.ts` + `core/tests/geometry/`。完整原文（Schema 改动表 / pen 语义全表 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `b99e7294`；压缩前完整施工蓝图 = `git show b99e7294^:notes/decisions/core/v0/v0.2/alpha.5/02-partial-circle-ellipse.md`。

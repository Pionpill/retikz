# ADR-02：circlePath / ellipsePath 部分裁剪（startAngle / endAngle / closed）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §`<Circle>` / §`<Ellipse>`](./roadmap.md) · [本 milestone ADR-01 arc](./01-arc-center-and-elliptical.md)（部分弧几何同源）

## 背景

现有 `circlePath` / `ellipsePath` 只能画**整圆 / 整椭圆**（compile 走 `emitEllipseArc(center, r, r, 0, 360)` 全 sweep）。`<Circle>` / `<Ellipse>` 想画半圆 / 1/4 椭圆 / 弓形（部分裁剪）无从表达。

## 决策

两 step 各加可选 `startAngle` / `endAngle` + `closed` 枚举：

- **不给角度** → 整圆 / 整椭圆（原行为，逐字节不变）。
- **给角度** → 部分弧，按 `closed` 模式收尾。

**`sweepAngle` 不进 IR**：与 `arc` step 一致（arc 也只有 startAngle / endAngle），「三键（start/end/sweep）求二」是 **sugar 层**便利，sugar 解析后只塞 startAngle / endAngle 进 IR。保持 IR 紧凑 + 与 arc 命名一致。

`closed` 三模式：

| 值 | 含义 | 合法场景 |
|---|---|---|
| `'closed'` | 完整闭合（整圆 / 整椭圆） | **仅无角度**时（默认） |
| `'chord'` | 弦闭合（直线连弧两端点 → 半圆 / 弓形） | 有角度时**默认** |
| `'open'` | 不闭合（纯弧线，等价 `<Arc>`） | 有角度时可选 |

> wedge（经圆心闭合 = 扇形）**不在此**——那是 `<Sector>` 的形态（[ADR-01](./01-arc-center-and-elliptical.md)）。`<Circle>` 带角度只做 chord / open。

## 待决点（已定）

- **角度 both-or-neither**：`startAngle` / `endAngle` 要么都缺（整圆）、要么都给（部分）。**约束不放 zod**（同 [ADR-01](./01-arc-center-and-elliptical.md)：step schema 保纯 ZodObject 供 discriminatedUnion + docs `<ZodSchema>` 自省）——由 sugar 构造保证、compile 处理（只给一个角度时 compile 视为整圆 + warn）。
- **closed 默认 + 合法性**：无角度 → `'closed'`（compile 默认）；有角度 → 默认 `'chord'`。模式与是否带角度的互锁同由 sugar + compile 保证（compile：无角度恒 full；有角度时 `closed` 取 chord/open，误给 `'closed'` warn 回退 chord）。schema 仅 `closed: z.enum(['closed','chord','open']).optional()` 字段级。
- **center 透传**：`<Circle>` / `<Ellipse>` 派发 `move(center) → circlePath/ellipsePath(...)`，center 由 compile 解析（circlePath 的圆心 = prev.anchor = move 的 center），**sugar 不算 arcStart** → center 可接**任意 Target**（透传形态，[ADR-04](./04-sugar-conventions.md)）。
- **角度参数化**：同 [ADR-01](./01-arc-center-and-elliptical.md)（SVG y-down，参数角，非真实极角）；部分弧几何复用 `geometry/{circle,ellipse}.ts` 新增的 partial-outline 函数。
- **fill 语义**：chord 闭合的弓形可被 path 级 `fill` 填充（弦 + 弧围成的区域）；open 不闭合，fill 行为同非闭合 path。

## pen / subpath 语义（逐 closed 模式，必须逐个测）

`arcStart = ellipseArcEndPoint(center, rx, ry, startAngle)`、`arcEnd = …endAngle`（圆 rx=ry=radius）。compile 分流：

| 模式 | 触发 | 输出 commands | subPathStart | 画完笔位（penOverride） | bbox |
|---|---|---|---|---|---|
| full（closed） | 无角度 | `M (cx+rx,cy)`, 全 sweep ellipseArc(0→360) | (cx+rx, cy) | **center**（原行为，TikZ circle 回圆心） | 轴向四点 |
| open | 有角度 + closed=open | `M arcStart`, ellipseArc(start→end) | arcStart | **arcEnd**（停弧终点，等价 `<Arc>`） | `arcBoundingPoints` / 椭圆版（端点 + 区间内 90°·k 轴向点） |
| chord | 有角度 + closed=chord | `M arcStart`, ellipseArc(start→end), **close** | arcStart | **arcStart**（close 后 lastEnd=subPathStart） | 同 open（弦在弧凸包内） |

要点：① open 的 penOverride=arcEnd 保证「等价 `<Arc>`」+ 后续 step / arrow endpoint 从弧终点续；② chord 用 `emitClose()`（Z 画 arcEnd→arcStart 弦 + 收口），penOverride=arcStart；③ full 维持现有 `penOverride=center`，**整圆 / 整椭圆输出逐字节不变**；④ 三模式 bbox 都不能再用整圆四点（partial 只取区间内轴向点 + 端点）。

## 影响

- `packages/core/src/ir/path/step.ts`：`CirclePathStepSchema` / `EllipsePathStepSchema` 各加 `startAngle?` / `endAngle?`（`z.number().optional()`）/ `closed?: z.enum(['closed','chord','open'])`——**保持纯 ZodObject，无 refine**（约束在 sugar + compile）。
- `packages/core/src/geometry/{circle,ellipse}.ts`：加部分 outline（端点 + bbox）函数，供 compile 与未来 node shape 复用（[ADR-04](./04-sugar-conventions.md) 几何下沉原则）。
- `packages/core/src/compile/path/index.ts`：circlePath / ellipsePath 分支按角度与 closed 分流——全 sweep（原） / 部分 + chord 收线 / 部分 + open。
- `packages/react/src/kernel/Step.tsx` + `builder.ts`：两 step 变体 props + 透传新字段。
- **零破坏**：新字段 optional，整圆 / 整椭圆输出不变。

## 实现契约

### Level

`red`（`ir/**` + `compile/**` + `geometry/**`）。

### Schema 改动

| 文件 | 操作 | 字段 | 类型 | describe 摘要 |
|---|---|---|---|---|
| `ir/path/step.ts` | 加 | circlePath/ellipsePath `startAngle` / `endAngle` | `z.number().optional()` | 部分弧起 / 末角；两者同缺 = 整圆，同给 = 部分 |
| `ir/path/step.ts` | 加 | `closed` | `z.enum(['closed','chord','open']).optional()` | 闭合模式；无角度默认 closed，有角度默认 chord |
| （约束） | sugar + compile | 角度 both-or-neither / closed 互锁 | — | 不进 zod（保 ZodObject）；sugar 构造 + compile 处理 |

### 测试象限（`packages/core/tests/compile/partial-circle-ellipse.test.ts`，≥ 8）

- happy：半圆（start=0 end=180 chord）commands = `[move, ellipseArc, close]`；1/4 椭圆部分；open 模式 commands 无 close
- 边界：整圆（无角度）输出与改造前一致（回归 / 快照）；start>end 跨向正确
- **pen 语义（逐模式，接一条 line 验起点）**：open 后续 line 从 arcEnd 起；chord 后续 line 从 arcStart 起；full 后续 line 从 center 起；partial bbox 不含整圆四点
- 错误（sugar + compile，非 safeParse）：sugar 单给 startAngle → 抛 Error；compile 收单角度 → 视整圆 + warn；compile 收「有角度 + closed:'closed'」→ warn 回退 chord
- 交互：`<Circle>` 带角度派发 = 手写 circlePath(startAngle,endAngle,closed) IR 等价

### 依赖

- `compile/path/index.ts` `emitEllipseArc` —— 推广到 start..end 部分 sweep。
- `geometry/{circle,ellipse}.ts` —— 加 partial outline，复用点同 [ADR-04](./04-sugar-conventions.md)。

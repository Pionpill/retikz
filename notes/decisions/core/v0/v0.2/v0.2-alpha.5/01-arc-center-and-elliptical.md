# ADR-01：arc step 加显式 center + 椭圆弧（radiusX / radiusY）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §IR 改动清单 / §`<Arc>` / §`<Sector>`](./roadmap.md) · [本 milestone ADR-04 sugar 设计约定](./04-sugar-conventions.md)

> **范围**：给 `arc` step 补显式圆心与椭圆弧能力，让 `<Arc>` / `<Sector>` 能画椭圆弧、扇形 wedge 不再被隐式圆心坑。

## 背景 / 约束

塑造方案的两个硬约束：

- **隐式圆心**：原 `arc` step 圆心恒取「紧邻前一 step 的 anchor」（`prev.anchor`），且只有单 `radius`（正圆弧）。椭圆弧（`radiusX ≠ radiusY`）无从表达。
- **扇形 wedge 几何断点**：`<Sector>` 需「圆心 → 弧起点 → 弧 → 回圆心」。隐式圆心下 naive 派发 `move(center) → line(arcStart) → arc → cycle` 会让 arc 的圆心变成 arcStart（line 的终点）而非 center，扇形整体错位。

## 决策：arc 加可选显式 `center` + radiusX / radiusY

`center` 缺省仍取 `prev.anchor`（**完全向后兼容**），给了就用显式值——圆心不再隐式依赖 step 顺序。alpha.5 本就要改 arc schema 加 radiusX/radiusY，顺带加 center 边际成本最小。最终字段见 `core/src/ir/path/step.ts`（`ArcStepSchema`）。

显式 center 让 `<Sector>` 能用**现有 compile 语义就成立**的干净 wedge（无需改 cycle 分支）：

```
move(arcStart)          // 起点 = 弧起点；arcStart = center + polar(radius, startAngle)，sugar 算
→ arc(center=center,…)  // 紧跟 move：与游标重合不发 move；显式 center 圆心正确；penOverride=arcEnd
→ line(center)          // 消费 penOverride=arcEnd → 画 arcEnd→center（wedge 第二条边）
→ cycle                 // prev=line(center)：fromClip=center==lastEnd → 命中 emitClose() 闭回 arcStart
```

输出 `M arcStart, arc, L center, Z` —— 干净闭合 wedge，用 emitClose（Z）收口（描边接角正确）。代价：Sector 的 center 与 arcStart 都须 literal 笛卡尔（sugar 算 arcStart），与 [ADR-04](./04-sugar-conventions.md)「可计算形态」一致。

> **wedge step 顺序是决策、不可调换**：必须 arc 紧跟 move、line(center) 在 cycle 之前。若写成 `move(center) → line(arcStart) → arc → cycle`，cycle 分支用 `findPrev()` 找最近带 `to` 的 step = `line(arcStart)`（arc 不在 hasTo 内），从 `arcStart`（而非实际笔位 arcEnd）闭合 → 画成 arcStart→center、不连 arcEnd，wedge 断裂。

`<Arc>`（开放弧，不闭合）派发 `move(center) → arc(center=center)`：move 不发命令，arc 的 startSegment 发 `M arcStart` 再画弧，**sugar 不需算 arcStart**，故 `<Arc>` 的 center 可接任意 Target（透传形态）。

具体决策：

- **半径三互斥**：`radius`（单值 = 正圆弧）/ `radiusX` + `radiusY`（双值 = 椭圆弧）二选一。**约束不放 zod**——`ArcStepSchema` 须保持纯 `ZodObject`（`StepSchema` discriminatedUnion 成员 + docs `<ZodSchema>` `.shape` 自省 + 个体 `.safeParse` 都要求），加 `.refine` / `.superRefine` 会变 ZodEffects 破坏这些。三互斥改由 sugar 构造保证（只发合法组合）+ compile 优雅处理（`radiusX && radiusY` → 椭圆弧；否则 `radius` → 圆弧；都缺 → warn + skip）。schema 仍保字段级 `.positive()`。
- **角度约定**：沿用 `geometry/arc.ts`（SVG y-down，0=+x，角增 = 屏幕顺时针）；椭圆弧端点 = `[cx + rx·cosθ, cy + ry·sinθ]`（参数角，非真实极角）。
- **圆弧走 `emitArc`、椭圆弧走 `emitEllipseArc`，不统一**：`radius` 分支沿用现有 `emitArc`（`arc` PathCommand，现有圆弧图逐字节不变），`radiusX/radiusY` 走 `emitEllipseArc`（`ellipseArc` PathCommand）。统一会改动现有圆弧命令表示、触发快照漂移，故刻意分流。

### 被否决的选项

- **B：`move→arc→line→cycle` 纯 sugar 不改 IR** —— 强依赖 arc 的 startSegment / cycle 内部行为收 wedge，须测试验证，脆。
- **C：新增专门 `sector` step** —— 语义最清晰但 IR 表面最大、工作量最多；扇形并非高频到值得独占一个 step。

## 不在本 ADR 范围

- circlePath / ellipsePath 部分裁剪（[ADR-02](./02-partial-circle-ellipse.md)）；矩形 step（[ADR-03](./03-rectangle-step.md)）。

---

> **实现指针**：level `red`（动 `core/src/ir/**` schema + `compile/**` + `geometry/**`）、additive 零破坏（新字段 optional，现有 `radius`-only arc 输出逐字节不变）。真源以代码为准——`ArcStepSchema` / `IRArcStep`（`core/src/ir/path/step.ts`）、arc 分支圆心 / 半径分流（`core/src/compile/path/index.ts`）、端点 / bbox 推广 rx/ry（`core/src/geometry/arc.ts`）、`<Arc>` / `<Sector>` props（`react/src/kernel/Step.tsx` + `builder.ts`）。测试在 `core/tests/compile/arc-center-elliptical.test.ts` + `core/tests/geometry/`。完整原文（Schema 改动表 / 文件 scope / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `b99e7294`；压缩前完整施工蓝图 = `git show b99e7294^:notes/decisions/core/v0/v0.2/v0.2-alpha.5/01-arc-center-and-elliptical.md`。

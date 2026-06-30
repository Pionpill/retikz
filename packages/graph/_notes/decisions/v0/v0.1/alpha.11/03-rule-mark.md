# ADR-03：rule mark——数据驱动的常量位置参考标注，line 形态下沉 core `Path`、band 形态复用 ADR-01 `projectCell`；与 reference-line guide 划清「数据 vs scale 派生」分工

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md)「Geometry 基础」 · [alpha.11 roadmap](./roadmap.md) · [plot-design.md §3.7 mark 表 rule / §3.9 guide / §3.10 layer](../../../../architecture/plot-design.md) · 同 milestone [ADR-01 区间几何投影](./01-cell-geometry-projection.md)

## 背景（塑造决策的硬约束）

- plot-design 把「画参考线 / 阈值线」「画区间高亮带」这两件事横跨了两层：§3.7 把 `rule` 列为 mark（参与 §3.10 layer z-order、与 bar/line 并列），§3.9 的 guide 清单却又同时列了「reference line / band」。边界不划清，下游会出现两套画线 / 画带机制互相打架，这是本 ADR 必须先解决的核心。
- §3.9 的「reference **line**」与「reference **band**」只差「常量轴上是一个值还是一对 `[lo,hi]`」：前者是单值 → 一条线，后者是区间 → 一片填充区域。拆成两个 mark 会割裂语义、让用户困惑该用哪个。
- 既有 mark union（point / line / interval / sector / area）和 guide（axis / legend）都没有「常量位置参考标注」能力。用户当前只能滥用 line mark 手凑端点假数据、或滥用 interval mark 拼区间，既不语义、又拿不到「跨满整条对侧轴域」这个本质行为（rule 连的是坐标系的轴域边界，不是数据点）。
- 业界对照（Observable Plot `ruleX`/`ruleY`、Vega-Lite `mark:"rule"` + `rect` band、G2 `lineX/Y` + `rangeX/Y`）的共识：rule = 一条常量位置线，做成 **mark**（要参与 layer z-order、可 per-datum、可被 color 等通道编码）；区间带用 rect / range 类几何表达，仍是 mark 层。retikz 已有的 axis-guide 是「scale 的刻度可视化身」，与「在数据空间某个值 / 区间处画标注」是两类东西。

## 决策：rule 作为 mark，line 下沉 core `Path`、band 复用 ADR-01 `projectCell`；reference-line / band guide 暂不引入

**核心分工（本 ADR 最重要的决策）**：

- **rule mark = 数据驱动的常量位置参考标注**——值来自 `encoding`（`field` per-datum 每行一条、或 `value` 常量单条），属 **mark 层**，与 point / line / interval 并列参与 layer z-order（§3.10 `threshold rule layer`），可被 `color` 通道编码、可被 scope / anchor 引用。两种形态：
  - **line（默认）**：常量轴给**单值** → 一条线，跨满对侧轴域（或被 extent 截断）。下沉 core `Path`（1D 线，**不走** `projectCell`）。
  - **band**：常量轴给一个 **`[lo,hi]` 区间** → 一片**填充区域**。band 几何 = ADR-01 的正交 cell（primary = 对侧轴 full extent / extent 截断、secondary = 常量轴 `[lo,hi]`），喂 `frame.projectCell(cell)` → cartesian 出 rect、polar 出环带 sector、曲线出 contour，是**可连接 Node**（守 §8.1），**零新增几何**（直接复用 ADR-01）。
- **reference-line / band guide = scale 派生的标注**（均值线、固定阈值带等由 scale domain / aggregate 推出、随 scale 重算）属 guide 层。**本 ADR 不引入它**——「均值线」「均值 ± σ 带」本质 = aggregate transform 产出常量行 / 区间行 + rule mark 的 line / band 形态画（Vega-Lite 路线），无需独立 guide 成员。真正只有 guide 能做的「跟随 scale tick 自动重算的标注带」留待 guide 体系演进单独评估（见「不在本 ADR 范围」）。

**几何本质**：rule = 沿一个位置维度取常量（line = 单值、band = `[lo,hi]` 区间）、跨满对侧维度整个轴域的标注（或由 extent 截成部分长度）。line 是 1D 线、band 是 2D 区域。

**已拍板的子决策**：

- **取向由 encoding 绑定维度决定，不加独立 `orientation` 字段**——绑 `encoding.x` ⇒ 竖直 rule（x=const 跨 y 域）、绑 `encoding.y` ⇒ 水平 rule（y=const 跨 x 域）；两者皆设 / 皆缺 → lowering fail-loud。语义自洽、复用 encoding 通道，省一个易与 encoding 冲突的冗余枚举（Observable Plot 用两个 mark `ruleX/ruleY`，retikz 用一个 mark + 绑定维度区分，更省表面）。
- **line vs band 判别**：常量轴只给下界 ⇒ line；同时给匹配维度的上界（`xTo` / `yTo`）⇒ band。两形态共用一个 rule mark，分流在 lowering。
- **band 第二界字段命名 = `xTo` / `yTo`**（**字面形态即决策**）。被否决候选：① `x2` / `y2`（与 Vega-Lite / Observable Plot 对齐、业界熟悉）——否决，因 `xTo/yTo` 与既有 `extentToField` 的 `To` 命名一致、更自洽；② 子对象 `band: { to }`——否决，上界与作下界的 `encoding.x/y` 不在同一层、读起来割裂。`xTo/yTo` 扁平、避免子对象嵌套。
- **band 坐标系支持面 = 完全继承 ADR-01**：frame 实现了 `projectCell` 才支持（cartesian2D → rect band、polar2D → 环带 sector、出 contour 的曲线 frame → contour band），未实现则 fail-loud，无引擎自动兜底。不为 band 单开坐标系矩阵。
- **full-span vs per-datum**：`value` ⇒ 单条 full-span；`field`（含 `xTo/yTo` 给 field）⇒ 每行一条。统一走同一 `lowerRule`。
- **extent（部分长度）**：`extentField` / `extentToField` 给对侧维度起止值，把线 / 带从满铺截成线段（如甘特时间游标段）；须成对，缺一 / 单设 → fail-loud；皆缺 → 满铺。本轮即落（per-datum 阈值线常需部分长度）。
- **polar 语义**：line——竖直 rule（`x=const`=常量角度）→ 径向线（沿半径 inner→outer 单 line step）、水平 rule（`y=const`=常量半径）→ 整圆 / 弧（沿角向密采样，复用 `densifyPolarSegments`，按角域整圆 vs 弧）；band 全部委托 `projectCell`——水平 band（半径区间）→ 环带 sector、竖直 band（角度区间）→ 扇形楔 sector，与 sector mark 同形，rule 侧不自写 polar band 几何。
- **color 编码**：per-datum 支持 `color` 通道，按 `colorGroupedScope` 同思路分子 Scope 上提（line→stroke、band→fill）；单条常量 line/band 直接落 Path stroke / Node fill。复用既有分组机制，line/band 仅样式属性不同。

**判别字段形态**（IR 判别串 `type = 'rule'`，line vs band 由有无匹配维度的 `xTo/yTo` 决定，取向由 `encoding.x` XOR `encoding.y` 决定）：

```ts
// 顶层 mark 字段：xTo / yTo（band 上界，与所绑维度配对）、extentField / extentToField（对侧维截断，成对）
// encoding 复用 positionalEncoding（x/y 下界 + color）；上界不入 encoding
```

DSL / API 两套表面（IR `{value}`/`{field}` 互斥；React `<RuleMark>` 扁平 props，数字→value、字符串→field）的完整示例见文档站 `apps/docs/src/contents/graph/components/mark/rule/`（zh / en）。

## 理由

1. **rule 数据驱动 + 参与 layer z-order，本质就是 mark**——能 per-datum、能被 color 编码、要和 bar / line 在同一 coordinate scope 内按声明序叠放（§3.10）。这些是 mark 层属性，axis-guide（scale 的刻度身）给不了。与 Observable Plot / Vega-Lite 一致。
2. **按形态分流下沉，零新增几何契约**——line 是 1D 线、无 2D cell 结构，下沉 core `Path`，复用 line mark 的 `pointsToSteps` / `densifyPolarSegments`、坐标系无关性靠 `frame.project` + polar 段采样承接；band 恰好是 ADR-01 的正交 cell，直接喂 `frame.projectCell`，与 interval / rect 共用同一套 cell 几何并产出可连接 Node（守 §8.1）。这把 §3.9「reference line / band」两种形态统一进同一个 rule mark，band 还把 ADR-01 cell 投影复用到「常量轴区间」新场景。故「rule 不走 `projectCell`」不是绝对结论：line 不走、band 走，由有无 `xTo/yTo` 判定。
3. **不引入 reference-line-guide，避免能力分裂**——「均值线」用 aggregate transform + rule mark 表达（无新 IR 成员），先吃掉 §3.9 reference line 的主体诉求；一上来开两套画线机制会让用户困惑该用哪个、让实现重复。

## 影响（用户可见）

- 新增 `<RuleMark>` mark（plot-react sugar，扁平 props，含 `xTo` / `yTo` band 上界）+ rule IR 成员；非 breaking（纯新增 mark 成员）。
- `ir/encoding.ts` / `ir/guide.ts` 不改（rule 复用既有 encoding；band 上界作 mark 顶层字段不入 encoding；明确不在 guide 加 reference-line 成员）。
- plot-vanilla `renderPlot` 无代码改动（mark 无关、纯 spec 驱动）。
- 文档站新增 rule mark 页（IR + React 两套表面、line vs band、取向 / extent / polar 语义）；guide 文档补一句「参考线 / 参考带走 rule mark，非 axis/legend guide」消歧。

## 不在本 ADR 范围

- **reference-line / band guide 独立成员**（随 scale tick 自动重算的标注线 / 带）：本 ADR 用 rule mark + aggregate transform 覆盖均值线、均值 ± σ 带等主体诉求；真正只有 guide 能做的「跟随 scale 重算」留待 guide 体系演进单独 ADR 评估。
- **1D / ternary / custom 坐标系下的 rule line**：几何语义（对侧轴域 / 满铺定义）未定，fail-loud；band 支持面随 `projectCell`（继承 ADR-01），无 `projectCell` 的坐标系 band 同样 fail-loud；后续按需求驱动单独评估。
- **dash / 线型 / 标签**（rule 上挂文字标注）：样式归 Theme（alpha.15）、标签归 text mark（ADR-04）+ anchor 引用 rule，本 ADR 只画线 / 带。
- **chart preset / 高层封装**（一行出带参考线的图表）：后随单独评估。

## 实现指针

- 实现 commit：`d0071529`（后续对抗审查修复见 `f0085156` 的 ribbon/rule 边界修复）。
- IR schema：`packages/graph/plot/src/ir/mark.ts`（`PlotMark.Rule` + `RuleMarkSchema` + 并入 `MarkSchema` discriminatedUnion + `RuleMark` 类型）。
- lowering：`packages/graph/plot/src/lower/mark.ts`（`lowerRule`，line 产 core Path、band 经 `frame.projectCell` 出 Node）。
- React sugar：`packages/graph/plot-react/src/components/marks.tsx`（`RuleMark` / `RuleMarkProps`）+ `packages/graph/plot-react/src/components/build-plot-spec.ts`（扁平 props → rule IR 装配 + fail-loud 校验）。
- 测试：`packages/graph/plot/tests/lower/rule.test.ts`、`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`、`packages/graph/plot-vanilla/tests/render-plot.test.ts`。
- 文档 + demo：`apps/docs/src/contents/graph/components/mark/rule/`（line / band / per-datum demo，zh / en）。

---

> 🔖 本文件压缩前完整施工蓝图 = `git show 6902289a:_notes/decisions/plot/v0/v0.1/alpha.11/03-rule-mark.md`（封板全文）。

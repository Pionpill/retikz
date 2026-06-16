# ADR-03：rule mark——数据驱动的常量位置参考标注，line 形态下沉 core `Path`、band 形态复用 ADR-01 `projectCell`；与 reference-line guide 划清「数据 vs scale 派生」分工

- 状态：Proposed
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md)「Geometry 基础」 · [alpha.11 roadmap](./roadmap.md) · [plot-design.md §3.7 mark 表 rule / §3.9 guide / §3.10 layer](../../../../../architecture/plot-design.md) · 同 milestone [ADR-01 区间几何投影](./01-cell-geometry-projection.md)

## 背景

plot-design §3.7 把 `rule` 列为 mark（语义「参考线 / 阈值线」，例子 average line）；§3.10 的 layer 例子里又写着 `threshold rule layer` 与 bar / line / point 并列、参与同一 coordinate scope 的 z-order。但 §3.9 的 guide 清单里**同时**列了「reference line / band」——于是「画一条横线标注阈值 / 均值」「画一条区间带标注容差 / 阈值范围」这两件事在设计文档里横跨 mark 与 guide 两层。本 ADR 必须先把这条边界划清，否则下游会出现两套画线 / 画带机制互相打架。

现状 `packages/plot/plot/src/`：mark union 已有 point / line / interval / sector / area（`ir/mark.ts`），guide 已有 axis / legend（`ir/guide.ts`），**都没有「常量位置参考标注」能力**。用户想画「y=80 及格线」「x=今天 时间游标」「每行一条阈值横杠」（**line 形态**），或「y∈[70,90] 容差带」「x∈[周末] 高亮带」（**band 形态**）时，目前只能滥用 line mark 手凑端点假数据、或滥用 interval mark 拼区间——既不语义、又拿不到「跨满整条对侧轴域」这个本质行为（line/band 连的是坐标系的轴域边界，不是数据点）。

§3.9 同时把「reference **line**」与「reference **band**」并列在 guide 清单里：前者是「常量轴给单值 → 一条线」，后者是「常量轴给一个 `[lo,hi]` 区间 → 一片填充区域」，两者只差「常量轴上是一个值还是一对值」。把它们拆到两个 mark 既割裂语义、又让用户困惑「该用 rule 还是另一个 band mark」。本 ADR 将二者**统一进同一个 rule mark**：单值判为 line、区间判为 band，line 走 core `Path`、band 复用 ADR-01 的 `projectCell`，零新增几何契约（见「决策」）。

同类库对照：

- **Observable Plot** 有 `ruleX` / `ruleY` 两个 mark：`ruleX(data, {x})` 给每行画一条竖直全高线（per-datum），`ruleY([80])` 给单个常量画一条水平全宽线（full-span）；`y1` / `y2`（或 `x1` / `x2`）做部分长度线段。它把 rule 明确放在 **mark** 层，参与 `marks: [...]` 的绘制顺序。
- **Vega-Lite** 用 `mark: "rule"` + `encoding.x`（竖线）/ `encoding.y`（横线），同样是 mark；区间高亮则用 `mark: "rect"` + `x`/`x2`（或 `y`/`y2`）画 band；另有 layer 叠加表达均值线（`transform: aggregate` → rule mark）。
- **G2** 的 `lineX` / `lineY` 与 `rangeX` / `rangeY` annotation 与 mark 体系融合——前者画线、后者画带。
- **Observable Plot** 同样用 `ruleY([80])` 画线、`rectY` / 自带 band 思路画区间高亮。

共识：业界把「rule = 一条常量位置线」做成 **mark**，因为它和 bar / line 一样要参与 layer z-order、可数据驱动（per-datum）、可被 color / 其它通道编码；区间带（band）则用 rect / range 类几何表达，仍是 mark 层。retikz 已有的 axis-guide 是「scale 的刻度可视化身」，与「在数据空间某个值 / 某个区间处画标注」是两类东西。本 ADR 据此把 rule 落为 **mark**，**并把 line 与 band 两种形态统一进同一个 rule mark**（单值 → line、区间 → band），同时明确 reference-line-guide 的角色边界（见「决策」首段）。

## 决策：rule 作为 mark（数据驱动的常量位置参考标注），line 形态下沉 core `Path`、band 形态复用 ADR-01 `projectCell`；reference-line / band guide 暂不引入，其角色由 rule mark + 后续 scale 派生标注共同承接

**核心分工（本 ADR 最重要的决策）**：

- **rule mark = 数据驱动的常量位置参考标注**——值来自 `encoding`（`field` per-datum 每行一条、或 `value` 常量单条），属 **mark 层**，与 point / line / interval 并列参与 layer z-order（§3.10 `threshold rule layer`），可被 `color` 通道编码、可被 scope / anchor 引用。它有两种形态：
  - **line（默认）**：常量轴给**单值** → 一条线，跨满对侧轴域（或被 extent 截断）。下沉 core `Path`（1D 线，**不走** `projectCell`）。
  - **band（新增）**：常量轴给一个 **`[lo,hi]` 区间**（下界 + 上界两个值） → 一片**填充区域**，跨满对侧轴域（或被 extent 截断）。band 几何 = ADR-01 的正交 cell——primary = 对侧轴 full extent（或 extent 截断）、secondary = 常量轴的 `[lo,hi]`，喂 `frame.projectCell(cell)` → cartesian 出 rect、polar 出环带（sector）、曲线 / 自定义出 contour，是**可连接 Node**（守 §8.1），**零新增几何**（直接复用 ADR-01）。

  这是本 ADR 落地的层；按 v0.1 三包 lockstep 全补——plot core（IR + lowering）+ plot-react（`<RuleMark>` sugar）+ plot-vanilla（SSR 测试），与既有 mark（bar / line / point …）同节奏，不留单包缺口。
- **reference-line / band guide = scale 派生的标注**（如「均值线」「固定阈值带」由 scale domain / aggregate 推出、随 scale 重算、不进 mark 的 datum 流），属 **guide 层**，与 axis / legend 并列。**本 ADR 不引入它**——理由是：「均值线」「均值 ± σ 带」本质 = 先跑一个 aggregate transform 产出常量行 / 区间行、再用 rule mark 的 line / band 形态画（Vega-Lite 路线），无需独立 guide 成员；真正只有 guide 能做的「跟随 scale tick 自动重算的标注带」留待 guide 体系演进时单独评估（见「不在本 ADR 范围」）。这样**先用 mark 覆盖 §3.9「reference line / band」的绝大多数实际诉求**，避免同一能力在 mark / guide 两处各实现一半。

**几何本质**：rule = 沿一个位置维度取常量（line = 单值、band = `[lo,hi]` 区间）、**跨满对侧维度整个轴域**的标注（或由 extent 截成部分长度）。line 是 1D 线、band 是 2D 区域。

```ts
// ir/mark.ts —— RuleMarkSchema 草案（判别字段 type = 'rule'）
export const PlotMark = {
  Point: 'point',
  Line: 'line',
  Interval: 'interval',
  Sector: 'sector',
  Area: 'area',
  Rule: 'rule', // 新增：常量位置线 / 阈值线
} as const;

export const RuleMarkSchema = z
  .object({
    type: z.literal(PlotMark.Rule).describe('Discriminator: a constant-position reference mark (line for a single value, band for a [lo,hi] interval) spanning the opposite axis domain'),
    // 取向：恰好绑定 x（竖直 rule，x=const 跨整个 y 域）或 y（水平 rule，y=const 跨整个 x 域）之一；
    //   两者皆设 / 皆缺 → lowering fail-loud。绑定哪个由 encoding.x / encoding.y 是否存在决定（无独立 orientation 字段）。
    // line vs band 判别：常量轴只给下界（encoding.x / encoding.y）→ line（1D，走 Path）；
    //   同时给上界（xTo / yTo，与所绑维度匹配）→ band（2D 区域 [lo,hi]，走 ADR-01 projectCell）。
    yTo: z
      .union([z.number(), z.string().min(1)])
      .optional()
      .describe('Horizontal band upper bound along y: number → constant, string → per-datum field. Present (paired with encoding.y as the lower bound) turns a horizontal rule into a filled band y∈[y,yTo]; omit → a single line'),
    xTo: z
      .union([z.number(), z.string().min(1)])
      .optional()
      .describe('Vertical band upper bound along x: number → constant, string → per-datum field. Present (paired with encoding.x as the lower bound) turns a vertical rule into a filled band x∈[x,xTo]; omit → a single line'),
    extentField: z
      .string()
      .min(1)
      .optional()
      .describe('Per-datum partial-length rule/band: field giving the span start along the opposite axis (omit → span the full opposite domain). Pairs with extentToField'),
    extentToField: z
      .string()
      .min(1)
      .optional()
      .describe('Per-datum partial-length rule/band: field giving the span end along the opposite axis (omit → span the full opposite domain). Pairs with extentField'),
    ...markBase,
    ...positionalEncoding, // encoding.x XOR encoding.y 决定取向 + band 下界；上界由 xTo / yTo 给（缺 → line）；对侧维由 extent 字段截断或满铺
  })
  .describe('Rule mark: a constant-position reference. Bind x (vertical) or y (horizontal); field → per-datum, value → constant. Give only the lower bound for a line; pair it with xTo / yTo for a filled band [lo,hi]. Use extentField / extentToField for partial-length spans');
```

下沉到 core IR（`lower/mark.ts` 新增 `lowerRule`），按 line / band 分流：

```ts
// === line 形态（常量轴仅给下界，无 xTo/yTo）：1D 线 → core Path（move + 一条 line step），不走 projectCell ===
// 竖直 rule（绑 x、值 vx）：沿 x=vx，secondary 从对侧轴域 lo 走到 hi（或 extent 截断）
//   cartesian2D: move→ frame.project(vx, yLo)；line→ frame.project(vx, yHi)
//   polar2D（x=const=常量角度）: 径向线 move→ projectPolar(θ(vx), rInner)；line→ projectPolar(θ(vx), rOuter)
// 水平 rule（绑 y、值 vy）：沿 y=vy，primary 跨整个 primary 轴域
//   cartesian2D: move→ frame.project(xLo, vy)；line→ frame.project(xHi, vy)
//   polar2D（y=const=常量半径）: 整圆 / 弧 → 沿角向 [startAngle, endAngle] 段内密采样（复用 densifyPolarSegments）
//
// === band 形态（常量轴给 [lo,hi]，下界 = encoding.x/y、上界 = xTo/yTo）：2D 区域 → ADR-01 projectCell → 可连接 Node ===
// 构造正交 cell：primary = 对侧轴 full extent（或 extent 截断）、secondary = 常量轴的 [lo,hi]（输出空间区间）
// 水平 band（绑 y、区间 [vy,vyTo]）：cell = { primary:[xLo,xHi], secondary:[coord(vy), coord(vyTo)] }
// 竖直 band（绑 x、区间 [vx,vxTo]）：cell = { primary:[yLo,yHi], secondary:[coord(vx), coord(vxTo)] }
//   → frame.projectCell(cell) → CellGeometry（cartesian=rect / polar=环带 sector / 曲线=contour）→ 装配 Node（复用 ADR-01 装配路径）
//
// 多行（per-datum field / xTo·yTo field）→ 每行一条 Path（line）或一个 Node（band）；
//   color 编码 → 按 colorGroupedScope 同思路分子 Scope 上提 stroke（line）/ fill（band）
// 坐标系支持随 projectCell：band 仅在 frame 实现 projectCell 的坐标系（cartesian2D / polar2D / 出 contour 的曲线 frame）可用，否则 fail-loud（与 ADR-01 一致）。
```

理由：

1. **rule 是数据驱动 + 参与 layer z-order，本质就是 mark**——它能 per-datum（每行一条阈值线）、能被 color 通道编码、要和 bar / line 在同一 coordinate scope 内按声明序叠放（§3.10 `threshold rule layer`）。这些都是 mark 层属性，axis-guide（scale 的刻度身）给不了。把 rule 放 mark 与 Observable Plot / Vega-Lite 一致。
2. **rule 按形态分流下沉，line 走 `Path`、band 复用 ADR-01 `projectCell`，零新增几何契约**——
   - **line**（常量轴单值）是 1D 线，没有 2D cell 结构，下沉 core `Path`：复用 line mark 已有的 `pointsToSteps` / polar 段采样（`densifyPolarSegments`），坐标系无关性靠 `frame.project` / `projectRoles` + polar 段采样承接，与 line mark 同源。
   - **band**（常量轴 `[lo,hi]` 区间）恰好是 ADR-01 描述的正交 cell——primary = 对侧轴 full extent（或 extent 截断）、secondary = 常量轴 `[lo,hi]`——直接喂 `frame.projectCell(cell)`：cartesian 出 rect、polar 出环带 sector、曲线 / 自定义出 contour，**全部是可连接 Node（守 §8.1）**，与 interval / rect 共用同一套 cell 几何，rule 这边不再新造几何。这把 §3.9「reference line / **band**」两种形态统一进同一个 rule mark，band 还把 ADR-01 的 cell 投影复用到了「常量轴区间」这一新消费场景。
   因此「rule 不走 `projectCell`」不再是绝对结论：**line 不走、band 走**，分流由「常量轴给单值还是区间」（有无 `xTo` / `yTo`）判定。
3. **不引入 reference-line-guide，避免能力分裂**——「均值线」用 aggregate transform → rule mark 表达（无新 IR 成员），先吃掉 §3.9 reference line 的主体诉求；只把「随 scale tick 自动重算的标注」这类**真正只有 guide 能做**的留到 guide 体系单独评估。一上来就开两套画线机制，会让用户困惑「该用 rule mark 还是 reference guide」、让实现重复。
4. **取向由 encoding 绑定维度决定、不加独立 `orientation` 字段**——绑 x ⇒ 竖直 rule、绑 y ⇒ 水平 rule，语义自洽且与 encoding 通道复用，省一个易与 encoding 冲突的冗余枚举（Observable Plot ruleX/ruleY 是两个 mark，retikz 用一个 mark + 绑定维度区分，更省表面）。

## 待决策点 🔻

- **rule-mark vs reference-line-guide 的归属（核心，已定倾向）**：rule **mark** = 数据驱动的常量位置线（field per-datum / value 常量单线），参与 mark 层 z-order；reference-line **guide** = scale 派生标注（均值 / 自动跟随 tick）。倾向：**本 ADR 只落 rule mark**，把「均值线」交给 aggregate transform + rule mark 组合，**不引入独立 reference-line-guide 成员**。真正需要 guide 的「随 scale 重算的标注带」留待 guide 演进单独评估。这是本 ADR 最重要的拍板。
- **取向判定**：绑 `encoding.x` ⇒ 竖直 rule（x=const 跨 y 域）、绑 `encoding.y` ⇒ 水平 rule（y=const 跨 x 域）；两者皆设 / 皆缺 → lowering fail-loud。倾向：用绑定维度区分，不加独立 `orientation` 枚举字段。
- **line vs band 形态判别（核心，本轮新增）**：常量轴只给下界（`encoding.x` / `encoding.y`）⇒ **line**（1D 线，走 core `Path`）；同时给匹配维度的上界（`xTo` / `yTo`）⇒ **band**（2D 区域 `[lo,hi]`，走 ADR-01 `projectCell`）。倾向：以「常量轴是单值还是区间」分流，两形态共用一个 rule mark。
- **band 第二界字段命名（待决策）**：band 上界字段需选一种命名，候选——① `xTo` / `yTo`（语义直白「到…为止」，本草案采用）；② `x2` / `y2`（与 Vega-Lite / Observable Plot 的 `x2`/`y2` 对齐，业界熟悉）；③ 子对象 `band: { to }`（把上界收进 band 命名空间，但与 `encoding.x`/`y` 作下界不在同一层、读起来割裂）。倾向：**`xTo` / `yTo`**（与既有 `extentToField` 的 `To` 命名一致、扁平、避免子对象嵌套）；最终命名待 review 拍板。
- **band 在曲线 / 自定义坐标系是否自动支持（待决策）**：band 走 `projectCell`，故支持面**与 ADR-01 完全一致**——frame 实现了 `projectCell` 就支持（cartesian2D → rect band、polar2D → 环带 sector band、出 contour 的曲线 frame → contour band），未实现则 fail-loud，**无引擎自动兜底**。倾向：不为 band 单开坐标系矩阵，直接继承 ADR-01 的「有 `projectCell` 才支持」边界。
- **full-span vs per-datum**：`value` / 单值常量 ⇒ 单条 full-span line / band；`field`（含 `xTo`/`yTo` 给 field）⇒ 每行一条（per-datum 阈值线 / 阈值带）。两者走同一 `lowerRule`，只是常量 vs 逐行迭代。倾向：统一一条路径。
- **extent（部分长度 rule）**：`extentField` / `extentToField` 给对侧维度的起止值，把线从「满铺对侧轴域」截成线段（如甘特里的时间游标段）；两者须成对出现，缺一 / 单设 → fail-loud；皆缺 → 满铺。倾向：成对可选、本轮即落（per-datum 阈值线常需部分长度）。
- **polar 语义**：
  - **line**：竖直 rule（`x=const` = 常量角度）→ **径向线**（沿半径从 inner 到 outer，单条 line step）；水平 rule（`y=const` = 常量半径）→ **整圆 / 弧**（沿角向 [startAngle, endAngle] 密采样，复用 `densifyPolarSegments`；满角域 ⇒ 整圆、部分 ⇒ 弧）。倾向：径向线走直连、常半径环走段采样。
  - **band**：水平 band（`y∈[lo,hi]` = 半径区间）→ **环带**（`projectCell` 出 sector：innerRadius=coord(lo)、outerRadius=coord(hi)、角向跨满或 extent 截断）；竖直 band（`x∈[lo,hi]` = 角度区间）→ **扇形楔**（sector：起止角 = coord(lo)/coord(hi)、半径跨满或 extent 截断）。皆由 ADR-01 `projectCell` polar 实现直接产出，与 sector mark 同形。倾向：band 全部委托 `projectCell`，rule 侧不自写 polar band 几何。
- **color 编码**：per-datum rule 支持 `color` 通道 → 按 `colorGroupedScope` 同思路分子 Scope 上提；line 上提 `stroke`、band 上提 `fill`（与 line / interval mark 一致）；单条常量 line color 取 `encoding.color.value` 直接落 Path stroke、单个常量 band 落 Node fill。倾向：复用既有分组机制，line/band 仅样式属性不同。
- **1D / ternary / custom 坐标系**：line 本轮 cartesian2D / polar2D 支持，cartesian1D / polar1D / ternary2D / custom 下几何语义未定 → fail-loud（与现有 mark 矩阵一致）；band 支持面随 `projectCell`（见上「band 在曲线 / 自定义坐标系是否自动支持」），无 `projectCell` 的坐标系 band fail-loud。倾向：line 先支持 2D，band 继承 ADR-01 `projectCell` 边界，其余 fail-loud。

## DSL 表面

rule 有两套表面，**别混**：plot core 的 **IR 形态**（JSON，`{value}` / `{field}` 互斥）与 plot-react 的 **`<RuleMark>` sugar 形态**（扁平 props，组件名带 `Mark` 后缀，与 `<BarMark>` / `<PointMark>` 同风格）。React 层约定：**数字常量 → IR `{ value }`、字符串 → IR `{ field }`**；取向由给 `x` 还是 `y` 决定（绑 x→竖直 / 绑 y→水平），x/y 皆给或皆缺 → 装配 fail-loud。**line vs band**：只给下界（`y` / `x`）⇒ line；同时给上界（`yTo` / `xTo`）⇒ band（`yTo` 与 `y` 配对、`xTo` 与 `x` 配对；给了 `yTo` 却绑 x、或上界单飞 → fail-loud）。

### IR 形态（plot core，下游手写 PlotSpec / 测试断言对象）

```jsonc
// 1) 常量线（full-span）：y=80 及格线，水平 rule 跨满 x 域
{ "type": "rule", "encoding": { "y": { "value": 80 }, "color": { "value": "crimson" } } }

// 2) per-datum 线（field 驱动）：每行一条水平 rule，按 category 上色
{ "type": "rule", "encoding": { "y": { "field": "threshold" }, "color": { "field": "category" } } }

// 3) 部分长度 rule（extent）：竖直 rule，y 方向从 rowLo 到 rowHi（非满铺）
{ "type": "rule", "extentField": "rowLo", "extentToField": "rowHi", "encoding": { "x": { "field": "date" } } }

// 4) polar：y=const（常量半径）→ 整圆参考环；x=const（常量角度）→ 径向参考线
{ "type": "rule", "encoding": { "y": { "value": 50 } } }   // 常半径环（弧/整圆，按角域）
{ "type": "rule", "encoding": { "x": { "value": 90 } } }   // 90° 处径向参考线（inner→outer）

// 5) band（常量轴给区间 [lo,hi]）：水平容差带 y∈[70,90]，跨满 x 域 → projectCell 出 rect
{ "type": "rule", "encoding": { "y": { "value": 70 }, "color": { "value": "amber" } }, "yTo": 90 }

// 6) per-datum band（field 驱动上下界）：每行一条带 y∈[lo,hi]，按 category 上色
{ "type": "rule", "encoding": { "y": { "field": "lo" }, "color": { "field": "category" } }, "yTo": "hi" }

// 7) polar band：y∈[40,60]（半径区间）→ 环带（projectCell 出 sector）
{ "type": "rule", "encoding": { "y": { "value": 40 } }, "yTo": 60 }
```

### React sugar 形态（plot-react `<RuleMark>`，扁平 props）

```tsx
// 1) 单条常量阈值线（full-span）：数字 80 → IR { value: 80 }
<Plot data={scores}>   {/* coordinate 缺省 cartesian2D，可省 */}
  <PointMark x="name" y="score" />
  <RuleMark y={80} color="crimson" />          {/* 水平 rule，跨满 x 域；数字常量 → value */}
</Plot>

// 2) per-datum 阈值线：字符串 "threshold" → IR { field: 'threshold' }，按 category 上色
<Plot data={thresholds}>
  <RuleMark y="threshold" color="category" />  {/* 每行一条水平 rule；字符串 → field */}
</Plot>

// 3) 部分长度 rule（extent）：竖直时间游标，只在 [rowLo, rowHi] y 区间画线段
<Plot data={events}>
  <RuleMark x="date" extentField="rowLo" extentToField="rowHi" />  {/* 字符串 → field；取向绑 x→竖直 */}
</Plot>

// 4) polar：y=const（常量半径）→ 整圆参考环；x=const（常量角度）→ 径向参考线
<Plot data={radar} coordinate="polar2D">
  <RuleMark y={50} />   {/* 常半径环（弧/整圆，按角域） */}
  <RuleMark x={90} />   {/* 90° 处径向参考线（inner→outer） */}
</Plot>

// 5) band（区间）：水平容差带 y∈[70,90]，跨满 x 域；给了 yTo → band（数字→value）
<Plot data={scores}>
  <PointMark x="name" y="score" />
  <RuleMark y={70} yTo={90} color="amber" />   {/* 水平 band；projectCell → rect */}
</Plot>

// 6) per-datum band：每行一条带 y∈[lo,hi]，按 category 上色（字符串→field）
<Plot data={tolerances}>
  <RuleMark y="lo" yTo="hi" color="category" />
</Plot>

// 7) polar band：y∈[40,60]（半径区间）→ 环带
<Plot data={radar} coordinate="polar2D">
  <RuleMark y={40} yTo={60} color="amber" />   {/* 环带；projectCell → sector */}
</Plot>
```

## 测试设计

`packages/plot/plot/tests/lower/rule.test.ts`（新建）+ mark schema 回归覆盖：

- schema：`RuleMarkSchema` accept（绑 x / 绑 y / value / field / extent 成对 / band 上界 xTo·yTo）与 reject（x+y 皆设 / 皆缺、extent 单设、band 上界与所绑维度不匹配）
- cartesian2D line：水平 rule（y=const 跨满 x 域）/ 竖直 rule（x=const 跨满 y 域）→ core Path（move + line）端点正确
- cartesian2D band：水平 band（y∈[lo,hi] 跨满 x 域）→ `projectCell` 出 rect → 可连接 Node；竖直 band（x∈[lo,hi]）→ rect Node
- per-datum：line `field` ⇒ 每行一条 Path / `value` ⇒ 单条 Path；band `field`+`yTo` field ⇒ 每行一个 Node / `value`+`yTo` 常量 ⇒ 单个 Node
- extent：部分长度 rule/band 端点落 `extentField`..`extentToField` 而非满铺
- polar2D line：竖直 rule（常量角度）→ 径向线；水平 rule（常量半径）→ 弧 / 整圆段采样
- polar2D band：水平 band（半径区间）→ `projectCell` 环带 sector；竖直 band（角度区间）→ 扇形楔 sector
- band 可连接性：band Node 经 `boundaryPoint` 被另一 core Path 连接（守 §8.1，与 ADR-01 contour-connectable 同断言）
- color：per-datum + color field → 按色分子 Scope 上提（line→stroke / band→fill）；单线 color value → Path stroke / 单 band → Node fill
- 坐标系矩阵：line cartesian1D / polar1D / ternary2D / custom 下 fail-loud；band 在无 `projectCell` 的坐标系 fail-loud（继承 ADR-01）
- 与既有 mark 共存：同 scope 内 interval + rule（line / band）按声明序叠放（z-order parity，§3.10）

具体见下「实现契约 § 测试象限」。

## 影响

- **Plot IR**：`ir/mark.ts` 加 `RuleMarkSchema`（含 `xTo` / `yTo` band 上界）+ `PlotMark.Rule` + 并入 `MarkSchema` discriminatedUnion + 导出 `RuleMark` 类型。`ir/encoding.ts` **不改**（复用 `positionalEncoding` 的 x / y + StyleEncoding 的 color；band 上界 `xTo`/`yTo` 作为 mark 顶层字段而非 encoding 通道）。`ir/guide.ts` **不改**（本 ADR 明确不引入 reference-line / band guide 成员）。
- **lowering**：`lower/mark.ts` 加 `lowerRule`，按 line / band 分流——line 产 core Path（复用 `pointsToSteps` / `densifyPolarSegments`）、band 经 `frame.projectCell` 出 `CellGeometry` 并复用 ADR-01 的 Node 装配（rect / sector / contour）；统一复用 `colorGroupedScope` / `attachMarkLayer`，并在 `lowerMark` dispatch 接入。`lower/project.ts` **不改**（line 用既有 `project` / `projectPolar` + 轴域端点；band 消费 ADR-01 已加的 `projectCell`，本 ADR 不再动 project）。
- **依赖 core**：line 消费已有 core `Path` / `Step`（move + line + 段采样点），与 line mark 同目标；band 消费 core `rectangle` / `sector` / `contour` shape（经 ADR-01 `projectCell` 产出的 `CellGeometry` 装配），与 interval / rect mark 同目标；仅消费、不改 core 内部。**依赖 ADR-01 的 `projectCell`**（band 是 2D cell；ADR-01 须先落或同 milestone 提供 `projectCell` 契约）。
- **plot-react**：`components/marks.tsx` 加 `RuleMark`（返回 null 的 FC）+ `RuleMarkProps`（扁平 props，含 `xTo?` / `yTo?` 接 `number | string`）；`components/build-plot-spec.ts` 的 `collectInto` 加 `child.type === RuleMark` 分支——把 `y={80}` / `y="threshold"` 等扁平 props 按「数字→value、字符串→field」翻成 rule IR，取向由给 x 还是 y 决定；给了 `yTo`/`xTo` → 翻成 band IR 上界（上界与所绑维度不匹配 / 上界单飞 → fail-loud），x/y 皆给或皆缺 → fail-loud；`components/index.ts` + `src/index.ts` barrel 导出 `RuleMark` / `RuleMarkProps`。
- **plot-vanilla**：`renderPlot` mark 无关、纯 spec 驱动，**无代码改动**；交付 = `packages/plot/vanilla/tests/` 下 rule SSR 测试（参考线落正确 SVG）。
- **三包同步（v0.1 lockstep）**：plot core（IR + lowering）+ plot-react（`<RuleMark>` sugar）+ plot-vanilla（SSR 测试 + docs demo）同一改动集；vanilla 无代码改动（仅测试 + 文档），react / core 有代码改动。
- **文档站**：plot mark 文档新增 rule 页（IR + React sugar 两套表面、line vs band 形态、取向 / extent / polar 语义说明，zh / en 同步）+ `<RuleMark>` line / band demo；guide 文档需补一句「参考线 / 参考带走 rule mark，非 axis/legend guide」以消歧。
- **对外 API**：新增 `<RuleMark>` mark（plot-react sugar，扁平 props，含 `xTo`/`yTo` band 上界）+ rule IR 成员；非 breaking（纯新增 mark 成员）。

## 不在本 ADR 范围

- **reference-line / band guide 独立成员**（随 scale tick 自动重算的标注线 / 带）：本 ADR 用 rule mark（line / band）+ aggregate transform 覆盖均值线、均值 ± σ 带等主体诉求；真正只有 guide 能做的「跟随 scale 重算」留待 guide 体系演进时单独 ADR 评估。
- **1D / ternary / custom 坐标系下的 rule line**：几何语义（对侧轴域 / 满铺定义）未定，fail-loud；band 支持面随 `projectCell`（继承 ADR-01），无 `projectCell` 的坐标系 band 同样 fail-loud；后续按需求驱动单独评估。
- **dash / 线型 / 标签**（rule 上挂文字标注，如「均值 80」）：样式归 Theme（alpha.15）、标签归 text mark（ADR-04）+ anchor 引用 rule，本 ADR 只画线。
- **chart preset / 高层封装**：本 ADR 落 IR + lowering + `<RuleMark>` sugar（三包 lockstep），更上层的 chart preset（一行出带参考线的图表）后随单独评估。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（新增 `RuleMarkSchema` + `xTo`/`yTo` band 上界 + 并入 mark union，是 IR schema 契约）与 `packages/plot/plot/src/lower/**`（新增 `lowerRule`，line 产 Path、band 经 ADR-01 `projectCell` 产 Node，下沉到 core IR 的契约边界）。**同时动 plot-react components**（`marks.tsx` 加 `RuleMark` + `build-plot-spec.ts` 加 rule line/band 装配分支，sugar = Kernel IR 等价性契约）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/mark.ts` | 加 | `PlotMark.Rule` | `'rule'`（const object 成员） | — | rule mark 判别串（常量位置线 / 阈值线） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.type` | `z.literal(PlotMark.Rule)` | — | 判别字段：常量位置参考（line / band） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.yTo` | `z.union([z.number(), z.string().min(1)]).optional()` | `—`（缺 → line） | 水平 band 上界（number=常量 / string=field），与 encoding.y 下界配对 → y∈[y,yTo] 填充带 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.xTo` | `z.union([z.number(), z.string().min(1)]).optional()` | `—`（缺 → line） | 竖直 band 上界（number=常量 / string=field），与 encoding.x 下界配对 → x∈[x,xTo] 填充带 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.extentField` | `z.string().min(1).optional()` | `—`（缺 → 满铺对侧域） | per-datum 部分长度 line/band 的对侧维起点字段（与 extentToField 成对） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.extentToField` | `z.string().min(1).optional()` | `—`（缺 → 满铺对侧域） | per-datum 部分长度 line/band 的对侧维终点字段（与 extentField 成对） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.id` | `markBase.id`（复用） | `—` | 可选 mark 句柄（scope / anchor 目标，复用 markBase） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMarkSchema.encoding` | `positionalEncoding.encoding`（= `EncodingSchema`，复用） | — | x XOR y 决定取向 + color 样式（复用 positionalEncoding，不新增字段） |
| `packages/plot/plot/src/ir/mark.ts` | 改 | `MarkSchema` | `discriminatedUnion('type', [...,RuleMarkSchema])` | — | 并入 rule 成员 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RuleMark`（派生类型） | `z.infer<typeof RuleMarkSchema>` | — | rule mark 类型（中文 JSDoc：参考 / 阈值线） |

`ir/encoding.ts` / `ir/guide.ts` **无改动**（rule 复用既有 encoding；band 上界 `xTo`/`yTo` 作 mark 顶层字段不入 encoding；明确不引入 reference-line / band guide）。取向「x XOR y」、extent「成对」、band 上界「与所绑维度匹配（绑 x 才能给 xTo、绑 y 才能给 yTo）」的互斥校验放 **lowering fail-loud**（与现有 x/y 必填性下放 lowering 一致），不进 schema `.refine`（避免与 positionalEncoding 的 schema 级可选语义冲突）。line vs band 判别 = 是否给了匹配维度的 `xTo`/`yTo`，亦在 lowering 分流。

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（修改：加 `PlotMark.Rule` + `RuleMarkSchema` + 并入 `MarkSchema` + 导出 `RuleMark`）
- `packages/plot/plot/src/lower/mark.ts`（修改：加 `lowerRule`，line 分支产 core Path、band 分支经 `frame.projectCell` 出 `CellGeometry` 并复用 ADR-01 Node 装配（rect/sector/contour）；在 `lowerMark` dispatch 接入；复用 `pointsToSteps` / `densifyPolarSegments` / `colorGroupedScope` / `attachMarkLayer` + ADR-01 cell 装配；line 2D 外 fail-loud、band 无 `projectCell` fail-loud）
- `packages/plot/plot/tests/lower/rule.test.ts`（新建）
- `packages/plot/plot/tests/ir/mark.test.ts`（修改：rule schema accept/reject 回归，若既有该测试文件）
- `packages/plot/react/src/components/marks.tsx`（修改：加 `RuleMark`（返回 null 的 FC）+ `RuleMarkProps`（扁平 props：`x?` / `y?` / `xTo?` / `yTo?` 接 `number | string`、`color?` / `extentField?` / `extentToField?` / `id?`））
- `packages/plot/react/src/components/build-plot-spec.ts`（修改：`collectInto` 加 `child.type === RuleMark` 分支——扁平 props 翻成 rule IR，「数字→value、字符串→field」，取向由给 x / y 决定；给 `xTo`/`yTo` → band 上界；x/y 皆给或皆缺 → fail-loud；extent 单设 → fail-loud；band 上界与所绑维度不匹配 / 上界单飞 → fail-loud）
- `packages/plot/react/src/components/index.ts`（修改：barrel 导出 `RuleMark` / `RuleMarkProps`）
- `packages/plot/react/src/index.ts`（修改：public API barrel 导出 `RuleMark` / `RuleMarkProps`）
- `packages/plot/vanilla/tests/`（新建：rule SSR 测试——`renderPlot` 出参考线 / 参考带 SVG；`render-plot.ts` 无代码改动）
- `apps/docs/src/contents/plot/.../rule`（新建：rule mark 文档页 + `<RuleMark>` line / band demo，zh / en 同步）
- `apps/docs/src/contents/plot/.../guide`（修改：补「参考线 / 参考带走 rule mark」消歧一句）

偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha 放宽口径：覆盖真实有意义的 accept/reject 与几何断言即可，不硬凑 9。

**Happy path（≥3）**：
- `rule-horizontal-fullspan`（line）：cartesian2D `y={value:80}` → 单条 Path，move=frame.project(xLo,80) / line=frame.project(xHi,80)（跨满 x 域）
- `rule-vertical-fullspan`（line）：cartesian2D `x={value:5}` → 单条 Path 跨满 y 域（move=底/line=顶）
- `rule-per-datum-field`（line）：`y="limit"` 多行 → 每行一条 Path；color field → 按色分子 Scope 上提 stroke
- `rule-band-cartesian-rect`（band）：cartesian2D `y={value:70}` + `yTo=90` → 构造 cell{primary:[xLo,xHi], secondary:[coord(70),coord(90)]} → `projectCell` 出 rect → 可连接 Node（与 ADR-01 rect 装配等价）

**边界（≥2）**：
- `rule-extent-partial`：`x="date"` + `extentField/extentToField` → line/band 对侧维端点落 [extentLo, extentTo]，非满铺
- `rule-single-row`：单 datum field → 一条 Path / 一个 Node（不退化、不空）；空数据 field → null（无可绘制图元）
- `rule-band-per-datum-field`（band）：`y="lo"` + `yTo="hi"` 多行 → 每行一个 band Node；color field → 按色分子 Scope 上提 fill

**错误路径（≥2）**：
- `rule-orientation-conflict`：encoding 同时设 x 与 y（或皆缺）→ lowering fail-loud（取向不可判定）
- `rule-extent-unpaired`：仅设 extentField（缺 extentToField）→ fail-loud（extent 须成对）
- `rule-band-bound-mismatch`：给 `yTo` 却绑 x（或给 `xTo` 却绑 y）→ fail-loud（band 上界须与所绑维度匹配）
- `rule-coord-matrix-fail`：line 在 cartesian1D / polar1D / ternary2D / custom → fail-loud；band 在无 `projectCell` 的坐标系（含未实现 projectCell 的 custom）→ fail-loud

**交互（≥2）**：
- `rule-polar-radial-and-ring`（line）：polar2D `x=const` → 径向线（inner→outer 单 line step）；`y=const` → 弧 / 整圆（densifyPolarSegments 段采样、按角域整圆 vs 弧）
- `rule-band-polar-ring`（band）：polar2D `y={value:40}` + `yTo=60` → `projectCell` 环带 sector（innerRadius=coord(40)/outerRadius=coord(60)）；band Node 经 `boundaryPoint` 可被另一 Path 连接（守 §8.1）
- `rule-zorder-with-bar`：同 scope 内 `<BarMark>` + `<RuleMark>`（line / band）按声明序产出图层（z-order parity，守 §3.10 threshold rule layer 叠放）

**plot-react sugar（`<RuleMark>` props → rule IR 装配，≥2）**：
- `rulemark-constant-and-field`：`<RuleMark y={80} color="crimson" />` → `{ type:'rule', encoding:{ y:{ value:80 }, color:{...} } }`（数字→value，line）；`<RuleMark y="threshold" color="category" />` → `encoding.y = { field:'threshold' }`（字符串→field，line）
- `rulemark-band`：`<RuleMark y={70} yTo={90} color="amber" />` → `{ type:'rule', encoding:{ y:{ value:70 }, color:{...} }, yTo:90 }`（给 yTo → band）；`<RuleMark y="lo" yTo="hi" />` → `yTo:'hi'`（字符串→field band）
- `rulemark-orientation`：绑 x → 竖直 rule IR（`encoding.x`）、绑 y → 水平 rule IR（`encoding.y`）；x/y 皆给或皆缺 → 装配 fail-loud（取向不可判定）；extent 字段透传 + 单设 fail-loud；band 上界与所绑维度不匹配 → fail-loud

**plot-vanilla SSR（`renderPlot` 出参考线 / 参考带 SVG，≥1）**：
- `rule-ssr-svg`：含 rule mark（line + band）的 PlotSpec 经 `renderPlot` → SVG 字符串含参考线（常量线 full-span / per-datum 多线 / color）与参考带（band rect / 环带、fill），守 vanilla 无代码改动下纯 spec 驱动的端到端产出

### 依赖的现有元素

- `ir/mark.ts` 的 `PlotMark` / `markBase` / `positionalEncoding` / `MarkSchema`（`packages/plot/plot/src/ir/mark.ts`）—— 扩展：加 `Rule` 成员、复用 `markBase` / `positionalEncoding`、并入 union。
- `ir/encoding.ts` 的 `EncodingSchema`（`packages/plot/plot/src/ir/encoding.ts`）—— 仅引用（rule 复用 x / y + color，不改 encoding）。
- `ir/guide.ts` 的 `GuideSchema`（`packages/plot/plot/src/ir/guide.ts`）—— 仅作概念对照：本 ADR 明确不在 guide 加 reference-line 成员，二者分工写入决策段。
- `lower/mark.ts` 的 `pointsToSteps` / `colorGroupedScope` / `attachMarkLayer` / `resolveRolePosition` / `lowerMark` dispatch（`packages/plot/plot/src/lower/mark.ts`）—— 复用：rule 端点连成 move+line step、color 分组、图层挂 id/meta；`lowerMark` 加 rule 分支。
- `lower/project.ts` 的 `frame.project` / `PolarFrame.projectPolar` / `densifyPolarSegments` / `RETIKZ_POLAR_SEGMENT_SAMPLES`（`packages/plot/plot/src/lower/project.ts`）—— 仅消费：line 用 project 取轴域端点、polar 常半径环复用段采样；不改 project。
- **ADR-01 的 `frame.projectCell` / `Cell` / `CellGeometry` 及其 Node 装配路径**（`packages/plot/plot/src/lower/project.ts` + `lower/mark.ts`，ADR-01 提供）—— **band 形态核心依赖**：band 构造正交 cell（primary=对侧轴 full extent / extent 截断、secondary=常量轴 `[lo,hi]`）→ `frame.projectCell(cell)` → rect / sector / contour `CellGeometry` → 复用 ADR-01 的统一 Node 装配；仅消费、不改 project。ADR-01 须先落或同 milestone 就绪。
- `lower/field.ts` 的 `channelValue` / `resolveFieldPath` / `isFiniteNumber`（`packages/plot/plot/src/lower/field.ts`）—— 复用：解析 value / field 通道与 extent 字段。
- core `Path` / `Step`（`@retikz/core`，已导出）—— lowering 目标：move + line step（+ polar 段采样点），与 line mark 同目标；仅消费不改 core。

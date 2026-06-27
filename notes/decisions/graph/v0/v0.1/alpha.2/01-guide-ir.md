# ADR-01：guide IR（Axis + grid 子属性，Guide union 可扩展，绑 coordinate scope）

- 状态：Accepted（已实现）
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.9 guide / §3.6 coordinate scope / §7 多坐标 / §14 anchor](../../../../../architecture/plot-design.md) · 根节点：[alpha.1 ADR-01 PlotSpec](../alpha.1/01-plot-spec-root.md) · 坐标系：[alpha.1 ADR-04 coordinate](../alpha.1/04-plot-coordinate.md) · 消费方：[ADR-04 guide lowering](./04-guide-lowering.md)

> 本 ADR 只定 guide 的 **IR 声明形态**（画什么轴、是否带网格、绑哪个维度），不含刻度怎么算（[ADR-02](./02-d3-scale.md)）、画在哪（[ADR-03](./03-plot-area-layout.md)）、怎么 lower（[ADR-04](./04-guide-lowering.md)）。

## 背景

塑造决策的硬约束：

- plot-design §3.9 把 **guide**（坐标轴 / 网格 / 刻度 / 图例 / 参考线）列为与 mark **并列的一等输出**，由 scale + 坐标系派生（§4.3 管线第 6 段）。alpha.2 落第一类：axis（轴线 + 刻度 + 刻度标签）。
- **为分面（facet）预留**（plot-design §7 / §3.6）：分面 = 多个 **coordinate scope**，每 scope 有各自的 local range / clip / guide。故 guide 不能是「全图全局单份」语义，必须**归属于某个坐标系**——否则将来做分面时每个子图的轴无从表达、被迫重构。这是守住的硬约束。

## 决策：guide 是顶层一等节点（与 marks 对称），经 `dimension` 关联坐标系的 x/y 轴；grid 是 axis 的子属性

PlotSpec 顶层加 `guides`（可选数组），与 `marks` 对称——guide 是一等输出，不是 coordinate 的内部属性、也不是 mark 的细节。alpha.2 的 guide 只有 `axis`，带 `dimension`（`x` / `y`）声明它装饰哪根轴 + `grid?` 布尔表示「这根轴是否在 plot area 内画对齐的网格线」。`type` 判别位保留，便于后续把 `GuideSchema` 升成 `z.discriminatedUnion('type', [Axis, Legend, ReferenceLine…])`（非破坏）。alpha.2 唯一 coordinate，guide 经 `dimension` **隐式绑定**它；分面时演进为 guide 带可选 `coordinate` 引用（见「不在本 ADR 范围」）。

`guides` 省略 / 为空 = 不画任何 guide（IR 显式所得）。**「默认自动出轴」是 [ADR-05](./05-guide-bindings-dsl.md) 的 DSL builder 行为**，不是 IR / lowering 的隐式默认——保证 vanilla 直写 spec 时显式可控、`bare` 易表达。

判别常量字面即决策（暴露给用户，裸 `'axis'` / `'x'` / `'y'` 同样可用），最小片段：

```ts
// plot/src/ir/guide.ts
export const PlotGuide = { Axis: 'axis' } as const;       // 派生 GuideType
export const GuideDimension = { X: 'x', Y: 'y' } as const; // 定位维度（非固定屏幕方向；polar 等扩展 radius/angle）
```

`AxisGuide` 字段：`dimension`（必填，装饰哪根轴）、`id?`（anchor handle，预留）、`tickCount?`（目标刻度数，scale 提示）、`tickLabels?`（缺省视为 true）、`grid?`（缺省视为 false）。`GuideSchema` 当前是 `AxisGuideSchema` 别名，留升 discriminatedUnion 空间。真源以代码为准（`plot/src/ir/guide.ts`、`plot/src/ir/plot.ts` 的 `guides` 槽位）。

理由：

1. **guide 一等、与 marks 对称**（§3.9）：顶层 `guides` 数组而非内嵌 coordinate，便于 DSL `<Axis>` 直接装配，契合「guide 与 mark 并列」概念模型。
2. **绑 coordinate scope（facet 预留）**：guide 经 `dimension` 关联坐标系的轴；分面时坐标系多实例、guide 加可选 `coordinate` 引用即各自归位——结构非破坏。绑定粒度 = coordinate scope，不是全图单份。
3. **显式 IR、默认在 DSL**：`guides` 省略 = 无 guide，「默认出轴」交给 builder，IR 层保持显式所得。
4. **可扩展、JSON 安全**：`type` 判别位为 legend / reference line 预留升 union 空间，不破坏旧 IR；全字段 JSON 可序列化。

## 网格归属：grid 是 axis 子属性，不是独立 guide（本次决策核心）

调研主流库：**绝大多数把 grid 做成轴/scale 子属性**——Vega/Vega-Lite `axis.grid`、matplotlib `ax.xaxis.grid()`、Chart.js `scales.x.grid`、Plotly `xaxis.showgrid`、pgfplots `grid=major`、ECharts `xAxis.splitLine`、D3 约定 `axis.tickSize(-innerWidth)`（网格 = 拉长的刻度）。只有 Observable Plot 把 `gridX`/`gridY` 做成独立 mark。

收为 axis 子属性的依据：

1. **几何同源**：笛卡尔下一根轴的网格 = 该轴每刻度处、垂直于轴、横跨另一维度的一族平行线（x 轴 → 竖线族、y 轴 → 横线族）；用户看到的「网格」是两族线叠加的视觉效果，库不需要「网格」这个一等概念。
2. **单一刻度真源**：grid 用所在 axis 的刻度位置，天然对齐、不可能错位；不必再为 grid 配 `tickCount`，也无「grid 复用哪个同维 axis 的 ticks」歧义。
3. **独立 guide 也救不了「特殊网格」**：独立 `GridGuide` 仍带 `dimension`（还是平行线族），表达不了点阵网格（x×y 配对）或六边形 / 斜线网格（非轴向）——这些本不属于 grid 概念。装饰性底纹走 **core pattern**（Kernel 能力），数据空间区域强调走未来 **reference-area 原语**（mark 家族）。「数据空间点名某处画特殊东西」= mark/annotation，「轴派生的规则线」= guide，两者不混。
4. **「只要网格不要轴线」** = 「一根只显示网格的轴」，靠关闭该 axis 的轴线/刻度/标签子开关表达（归属仍是 axis）。alpha.2 先只给 `grid` 布尔。

### 被否决的选项

- **B：guide 内嵌 coordinate（`coordinate.axes`）** —— 对 facet（coordinate scope 化）更天然（轴随坐标系复制），但与「guide 一等」「子组件 DSL」张力大，且 alpha.2 单坐标系下两者等价。否决：facet 真正落地时在顶层数组方案上加 `guide.coordinate` 引用即可，非破坏，不必现在内嵌换来 DSL 张力。
- **独立 `GridGuide` union 成员（Observable Plot 风格）** —— 强调 grid 是独立视觉层，但独立成员换不来特殊网格能力、却要背刻度同源歧义与去重补丁。否决，grid 收为 `axis.grid` 子属性。

### 已知代价

未来若要「网格密度 ≠ 轴刻度密度」（minor grid），需在 axis 内加 major/minor 刻度体系（主流库亦如此），而非再开独立 grid——方向一致，不算欠债。`grid` 先做 `boolean`，留升级成样式对象（`grid?: { stroke, dash, opacity }`）空间，非破坏。

## 不在本 ADR 范围

- **刻度算法（auto-tick）** → [ADR-02](./02-d3-scale.md)；**轴/网格画在哪（plot area / margin）** → [ADR-03](./03-plot-area-layout.md)；**guide → core IR 的 lowering** → [ADR-04](./04-guide-lowering.md)；**`<Axis>` 子组件 / 默认自动出 / `bare`** → [ADR-05](./05-guide-bindings-dsl.md)。
- **轴标题（title）**：alpha.2 不含（要额外占 margin + 富排版）；留后续（非破坏加 `title?`）。`tickLabels`（非 `label`）命名即为给未来轴标题让出 `label` 一词。
- **轴线/刻度可见性细分开关、legend、reference line、富排版** → 后续。
- **同维度多轴（dual-axis）+ `placement`（top/bottom/left/right）+ 副轴 `scale?` 绑定** → 后续；当前每维一轴（lowering 拒重复，见 [ADR-04](./04-guide-lowering.md)），多轴是非破坏加可选字段 + 放宽该断言。
- **polar 等坐标系的定位维度（radius / angle）** → alpha.4；`GuideDimension` 加成员即可，非破坏扩展。
- **装饰性网格底纹（core pattern）、数据空间区域强调（reference-area 原语）** → 后续（非 guide，见「网格归属」§3）。
- **`guide.coordinate` 引用 + coordinate 具名/多实例（facet）、guide 的 anchor/scope 解析** → alpha.5 / facet milestone（alpha.2 仅校验 `id` 字段位、不解析）。

---

> **实现指针**：level `red`（动 `plot/src/ir/**`）、additive 非 breaking（alpha.1 不带 guides 的 spec 仍合法）。
> - 真源以代码为准：`AxisGuideSchema` / `GuideSchema` / `PlotGuide` / `GuideDimension`（`plot/src/ir/guide.ts`）、`PlotSpecSchema.guides` 槽位（`plot/src/ir/plot.ts`）、包导出（`plot/src/ir/index.ts`）。
> - 测试见 `plot/tests/ir/guide.schema.test.ts` 与 `plot/tests/ir/plot-spec.schema.test.ts`（合法/缺字段/非法 dimension/tickCount/grid 拒绝、guides JSON round-trip、与 marks 共存）。
> - 完整原文（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `7acbf962`；压缩前完整施工蓝图 = `git show 7acbf962^:notes/decisions/plot/v0/v0.1/alpha.2/01-guide-ir.md`。

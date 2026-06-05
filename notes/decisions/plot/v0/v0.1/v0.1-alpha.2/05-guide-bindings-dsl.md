# ADR-05：三包 guide 露出（`<Axis>` 子组件（含 `grid` prop）、默认自动出、`bare` 开关）

- 状态：Accepted（已实现）
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略（三包 lockstep）](../roadmap.md) · 依赖：[ADR-01 guide IR](./01-guide-ir.md) · [ADR-04 guide lowering](./04-guide-lowering.md) · 基座：[alpha.1 ADR-08 组合 DSL](../v0.1-alpha.1/08-plot-react-dsl.md) · [alpha.1 ADR-07 薄包装](../v0.1-alpha.1/07-plot-bindings.md)

## 背景

[ADR-01~04](./01-guide-ir.md) 让 `@retikz/plot` 能产出带轴/网格的图，但 authoring 面还没暴露 guide——用户写 `<Plot data>{marks}` 仍是无轴图。按三包 lockstep（每加 plot 能力，react/vanilla/docs 同步露出），本 ADR 在组合 DSL 上加 `<Axis>` 子组件（网格经其 `grid` prop 表达——grid 是 axis 子属性，见 [ADR-01](./01-guide-ir.md)），并落实两条产品决策：**默认自动出轴和网格**、**提供 `bare` 总开关「什么都不出、只绘图」**。

## 决策：`<Axis>` 配置子组件（网格走 `grid` prop）；无 axis 子组件→默认全套；有则显式所得；`bare`→纯绘图

`<Axis>` 与 `<LineMark>`/`<PointMark>` 同构——**配置载体**（返回 `null`、不进 render 栈、无 hooks），由 `buildPlotSpec` 同步内省装配进 `PlotSpec.guides`。**网格不是独立组件**：它是这根轴的 `grid` 布尔 prop（`<Axis dimension="y" grid />`），与 IR `axis.grid` 一一对应。装配规则：

- **`bare`**：`<Plot bare>` → `guides: []` 且布局不留 margin（plot area = 整图）= alpha.1 行为；忽略任何 `<Axis>`（bare 优先、静默）。
- **无任何 `<Axis>`**：默认填 `DEFAULT_GUIDES = [axis x, {axis y, grid:true}]`（双轴 + **仅 y 轴带网格**：横线读数值，对齐 d3 / Observable Plot 常规、不过密；x 网格写 `<Axis dimension="x" grid />`）。
- **写了任意 `<Axis>`**：**完全显式所得**（不再补默认）——所见即所得、可预测，无「显式+默认混合」的惊讶。

`<Plot>` 加 `bare?: boolean`（DSL 入口），透传 `fontSize` / `margin`（[ADR-03](./03-plot-area-layout.md)）给 `lowerPlots`。**vanilla 无新组件**：`renderPlot(spec, data, opts)` 的 `spec.guides` 即所得，「默认自动出」「bare」是 DSL builder 便利，vanilla 显式列 `guides`（或不列 = 无轴）；文档 vanilla 视图展示带 `guides` 的 spec。builder 把默认 / bare 都落成显式 `guides`，两表面同一 IR，渲染走 [ADR-04](./04-guide-lowering.md)。真源见 `react/src/components/guides.tsx`（`Axis` / `AxisProps`）、`react/src/components/buildPlotSpec.ts`（`collectGuides` + `DEFAULT_GUIDES` + bare）、`react/src/Plot.tsx`。

命名决策（字面即决策）：

- **维度 prop 用 `dimension`**（对齐 IR + AGENTS「不缩写」规则），缩写 `dim` 违规已弃。
- **`tickLabels`（非 `label`）**：axis 刻度文字开关字段叫 `tickLabels`，避免与未来轴标题（axis title，常被叫 label）混淆，省一次 future rename；IR（[ADR-01](./01-guide-ir.md)）同步此名。
- **属性名 `bare`**（用户确认），非 `guides={false}` / `frameless`。

理由：

1. **子组件与 marks 同构**：`<Axis>` 沿用 alpha.1 ADR-08「配置载体 + builder 同步装配」范式，零新机制、无 hooks；网格不另起组件，作 `grid` prop 与 IR `axis.grid` 对齐。
2. **默认全套 + 显式所得**：开箱即出完整轴网格（用户拍板「默认自动出」），一旦显式写就完全交给用户（可预测）。
3. **`bare` = 回到 alpha.1**：总开关产 `guides:[]` + 无 margin，等价纯绘图——叙述性插图 / 极简场景用。
4. **lockstep**：react 出子组件、vanilla 出 spec 字段、docs 出带轴 demo，同一改动集。

### 被否决的选项

- **独立 `<Grid>` 组件** → 取消（随 [ADR-01](./01-guide-ir.md) 把 grid 收为 axis 子属性）：作 `<Axis>` 的 `grid` prop 与 IR `axis.grid` 一一对应，避免 DSL 与 IR 结构错位。
- **写 `<Axis>` 后按类型补缺省** → 否决，选「完全显式所得」（所见即所得、无混合惊讶）。
- **`bare` 与显式 `<Axis>` 并存报错 / warn** → 否决，选 `bare` 静默优先（什么都不出）。

## 不在本 ADR 范围

- **vanilla 链式 builder（`plot(rows).line().axis()…`）** → 后续（alpha.1 ADR-08 已记 vanilla DSL 留后续）。
- **轴标题 / legend / reference line DSL** → 后续。
- **per-coordinate `<Axis>`（facet 内）** → facet milestone（[ADR-01](./01-guide-ir.md) 预留）。

---

> **实现指针**：level `red`（动 `react/src/index.ts` 公开 API 加 DSL 组件）、无 IR schema 改动（装配现有 guide IR，产出过 `PlotSpecSchema` 校验）。三包 lockstep：react 出组件、vanilla 文档示例带 `guides`、docs 出带轴 demo。
> - 用户 API 与示例见文档站 plot introduction 页（`<Axis dimension grid tickCount tickLabels id>` / `<Plot bare>` / `fontSize` / `margin`，react + vanilla 两视图）。
> - 真源以代码为准：`Axis` / `AxisProps`（`react/src/components/guides.tsx`）、`collectGuides` / `DEFAULT_GUIDES` / bare 装配（`react/src/components/buildPlotSpec.ts`）、`bare` + 透传（`react/src/Plot.tsx`）、导出（`react/src/components/index.ts` / `react/src/index.ts`）；vanilla `renderPlot` 无改动（已支持任意 spec）。
> - 测试见 `react/tests/components/`（默认全套 / 显式所得 / `grid` prop / bare 空 guides / 字段对齐 / 产物过 schema / 端到端渲出轴线 + 刻度文字 + y 网格 / bare 等价无 guides 几何）。
> - 完整原文（buildPlotSpec 草案 / DSL 表面示例 / 待决策点 / 测试象限 / 文件 scope）见本文件 git 历史。

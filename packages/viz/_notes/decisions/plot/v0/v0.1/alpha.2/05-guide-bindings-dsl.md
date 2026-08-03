# ADR-05：三包 guide 露出（`<Axis>` 子组件（含 `grid` prop）、默认自动出、`bare` 开关）

- 状态：Superseded
- 替代：[alpha.10 ADR-01](../alpha.10/01-plot-thin-container.md) 与 [beta.2 ADR-02](../beta.2/02-plot-vanilla-plain-api.md)；Plot 不再注入默认 axes，binding 统一由共享 authoring normalization 处理
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略（三包 lockstep）](../roadmap.md) · 依赖：[ADR-01 guide IR](./01-guide-ir.md) · [ADR-04 guide lowering](./04-guide-lowering.md) · 基座：[alpha.1 ADR-08 组合 DSL](../alpha.1/08-plot-react-dsl.md) · [alpha.1 ADR-07 薄包装](../alpha.1/07-plot-bindings.md)

## 背景

[ADR-01~04](./01-guide-ir.md) 让 `@retikz/plot` 能产出带轴/网格的图，但 authoring 面还没暴露 guide——用户写 `<Plot data>{marks}` 仍是无轴图。按三包 lockstep（每加 plot 能力，react/vanilla/docs 同步露出），本 ADR 在组合 DSL 上加 `<Axis>` 子组件（网格经其 `grid` prop 表达——grid 是 axis 子属性，见 [ADR-01](./01-guide-ir.md)），并落实两条产品决策：**默认自动出轴和网格**、**提供 `bare` 总开关「什么都不出、只绘图」**。

## 决策：`<Axis>` 配置子组件（网格走 `grid` prop）；无 axis 子组件→默认全套；有则显式所得；`bare`→纯绘图

`<Axis>` 与 `<LineMark>`/`<PointMark>` 同构——**配置载体**（返回 `null`、不进 render 栈、无 hooks），由 `buildPlotSpec` 同步内省装配进 `IRPlotSpec.guides`。**网格不是独立组件**：它是这根轴的 `grid` 布尔 prop（`<Axis dimension="y" grid />`），与 IR `axis.grid` 一一对应。装配规则：

- **`bare`**：`<Plot bare>` → `guides: []` 且布局不留 margin（plot area = 整图）= alpha.1 行为；忽略任何 `<Axis>`（bare 优先、静默）。
- **无任何 `<Axis>`**：默认填 `DEFAULT_GUIDES = [axis x, {axis y, grid:true}]`（双轴 + **仅 y 轴带网格**：横线读数值，对齐 d3 / Observable Plot 常规、不过密；x 网格写 `<Axis dimension="x" grid />`）。
- **写了任意 `<Axis>`**：**完全显式所得**（不再补默认）——所见即所得、可预测，无「显式+默认混合」的惊讶。

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

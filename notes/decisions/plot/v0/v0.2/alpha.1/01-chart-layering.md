# ADR-01：`<Chart>` 上层封装 —— chart 框架无关核心暂归 `@retikz/plot`，react/vanilla 三包对称表面

- 状态：Proposed
- 决策日期：2026-06-13
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [plot v0.2 roadmap](../roadmap.md) · [plot v0 roadmap §定位（`@retikz/chart`）](../../roadmap.md) · [前置：v0.1-alpha.10 薄 Plot ADR-01](../../v0.1/alpha.10/01-plot-thin-container.md) · [plot-design §2 / §11](../../../../../architecture/plot-design.md)
> ⚠️ 草案：本 ADR 由 2026-06-13 设计讨论产出，实现契约为 AI 起草建议稿，待人工 review + 红级多 LLM 评审后定稿。

## 背景

v0.1-alpha.10 已把 `<Plot>` 退化成薄容器：移除 cartesian2D 默认轴注入、保留 scale/coordinate 推断，并把"默认轴 / 网格补齐"推断**抽成可复用纯函数**（`decorateDefaultGuides`，PlotSpec 进出，框架无关）。这留下一个干净的上层缺口：**开箱即用的自动装饰 + 主题**该由谁承担。

v0 roadmap 早已预留 **`@retikz/chart`（`type` + 配置的 preset 封装）依赖 `@retikz/plot`，preset 必须展开成 plot primitive、不得拥有底层无法表达的能力**（[v0 roadmap §定位](../../roadmap.md)）。本 ADR 落地它的**第一版组合式形态**：`<Chart>` —— 照旧写 `<BarMark>` 等子组件，Chart 自动补轴 / 图例 / 网格 + 透出主题。

关键约束（2026-06-13 与用户敲定）：

- chart 要**同时服务 react 与 vanilla** → 需一份**框架无关的共享核心**（装饰 / 主题 → PlotSpec），不能各绑定包各写一遍（撞 AGENTS.md「不造平行机制」）。
- plot 核心要保持**纯 grammar** → chart 核心是「PlotSpec 生产者」纯函数、自包含模块，不污染 grammar lowering。
- 现阶段不引入 `type` + 配置 preset → 不必建独立 `@retikz/chart` 三件套（YAGNI）。

同类库对照：Recharts `<ResponsiveContainer>`（容器）vs 高层组合；Observable Plot `Plot.plot({marks})` 自带轴、mark 是纯数据层；Vega-Lite unit spec 默认出轴；ECharts `type`+option 配置驱动。retikz 取「底层显式组合（`<Plot>`）/ 上层开箱即用（`<Chart>`）双层」。

## 决策：chart 框架无关核心暂归 `@retikz/plot` 自包含模块，react/vanilla 三包对称薄绑定

**(1) chart 框架无关核心暂归 `@retikz/plot`**。新增自包含、框架无关的 chart 模块（建议 `packages/plot/plot/src/chart/`），**收纳 v0.1-alpha.10 抽出的 `decorateDefaultGuides`** 并扩展为完整装饰：输入 marks/config + theme、输出**装饰完整的 `PlotSpec`**（补默认轴 / 图例 / 网格 + 透出 theme）。**无新 IR、无新 lowering、不进 IR**——它是 PlotSpec 生产者，与用户手写 PlotSpec 同级。

```ts
// packages/plot/plot/src/chart/decorate.ts （示意）
/** 框架无关：裸 PlotSpec（marks + scale/coord）→ 装饰完整 PlotSpec（默认轴/图例/网格 + theme） */
export const decorateChartSpec = (spec: PlotSpec, options?: ChartDecorateOptions): PlotSpec => { /* 复用 decorateDefaultGuides + theme 注入 */ };
```

**(2) react / vanilla 三包对称薄绑定**。`@retikz/plot-react` 的 `<Chart>` 与 `@retikz/plot-vanilla` 的 chart builder 都是**薄绑定**：收集 children/config → 调 `decorateChartSpec` → 委托各自的 `<Plot>` / builder 渲染。`<Chart>` props ≈ `<Plot>` 的 DSL props（data / model / coordinate / scaleX…）+ 叠加 `title` / `theme`。

```tsx
// react：<Chart> 自动补轴/网格/图例 + 主题
<Chart data={rows} title="Sales">
  <BarMark x="q" y="sales" color="region" />
</Chart>
// 等价于薄 <Plot> + 手写 <Axis dimension="x"/> <Axis dimension="y" grid/> <Legend channel="color"/>
```

```ts
// vanilla：对称 builder / SSR，调同一 chart 模块
const svg = renderChart({ data: rows, marks: [...], title: 'Sales' });
```

**(3) 包结构为 interim，立毕业触发条件**。chart 核心放 `@retikz/plot` 是**显式临时方案**（AGENTS.md）。**毕业**为独立 `@retikz/chart{,-react,-vanilla}` 三件套的触发条件（任一）：① 引入 `type` + 配置驱动 preset（非组合式）；② chart 逻辑体量 / 演进节奏明显独立于 plot 核心；③ chart 需独立版本线。模块按"PlotSpec 进、PlotSpec 出"自包含隔离，毕业是**机械搬迁非重写**。

理由：

1. **同时服务 react + vanilla 需共享核心**。chart 装饰 / 主题逻辑框架无关，放 plot 核心（自包含模块）两个绑定共享；放某绑定包内则另一包要重写（撞「不造平行机制」）。
2. **复用 v0.1 装饰函数、不重写**。v0.1-alpha.10 已把装饰抽成纯函数；本轮收纳 + 扩展，临时方案不沉没（AGENTS.md）。
3. **回归既有定位、不造平行 IR**。`<Chart>` 正是 v0 roadmap 预留的 `@retikz/chart` 上层封装；两层都编译到唯一 `PlotSpec`、共走 `expandPlot`，物理上不可能自造平行 IR（plot-design §2）。
4. **YAGNI**。preset（type+config）未落地前不建三个近空壳包；用"自包含模块 + 毕业触发条件"保证将来零重写抽包。

## 待决策点 🔻

- **chart 模块导出形态**：`@retikz/plot/chart` 子路径还是主入口具名导出？倾向子路径，隔离更清、利于毕业。
- **自动装饰默认是否带网格**：v0.1 抽出的 `decorateDefaultGuides` 默认 y 轴带网格。`<Chart>` 沿用？倾向**先 1:1 沿用**（等价可测），默认微调另立需求。
- **`title` / `theme` props 形态**：`title` 字符串 + 可选 `subtitle`；`theme` 在 v0.1-alpha.15 Theme 就位前仅预留接缝（接受 theme token 子集或留 `theme?` 占位）。
- **vanilla 入口命名**：`renderChart` vs 扩展现有 `renderPlot`？倾向独立 `renderChart`（与薄 `renderPlot` 对称双层）。

## DSL 表面

```tsx
// 双层心智
<Plot data={rows}>                  {/* 薄：自己写轴 */}
  <LineMark x="t" y="v" />
  <Axis dimension="x" /><Axis dimension="y" grid />
</Plot>

<Chart data={rows} title="Trend">   {/* 厚：自动补轴/网格/图例 + 主题 */}
  <LineMark x="t" y="v" color="series" />
</Chart>
```

## 测试设计

`packages/plot/plot/tests/chart/decorate.test.ts`（新建：装饰函数契约）+ `packages/plot/react/tests/Chart.test.tsx`（新建：`<Chart>` 表面）+ `packages/plot/vanilla/tests/renderChart.test.ts`（新建）覆盖：

- `decorateChartSpec` 等价性：装饰产物 = 薄 `<Plot>` + 手写默认轴 / 图例 / 网格
- `<Chart>` 复用 `<Plot>` DSL props（coordinate / scaleX / model…）+ title/theme
- vanilla `renderChart` 与 react `<Chart>` 同 spec 产物 parity
- color scale → 自动 legend；polar / 1D / ternary 下 `<Chart>` 行为（按支持矩阵）
- 主题接缝：theme 占位不破坏装饰（gate 于 alpha.15 前）

具体 case 见「实现契约 § 测试象限」。

## 影响

- **`@retikz/plot` 新增 chart 模块**：`packages/plot/plot/src/chart/`（框架无关，收纳 + 扩展 v0.1 装饰函数）；**无新 IR 字段、无 lowering 改动**。
- **`@retikz/plot-react`**：新增 `<Chart>` 组件 + 导出。
- **`@retikz/plot-vanilla`**：新增 `renderChart` / chart builder + 导出。
- **公开 API**：`@retikz/plot` 导出 chart 模块（red）；react `<Chart>` / vanilla `renderChart` 新导出。
- **core**：无新依赖、不触 core IR 契约。
- **文档站**：新增「`<Chart>` 开箱即用」线；与「`<Plot>` 底层组合」线对照。
- **v0.1→v0.2 兼容**：纯增量（加 `<Chart>`），削薄已在 v0.1 完成，无破坏性变更。

## 不在本 ADR 范围

- **`type` + 配置驱动 preset**（ECharts 式）：本轮只做组合式 chart；type/config 是毕业触发条件之一，独立 milestone。
- **完整主题透出**：gate 于 v0.1-alpha.15 Theme；本轮仅预留接缝。
- **抽 `@retikz/chart` 三件套**：interim 放 `@retikz/plot`，毕业按触发条件另立 ADR。
- **薄 Plot 本身**：已在 [v0.1-alpha.10 ADR-01](../../v0.1/alpha.10/01-plot-thin-container.md) 完成。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字 + 红级多 LLM 评审后定稿。

### Level

`red`

判级：触及 `packages/plot/plot/src/index.ts`（导出 chart 模块）+ `packages/plot/{react,vanilla}/src/index.ts`（导出 `<Chart>` / `renderChart`），公开 API 新增 → red。chart 模块本身（`src/chart/**`）是 yellow（preset 层），跨级取最高 → red。

### Schema 改动

无。chart 模块只产已有 `PlotSpec`，不动 IR / schema。装饰 / 主题逻辑均不进 IR。本表写「无」。

### 文件 scope

- `packages/plot/plot/src/chart/`（新建：`decorateChartSpec` + 收纳 v0.1 `decorateDefaultGuides` + theme 注入）
- `packages/plot/plot/src/index.ts`（修改：导出 chart 模块 / 子路径）
- `packages/plot/react/src/Chart.tsx`（新建：`<Chart>` 组件）
- `packages/plot/react/src/components/buildPlotSpec.ts`（修改：装饰函数下沉到 plot chart 模块、react 改 import）
- `packages/plot/react/src/index.ts`（修改：导出 `<Chart>`）
- `packages/plot/vanilla/src/renderChart.ts`（新建）+ `packages/plot/vanilla/src/index.ts`（修改：导出）
- `packages/plot/plot/tests/chart/decorate.test.ts` / `packages/plot/react/tests/Chart.test.tsx` / `packages/plot/vanilla/tests/renderChart.test.ts`（新建）
- `apps/docs/src/contents/plot/**`（新增 `<Chart>` 线 + demo，zh/en 同步）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，不硬凑 9。

**Happy path**：

- `decorate_adds_default_axes`：裸 spec（cartesian2D + marks）→ `decorateChartSpec` 补 x/y 轴（y 网格）
- `chart_react_equivalent_to_plot_plus_axes`：`<Chart>` 产物 = 薄 `<Plot>` + 手写默认轴 / 图例
- `chart_color_adds_legend`：`color={field}` → 自动补 legend

**边界**：

- `chart_polar_support_matrix`：polar / 1D / ternary 下 `<Chart>` 按支持矩阵补对应轴或 fail-loud（不静默出怪图）
- `chart_theme_placeholder_noop`：theme 占位（alpha.15 前）不破坏装饰

**错误路径**：

- `chart_invalid_spec_fails_loud`：装饰后仍过 `PlotSpecSchema.parse`，非法 → 清晰 ZodError
- `chart_vanilla_react_parity`：同 spec 下 `renderChart` 与 `<Chart>` 产物 parity

**交互**：

- `chart_reuses_plot_dsl_props`：`<Chart coordinate scaleX model>` 等 DSL props 与 `<Plot>` 同语义
- `decorate_equivalent_to_v01_default_guides`：`decorateChartSpec` 的默认轴部分 = v0.1-alpha.10 `decorateDefaultGuides`（复用正确性）

### 依赖的现有元素

- `decorateDefaultGuides`（v0.1-alpha.10 抽出，`react/src/components/buildPlotSpec.ts`）—— 修改：下沉到 `@retikz/plot` chart 模块、扩展为 `decorateChartSpec`
- `buildPlotSpec` / `collectInto`（`react/src/components/buildPlotSpec.ts`）—— 引用：`<Chart>` 复用 children 收集
- `Plot`（`react/src/Plot.tsx`）—— 引用：`<Chart>` 委托薄 `<Plot>` 渲染
- `renderPlot`（`vanilla/src/renderPlot.ts`）—— 引用：`renderChart` 对称、复用 lowering 路径
- `PlotSpec` / `PlotSpecSchema` / `lowerPlots`（`@retikz/plot`）—— 仅引用：chart 模块产 `PlotSpec`，不改 schema / lowering
- core `Node` / `Path` / `Scope`（`packages/core/core`）—— 仅消费（经 plot 既有 lowering）

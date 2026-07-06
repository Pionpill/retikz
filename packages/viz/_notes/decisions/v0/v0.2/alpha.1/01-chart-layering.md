# ADR-01：`<Chart>` 上层封装 —— chart 核心归 `@retikz/chart`，使用 plot-backed 表达

- 状态：Superseded（迁往 `chart/v0/v0.1` 路线）
- 决策日期：2026-06-13
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [plot v0.2 roadmap](../roadmap.md) · [plot v0 roadmap §定位](../../roadmap.md) · [前置：v0.1-alpha.10 薄 Plot ADR-01](../../v0.1/alpha.10/01-plot-thin-container.md) · [plot-design §2 / §11](../../../../architecture/plot-design.md)
> 2026-07-05 更新：本文是旧版 plot v0.2 chart 草案，已被新的版本规划取代。chart 仍是 Tier 3 封装层，但拥有 JSON-safe `ChartSpec`，并在独立 `chart/v0/v0.1` 路线中 lower 成 PlotSpec；plot v0.2 改为交互能力 + layout transform 主线。本文保留为 superseded 历史记录，不再作为实现输入。

## 背景

v0.1-alpha.10 已把 `<Plot>` 退化成薄容器：移除 cartesian2D 默认轴注入、保留 scale/coordinate 推断，并把"默认轴 / 网格补齐"推断**抽成可复用纯函数**（`decorateDefaultGuides`，PlotSpec 进出，框架无关）。这留下一个干净的上层缺口：**开箱即用的自动装饰 + 主题**该由谁承担。

v0 roadmap 现已明确 `@retikz/chart` / `@retikz/chart-react` / `@retikz/chart-vanilla` 是独立 Tier 3 上层封装：通过 `type` / 配置 / preset 提供新手友好的 API，当前主要调度 plot 底层能力并生成 PlotSpec。原 struct 范围不作为独立包，tree / network / wordCloud / gauge 等结构化 type 通过 plot layout transform + mark 表达。本 ADR 只落地 chart 的**第一版 plot-backed 组合式形态**：`<Chart>` —— 照旧写 `<BarMark>` 等子组件，Chart 自动补轴 / 图例 / 网格 + 透出主题。

关键约束（2026-06-13 与用户敲定）：

- chart 要**同时服务 react 与 vanilla** → 需一份**框架无关的共享核心**（装饰 / 主题 → PlotSpec），不能各绑定包各写一遍（撞 AGENTS.md「不造平行机制」）。
- plot 核心要保持**纯 grammar** → chart 核心是「PlotSpec 生产者」纯函数，放在 `@retikz/chart`，不污染 plot grammar / lowering。
- 长期高层封装由 chart 承担：line/bar/pie 与 gauge/progress/tree/network/wordCloud/pictogram 等都必须先生成 PlotSpec；table 不由 chart 调度；map/choropleth/flowMap 所属的 geo 边界待后续 ADR 决定。现阶段只做 plot-backed 组合式 `<Chart>`，不建统一 `@retikz/viz-react` / `@retikz/viz-vanilla`。

同类库对照：Recharts `<ResponsiveContainer>`（容器）vs 高层组合；Observable Plot `Plot.plot({marks})` 自带轴、mark 是纯数据层；Vega-Lite unit spec 默认出轴；ECharts `type`+option 配置驱动。retikz 取「Tier 2 底层显式组合（Plot / Table / geo 待决策）/ Tier 3 chart 友好封装 / 各模块各自框架绑定」。

## 决策：plot-backed chart 核心归 `@retikz/chart`，绑定包独立发布

**(1) plot-backed chart 核心归 `@retikz/chart`**。新增框架无关的 chart / preset 模块（`packages/viz/chart/src/`），**复用或承接 v0.1-alpha.10 抽出的 `decorateDefaultGuides` 语义** 并扩展为完整装饰：输入 marks/config + theme、输出**装饰完整的 `PlotSpec`**（补默认轴 / 图例 / 网格 + 透出 theme）。**无新 IR、无新 lowering、不进 IR**——它是 PlotSpec 生产者，与用户手写 PlotSpec 同级。

```ts
// packages/viz/chart/src/decorate.ts （示意）
/** 框架无关：裸 PlotSpec（marks + scale/coord）→ 装饰完整 PlotSpec（默认轴/图例/网格 + theme） */
export const decorateChartSpec = (spec: PlotSpec, options?: ChartDecorateOptions): PlotSpec => { /* 复用 decorateDefaultGuides + theme 注入 */ };
```

**(2) 新增 chart-react / chart-vanilla 绑定**。`@retikz/chart-react` 的 `<Chart>` 与 `@retikz/chart-vanilla` 的 chart builder 都是**薄绑定**：收集 children/config → 调 `decorateChartSpec` → 委托 plot 的 `<Plot>` / builder 或 compile path 渲染。`<Chart>` props ≈ `<Plot>` 的 DSL props（data / model / coordinate / scaleX…）+ 叠加 `title` / `theme`。plot-react / plot-vanilla 继续只暴露 plot authoring 表面；chart 的新手友好表面在 chart 三包内。

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

**(3) 包结构不设 viz adapter 聚合**。chart 是长期独立 Tier 3 包，但不是 viz-level 聚合 adapter；本轮只调度 plot，不拉入 table / geo。若 table 后续需要高层入口，应由 table 自己承担；geo 是否独立成包另行决策。

理由：

1. **同时服务 react + vanilla 需共享核心**。chart 装饰 / 主题逻辑框架无关，放 `@retikz/chart` 后由两个绑定共享；放某绑定包内则另一包要重写（撞「不造平行机制」）。
2. **复用 v0.1 装饰函数、不重写**。v0.1-alpha.10 已把装饰抽成纯函数；本轮在 chart 核心中承接同一语义，临时方案不沉没（AGENTS.md）。
3. **职责清晰、不造平行 IR**。本轮 plot-backed 表面编译到唯一 `PlotSpec`、共走 `expandPlot`，物理上不可能自造平行 IR（plot-design §2）。未来结构化算法类 type 仍经 plot layout transform 生成 PlotSpec；table / geo 不由 chart 在本轮调度。
4. **安装边界清晰**。不做 `@retikz/viz-react` 聚合包；用户只用 plot 时无需安装 chart / table / geo，用户要新手友好 API 时显式安装 chart 三包。

## 待决策点 🔻

- **chart 模块导出形态**：`@retikz/chart` 主入口导出核心函数；是否额外提供 `@retikz/chart/presets` 子路径另行决定。
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

`packages/viz/chart/tests/decorate.test.ts`（新建：装饰函数契约）+ `packages/viz/chart-react/tests/Chart.test.tsx`（新建：`<Chart>` 表面）+ `packages/viz/chart-vanilla/tests/renderChart.test.ts`（新建）覆盖：

- `decorateChartSpec` 等价性：装饰产物 = 薄 `<Plot>` + 手写默认轴 / 图例 / 网格
- `<Chart>` 复用 `<Plot>` DSL props（coordinate / scaleX / model…）+ title/theme
- vanilla `renderChart` 与 react `<Chart>` 同 spec 产物 parity
- color scale → 自动 legend；polar / 1D / ternary 下 `<Chart>` 行为（按支持矩阵）
- 主题接缝：theme 占位不破坏装饰（gate 于 alpha.15 前）

具体 case 见「实现契约 § 测试象限」。

## 影响

- **`@retikz/chart` 新增 chart 核心**：`packages/viz/chart/src/`（框架无关，承接 + 扩展 v0.1 装饰语义）；**无新 IR 字段、无 lowering 改动**。
- **`@retikz/chart-react`**：新增 `<Chart>` 组件 + 导出。
- **`@retikz/chart-vanilla`**：新增 `renderChart` / chart builder + 导出。
- **公开 API**：`@retikz/chart` 导出 chart 核心（red）；chart-react `<Chart>` / chart-vanilla `renderChart` 新导出。
- **core**：无新依赖、不触 core IR 契约。
- **文档站**：新增「`<Chart>` 开箱即用」线；与「`<Plot>` 底层组合」线对照。
- **v0.1→v0.2 兼容**：纯增量（加 `<Chart>`），削薄已在 v0.1 完成，无破坏性变更。
- **长期边界**：本文只定义 plot-backed `<Chart>`；chart 长期作为 Tier 3 新手友好封装存在，但当前只生成 PlotSpec 并调度 plot。table 不由 chart 调度；geo 边界另立 ADR。

## 不在本 ADR 范围

- **跨表达层 `type` + 配置驱动 preset**（ECharts 式）：本轮不做 viz-level 聚合 chart；只做 plot-backed 组合式 chart。
- **data 共享层抽离**：本轮不抽 `@retikz/data`；后续 plot / table / geo 共享数据模型、字段、通用 transform、通道、scale / formatter 时另立 ADR。
- **plot layout chart type**：gauge / progress / token ring / tree / network / wordCloud / pictogram 等先由 `@retikz/plot` 提供 layout transform 能力，再由 chart 封装。
- **table-backed chart type**：table / pivotTable / matrix 等由 `@retikz/table` 自己决定是否提供高层封装。
- **geo-backed chart type**：map / choropleth / flowMap 等先做 geo 边界决策；geo 可能独立成包，也可能作为 plot projection / layout 能力。
- **viz adapter 收敛**：不规划；本轮新增 `@retikz/chart-react` / `@retikz/chart-vanilla`，table / geo（若独立）后续各自发包。
- **完整主题透出**：gate 于 v0.1-alpha.15 Theme；本轮仅预留接缝。
- **viz adapter 目标包**：不做；不规划 `@retikz/viz-react` / `@retikz/viz-vanilla`。
- **薄 Plot 本身**：已在 [v0.1-alpha.10 ADR-01](../../v0.1/alpha.10/01-plot-thin-container.md) 完成。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字 + 红级多 LLM 评审后定稿。

### Level

`red`

判级：新增 `packages/viz/chart/src/index.ts`（导出 chart 核心）+ `packages/viz/chart-react/src/index.ts` / `packages/viz/chart-vanilla/src/index.ts`（导出 `<Chart>` / `renderChart`），公开 API 新增 → red。chart 核心本身是 yellow（preset 层），跨级取最高 → red。

### Schema 改动

无。chart 模块只产已有 `PlotSpec`，不动 IR / schema。装饰 / 主题逻辑均不进 IR。本表写「无」。

### 文件 scope

- `packages/viz/chart/src/`（新建：`decorateChartSpec` + 承接 v0.1 `decorateDefaultGuides` 语义 + theme 注入）
- `packages/viz/chart/src/index.ts`（新建：导出 chart 核心 / preset）
- `packages/viz/chart-react/src/Chart.tsx`（新建：`<Chart>` 组件）
- `packages/viz/chart-react/src/index.ts`（新建：导出 `<Chart>`）
- `packages/viz/chart-vanilla/src/renderChart.ts`（新建）+ `packages/viz/chart-vanilla/src/index.ts`（新建：导出）
- `packages/viz/chart/tests/decorate.test.ts` / `packages/viz/chart-react/tests/Chart.test.tsx` / `packages/viz/chart-vanilla/tests/renderChart.test.ts`（新建）
- `apps/docs/src/modules/docs/contents/viz/**`（新增 `<Chart>` 线 + demo，zh/en 同步）

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

- `decorateDefaultGuides`（v0.1-alpha.10 抽出，`react/src/components/buildPlotSpec.ts`）—— 修改：由 `@retikz/chart` 核心承接同一装饰语义，扩展为 `decorateChartSpec`
- `buildPlotSpec` / `collectInto`（`react/src/components/buildPlotSpec.ts`）—— 引用：`<Chart>` 复用 children 收集
- `Plot`（`react/src/Plot.tsx`）—— 引用：`<Chart>` 委托薄 `<Plot>` 渲染
- `renderPlot`（`vanilla/src/renderPlot.ts`）—— 引用：`renderChart` 对称、复用 lowering 路径
- `PlotSpec` / `PlotSpecSchema` / `lowerPlots`（`@retikz/plot`）—— 仅引用：chart 模块产 `PlotSpec`，不改 schema / lowering
- core `Node` / `Path` / `Scope`（`packages/kernel/core`）—— 仅消费（经 plot 既有 lowering）

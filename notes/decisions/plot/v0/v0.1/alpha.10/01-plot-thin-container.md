# ADR-01：退化 `<Plot>` 为薄容器 —— 移除默认轴注入，保留 scale/coord 推断，装饰逻辑抽出留给 v0.2 chart

- 状态：Proposed
- 决策日期：2026-06-13
- 关联：[plot v0.1-alpha.10 roadmap](./roadmap.md) · [plot v0.1 roadmap §拆分策略（薄 `<Plot>` + 组合 DSL）](../roadmap.md) · [plot v0.2 roadmap（chart 上层）](../../v0.2/roadmap.md) · [plot-design §2 / §11](../../../../../architecture/plot-design.md)
> ⚠️ 草案：本 ADR 由 2026-06-13 设计讨论产出，实现契约为 AI 起草建议稿，待人工 review 后定稿。

## 背景

`@retikz/plot` 的 React 绑定从 v0.1 起被定位为「**薄 `<Plot>` + 组合 DSL**」（[v0.1 roadmap §拆分策略](../roadmap.md)）。但实现中 `<Plot>` 的 DSL 入口比"薄"更厚：`buildPlotSpec`（`react/src/components/buildPlotSpec.ts`）在 **cartesian2D 且用户未写 `<Axis>`** 时自动注入默认 x/y 轴（`DEFAULT_GUIDES`，y 带网格，:404 / :114）。

"自动出轴"让 `<Plot>` 同时承担"底层容器"与"开箱即用"两种角色：想完全手控轴 / 网格的用户要绕 `bare`，想要更高层封装（title / 主题 / preset）的用户又无处可去。

设计决策（2026-06-13 与用户敲定）拆成两层：**底层 `<Plot>` 只当薄容器**（不生成可见装饰，轴 / 图例 / 网格靠用户显式组合 `<Axis>` / `<Legend>`），**上层 `<Chart>` 开箱即用**（自动装饰 + 主题）。`<Chart>` 归 **v0.2**（[v0.2 roadmap](../../v0.2/roadmap.md)）；**本 ADR 只做 v0.1 这一半：把 `<Plot>` 退化成薄容器**。

一个有利事实：**"薄"的接缝早已存在**。`<Plot>` 已有 `bare` 开关（"什么都不出"，`Plot.tsx:30`），`spec` 入口本就是全显式薄路径，默认轴注入只在 cartesian2D 单一分支。故本 ADR 是**移除一个默认行为 + 抽出可复用装饰函数**，非新造机制，回归面可控。

## 决策：移除 cartesian2D 默认轴注入，保留 scale/coord 推断；装饰逻辑抽成自包含纯函数（本轮不默认调用，留给 v0.2 chart）

**(1) 薄 `<Plot>` 语义（决策 A）**。`<Plot>` DSL 入口：

- **移除**：`DEFAULT_GUIDES` 自动注入——用户不写 `<Axis>` 就没有轴 / 网格。
- **保留**：从 marks 推 scale（band/linear/time…）、推 coordinate（缺省 cartesian2D，可经 `coordinate` 覆盖）、color scale 推断——这些是 mark 定位 / 图例绑定所需的**不可见管道**，不算"可见内容"。
- **不变**：显式 `<Axis>` / `<Legend>` 照常收集、生效、留边距；`<Axis grid>` 仍是网格入口（不另立 `<Grid>`，决策 1a）；`spec` 入口全显式薄包装。

**(2) 装饰逻辑抽成自包含纯函数，本轮不默认调用**。现有"默认轴 / 网格补齐"推断**不就地删除**，而是抽成**框架无关、PlotSpec 进出**的纯函数（如 `decorateDefaultGuides(spec)`），`<Plot>` 本轮不再默认调用它。这样 **v0.2 的 `<Chart>` 直接复用**这份函数补装饰，无需重写——避免临时删除造成 v0.2 重新实现（AGENTS.md：临时方案不沉没、可复用能力不丢）。落点与导出边界与 [v0.2 chart ADR](../../v0.2/alpha.1/01-chart-layering.md) 协调（v0.2 决定它最终归 `@retikz/plot` 的 chart 模块）。

```ts
// 退化后（react/src/components/buildPlotSpec.ts 示意）
// 旧：cartesian2D 无 <Axis> → 注入 DEFAULT_GUIDES
// 新：不注入；装饰推断抽成纯函数供 v0.2 chart 复用
const guides = options.bare ? [] : [...explicitAxes, ...legends];  // 不再 fallback 到 DEFAULT_GUIDES
```

```tsx
// 退化后：不写 <Axis> 就没有轴（BREAKING）
<Plot data={rows}>
  <LineMark x="t" y="v" />
</Plot>
{/* 退化前：自动 x 轴 + y 轴(网格)；退化后：只有折线 */}

// 要轴就显式组合
<Plot data={rows}>
  <LineMark x="t" y="v" />
  <Axis dimension="x" />
  <Axis dimension="y" grid />
</Plot>
```

理由：

1. **回归既有定位、为 v0.2 铺路**。薄 `<Plot>` 正是 v0.1 roadmap 写明的「薄 `<Plot>` + 组合 DSL」；退化后 `<Plot>` 角色单一（底层容器），v0.2 `<Chart>` 才有干净的"开箱即用"层可加，两层都编译到唯一 `PlotSpec`、不造平行机制。
2. **不丢能力、不重写**。装饰推断抽成纯函数而非删除——v0.2 chart 直接复用，临时方案不沉没（AGENTS.md）。
3. **零波及 grammar**。本轮只动 `react` 装配层，不碰 IR / lowering / grammar 编号；grammar alpha.10–14 及其 ~13 处按号引用一字不动。

## 待决策点 🔻

- **`bare` 去留**：倾向**保留**——`bare` = 真全出血（无轴、无边距、plot area = 整图），语义不同于薄 Plot 默认态（不补默认轴但尊重显式 `<Axis>` + 留边距）。
- **装饰函数导出形态**：本轮抽出的 `decorateDefaultGuides` 暂留 `react` 内部 module 还是即刻下沉到 `@retikz/plot`？倾向**本轮先留 react 内部**（v0.1 不引入 plot 核心新导出），v0.2 chart ADR 决定是否下沉到 plot 的 chart 模块（框架无关复用点）。
- **薄 Plot 是否仍隐式推 color scale**：倾向**保留**（不可见管道，`<Legend>` 需绑定）。

## DSL 表面

```tsx
// 薄 <Plot>：marks + 显式装饰
<Plot data={rows}>
  <BarMark x="q" y="sales" />
  <Axis dimension="x" />
  <Axis dimension="y" grid />
</Plot>

// bare：连显式轴 / 边距都不要（保留）
<Plot data={rows} bare>
  <LineMark x="t" y="v" />
</Plot>
```

## 测试设计

> plot alpha milestone 放宽：按复杂度适量，不硬凑 9。

`packages/plot/react/tests/components/buildPlotSpec.test.tsx`（改：默认轴注入移除后产物）+ `packages/plot/react/tests/Plot.test.tsx`（改：薄 Plot 行为）覆盖：

- 薄 Plot：DSL 无 `<Axis>` → `guides` 不含默认 x/y 轴（移除注入）
- 薄 Plot：显式 `<Axis>` / `<Legend>` 仍正常收集、生效、留边距
- 薄 Plot：scale / coordinate / color 推断**不变**（band/linear/time/color/polar 角向 等价回归）
- `bare` 保留：仍"什么都不出 + plot area 整图"，与薄 Plot 默认态区分
- spec 入口零回归（全显式路径不受影响）
- `decorateDefaultGuides(裸spec)`：抽出的纯函数产出 = 旧默认轴注入产物（等价，锚定 v0.2 复用正确性）

具体 case 见「实现契约 § 测试象限」。

## 影响

- **⚠️ alpha 间 BREAKING（DSL 入口）**：cartesian2D DSL 入口不再自动出 x/y 轴。alpha.1/2/3（npm）依赖此默认；本轮在 v0.1 alpha 线内变更，0.x 不留别名 / 桥接（AGENTS.md），changelog 显式标注。**迁移**：① 显式加 `<Axis>`；或 ② 等 v0.2 改用 `<Chart>`。依赖默认轴的 docs demo **同改动集**迁移（决策 2b）。
- **`react/src/components/buildPlotSpec.ts`**：移除 `DEFAULT_GUIDES` fallback；装饰推断抽成 `decorateDefaultGuides` 纯函数（不删能力）。scale/coord/color 推断保留。
- **`react/src/Plot.tsx`**：`bare` 语义重申（保留）。
- **公开 API**：无导出契约变更（不动 `index.ts`、不动 IR）；纯行为变更。
- **core / plot 核心 IR**：无影响。
- **文档站**：依赖默认轴的 demo 迁移（手动补 `<Axis>`）；说明 `<Plot>` 现为薄容器、轴需显式声明。

## 不在本 ADR 范围

- **`<Chart>` 上层封装 / 自动装饰 / 主题**：归 **v0.2**（[chart ADR](../../v0.2/alpha.1/01-chart-layering.md)）。本轮只退化 Plot、抽出可复用装饰函数。
- **装饰函数下沉到 `@retikz/plot` chart 模块**：v0.2 决定；本轮暂留 react 内部。
- **`<Grid>` 独立组件**：决策 1a 维持 `<Axis grid>` prop。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字后定稿。

### Level

`yellow`

判级：仅动 `packages/plot/react/src/components/**`（装配层行为）+ 测试 + docs；**不动** plot 核心 `ir/**` · `lowering/**` · 任何 `index.ts` 导出契约 · IR schema。breaking 是行为级、非导出契约级。→ yellow（docs / 测试部分 green，跨级取最高 yellow）。

### Schema 改动

无。本 ADR 不动 IR / schema / 导出契约——纯装配层行为变更。本表写「无」。

### 文件 scope

- `packages/plot/react/src/components/buildPlotSpec.ts`（修改：移除默认轴注入；抽 `decorateDefaultGuides` 纯函数）
- `packages/plot/react/src/Plot.tsx`（修改：`bare` 语义重申，按需）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（修改：默认轴移除后产物 + 抽出函数等价）
- `packages/plot/react/tests/Plot.test.tsx`（修改：薄 Plot 行为）
- `apps/docs/src/contents/plot/**`（修改：依赖默认轴的 demo 迁移 + `<Plot>` 薄容器说明，zh/en 同步）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，不硬凑 9。

**Happy path**：

- `thin_plot_no_default_axes`：DSL `<Plot>` 含 mark、无 `<Axis>` → `guides` 不含默认 x/y 轴
- `thin_plot_explicit_axis_kept`：写 `<Axis dimension="x" />` → 该轴进 `guides`、布局留边距
- `thin_plot_scale_inference_unchanged`：含 `<BarMark>` → x 推 band、y 推 linear（推断零回归）

**边界**：

- `bare_still_full_bleed`：`<Plot bare>` → 无轴、无边距、plot area = 整图（与薄 Plot 默认态区分）
- `thin_plot_polar_unchanged`：polar / 1D / ternary 本就要显式轴 → 行为逐字不变

**错误路径**：

- `spec_entry_zero_regression`：`<Plot spec={…} data={…}>` 全显式路径 → 产物与退化前逐字一致
- `legend_without_axis`：只写 `<Legend>` → legend 保留、仍不补默认轴

**交互**：

- `decorate_default_guides_equivalent`：抽出的 `decorateDefaultGuides(裸spec)` 产出 = 退化前默认轴注入产物（等价，锚定 v0.2 chart 复用）
- `color_scale_still_inferred`：薄 Plot 下 `color={field}` 仍推 color scale（供 `<Legend>` 绑定）

### 依赖的现有元素

- `buildPlotSpec` / `DEFAULT_GUIDES` / `collectInto`（`react/src/components/buildPlotSpec.ts`）—— 修改：移除默认注入、抽装饰纯函数
- `Plot` / `PlotDslProps.bare`（`react/src/Plot.tsx`）—— 修改：`bare` 重申
- `PlotSpec` / `Guide` / `PlotGuide`（`@retikz/plot`）—— 仅引用：装饰函数产 `Guide[]`，不改 schema

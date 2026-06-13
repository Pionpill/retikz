# plot v0.2-alpha.1 实施待办：chart 模块 + `<Chart>` 三包表面

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.2 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot v0.1-alpha.10（薄 Plot 前置）`](../../v0.1/alpha.10/roadmap.md) · [`plot-design §2 / §11`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md)
> ⚠️ 草案：本 milestone 由 2026-06-13 设计讨论开出，待人工 review。

## 目标

在 v0.1 已退化的薄 `<Plot>` 之上，加 `<Chart>` 开箱即用层，并落地 [v0 roadmap](../../roadmap.md) 预留的 `@retikz/chart` 上层封装第一版（组合式形态）：

1. **`@retikz/plot` 新增框架无关 chart 模块**：输入 marks/config + theme → 装饰完整 `PlotSpec`（自动补默认轴 / 图例 / 网格 + 透出 theme）。**复用 v0.1-alpha.10 抽出的装饰函数**（`decorateDefaultGuides`），不重写。无新 IR、无新 lowering。
2. **`@retikz/plot-react` 新增 `<Chart>`**：薄绑定，收集 children → 调 chart 模块 → 委托 `<Plot>`。
3. **`@retikz/plot-vanilla` 新增对称 chart builder / SSR**：调同一 chart 模块。
4. **三包 + docs lockstep**：文档拆「底层 `<Plot>` 组合」与「`<Chart>` 开箱即用」两线。

## 前置

- **v0.1-alpha.10 薄 Plot**：`<Plot>` 已退化、装饰推断已抽成可复用纯函数（见 [v0.1-alpha.10 ADR-01](../../v0.1/alpha.10/01-plot-thin-container.md)）。本 milestone 把该函数下沉 / 归位到 `@retikz/plot` 的 chart 模块，供 react/vanilla 共享。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
| --- | --- | --- | --- | --- |
| [01](./01-chart-layering.md) | **chart 模块归属 + 装饰契约 + 三包表面**：chart 框架无关核心暂归 `@retikz/plot`（interim + 毕业触发）、装饰函数契约（marks/config+theme → PlotSpec）、自动装饰规则、React `<Chart>` props、Vanilla chart builder | red | v0.1-alpha.10 ADR-01 | 草拟中 |

> 单 ADR 起步；若表面 / 主题 / preset 细分需要可再拆 ADR-02+。theme 完整透出 gate 于 v0.1-alpha.15 Theme，本轮仅预留主题接缝。

## 待决策（ADR-01 起草前定）

- **① chart 模块在 plot 核心的目录与导出边界**：倾向 `packages/plot/plot/src/chart/`（自包含），经 `@retikz/plot` 子路径（`@retikz/plot/chart`）或具名导出供 react/vanilla 消费；不与 grammar lowering 目录混。
- **② 自动装饰补齐规则**：`<Chart>` 在哪些条件补默认轴 / 图例 / 网格——倾向**先 1:1 复用 v0.1 抽出的 `decorateDefaultGuides`**（cartesian2D 补 x/y 轴、y 带网格；有 color scale 补 legend），默认微调另立需求。
- **③ `<Chart>` 与 `<Plot>` 的 props 关系**：倾向**复用 + 叠加**——`<Chart>` ≈ `<Plot>` 的 DSL props（data / model / coordinate / scaleX…）+ 自动装饰 + `title` / `theme`。
- **④ vanilla chart builder 形态**：对齐现有 `renderPlot` / builder 风格，调同一 chart 模块。

## core 依赖

无新 core 依赖——chart 模块只产 `PlotSpec`，经 plot 既有 lowering 下沉到 core 现有 Node / Path / Scope。

## 执行模式

**三包 lockstep（milestone 粒度）**：chart 模块 + react/vanilla 表面 + 文档一次性同步，milestone 完成时四方一致才「可交付」。红级 ADR 按 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) 先调研同类库（Recharts `<ResponsiveContainer>` vs 高层组合、Observable Plot `Plot.plot()` vs marks、Vega-Lite unit spec、ECharts type+option）+ 外部 LLM 评审，人工签字后进实现。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。

# plot v0.2-alpha.1 实施待办：主题所有权 + 交互与 layout transform 地基

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.2 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design §7 / §10 / §13`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../../_template.md)
> ⚠️ 草案：本 milestone 由 2026-07-05 版本规划讨论开出，待人工 review。

## 目标

在 v0.1 GoG 基座之上，先修正 Plot / Chart 的主题所有权，再打通 v0.2 两条能力轴的最小纵向闭环：

1. **主题所有权**：Plot 消费 Core effective Theme，拥有 Plot token、preset、cascade 与 inspection；Chart 只组合或传递 Plot 公开契约。
2. **交互地基**：让 locator / provenance / layer identity 能被 runtime 消费，支撑 tooltip、hover、selection、brush、legend interaction 与 overlay 的后续实现。
3. **layout transform 地基**：建立结构化布局算法的 registry / contract，让 tree、network、word cloud、treemap、gauge、progress、pictogram 等算法产出普通 rows / derived fields，再交给 plot mark 渲染。
4. **Chart 消费边界**：chart v0.1 可消费本 milestone 产出的 PlotSpec 能力，但 ChartSpec、recipe 与 presentation 由 chart 自身 roadmap 维护。

## ADR 清单

| ADR | 主题                                                                                                                                                        | Level | 依赖                                                | 状态     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------- | -------- |
| 01  | **Plot theme token ownership and Chart consumption boundary**：Plot 拥有领域 token、preset、cascade 与 Theme context 消费；Chart 保持封闭 PlotSpec producer | red   | Core inherited Theme / Plot v0.1 theme / Chart v0.1 | Accepted |
| 02  | **interaction runtime contract**：locator / provenance 的 runtime 消费、事件回调、overlay scope、交互状态与 PlotSpec JSON-safe 边界                         | red   | v0.1 alpha.5 / alpha.14 / alpha.15                  | 待起草   |
| 03  | **layout transform registry**：结构化布局算法的 definition / registry、输入输出 rows、derived field 命名、与普通 transform / mark 的边界                    | red   | v0.1 stat / mark / composition                      | 待起草   |

ADR-01 已按当前 Tier 3 ChartSpec 与 Core inherited Theme 重写：Chart 的具体 schema、recipe 和 presentation 继续由 chart v0.1 路线维护；本 milestone 只冻结 Plot 的上游所有权与跨包消费边界。

## 前置

- **v0.1 beta data 抽层**：共享 field model、dataset normalization、field resolver / formatter 与通用 transform 基础契约。
- **v0.1 locator / provenance / layer**：交互 runtime 只消费这些 identity，不重新定义来源模型。
- **core runtime / hydration 能力**：事件绑定、hit-test 与 overlay 渲染依赖 core / adapter 的 runtime 基础。

## 不在本 milestone 范围

- 完整 tooltip / brush / selection 交互组件库。
- 动画与 transition 语法。
- 全量结构化布局算法实现；本轮先定 registry 与 1-2 个可验证薄片。
- ChartSpec / `<Chart>` 实现；chart v0.1 单独开 roadmap / ADR。
- table / geo 的独立包设计。

## 执行模式

plot v0.2 仍保持 plot 三包 lockstep：`@retikz/plot` 定 contract 与 lowering，`@retikz/plot-react` / `@retikz/plot-vanilla` 提供 runtime / authoring 表面，docs 同步展示。交互红级 ADR 必须先调研 Recharts / Vega(-Lite) selection / Observable Plot / ECharts 的交互边界；layout transform 红级 ADR 必须对照 d3-hierarchy / d3-force / wordcloud / treemap 的输入输出契约。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../../_template.md`](../../../../_template.md)。

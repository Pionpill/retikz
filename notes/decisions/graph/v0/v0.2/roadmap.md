# plot v0.2 Roadmap

> 本文件汇总 plot v0.2 minor 的路线与 milestone 索引。具体执行记录放各 milestone 的 `roadmap.md`，长期决策放同目录 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot v0.1 roadmap`](../v0.1/roadmap.md) · [`plot v0.1-alpha.10（薄 Plot 前置）`](../v0.1/alpha.10/roadmap.md) · [`plot-design.md §2 / §11`](../../../../architecture/plot-design.md)
> ⚠️ 草案：本 minor 由 2026-06-13「薄 Plot + chart 上层封装」设计讨论开出，待人工 review。

## 定位

**v0.2 承载 `@retikz/chart` 的首个 plot-backed 落点**——chart 是独立 Tier 3 上层封装包，通过 `type/config` 或 `<Chart>` 这类高层抽象生成 PlotSpec，并调度 plot 底层能力。本 minor 先在 v0.1 已退化的薄 `<Plot>` 之上，加一层「batteries-included」表面：

- **底层 `<Plot>`（薄容器，v0.1-alpha.10 已退化）**：只负责 plot 系底层逻辑（kernel 组合 + scale/coordinate 隐式推断），不生成可见装饰。
- **高层 `<Chart>` / preset（本 minor）**：自动装饰（marks → 默认轴 / 图例 / 网格）+ 主题，开箱即用。**本轮只覆盖 plot-backed 组合式图形**，必须展开成 PlotSpec、不得拥有 plot 底层无法表达的能力；后续 `type="tree"` / `type="gauge"` / `type="wordCloud"` 等也应通过 plot layout transform + mark 表达。table 不由 chart 调度；geo 是否独立拆包仍待决策。

本轮两层都编译到**唯一的 `PlotSpec`**、共走 `expandPlot` lowering，不造平行 IR / 平行渲染。长期 chart 高层入口也必须产出 PlotSpec；结构化算法类 type 默认仍经 plot layout transform 生成 PlotSpec。

## 前置：v0.1-alpha.10 薄 Plot

v0.1-alpha.10 已把 `<Plot>` 退化为薄容器，并把"默认轴 / 网格补齐"推断**抽成可复用纯函数**（不删除）。本 minor 的高层 `<Chart>` / preset **在 `@retikz/chart` 中复用或承接**这份装饰语义，不重写两套逻辑。见 [v0.1-alpha.10 ADR-01](../v0.1/alpha.10/01-plot-thin-container.md)。

## 包结构决策（2026-06-13 更新）

本轮高层封装的框架无关核心逻辑（marks/config + theme → 装饰完整 `PlotSpec`）**放进 `@retikz/chart`**，向 `@retikz/chart-react` / `@retikz/chart-vanilla` 提供能力；chart 依赖并产出 plot 的 `PlotSpec`，不自造 IR / lowering / renderer，也不承担 table / geo 聚合。

- **理由**：plot 继续保持 GoG 抽象层职责清晰；chart 明确服务新手友好的 type/config API；两者用 PlotSpec 作为边界，既不混职责，也不复制 lowering。
- **长期标注**：chart 是独立 Tier 3 包，但不是 graph-level 聚合 adapter。它当前只调度 plot；table 不由 chart 调度，geo 的独立性待后续 ADR 决定。

## Milestones

| Milestone | 主题 | 模块 / 产出 | 状态 |
| --- | --- | --- | --- |
| [v0.2-alpha.1](./alpha.1/roadmap.md) | **chart 核心 + `<Chart>` 表面** | 新增 `@retikz/chart` 框架无关核心（marks/config+theme → 装饰完整 PlotSpec，复用 v0.1 装饰语义）；新增 `@retikz/chart-react` `<Chart>` + `@retikz/chart-vanilla` chart builder；chart 三包表面 + docs lockstep | 草拟中 |

> 后续 milestone（data 共享层抽离、plot layout transform、table 高层封装、geo 边界决策、完整主题透出等）攒够需求再排。chart theme 能力依赖 v0.1-alpha.15 Theme（GoG 第 8 组件）——v0.2-alpha.1 先做组合式自动装饰 + 主题接缝，完整主题透出 gate 于 v0.1 Theme 就位。

## 依赖

- **plot v0.1**：薄 `<Plot>`（alpha.10）+ 抽出的装饰函数；grammar mark/scale/coordinate/guide lowering。本轮 chart 封装不新增 IR、不新增 lowering。
- **data**：不参与本轮；后续 plot / table / geo（若独立）共享的数据模型、字段解析、通用 transform、通道、scale / formatter 等应先由 `@retikz/data` 提供。
- **plot layout / table / geo**：plot layout transform 不参与本轮；后续 gauge / progress / tree / network / word cloud / pictogram 等先由 `@retikz/plot` 提供 layout transform 能力。table 不参与本轮；geo 是否独立成包另行决策。
- **framework adapter**：本轮新增 `@retikz/chart-react` / `@retikz/chart-vanilla` 表面；不规划 graph-react / graph-vanilla 收敛。
- **core**：无新增依赖（高层封装不直接碰 core，经 plot 既有 lowering 下沉）。

## 与 v0.1 的关系

v0.1 = 图形语法完整（GoG 8 组件）+ 薄 Plot（alpha.10）。v0.2 = chart 的首个 plot-backed 上层表面。发布次序：v0.2 在 v0.1 之后；削薄已在 v0.1 内完成，故 v0.1→v0.2 **无破坏性变更**，v0.2 是纯增量（加 `@retikz/chart` / `@retikz/chart-react` / `@retikz/chart-vanilla`）。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../_template.md`](../../_template.md)。

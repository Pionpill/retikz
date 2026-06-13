# plot v0.2 Roadmap

> 本文件汇总 plot v0.2 minor 的路线与 milestone 索引。具体执行记录放各 milestone 的 `roadmap.md`，长期决策放同目录 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot v0.1 roadmap`](../v0.1/roadmap.md) · [`plot v0.1-alpha.10（薄 Plot 前置）`](../v0.1/alpha.10/roadmap.md) · [`plot-design.md §2 / §11`](../../../../architecture/plot-design.md)
> ⚠️ 草案：本 minor 由 2026-06-13「薄 Plot + chart 上层封装」设计讨论开出，待人工 review。

## 定位

**v0.2 承载 `@retikz/chart` 上层封装**——在 v0.1 已退化的薄 `<Plot>` 之上，加一层「batteries-included」表面：

- **底层 `<Plot>`（薄容器，v0.1-alpha.10 已退化）**：只负责 plot 系底层逻辑（kernel 组合 + scale/coordinate 隐式推断），不生成可见装饰。
- **上层 `<Chart>`（本 minor）**：自动装饰（marks → 默认轴 / 图例 / 网格）+ 主题，开箱即用。**preset 必须展开成 plot primitive、不得拥有 plot 底层无法表达的能力**（对齐 [v0 roadmap §定位](../roadmap.md) 对 `@retikz/chart` 的定位）。

两层都编译到**唯一的 `PlotSpec`**、共走 `expandPlot` lowering，不造平行 IR / 平行渲染。

## 前置：v0.1-alpha.10 薄 Plot

v0.1-alpha.10 已把 `<Plot>` 退化为薄容器，并把"默认轴 / 网格补齐"推断**抽成可复用纯函数**（不删除）。本 minor 的 `<Chart>` **直接复用**这份装饰函数，不重写——临时方案不沉没（AGENTS.md）。见 [v0.1-alpha.10 ADR-01](../v0.1/alpha.10/01-plot-thin-container.md)。

## 包结构决策（interim，2026-06-13 定）

chart 的框架无关核心逻辑（marks/config + theme → 装饰完整 `PlotSpec`）**先放进 `@retikz/plot`**（自包含模块，建议 `packages/plot/plot/src/chart/`，含从 v0.1 抽出的装饰函数），向 `@retikz/plot-react` / `@retikz/plot-vanilla` 提供能力；**暂不**新建 `@retikz/chart{,-react,-vanilla}` 三件套。

- **理由**：避免在 type+config preset 真正落地前建三个近空壳包（YAGNI）；复用 v0.1 抽出的装饰函数；plot 核心新增的是「PlotSpec 生产者」纯函数，不进 IR、不引入平行机制。chart 同时服务 react + vanilla，需框架无关共享核心，故放 plot（而非某个绑定包内）。
- **interim 标注（AGENTS.md 临时设计要求）**：显式临时方案。**毕业**为独立 `@retikz/chart` 三件套的触发条件（任一）：① 引入 `type` + 配置驱动 preset（非组合式）；② chart 逻辑体量 / 演进节奏明显独立于 plot 核心；③ chart 需独立版本线。模块按"PlotSpec 进、PlotSpec 出"自包含隔离，毕业是机械搬迁非重写。

## Milestones

| Milestone | 主题 | 模块 / 产出 | 状态 |
| --- | --- | --- | --- |
| [v0.2-alpha.1](./alpha.1/roadmap.md) | **chart 模块 + `<Chart>` 三包表面** | `@retikz/plot` 新增框架无关 chart 模块（marks/config+theme → 装饰完整 PlotSpec，复用 v0.1 装饰函数）；`@retikz/plot-react` `<Chart>` + `@retikz/plot-vanilla` chart builder；三包 + docs lockstep | 草拟中 |

> 后续 milestone（type+config preset、完整主题透出、chart 毕业评估等）攒够需求再排。chart 的 theme 能力依赖 v0.1-alpha.15 Theme（GoG 第 8 组件）——v0.2-alpha.1 先做组合式自动装饰 + 主题接缝，完整主题透出 gate 于 v0.1 Theme 就位。

## 依赖

- **plot v0.1**：薄 `<Plot>`（alpha.10）+ 抽出的装饰函数；grammar mark/scale/coordinate/guide lowering。chart 不新增 IR、不新增 lowering。
- **core**：无新增依赖（chart 不直接碰 core，经 plot 既有 lowering 下沉）。

## 与 v0.1 的关系

v0.1 = 图形语法完整（GoG 8 组件）+ 薄 Plot（alpha.10）。v0.2 = chart 上层。发布次序：v0.2 在 v0.1 之后；削薄已在 v0.1 内完成，故 v0.1→v0.2 **无破坏性变更**，v0.2 是纯增量（加 `<Chart>`）。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../_template.md`](../../_template.md)。

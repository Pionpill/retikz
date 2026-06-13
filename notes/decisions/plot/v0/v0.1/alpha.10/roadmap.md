# plot v0.1-alpha.10 实施待办：退化 `<Plot>` 为薄容器（移除默认轴 / 网格自动注入）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design §2 / §11`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.9`](../alpha.9/roadmap.md)
> ⚠️ 草案：本 milestone 由 2026-06-13「薄 Plot + chart 上层封装」设计讨论开出，待人工 review。

## 定位（绑定层 milestone，非 GoG 语法组件）

本 milestone **不属图形语法 8 组件**，是**绑定层行为修正**——把 `<Plot>` 退化成「薄容器」，回归 [v0.1 roadmap §拆分策略](../roadmap.md) 早写明的「**薄 `<Plot>` + 组合 DSL**」定位。

编号取 **alpha.10**（2026-06-13 决策插入），原语法里程碑 Geometry / Statistics / Facets / Theme 顺延 **alpha.11–15**（见 [v0.1 roadmap Milestones](../roadmap.md)）。各 Accepted ADR 中对这些语法 milestone 的按号引用同步 +1。

**与 v0.2 chart 的关系**：本轮只做 `<Plot>` 退化（移除自动装饰）；开箱即用的自动轴 / 图例 / 网格 + 主题由 **v0.2 的 `<Chart>`** 上层封装承担（见 [plot v0.2 roadmap](../../v0.2/roadmap.md)）。即：**v0.1 让 Plot 变薄，v0.2 在薄 Plot 之上加 Chart**。

为什么提前到 alpha.10 而非等语法收口：**削薄 `<Plot>` 是绑定层默认行为的修正**，越晚改、在厚 Plot 上沉淀的 demo / 用法越多、迁移面越大；在 alpha 线内做是 alpha 间 breaking（0.x 不留兼容，AGENTS.md），不产生跨 minor 破坏。

## 目标

1. **退化 `<Plot>` DSL 入口**：**移除** cartesian2D 默认 x/y 轴注入（`DEFAULT_GUIDES`）——用户不写 `<Axis>` 就没有轴 / 网格。
2. **保留 scale / coordinate 隐式推断**（mark 定位所需的不可见管道）；显式 `<Axis>` / `<Legend>` 照常收集、生效、留边距。
3. **现有依赖默认轴的 docs demo** 同改动集迁移：手动补 `<Axis>`（决策 2b）。
4. ⚠️ **alpha 间 BREAKING**：alpha.1/2/3 已上 npm（厚 Plot 自动轴），changelog 显式标注 + 迁移指引（0.x 不留兼容，AGENTS.md）。

## 现状（代码核验，2026-06-13）

- **自动装饰集中在 `buildPlotSpec`**（`react/src/components/buildPlotSpec.ts`）：`DEFAULT_GUIDES`（x 轴 + y 轴带网格）**仅 cartesian2D 且无显式 `<Axis>`** 时补（:404 / :114）；polar / 1D / ternary 本就要显式声明专门轴。scale / coordinate 推断同处（:280–401）。
- **已有 `bare` 开关**（`Plot.tsx:30`）：「什么都不出（无轴无网格、plot area = 整图），忽略任何 `<Axis>`」——证明"薄"接缝早已存在。`bare` 比目标"薄 Plot"更激进（连显式 `<Axis>` 与边距都不要）；薄 Plot = 不补**默认**轴，但尊重显式 `<Axis>` 并留边距。
- **`spec` 入口**（`<Plot spec={} data={}>`）：本就全显式薄路径，不经 buildPlotSpec，不受本轮影响。
- **`<Axis grid>`**：网格是 `<Axis>` 的 prop（`guides.tsx`），**维持**（决策 1a，不另立 `<Grid>`）。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
| --- | --- | --- | --- | --- |
| [01](./01-plot-thin-container.md) | **退化 `<Plot>` 为薄容器**：移除 cartesian2D 默认轴注入、保留 scale/coord 推断、`bare` 去留、显式 `<Axis>`/`<Legend>` 仍生效；breaking + demo 迁移 | yellow | — | 草拟中 |
| [02](./02-plot-composable.md) | **让 `<Plot>` 可被组合**：单 svg 多坐标信息图——PlotSpec 自描述尺寸 + plot lowering 暴露外部可见面板 anchor（bbox + plotArea，gated on id）；`<Plot>` 改可嵌入、直接作 core `<Layout>` 子组件（嵌入态不自渲染、lower 时处理）；**硬依赖 core-react 新机制「可嵌入 Tier2 in Layout」（另起 core 文档）**；组合 MVP 从 v0.5 前移 | red | 01 + core-react 机制 | 草拟中 |

> 两 ADR 同一主题线：**Plot 作为容器的角色**。01 把 `<Plot>` 降成薄绘图块（角色单一），02 顺势让薄块「可被嵌入与组合」进同一张 svg。02 是组合 MVP（plot-design §7 L1+L2），从原 roadmap v0.5 前移——L1（自描述尺寸 + 可嵌入）不依赖 facet，可独立先行；v0.5 收口 facet 内多坐标 + series/datum 锚 + 相对摆位。装饰逻辑去向（供 v0.2 chart 复用）见 ADR-01。

## 待决策（ADR-01 起草前定）

- **① `bare` 去留**：倾向**保留**——`bare` = 真全出血（无轴、无边距、plot area = 整图），语义不同于薄 Plot 默认态（不补默认轴但尊重显式 `<Axis>` + 留边距）。
- **② 装饰逻辑去向**：移除默认注入后，现有装饰推断（默认轴 / 网格补齐规则）是**就地删除**还是**抽成可复用纯函数留给 v0.2 chart 复用**？倾向**抽成自包含函数**（输入/输出 PlotSpec，框架无关），本轮 Plot 不再默认调用，v0.2 chart 直接消费——避免 v0.2 重写。落点与导出形态在 ADR-01 / v0.2 ADR 协调。
- **③ 薄 Plot 是否仍隐式推 color scale**：倾向**保留**（与 scale/coord 同属不可见管道，`<Legend>` 需绑定它）。

## core 依赖

- **ADR-01**：无。仅改 `@retikz/plot-react` 装配层行为，不碰 plot 核心 IR / lowering、不碰 core。
- **ADR-02**：**改 plot 核心 IR + lowering**（PlotSpec 加 width/height、`expand` per-node 尺寸 + 外部可见面板 anchor，gated on id）+ `<Plot>` 改可嵌入 + **硬依赖 core-react 新机制「可嵌入 Tier2 in Layout」**（buildIR/Layout 收纳 Tier2 子组件贡献 composites + datasets，通用、不写死 plot，另起 core 文档）。不新增 plot 容器组件、不改 core IR schema。组合用 core `<Layout>` + `<Plot>` 作其子组件。

## 执行模式

- **ADR-01**：yellow 级，单 ADR + docs 同步（无需红级多 LLM 评审，但 breaking 行为变更需 review 签字 + changelog）。
- **ADR-02**：**red 级**，进实现前需**外部 LLM 评审**（[v0.1 roadmap 排序原则](../roadmap.md)）+ review 签字；跨三包 lockstep + docs 同步。

> milestone 定位已从「单 ADR / 仅 react 装配层」扩为「Plot 作为容器角色」双 ADR：01（薄容器，react-only/yellow）+ 02（可被组合，跨包/red）。两者主题连续、可分别按级别推进。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。

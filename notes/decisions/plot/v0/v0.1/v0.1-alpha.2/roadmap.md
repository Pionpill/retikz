# plot v0.1-alpha.2 实施待办：guide（x/y 轴 + 网格）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design.md §3.9 guide / §4.3 管线 / §8 lowering`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.1`](../v0.1-alpha.1/roadmap.md)

## 目标

打通管线第 6 段 **guide**：由 scale + 坐标系**派生**坐标轴 / 刻度 / 网格（plot-design §3.9——guide 是与 mark 并列的一等输出），lower 进 core IR。产出从 alpha.1 的「无轴散点 / 折线」升级为「**带 x/y 坐标轴 + 网格的折线 / 散点图**」。仍限 **cartesian2D**（polar 留 alpha.4）。

随之引入两块 alpha.1 没有的能力：

- **scale & 刻度（d3-scale）**：采用 `d3-scale` 的 `scaleLinear`（ticks / tickFormat / nice），回溯 alpha.1 自写的 linear——plot 是 Tier 2、可依赖 d3（plot-design §13），不再自造轮子。
- **绘图区布局（margin convention）**：`width×height` 是**整图整体**尺寸；由外向内挤——量 label（估算）→ 减 axis 区 → 剩余才是 plot area；mark 自此投影到 plot area（缩进矩形），不再是整图。

不在 alpha.2：横向补 mark（bar）/ band·time·ordinal scale（alpha.3）、polar 坐标系与径向 / 角向 guide（alpha.4）、scope/anchor 接通与 datum locator（alpha.5）、legend / reference line（更后）、轴标题富排版。

## 执行模式

**单条串行**：每条 ADR 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后再开下一条。本 milestone 的 ADR 草案由 AI 一次性起草（用户离线委托），用户 review ack 后逐条进实现。

**三包 lockstep**（沿用 alpha.1）：每加一个 guide 能力，`@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` + 文档 demo 同步露出。

## 实现顺序（编号 ≠ 实现顺序，依赖叶子优先）

```
01 guide IR ─┐          02 d3-scale ──┐
             │                         │
             │   03 绘图区布局 ◄────────┘（估算 margin 需 label，来自 ticks；并改 mark 投影到 plot area）
             │            │
             └─ 04 guide lowering ◄─────┘（消费 guide IR + ticks + plot area → core Path/Node）
                          │
                05 三包 DSL 露出 ◄───────┘（<Axis> 子组件（含 grid prop）、默认自动出、bare）
```

- **01 / 02 互相独立**（schema vs 纯算法），可任意先后；
- **03 依赖 02**（估算 label 占位要先有 ticks）且**改 alpha.1 的 mark 投影**（range 从整图 → plot area）；
- **04 依赖 01 + 02 + 03**；
- **05 依赖 01 + 04**（DSL 装配 guide IR，端到端渲染验证）。
- 实现顺序：`01·02 → 03 → 04 → 05`。

> **测试 case 规则**：沿用 alpha.1 的放宽——按复杂度适量，覆盖真实有意义的 accept/reject 与几何断言，不硬凑「每 ADR ≥ 9」。

## 前置 setup

无新包（三包脚手架 alpha.1 已建）。scale（`lower/scale.ts` 用 d3-scale 重构）/ 布局是 `packages/plot/plot/src/lower/**` 下的模块，guide IR 是 `src/ir/**` 下的新 schema 文件。plot 包新增 `d3-scale` / `d3-array` 依赖（catalog 登记，见 [ADR-02](./02-d3-scale.md)）。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-guide-ir.md) | guide IR（Axis + grid 子属性，Guide union 可扩展，绑 coordinate scope，anchor 预留 `plot.xAxis`/`yAxis`） | red | 前置无 | Proposed |
| [02](./02-d3-scale.md) | 采用 d3-scale 作 scale/刻度/格式化基础（scaleLinear + ticks/tickFormat，回溯 alpha.1 自写 linear） | red | 前置无 | Proposed |
| [03](./03-plot-area-layout.md) | 绘图区布局（margin convention：整图 → 估算 label/axis 占位 → plot area；mark 改投影到 plot area；用户 margin 覆盖） | red | ADR-02 | Proposed |
| [04](./04-guide-lowering.md) | guide lowering（Axis（含 grid 子属性）+ ticks + plot area → core `Path` / `Node`(text)，绑 anchor id） | red | ADR-01~03 | Proposed |
| [05](./05-guide-bindings-dsl.md) | 三包 guide 露出（`<Axis>` 子组件（含 `grid` prop）、默认自动出、`bare` 开关；vanilla / docs 同步） | red | ADR-01、04 | Proposed |

> 全部 `Proposed`，等用户 review。review ack 后按实现顺序逐条走 flow-alpha。

## 贯穿原则落点

[plot v0.1 roadmap](../roadmap.md) 的贯穿原则在 alpha.2 的体现：

- **anchor / scope 预留**：guide lower 出的轴区给 `plot.xAxis` / `plot.yAxis` 埋 id（plot-design §14），延续 alpha.1「字段位就位、解析留 alpha.5」。注意：根 plot scope `localNamespace:true` 会把子 id 隔离在内部 frame——**alpha.2 仅内部埋点、不承诺外部可引用**，对外 semantic handle 的导出结构留 alpha.5（评审 P1.2）。
- **guide 绑 coordinate scope（为 facet 预留）**：guide 不做成全局单份语义；分面（多 coordinate scope）时各自带轴/网格，结构非破坏扩展。详见 [ADR-01](./01-guide-ir.md) 决策与待决策点。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。

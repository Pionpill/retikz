# plot v0.1 Roadmap

> 本文件汇总 plot v0.1 minor 的路线与 milestone 索引。具体执行记录放在各 milestone 的 `roadmap.md`，长期决策放在同目录的 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot-design.md §11 / §13.1`](../../../../architecture/plot-design.md)

## 定位

v0.1 是 `@retikz/plot` 的**基础纵向闭环**：对 ≥1 个 mark 跑通全 8 段管线（transform → encoding → scale → coordinate → mark → guide → scope → lowering），在 **cartesian + polar** 两套坐标系下都成立，端到端产出**带坐标轴与网格的折线图 / 柱状图**。

目标不是覆盖所有 chart type，而是验证 grammar 与 lowering 真正打通（详见 [plot-design §11.2 MVP](../../../../architecture/plot-design.md) 与 [§13.1](../../../../architecture/plot-design.md)）。

**贯穿原则**：v0.1 的 IR 与 lowering 从 **alpha.1 起**就预留两样东西，即便要到后面才露出——

- **semantic anchor / datum locator**（v0.3 交互命中要用）；
- **scope-aware IR**（v0.5 组合与 facet 要用）。

预留是零成本的字段埋点，放在 alpha.1 的 IR 设计里；alpha.5 负责接通可用与命中预演。事后补极痛。

## 拆分策略

**纵向薄片优先**：先打通最薄的端到端（单 mark · linear · cartesian · 最小 lowering），再逐层加宽。每个 milestone 都应产出可渲染的结果，对齐 [plot-design §13](../../../../architecture/plot-design.md) 主线「纵向闭环」。

**三包 lockstep 协同（改原计划）**：`@retikz/plot`（IR + lowering）/ `@retikz/plot-react`（`<Plot>` 组件 + 组合 DSL）/ `@retikz/plot-vanilla`（builder + SSR）**从 alpha.1 起一起迭代**——每加一个 plot 能力（mark / scale / coordinate…），同步在 react / vanilla 表面与文档 demo 露出。原计划把框架绑定整体推到 v0.3，现废除：否则文档站只能写 `<Layout ir={{...}} composites={lowerPlots(...)}/>` 这种低可读性示例，对用户极不友好。**注意区分**：authoring 绑定（构图 + 渲染）随 plot 同步；**交互能力**（tooltip / hover / 事件回调）仍留 v0.3——那依赖 core 水合，不只是 authoring 表面。

## Milestones

| Milestone | 主题 | 模块 / 产出 | 记录 |
|---|---|---|---|
| v0.1-alpha.1 | IR 骨架 + 最薄纵向闭环 | 新建包 `packages/plot/plot` 脚手架；`ir` / `schema` 最小骨架（**已预留 anchor / scope-aware 字段**）；单 mark（line 或 point）；`linear` scale；`cartesian` coordinate；最小 `lowering` → core IR。产出：无轴的散点 / 折线，验证管线 + lowering 打通 | `v0.1-alpha.1/` |
| v0.1-alpha.2 | guide：x/y 轴 + grid | `guide` 模块；scale → 坐标轴 / 刻度 / 网格派生；axis / grid 的 lowering | `v0.1-alpha.2/` |
| v0.1-alpha.3 | 横向补 mark + band scale | `scale` 补 band / time / ordinal·color；`mark` 补 point / interval(bar)；`relation` order / group / stack；`transform` 最小集（sort / groupBy / stack） | `v0.1-alpha.3/` |
| v0.1-alpha.4 | polar 坐标系 + 径向 / 角向 guide | `coordinate` 抽象通用化（逼出非笛卡尔、避免写死）；polar2D 投影几何；radial / angular axis；**拍板 mark 几何 × coordinate 的实现路线**（通用投影 vs 逐坐标系分支，见 [plot-design §8.3](../../../../architecture/plot-design.md)） | `v0.1-alpha.4/` |
| v0.1-alpha.5 | scope-aware 落地 + anchor 预演 + 收尾 | 接通 alpha.1 预留的 anchor / scope，加 datum locator 命中预演；端到端验收折线 / 柱状（cartesian + polar 双系） | `v0.1-alpha.5/` |

> beta / rc 收尾节点（类型 / 注释 / 测试收口、文档站、发布候选）待 alpha 收敛后参照 core v0.1 节奏再排，本表暂不预定。

## 依赖 core

- core IR / Scene / `compileToScene`；
- Tier 2 composite 接入与 `lowerComposites` 管线（core v0.3 起的 Tier 2 支撑，现已就绪）——plot 作为 Tier 2 内容 lower 进可引用的 `Scope`；
- 渲染走现有 `@retikz/react` / `@retikz/vanilla`（消费 core IR）；**plot v0.1 起即出 authoring 绑定** `@retikz/plot-react` / `@retikz/plot-vanilla`（薄 `<Plot>` + 组合 DSL + SSR），与 plot 本体 lockstep（见「拆分策略」）。交互绑定留 v0.3。

plot 只消费 core 能力、不反向依赖，也不改 core 内部。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态或 supersede 信息，不改历史决策内容。模板见 [`../../_template.md`](../../_template.md)。

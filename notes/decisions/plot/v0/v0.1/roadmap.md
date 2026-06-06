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
| v0.1-alpha.4 | polar 坐标系 + 径向 / 角向 guide | `coordinate` 抽象通用化（逼出非笛卡尔、避免写死）；polar2D 投影几何；radial / angular axis；**mark 几何 × coordinate 走 (i) 投影整形**（已定，见 [plot-design §8.3](../../../../architecture/plot-design.md)）——区间 mark（bar）经 coordinate 映射成 core 参数化可连接 Node（`sector` / `rectangle`，core v0.3-alpha.4 已就绪），连续 mark（line / area）投影成 Path | `v0.1-alpha.4/` |
| v0.1-alpha.5 | scope-aware 落地 + anchor 预演 + 收尾 | 接通 alpha.1 预留的 anchor / scope，加 datum locator 命中预演；端到端验收折线 / 柱状（cartesian + polar 双系） | `v0.1-alpha.5/` |

> beta / rc 收尾节点（类型 / 注释 / 测试收口、文档站、发布候选）待 alpha 收敛后参照 core v0.1 节奏再排，本表暂不预定。

## 后续打磨 backlog（alpha.5 后排期）

> **边界**：alpha.1~alpha.5 只打通**纵向闭环的基础能力**（8 段管线 × cartesian / polar，端到端出图），**不追求细节完备**。下列**横向打磨**项一律**推迟到 alpha.5 结束后再统一排期**（按用户价值排序，可成后续 alpha 或新 minor），不塞进 alpha.1~5、不重开已完成里程碑。
> 本段是**活清单**：新提的打磨需求往这里加；各 alpha ADR「不在本 ADR 范围」段的推迟项亦归此处一并待排。

- **样式通道（补进 `StyleEncodingSchema`）**：encoding 已拆出 `PositionEncodingSchema`（x/y，必填）+ `StyleEncodingSchema`（当前仅 color）；后续在 `StyleEncodingSchema` 补 **透明度（fill / stroke opacity）/ size / shape** 等非位置通道，mark 据此着色 / 缩放 / 改形
- **mark 视觉细节**：描边细节；数据标签（datum label）/ text mark
- **sector 间隔**（见 alpha.4 [ADR-02](./v0.1-alpha.4/02-sector-geometry.md) 讨论）：`padAngle`(+ `padRadius`) 角向间隔——放 sector / interval mark 层（rose 复用 band `paddingInner`），含小扇形 clamp；per-datum explode / pull 单片高亮（用户「内部小圆位移圆心」想法的归宿）
- **单系列 line / area 的 color field 静默丢弃**（cross-review P2）：`expand.ts` 的 `resolveColor` 支持字段编码，但 `lowerLine` / `lowerArea` 单系列路径只读常量 `encoding.color.value`，`color={field}` 无 series 时被静默忽略、回退 `currentColor`，而 React props / 文档把 `color` 写成「颜色字段」。排期时定向：① 文档明确 color field 仅在 series 拆分时生效；② color field 隐式触发 series 分组（GoG 语义）；③ 单系列取首行颜色。与 legend / 样式通道相关，建议合并排。落点 `src/lower/mark.ts`（单系列 stroke / fill 解析）+ `expand.ts` resolveColor
- **cartesian 不校验 guide dimension**（cross-review P2）：`<Axis dimension="angle" />` / `"radius"` 在 cartesian 下不被拒绝——`lowerCartesianGuide` 凡非 `x` 一律当 y 轴，无独立 y 轴时渲出一条空刻度杂散轴线。应在 expand 阶段按 coordinate 校验 guide dimension（cartesian 只许 x/y），抛清晰错误。落点 `src/lower/expand.ts`（`assertUniqueAxisDimension` 附近）/ `guide.ts`
- **更多坐标系**：当前仅 `cartesian2D` / `polar2D`。后续按需补全坐标系族——cartesian / polar 的 **1D**（`linear1D` rug / timeline、角向 1D 等）与其余 **2D** 变体、**ternary（三元图，2D 约束投影）**；判别串延续含维度命名（`cartesian1D` / `ternary2D` …）。**3D 坐标系（`cartesian3D` / `polar3D` 等）须先等 core 支持三维坐标**——plot 只消费 core 能力、不自造几何（见 AGENTS.md「子组遇 core 能力不足先补 core」），故 3D 坐标系 gating 于 core 三维坐标就绪，core 没有之前不在 plot 里做。
- *（后续追加……）*

## 依赖 core

- core IR / Scene / `compileToScene`；
- Tier 2 composite 接入与 `lowerComposites` 管线（core v0.3 起的 Tier 2 支撑，现已就绪）——plot 作为 Tier 2 内容 lower 进可引用的 `Scope`；
- 渲染走现有 `@retikz/react` / `@retikz/vanilla`（消费 core IR）；**plot v0.1 起即出 authoring 绑定** `@retikz/plot-react` / `@retikz/plot-vanilla`（薄 `<Plot>` + 组合 DSL + SSR），与 plot 本体 lockstep（见「拆分策略」）。交互绑定留 v0.3。

plot 只消费 core 能力、不反向依赖，也不改 core 内部。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态或 supersede 信息，不改历史决策内容。模板见 [`../../_template.md`](../../_template.md)。

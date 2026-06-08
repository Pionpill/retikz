# plot v0.1 Roadmap

> 本文件汇总 plot v0.1 minor 的路线与 milestone 索引。具体执行记录放在各 milestone 的 `roadmap.md`，长期决策放在同目录的 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot-design.md §11 / §13.1`](../../../../architecture/plot-design.md)

## 定位

**v0.1 承载 `@retikz/plot` 的整套图形语法**（GoG 8 组件：Data / Aesthetics / Geometry / Statistics / Scales / Coordinates / Facets / Theme，除交互 / 动画）。它经两个阶段、**都在 v0.1 的 alpha 线**完成（版本结构真源见 [v0 roadmap](../roadmap.md)）：

- **阶段一 · 基础架构搭建（alpha.1–5，✅ 已完成）**：对 ≥1 个 mark 跑通全 8 段管线（transform → encoding → scale → coordinate → mark → guide → scope → lowering），cartesian + polar 双系成立，端到端出带轴网格的折线 / 柱状图；并搭起 6 个组件的**最小骨架** + anchor·scope 预留。验证 grammar 与 lowering 真正打通，不求语法完备。
- **阶段二 · 完善图形语法（alpha.6–14）**：补全全部 8 组件——含全新 **Facets / Theme**。详见下方 Milestones。

**阶段一贯穿原则（已兑现）**：v0.1 的 IR 与 lowering 从 **alpha.1 起**预留两样东西——**semantic anchor / datum locator**（v0.1 之后交互命中要用）与 **scope-aware IR**（Facets / 组合要用）；预留零成本、alpha.5 已接通可用，事后补极痛。

## 拆分策略

**纵向薄片优先**：先打通最薄的端到端（单 mark · linear · cartesian · 最小 lowering），再逐层加宽。每个 milestone 都应产出可渲染的结果，对齐 [plot-design §13](../../../../architecture/plot-design.md) 主线「纵向闭环」。

**三包 lockstep 协同（改原计划）**：`@retikz/plot`（IR + lowering）/ `@retikz/plot-react`（`<Plot>` 组件 + 组合 DSL）/ `@retikz/plot-vanilla`（builder + SSR）**从 alpha.1 起一起迭代**——每加一个 plot 能力（mark / scale / coordinate…），同步在 react / vanilla 表面与文档 demo 露出。原计划把框架绑定整体推到 v0.3，现废除：否则文档站只能写 `<Layout ir={{...}} composites={lowerPlots(...)}/>` 这种低可读性示例，对用户极不友好。**注意区分**：authoring 绑定（构图 + 渲染）随 plot 同步；**交互能力**（tooltip / hover / 事件回调）仍留 v0.3——那依赖 core 水合，不只是 authoring 表面。

## Milestones

### 阶段一 · 基础架构搭建（alpha.1–5，✅ 已完成）

| Milestone | 主题 | 模块 / 产出 | 记录 |
|---|---|---|---|
| v0.1-alpha.1 | IR 骨架 + 最薄纵向闭环 | 新建包 `packages/plot/plot` 脚手架；`ir` / `schema` 最小骨架（**已预留 anchor / scope-aware 字段**）；单 mark（line 或 point）；`linear` scale；`cartesian` coordinate；最小 `lowering` → core IR。产出：无轴的散点 / 折线，验证管线 + lowering 打通 | `v0.1-alpha.1/` |
| v0.1-alpha.2 | guide：x/y 轴 + grid | `guide` 模块；scale → 坐标轴 / 刻度 / 网格派生；axis / grid 的 lowering | `v0.1-alpha.2/` |
| v0.1-alpha.3 | 横向补 mark + band scale | `scale` 补 band / time / ordinal·color；`mark` 补 point / interval(bar)；`relation` order / group / stack；`transform` 最小集（sort / groupBy / stack） | `v0.1-alpha.3/` |
| v0.1-alpha.4 | polar 坐标系 + 径向 / 角向 guide | `coordinate` 抽象通用化（逼出非笛卡尔、避免写死）；polar2D 投影几何；radial / angular axis；**mark 几何 × coordinate 走 (i) 投影整形**（已定，见 [plot-design §8.3](../../../../architecture/plot-design.md)）——区间 mark（bar）经 coordinate 映射成 core 参数化可连接 Node（`sector` / `rectangle`，core v0.3-alpha.4 已就绪），连续 mark（line / area）投影成 Path | `v0.1-alpha.4/` |
| v0.1-alpha.5 | scope-aware 落地 + anchor 预演 + 收尾 | 接通 alpha.1 预留的 anchor / scope，加 datum locator 命中预演；端到端验收折线 / 柱状（cartesian + polar 双系） | `v0.1-alpha.5/` |

### 阶段二 · 完善图形语法（alpha.6–14，GoG 8 组件补全）

> 排序原则：上游先于下游、结构性先于增量、地基先于铺面（Data → Aesthetics+Scales → Coordinates / Geometry → Statistics → Facets → Theme）。每 alpha 一个可渲染薄片，延续「纵向薄片 + 三包 lockstep」。**越远越是草案**，临近开发先起 ADR 草案、外部 LLM 评审，再进实现（同 alpha.1–5 流程）。

| Milestone | 组件 / 主题 | 模块 / 产出 | 记录 |
|---|---|---|---|
| v0.1-alpha.6 | **Data 数据模型 + Scales 选型** | `data.model` 字段语义类型层（quantitative / temporal / nominal / ordinal / interval / proportion）+ encoding 字段引用校验 + 无 model 时缺省推断；**type-driven scale 默认选型**（类型→scaleType）+ type-driven guide 格式化（时间轴 / ordinal tick）。**结构性地基**，撑住后续 scale / 通道 / guide | 待建 |
| v0.1-alpha.7 | **Aesthetics 上 + Scales 家族** | 通道×scale 通用抽象（推广出 position）；**size** 通道 + size scale；**color 从分组转真 scale 通道** + **series 一等化**（了结 color→series 重构债、修单系列 color field 静默丢弃）；scale 家族 log / pow / sqrt | 待建 |
| v0.1-alpha.8 | **Aesthetics 下 + Legend** | **opacity** 通道 + **shape** 通道（shape scale → glyph）；quantize / threshold scale；**color gradient**（sequential / diverging）；**legend** guide（由非位置 scale 派生 + 布局） | 待建 |
| v0.1-alpha.9 | **Coordinates 坐标系统** | **linear1D**（单轴；rug / timeline / histogram 底座）+ **ternary2D**（a+b+c=1 投影，消费 alpha.6 proportion）；1D 轴 / 三角轴 guide；cartesian guide dimension 校验（拒非法维度）。**地图坐标不进 plot**（§2 独立 domain）；**3D gating 于 core 三维坐标** | 待建 |
| v0.1-alpha.10 | **Geometry 基础** | mark 补 **rect**（heatmap 格）+ **rule**（参考 / 阈值线）+ **text**（datum label）+ **ribbon**（sankey / alluvial 流量、跨 scope connector） | 待建 |
| v0.1-alpha.11 | **Statistics 基础** | `transform` 补 **bin / histogram** + **aggregate**（sum / mean / count / min / max）+ **normalize**（百分比堆叠）+ **derive interval**（字段算 start/end）+ **jitter** | 待建 |
| v0.1-alpha.12 | **Statistics 进阶 + stat-geom** | **density**（KDE）+ **smooth / 回归** + **quartile**；配对几何 **boxplot / density-area**（geom×stat 成对落地）；sector **padAngle / explode·pull**（backlog 收口） | 待建 |
| v0.1-alpha.13 | **Facets 分面** | 按字段拆多 coordinate scope（小多图）；scale 共享 / 独立；统一轴 / 网格 / 间距；**复用 core `Scope`**（不自建容器，见 [plot-design §7](../../../../architecture/plot-design.md)） | 待建 |
| v0.1-alpha.14 | **Theme 主题样式** | 标题 / 字体 / 背景 / 网格线 / 图例外观；调色板（categorical / sequential / diverging）；默认样式 token；series / sector 配色。`theme` 模块（[plot-design §11.1](../../../../architecture/plot-design.md)） | 待建 |

> 阶段二依赖链：alpha.9 ternary ← alpha.6 proportion；alpha.8 legend ← alpha.7–8 非位置 scale；alpha.12 boxplot ← alpha.11/12 stat。
> beta / rc 收尾（类型 / 注释 / 测试收口、文档站、发布候选）待 alpha.14 收敛后参照 core 节奏再排。v0.1 共 14 alpha，是大 minor；若需中途预览发布（如 alpha.8「核心语法预览」）可另切。

## 后续打磨 backlog（alpha.5 后排期）

> **边界**：阶段一 alpha.1~5 只打通**纵向闭环的基础能力**（8 段管线 × cartesian / polar，端到端出图），**不追求细节完备**。
> **已吸收进阶段二**：本清单里的语法缺口已归位到上方 **alpha.6–14**（Milestones 阶段二表）——下表保留细节作为各 alpha 的输入，归属见行末标注。
> 本段仍是**活清单**：新提的打磨需求往这里加，再归入对应 alpha。

- **数据模型（字段语义类型层）** — *【alpha.6】*：`data.model`（§3.2 dimension typing：quantitative / temporal / nominal / ordinal / interval / proportion）一等化，驱动 type-driven scale 默认选型 + guide 格式化；显式声明 + 缺省推断两条路。**阶段二地基**，撑住 scale / 通道 / guide
- **样式通道（补进 `StyleEncodingSchema`）** — *【alpha.7–8】*：encoding 已拆出 `PositionEncodingSchema`（x/y，必填）+ `StyleEncodingSchema`（当前仅 color）；后续在 `StyleEncodingSchema` 补 **size（alpha.7）/ 透明度（fill / stroke opacity）/ shape（alpha.8）** 等非位置通道，mark 据此着色 / 缩放 / 改形
- **单系列 line / area 的 color field 静默丢弃**（cross-review P2）— *【alpha.7，随 series 一等化】*：`expand.ts` 的 `resolveColor` 支持字段编码，但 `lowerLine` / `lowerArea` 单系列路径只读常量 `encoding.color.value`，`color={field}` 无 series 时被静默忽略、回退 `currentColor`，而 React props / 文档把 `color` 写成「颜色字段」。排期时定向：① 文档明确 color field 仅在 series 拆分时生效；② color field 隐式触发 series 分组（GoG 语义）；③ 单系列取首行颜色。与 legend / 样式通道相关，建议合并排。落点 `src/lower/mark.ts`（单系列 stroke / fill 解析）+ `expand.ts` resolveColor
- **更多坐标系** — *【alpha.9；ternary 依赖 alpha.6 proportion；3D gating 于 core】*：当前仅 `cartesian2D` / `polar2D`。后续补全坐标系族——cartesian / polar 的 **1D**（`linear1D` rug / timeline、角向 1D 等）与其余 **2D** 变体、**ternary（三元图，2D 约束投影）**；判别串延续含维度命名（`cartesian1D` / `ternary2D` …）。**地图坐标不进 plot**（§2 独立 domain）。**3D 坐标系（`cartesian3D` / `polar3D` 等）须先等 core 支持三维坐标**——plot 只消费 core 能力、不自造几何（见 AGENTS.md「子组遇 core 能力不足先补 core」），故 3D 坐标系 gating 于 core 三维坐标就绪，core 没有之前不在 plot 里做。
- **cartesian 不校验 guide dimension**（cross-review P2）— *【alpha.9，随坐标系族 guide 校验】*：`<Axis dimension="angle" />` / `"radius"` 在 cartesian 下不被拒绝——`lowerCartesianGuide` 凡非 `x` 一律当 y 轴，无独立 y 轴时渲出一条空刻度杂散轴线。应在 expand 阶段按 coordinate 校验 guide dimension（cartesian 只许 x/y），抛清晰错误。落点 `src/lower/expand.ts`（`assertUniqueAxisDimension` 附近）/ `guide.ts`
- **mark 视觉细节** — *【alpha.7–8 描边 / alpha.10 text mark·datum label】*：描边细节；数据标签（datum label）/ text mark
- **sector 间隔**（见 alpha.4 [ADR-02](./v0.1-alpha.4/02-sector-geometry.md) 讨论）— *【alpha.12】*：`padAngle`(+ `padRadius`) 角向间隔——放 sector / interval mark 层（rose 复用 band `paddingInner`），含小扇形 clamp；per-datum explode / pull 单片高亮（用户「内部小圆位移圆心」想法的归宿）
- **时间判断的可配边界（决策已定，2026-06-07）** — *【部分落地：[alpha.6 ADR-09](./v0.1-alpha.6/09-iso-recognizer.md)】*：temporal「是不是时间」分两层——**解析**（已知是时间怎么转）已可配：声明式 `format`（进 IR，[alpha.6 ADR-06](./v0.1-alpha.6/06-declarative-format.md)）+ `resolveField`（运行时逃生舱，[ADR-04](./v0.1-alpha.6/04-field-resolver.md)）；**推断**（没声明时从数据猜）保持严格、只认无歧义 ISO（ADR-09 已补认空格分隔带时区 SQL 时间戳）。**不做"全局推断配置开关"**——只能是运行时选项、破坏 spec 自描述，且想自动认的格式（slashDate / epoch）恰是歧义格式（D/M/Y 坑）；按字段定制走 `resolveField`，歧义格式永远走声明
- **数据加载器（CSV / URL / JSON）定位** — *【v0.1 之后·便利轴，不进 plot 核心】*：取数 / 解析是 I/O，与图形语法正交，**不进 `@retikz/plot` 核心 lowering**——会让 lowering 变异步（破坏 SSR / locator parity / 确定性）并撞「数据不进 IR」边界。归宿是**适配层语法糖**（`@retikz/plot-react` 的 `useRemoteData` hook 等）**或独立小包**（`@retikz/plot-data`），排在图形语法完整之后。当前官方模式已是「app 层取数 → `.data.ts` hook 消费 → `<Plot data>` 收行」（见 docs-doc-principle）
- *（后续追加……）*

## 依赖 core

- core IR / Scene / `compileToScene`；
- Tier 2 composite 接入与 `lowerComposites` 管线（core v0.3 起的 Tier 2 支撑，现已就绪）——plot 作为 Tier 2 内容 lower 进可引用的 `Scope`；
- 渲染走现有 `@retikz/react` / `@retikz/vanilla`（消费 core IR）；**plot v0.1 起即出 authoring 绑定** `@retikz/plot-react` / `@retikz/plot-vanilla`（薄 `<Plot>` + 组合 DSL + SSR），与 plot 本体 lockstep（见「拆分策略」）。交互绑定留 v0.3。

plot 只消费 core 能力、不反向依赖，也不改 core 内部。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态或 supersede 信息，不改历史决策内容。模板见 [`../../_template.md`](../../_template.md)。

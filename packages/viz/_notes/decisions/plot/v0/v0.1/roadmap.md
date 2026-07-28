# plot v0.1 Roadmap

> 状态：Done
> 本文件汇总 plot v0.1 minor 的路线与 milestone 索引。具体执行记录放在各 milestone 的 `roadmap.md`，长期决策放在同目录的 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot-design.md §11 / §13.1`](../../../../architecture/plot-design.md)

## 定位

**v0.1 承载 `@retikz/plot` 的整套图形语法**（GoG 8 组件：Data / Aesthetics / Geometry / Statistics / Scales / Coordinates / Facets / Theme，除交互 / 动画；retikz 把 Facets 扩展为更通用的 Coordinate composition 坐标复合能力）。它经两个阶段、**都在 v0.1 的 alpha 线**完成；beta 阶段只做最小 `@retikz/data` 抽层与稳定化（版本结构真源见 [v0 roadmap](../roadmap.md)）：

- **阶段一 · 基础架构搭建（alpha.1–5，✅ 已完成）**：对 ≥1 个 mark 跑通全 8 段管线（transform → encoding → scale → coordinate → mark → guide → scope → lowering），cartesian + polar 双系成立，端到端出带轴网格的折线 / 柱状图；并搭起 6 个组件的**最小骨架** + anchor·scope 预留。验证 grammar 与 lowering 真正打通，不求语法完备。
- **阶段二 · 完善图形语法（alpha.6–9 / 11–15）**：补全全部 8 组件——含全新 **Coordinate composition / Theme**。详见下方 Milestones。（**alpha.10 为 2026-06-13 插入的绑定层 milestone**、非 GoG 组件，故语法 milestone 顺延 11–15。）

**阶段一贯穿原则（已兑现）**：v0.1 的 IR 与 lowering 从 **alpha.1 起**预留两样东西——**semantic anchor / datum locator**（v0.1 之后交互命中要用）与 **scope-aware IR**（Coordinate composition / 组合要用）；预留零成本、alpha.5 已接通可用，事后补极痛。

## 拆分策略

**纵向薄片优先**：先打通最薄的端到端（单 mark · linear · cartesian · 最小 lowering），再逐层加宽。每个 milestone 都应产出可渲染的结果，对齐 [plot-design §13](../../../../architecture/plot-design.md) 主线「纵向闭环」。

**三包 lockstep 协同（改原计划）**：`@retikz/plot`（IR + lowering）/ `@retikz/plot-react`（`<Plot>` 组件 + 组合 DSL）/ `@retikz/plot-vanilla`（plain authoring + Tier2 + SSR）**从 alpha.1 起一起迭代**——每加一个 plot 能力（mark / scale / coordinate…），同步在 react / vanilla 表面与文档 demo 露出。原计划把框架绑定整体推到 v0.3，现废除：否则文档站只能写 `<Layout ir={{...}} composites={lowerPlots(...)}/>` 这种低可读性示例，对用户极不友好。**注意区分**：authoring 绑定（构图 + 渲染）随 plot 同步；**交互能力**（tooltip / hover / 事件回调）留到 v0.2——那依赖 core runtime / 水合，不只是 authoring 表面。

## Beta 与 RC 收尾

- **beta.1**：抽出 `@retikz/data`，Plot 改为消费共享数据 schema、contract、provider 与 pipeline。
- **beta.2**：补齐 runtime-only Plot lineage；以 `createPlotSpec()` / `normalizePlotBindings()` 统一 React 与 Vanilla authoring；Vanilla 迁移为 `plot()`、`embedPlot()`、`createPlotAdapter()` 与独立 `renderPlot()` runtime。
- **RC**：冻结 Plot IR、Definition / registry、authoring、lowering、lineage、locator 与三包 adapter 公共面。增量更新、依赖失效、按需物化和 renderer diff 进入 v0.2。

## Milestones

### 阶段一 · 基础架构搭建（alpha.1–5，✅ 已完成）

| Milestone    | 主题                                  | 模块 / 产出                                                                                                                                                                                                                                                                                                                                                          | 记录       |
| ------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| v0.1-alpha.1 | IR 骨架 + 最薄纵向闭环                | 新建包 `packages/viz/plot` 脚手架；`ir` / `schema` 最小骨架（**已预留 anchor / scope-aware 字段**）；单 mark（line 或 point）；`linear` scale；`cartesian` coordinate；最小 `lowering` → core IR。产出：无轴的散点 / 折线，验证管线 + lowering 打通                                                                                                                  | `alpha.1/` |
| v0.1-alpha.2 | guide：x/y 轴 + grid                  | `guide` 模块；scale → 坐标轴 / 刻度 / 网格派生；axis / grid 的 lowering                                                                                                                                                                                                                                                                                              | `alpha.2/` |
| v0.1-alpha.3 | 横向补 mark + band scale              | `scale` 补 band / time / ordinal·color；`mark` 补 point / interval(bar)；`relation` order / group / stack；`transform` 最小集（sort / groupBy / stack）                                                                                                                                                                                                              | `alpha.3/` |
| v0.1-alpha.4 | polar 坐标系 + 径向 / 角向 guide      | `coordinate` 抽象通用化（逼出非笛卡尔、避免写死）；polar2D 投影几何；radial / angular axis；**mark 几何 × coordinate 走 (i) 投影整形**（已定，见 [plot-design §8.3](../../../../architecture/plot-design.md)）——区间 mark（bar）经 coordinate 映射成 core 参数化可连接 Node（`sector` / `rectangle`，core v0.3-alpha.4 已就绪），连续 mark（line / area）投影成 Path | `alpha.4/` |
| v0.1-alpha.5 | scope-aware 落地 + anchor 预演 + 收尾 | 接通 alpha.1 预留的 anchor / scope，加 datum locator 命中预演；端到端验收折线 / 柱状（cartesian + polar 双系）                                                                                                                                                                                                                                                       | `alpha.5/` |

### 阶段二 · 完善图形语法（alpha.6–9 / 11–15，GoG 8 组件补全；alpha.10 为插入的绑定层 milestone、非 GoG 组件）

> 排序原则：上游先于下游、结构性先于增量、地基先于铺面（Data → Aesthetics+Scales → Coordinates / Geometry → Statistics → Coordinate composition → Theme）。每 alpha 一个可渲染薄片，延续「纵向薄片 + 三包 lockstep」。**越远越是草案**，临近开发先起 ADR 草案、外部 LLM 评审，再进实现（同 alpha.1–5 流程）。

| Milestone     | 组件 / 主题                                               | 模块 / 产出                                                                                                                                                                                                                                                                                                                                                                           | 记录                                                                                        |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| v0.1-alpha.6  | **Data 数据模型 + Scales 选型**                           | `data.model` 字段语义类型层（continuous / categorical / temporal）+ encoding 字段引用校验 + 无 model 时缺省推断；**type-driven scale 默认选型**（类型→scaleType）+ type-driven guide 格式化（时间轴 / 分类 tick）。**结构性地基**，撑住后续 scale / 通道 / guide                                                                                                                      | [`alpha.6/`](./alpha.6/roadmap.md)                                                          |
| v0.1-alpha.7  | **Aesthetics 全部通道 + 连续 Scales 家族**                | 通道×scale 通用抽象（推广出 position）；**size / opacity / shape** 非位置通道（仅 PointMark）；**color 从分组转真 scale 通道** + **series 一等化**（了结 color→series 重构债、修单系列 color field 静默丢弃）；scale 家族 log / pow / sqrt（仅 point/line）。〔2026-06-08 把原 alpha.8 的 opacity/shape 前移并入〕                                                                    | [`alpha.7/`](./alpha.7/roadmap.md)（5 ADR 全部实现 + Accepted）                             |
| v0.1-alpha.8  | **高级 Scales + Legend**                                  | **color gradient**（sequential / diverging）+ quantize / threshold / quantile 离散化 scale；**legend** guide（由非位置 scale 派生 + 布局）。〔opacity/shape 已前移 alpha.7〕                                                                                                                                                                                                          | [`alpha.8/`](./alpha.8/roadmap.md)（3 ADR 全部实现 + Accepted）                             |
| v0.1-alpha.9  | **Coordinates 坐标系统**                                  | **一维坐标系族**（**cartesian1D** 直线：rug / timeline / histogram 底座；**polar1D** 圆周：环形 / 周期数据，复用 alpha.4 角向投影）+ **ternary2D**（a+b+c=1 重心投影，取 continuous 字段自归一化；proportion 已并入 continuous）；1D / 角向 1D / 三角轴 guide；guide dimension 按坐标系校验（拒非法维度）。**地图坐标不进 plot**（§2 独立 domain）；**3D gating 于 core 三维坐标**    | [`alpha.9/`](./alpha.9/roadmap.md)（4 ADR 全部实现 + Accepted；ternary2D 后于 beta.2 移除） |
| v0.1-alpha.10 | **绑定层：退化 Plot 为薄容器**（非 GoG，2026-06-13 插入） | `<Plot>` 退化：移除 cartesian2D 默认轴注入、保留 scale/coordinate 推断、装饰抽成可复用纯函数（后续 chart v0.1 消费）；显式 `<Axis>`/`<Legend>` 仍生效；⚠️ alpha 间 breaking + demo 迁移                                                                                                                                                                                               | [`alpha.10/`](./alpha.10/roadmap.md)                                                        |
| v0.1-alpha.11 | **Geometry 基础**                                         | mark 补 **rect**（heatmap 格）+ **rule**（参考 / 阈值线）+ **text**（datum label）+ **ribbon**（sankey / alluvial 流量、跨 scope connector）。并落地**区间类几何的坐标系无关下沉**（interval / rect / sector 共用，含曲线 / 自定义坐标系）——契约与决策见表后「区间几何下沉」备注。**依赖 core 补 `contour` shape**（core 已实现 contour shape）。契约与决策见表后「区间几何下沉」备注 | [`alpha.11/`](./alpha.11/roadmap.md)（5 ADR 全部实现 + Accepted）                           |
| v0.1-alpha.12 | **Statistics 基础**                                       | `transform` 补 **bin / histogram** + **aggregate**（sum / mean / count / min / max）+ **normalize**（百分比堆叠）+ **derive interval**（字段算 start/end）+ **jitter**                                                                                                                                                                                                                | [`alpha.12/`](./alpha.12/roadmap.md)（2 ADR 全部实现 + Accepted）                           |
| v0.1-alpha.13 | **Statistics 进阶 + stat-geom**                           | **density**（KDE）+ **smooth / 回归** + **quantile-band**；配对几何 **boxplot / density-area**（geom×stat 成对落地）；RelationMark **ribbon**、mark label 宿主与 sector **pull** 收口                                                                                                                                                                                                 | [`alpha.13/`](./alpha.13/roadmap.md)（7 ADR 全部实现 + Accepted）                           |
| v0.1-alpha.14 | **Coordinate composition 坐标复合**                       | plot 内多个 coordinate scope 的统一地基：facet 小多图；同 panel 多 y 轴 / 多位置 scale 叠加；共享坐标骨架的 tracks / rings / lanes（如共享圆心/角度但半径分轨，或共享 x 但 y-range 分带）；mark 可选择自己的 coordinate / scale / track；**复用 core `Scope`**（不自建跨域容器，见 [plot-design §7](../../../../architecture/plot-design.md)）                                        | [`alpha.14/`](./alpha.14/roadmap.md)（9 ADR 全部实现 + Accepted，2026-07-03 收口）          |
| v0.1-alpha.15 | **Guide + Theme 主题样式**                                | axis 值域弹性与 tick 策略；轴线 / 刻度 / label / grid / legend 外观；调色板（categorical / sequential / diverging）；默认样式 token；series / sector 配色；plot labels 与 layer zIndex。Interaction 顺延到 v0.2 能力线。`theme` 模块（[plot-design §11.1](../../../../architecture/plot-design.md)）                                                                                  | [`alpha.15/`](./alpha.15/roadmap.md)（12 ADR 全部 Accepted）                                |

> 阶段二依赖链：alpha.9 ternary ← alpha.6 proportion；alpha.8 legend ← alpha.7 非位置 scale（size/opacity/shape/color 全在 alpha.7 就位）+ alpha.8 gradient；alpha.13 boxplot ← alpha.12/13 stat；**alpha.11 任意坐标系区间几何 ← core `contour` shape（ADR `ADR-core-contour-shape.md`，已送 core 分支，gate 于 core 落地）**。其中 ternary2D 的实现历史保留在 alpha.9，当前内置能力已于 beta.2 移除。

> **区间几何下沉（alpha.11 决策，2026-06-16）**：区间类 mark（interval / rect / sector）的几何 = 把数据空间正交 cell `[u0,u1]×[v0,v1]` 经坐标系投影成边界。**分级在输出、统一在机制**：
>
> - **保留 cartesian2D 矩形 + polar2D 扇形作「闭式快路」**，不是因为历史惯性，而是它们对各自坐标系**严格更优**——sector 是精确弧（contour 走 points-only 会退成 faceted 折线 + IR 膨胀 + 丢精确弧）、rectangle 有精确 `edgePoint` / compass anchor、两者皆 O(1) params。强行全统一到 contour 是用更差路径换无收益的「统一」，否决。
> - **不在 mark 里写 `if cartesian … else if polar …`**（那是 plot-design §8.3 否决的路线 (ii)，N_mark×M_coord 矩阵，即现状 `mark.ts:488-498` fail-loud 的来源）。把「投影后是不是闭式 shape」的判断**挪进坐标系声明**——每个坐标系最懂自己的投影：
>
> ```ts
> type CellProjection =
>   | { kind: 'shape'; ref: IRShapeRef } // 闭式快路：cartesian2D→rectangle、polar2D→sector
>   | { kind: 'contour'; points: Array<Position> }; // 兜底：任意曲线 / 自定义轴，密采样边界
> // CoordinateFrame.projectCell?(cell): CellProjection —— 不实现 → 引擎默认 frame.project 密采样 4 边成 contour
> ```
>
> - **mark 侧 lowering 单路径**：拿 `CellProjection`，`shape` 建 `Node + shape ref`、`contour` 建 `Node + contour shape`；interval / rect / sector 共用这一条，不再各写坐标系分支。
> - **加新坐标系 O(1)**：声明闭式走快路、不声明自动 contour 兜底，杜绝「加坐标系要给一批 mark 补特判 / fail-loud」。
> - **代价（已认）**：contour 兜底是 O(顶点) IR、命名 compass anchor 退化到 AABB（`boundaryPoint` 指向式连接仍精确）；圆角逐顶点 fillet、由 plot 控制顶点存在性。详见 core `ADR-core-contour-shape.md` 待决策点。
>   beta / rc 收尾：v0.1-beta.1 先抽出最小 `@retikz/data`（字段类型 / field model / 数据引用 / dataset normalization / field resolver / formatter / 通用 transform 基础接口），再做类型 / 注释 / 测试 / 文档站 / 发布候选稳定化。v0.1 共 15 alpha（含 alpha.10 绑定层），是大 minor；若需中途预览发布（如 alpha.8「核心语法预览」）可另切。

## 后续打磨 backlog（alpha.5 后排期）

> **边界**：阶段一 alpha.1~5 只打通**纵向闭环的基础能力**（8 段管线 × cartesian / polar，端到端出图），**不追求细节完备**。
> **已吸收进阶段二**：本清单里的语法缺口已归位到上方 **alpha.6–14**（Milestones 阶段二表）——下表保留细节作为各 alpha 的输入，归属见行末标注。
> 本段仍是**活清单**：新提的打磨需求往这里加，再归入对应 alpha。

- **数据模型（字段语义类型层）** — _【alpha.6】_：`data.model`（§3.2 dimension typing：quantitative / temporal / nominal / ordinal / interval / proportion）一等化，驱动 type-driven scale 默认选型 + guide 格式化；显式声明 + 缺省推断两条路。**阶段二地基**，撑住 scale / 通道 / guide
- **样式通道（补进 `StyleEncodingSchema`）** — _【alpha.7–8】_：encoding 已拆出 `PositionEncodingSchema`（x/y，必填）+ `StyleEncodingSchema`（当前仅 color）；后续在 `StyleEncodingSchema` 补 **size（alpha.7）/ 透明度（fill / stroke opacity）/ shape（alpha.8）** 等非位置通道，mark 据此着色 / 缩放 / 改形
- **单系列 line / area 的 color field 静默丢弃**（cross-review P2）— _【alpha.7，随 series 一等化】_：`expand.ts` 的 `resolveColor` 支持字段编码，但 `lowerLine` / `lowerArea` 单系列路径只读常量 `encoding.color.value`，`color={field}` 无 series 时被静默忽略、回退 `currentColor`，而 React props / 文档把 `color` 写成「颜色字段」。排期时定向：① 文档明确 color field 仅在 series 拆分时生效；② color field 隐式触发 series 分组（GoG 语义）；③ 单系列取首行颜色。与 legend / 样式通道相关，建议合并排。落点 `src/lower/mark.ts`（单系列 stroke / fill 解析）+ `expand.ts` resolveColor
- **更多坐标系** — _【alpha.9；3D gating 于 core】_：当前提供 `cartesian2D` / `polar2D` 与 cartesian / polar 的 **1D**（`cartesian1D` rug / timeline、角向 1D 等），其它投影通过 `defineCoordinate` 扩展。**地图坐标不进 plot**（§2 独立 domain）。**3D 坐标系（`cartesian3D` / `polar3D` 等）须先等 core 支持三维坐标**——plot 只消费 core 能力、不自造几何（见 AGENTS.md「子组遇 core 能力不足先补 core」），故 3D 坐标系 gating 于 core 三维坐标就绪，core 没有之前不在 plot 里做。
- **Coordinate composition 坐标复合** — _【alpha.14】_：它是 Facets 的上位地基，不只处理“按字段拆小图”。同一套机制也要支撑 same-panel dual-axis / overlay（共享 x 或 plot area）、shared scaffold tracks（共享某些坐标基底但局部 range 不同，如极坐标共享 center / angle、半径分 ring；笛卡尔共享 x、y 分 lane；混合 coordinate scope 共享 anchor / guide / scale）。alpha.14 需拆 ADR：facet 负责“按字段拆 panel”，dual-axis / overlay 负责“同 panel 多坐标 / mark 选择 coordinate 或 position scale”，shared scaffold / track 负责“共享坐标骨架 + 局部轨道”。三者共享 scale registry、guide 绑定 coordinate scope、locator / provenance 的 scope 语义；不扩展为跨域组合容器。后续 v0.3 composite / chart preset 可复用这套地基做高层封装，但不得绕开 plot primitive。
- ~~**cartesian 不校验 guide dimension**（cross-review P2）~~ — ✅ **alpha.9 已修**：`expand.ts` 的 `assertValidGuideDimensions` 按 `coordinate-meta` 的 `VALID_GUIDE_DIMENSIONS` 逐坐标系校验 guide dimension（cartesian2D 只许 x/y…），非法维度 fail-loud（不再渲杂散轴线）。
- **mark 视觉细节** — _【alpha.7–8 描边 / alpha.11 text mark·datum label】_：描边细节；数据标签（datum label）/ text mark
- **sector 间隔与静态外拉**（见 alpha.4 [ADR-02](./alpha.4/02-sector-geometry.md) 与 alpha.13 ADR-06）— _【alpha.13 已收口】_：`padAngle` 作为 sector / interval mark 层角向间隔；`IntervalMark.pull` 作为 polar sector 静态径向偏移，anchor / locator 跟随同一几何；hover / selected 动画态顺延到交互轴。
- **时间判断的可配边界（决策已定，2026-06-07）** — _【部分落地：[alpha.6 ADR-09](./alpha.6/09-iso-recognizer.md)】_：temporal「是不是时间」分两层——**解析**（已知是时间怎么转）已可配：声明式 `format`（进 IR，[alpha.6 ADR-06](./alpha.6/06-declarative-format.md)）+ `resolveField`（运行时逃生舱，[ADR-04](./alpha.6/04-field-resolver.md)）；**推断**（没声明时从数据猜）保持严格、只认无歧义 ISO（ADR-09 已补认空格分隔带时区 SQL 时间戳）。**不做"全局推断配置开关"**——只能是运行时选项、破坏 spec 自描述，且想自动认的格式（slashDate / epoch）恰是歧义格式（D/M/Y 坑）；按字段定制走 `resolveField`，歧义格式永远走声明
- **数据加载器（CSV / URL / JSON）定位** — _【v0.1 之后·便利轴，不进 plot 核心】_：取数 / 解析是 I/O，与图形语法正交，**不进 `@retikz/plot` 核心 lowering**——会让 lowering 变异步（破坏 SSR / locator parity / 确定性）并撞「数据不进 IR」边界。归宿是**适配层语法糖**（`@retikz/plot-react` 的 `useRemoteData` hook 等）**或独立小包**（`@retikz/plot-data`），排在图形语法完整之后。当前官方模式已是「app 层取数 → `.data.ts` hook 消费 → `<Plot data>` 收行」（见 docs-doc-principle）
- **连续色阶 `range` 非法颜色串静默变黑**（alpha.8 ADR-01 adversarial W1）— _【需求驱动 / 颜色校验里程碑】_：`SequentialColorScale` / `DivergingColorScale` 的 `range` 端点给非法颜色串（`'notacolor'` / 拼错色名 / 带空格）时，d3 `scaleLinear` 静默当黑色、不 fail-loud——LLM 打错色名得到全黑图无报错。正确修需引入颜色解析器（破坏 `@retikz/plot` 仅 zod + d3 的依赖白名单）或维护易腐的 CSS 色名表，故未在 ADR-01 内做。落点 `lower/scale.ts` 的 `resolveSequentialColorScale` / `resolveDivergingColorScale`，与 ADR-01 的 domain 有限性 fail-loud 同口径
- **legend 自定义渲染 + 样式参数**（2026-06-08 记，alpha.8 ADR-03 后续）— _【样式 token 归 alpha.15 Theme；深度自定义另立里程碑】_：当前 `<Legend>` 只有 7 个配置项（channel/scale/title/position/orient/tickCount/tickLabels），**形态据绑定 scale 类型自动选、不可指定**，几何（swatch 尺寸 `LEGEND_SWATCH_SIZE`、ramp 长宽、间距、字号）是 `lower/guide.ts` 硬编码常量、不开放，且无自定义条目模板 / 手动图例项 / 自定义符号 / size 代表值指定。后续要支持：① **样式参数**（swatch 尺寸 / ramp 尺寸 / 间距 / 字体 / 配色 token）——归 **alpha.15 Theme**；② **自定义渲染**（可配几何为 props、自定义条目模板 / render、手动图例项、size 代表值 `values` 字段、自定义 glyph 集）——另立里程碑，遵「先内置 curated，后开放自定义」（同 plot-design §11 channel 注册表立场）。当前逃生舱：用 Kernel `<Node>`/`<Path>` 手搓图例（legend 本就 lower 成 core Node/Path/Scope）。落点 `lower/guide.ts`（lowerLegend 常量 → 可配）+ `ir/guide.ts`（LegendGuideSchema 扩字段）+ React `<Legend>` props
- **legend 缺省标题（字段名）+ per-dimension 默认轴补齐**（alpha.8 ADR-03 实现校准顺延）— _【需求驱动】_：① ADR-03 决策⑨「省略 title → 用绑定字段名」未物化成自动可见标题（仅显式 title 渲染），可补字段名缺省标题；② 决策⑦的 per-dimension 默认轴（显式 x 轴 → y 默认仍补）未采纳（保留既有「任一显式 Axis 即不补默认」），如需 per-dimension 要同改 React `dsl_explicit_axis_only` 期望
- ~~**自定义坐标系文档升级为独立分组**~~ — ✅ **alpha.12 与 docs 已完成**：alpha.9 [ADR-05](./alpha.9/05-coordinate-chart-frame.md) 的实验性 custom operation 已由 [alpha.12 coordinate registry](./alpha.12/05-coordinate-registry.md) 取代；当前公开面统一为 `defineCoordinate()`、`CoordinateDefinition`、`createCoordinateFrame()` 与数组形态 `coordinates`。双语 `coordinate/custom-coordinate` 分组已覆盖 registry 契约、bridge demo、`frameAlong` 与 `projectCell`；更多曲线 / 螺旋 / 组合 cookbook 按真实用例需求继续补充。
- **通用「进阶 / 扩展」分组**（2026-06-09 记）— _【攒够 2–3 个再开，需求驱动】_：给「小而散」的运行时扩展点（`resolveField` 自定义取值、`fieldMaps`、将来自定义 mark / scale 等，每个体量 ≈ 单页）一个归宿分组。**不含自定义坐标系**（它够格自己一个组，见上条）。**不要空开**——攒够 2–3 个这类小页再开，否则是会腐化的「杂项抽屉」。
- _（后续追加……）_

## 依赖 core

- core IR / Scene / `compileToScene`；
- Tier 2 composite 接入与 `lowerComposites` 管线（core v0.3 起的 Tier 2 支撑，现已就绪）——plot 作为 Tier 2 内容 lower 进可引用的 `Scope`；
- 渲染走现有 `@retikz/react` / `@retikz/vanilla`（消费 core IR）；**plot v0.1 起即出 authoring 绑定** `@retikz/plot-react` / `@retikz/plot-vanilla`（薄 `<Plot>` + 组合 DSL + SSR），与 plot 本体 lockstep（见「拆分策略」）。交互绑定留 v0.2。

plot 只消费 core 能力、不反向依赖，也不改 core 内部。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态或 supersede 信息，不改历史决策内容。模板见 [`../../../_template.md`](../../../_template.md)。

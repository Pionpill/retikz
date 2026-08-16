# plot v0 Roadmap

> 更新于 2026-07-27。本文件记录 `@retikz/plot` 的总体路线。**v0.1 承载整套图形语法（GoG 8 组件）**，beta / RC 阶段抽出 `@retikz/data`、补齐 runtime lineage、收敛 plain authoring 并冻结公共面；**v0.2 承载交互能力 + layout transform / structured visualization**；**v0.3 承载渐进式 AI 生成 + 跨域复合**。alpha 级执行细节见对应 `v0.*/roadmap.md`。
> 具体执行计划放在同目录 `v0.*/roadmap.md`，设计决策放在 `packages/viz/_notes/decisions/`，里程碑详情以 [`plot-design.md §13`](../../../architecture/plot-design.md) 为准。

## 定位

`@retikz/plot` 是 retikz 之上的 grammar-of-graphics 层：把「数据 → 通道 → scale → 坐标系 → mark → guide」的声明式语法，经 lowering 产出 core 的 `Scope / Node / Path / Step / Coordinate` IR，交给 core / renderer 真正绘制。

- plot **只消费 core 能力、不反向依赖**，也不自带 renderer（见 [plot-design §2 / §8](../../../architecture/plot-design.md)）。
- plot **版本线独立于 core**，不与 core 版本号对齐；每个里程碑由「所需 core 能力是否就绪」gating。
- 规划中的 `@retikz/data` 是 viz 共享数据语义层：负责数据模型、数据引用、字段解析、通用 transform、数据通道、scale / formatter / theme token 等跨 plot / table / geo（若独立）共用的契约。
- viz 组解决的是「有了数据之后如何可视化」：`@retikz/plot` 通过 GoG 可视化，`@retikz/table` 通过表格可视化，geo 处理地图类可视化但是否独立拆包待决策。原 `struct` 范围不作为独立包，gauge / progress / tree / network / word cloud / pictogram 等通过 plot 的 layout transform + mark 表达。
- 规划独立 `@retikz/chart` / `@retikz/chart-react` / `@retikz/chart-vanilla`：chart 是 Tier 3 新手友好封装层，可以拥有 JSON-safe `IRChart`，但唯一执行出口是 lower 成 IRPlot；它不拥有直接到 core 的底层 IR、lowering 或 renderer，也不聚合 table / geo。
- 框架绑定由各表达层各自发布：`@retikz/plot-react` / `@retikz/plot-vanilla`、规划中的 `@retikz/chart-react` / `@retikz/chart-vanilla`、`@retikz/table-react` / `@retikz/table-vanilla`，以及候选的 `@retikz/geo-react` / `@retikz/geo-vanilla`。不规划统一 `@retikz/viz-react` / `@retikz/viz-vanilla` 聚合 adapter，避免安装不需要的模块。

模块边界与 MVP 范围见 [plot-design §11](../../../architecture/plot-design.md)，里程碑拆分见 [§13](../../../architecture/plot-design.md)。

## 路线总览

**v0.1 承载整套图形语法**（GoG 8 组件，除交互 / 动画）。它分两阶段，**都在 v0.1 的 alpha 线**——不另起 v0.6+ minor（我们 v0.2 都未发，语法完善是继续在 v0.1 出 alpha）：

- **阶段一 · 基础架构搭建（v0.1 alpha.1–5，✅ 已完成）**：验证 8 段管线 / lowering / 坐标系抽象 / anchor·scope 等**架构能力端到端成立**，并搭起 6 个语法组件（Data / Aesthetics / Geometry / Statistics / Scales / Coordinates）的**最小骨架**（2 个二维坐标系、position + 基础 color、基础 mark）。是「搭骨架」，不求语法完备。
- **阶段二 · 完善图形语法（v0.1 alpha.6–9 / 11–15）**：在已验证的架构上**补全全部 8 组件**——含两个全新组件 **Coordinate composition / Theme**（Coordinate composition 覆盖 GoG 的 Facets，并向同 panel 多坐标复合扩展）。（**alpha.10 为 2026-06-13 插入的绑定层 milestone**「退化 Plot 为薄容器」、非 GoG 组件，故语法 milestone 顺延 11–15。）
- **v0.1 发布 = 图形语法完整**；beta / RC 阶段完成 `@retikz/data` 抽层、runtime lineage、plain authoring 收敛与类型 / 注释 / 测试 / docs 稳定化，不新增 table / geo / chart 专属能力。

**v0.1 之后 · 能力轴 minor**：

- **v0.2**：交互能力 + layout transform / structured visualization。交互依赖 locator / provenance / layer identity 与 core runtime；layout transform 承载 tree / network / wordCloud / treemap / gauge / progress / pictogram 等结构化算法。
- **chart v0.1**：与 plot v0.2 并行迭代，拥有 Tier 3 IRChart，lower 成 IRPlot 并消费 plot v0.1/v0.2 能力。
- **v0.3**：渐进式 AI 生成 + 跨域复合。AI 可优先生成 IRChart，复杂场景降到 IRPlot 或 attached-space composition；plot / table / diagram 等 Tier 2 内容通过 core Scope 组合。

> **阶段二排序原则**：上游先于下游、结构性先于增量、地基先于铺面。故 Data（数据模型，结构性地基）先行，Aesthetics + Scales（通道×scale×legend，语法核心）居中，Geometry / Coordinates（铺面、增量）随后，Statistics 配对几何，Coordinate composition / Theme 收尾。推导见 [plot-design §15~§16](../../../architecture/plot-design.md)。

### 图形语法 = GoG 8 组件（范围确认 2026-06-07）

经典 grammar of graphics（Wilkinson / ggplot 分层语法）的 8 组件，retikz 全部纳入 v0.1；**交互 / 动画不在 8 组件内**，属 v0.1 之后的能力轴。

| GoG 组件                                         | retikz 概念                                                     | alpha.1–5 最小骨架            | 阶段二补全（alpha.6+）                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Data** 数据                                    | `data.ref` + `data.model` + field accessor                      | ref / accessor ✓              | **数据模型（字段语义类型层）**                                                                                   |
| **Aesthetics** 美学映射                          | encoding 通道                                                   | position(x/y) ✓、color 半成品 | **size / opacity / shape + color 真通道 + series 一等化**                                                        |
| **Geometry** 几何对象                            | mark                                                            | point/line/area/bar/sector ✓  | **rect / rule / text / ribbon / boxplot**                                                                        |
| **Statistics** 统计变换                          | transform                                                       | sort/groupBy/stack ✓          | **bin / aggregate / density / smooth / quartile**                                                                |
| **Scales** 标度                                  | scale                                                           | linear/band/time/ordinal ✓    | **log/pow/sqrt/quantize/threshold/color gradient + type-driven 选型**（横切 Data/Aesthetics 两轮，非独立 alpha） |
| **Coordinates** 坐标系统                         | coordinate                                                      | cartesian2D / polar2D ✓       | **cartesian1D / polar1D**（地图坐标是否独立为 geo domain 仍待决策，也可能作为 plot projection / layout 扩展）    |
| **Coordinate composition** 坐标复合（含 Facets） | coordinate scope / facet / shared scaffold（复用 core `Scope`） | —                             | **全新：分面小多图 + 同 panel 多坐标轴 / 多 scale 叠加 + 共享坐标骨架的 tracks / rings / lanes**                 |
| **Theme** 主题样式                               | theme                                                           | —                             | **全新：标题 / 字体 / 背景 / 网格 / 图例外观 / 调色板**                                                          |

阶段二把 8 组件按依赖拆成 **alpha.6–9 / 11–15**（薄片拆，每 alpha 一个可渲染薄片，延续「纵向薄片 + 三包 lockstep」）——**每个 alpha 具体做什么见内层 [v0.1/roadmap](./v0.1/roadmap.md) Milestones**（本外层只到版本 / 组件粒度，不复述 alpha 细节）。

> 📌 v0.1 共 15 alpha（含 alpha.10 绑定层）、是个大 minor，到首发布路较长，之后走 beta / rc 收口；若需中途预览发布（如 alpha.8「核心语法预览」）可另切，不影响本线。

## 参考来源

- 架构与里程碑详情：[`plot-design.md`](../../../architecture/plot-design.md)（§11 模块划分 / §13 里程碑）
- v0.1 执行计划：[`v0.1/roadmap.md`](./v0.1/roadmap.md)
- ADR：`packages/viz/_notes/decisions/`
- core 路线与能力：[`core v0 roadmap`](../../../../../kernel/_notes/decisions/v0/roadmap.md)
- 横向对比分析：[`plot-compare-analysis.md`](../../../analysis/plot-compare-analysis.md)

本文件不再跟踪 alpha-by-alpha 细节。具体计划变化时，先改对应版本的 `v0.*/roadmap.md`；只有阶段主题或边界变化时，才更新本 roadmap。

## 范围边界

plot 聚焦坐标语法本身：transform / encoding / scale / coordinate / mark / relation / guide，以及 lowering 到 core IR。

以下不由 plot 承载：

- **渲染**：plot 不自带 renderer，绘制走 core / `@retikz/render` / 框架绑定包；
- **共享数据层**：数据模型、字段解析、通用 transform、数据通道、scale / formatter 等规划归 `@retikz/data`，plot 只消费；
- **chart 高层封装**：`type` + 配置的快速出图规划归 `@retikz/chart`，IRChart lower 成 IRPlot 并调度 plot 能力；chart 不拥有直接到 core 的底层 IR / lowering / renderer；
- **结构化可视化**：gauge / progress / token ring / tree / network / word cloud / pictogram 等不设独立 struct 包，规划归 plot 的 layout transform：算法先产出位置、尺寸、路由等派生字段，再统一走 plot mark / guide / lowering；
- **表格可视化**：table / pivot table / matrix 等表格型展示规划归 `@retikz/table`；
- **地图可视化**：map / choropleth / flow map / tile layer 等地图型展示待决策；可独立为 `@retikz/geo`，也可作为 plot projection / layout 能力进入 plot pipeline；
- **框架 adapter**：React / Vanilla authoring 表面由各表达层各自承接，plot 已有 `@retikz/plot-react` / `@retikz/plot-vanilla`，chart 规划 `@retikz/chart-react` / `@retikz/chart-vanilla`，table / geo（若独立）后续各自发包；
- **跨域内容组合**（plot 与 uml / table / 任意业务内容混排）：基于 core 现有 `Scope` 的通用能力，任意 Tier 2 内容共用同一套，plot 的义务仅是「可被组合」（lower 进可引用 scope + 暴露 anchor）；
- **core 通用图形能力**：Node / Path / Step / Coordinate / Scope 等留在 core，plot 只消费不重造。

以下能力暂不进 v0，除非后续阶段证明价值：

- 更多专门坐标系与 sankey / alluvial 完整支持；
- 大数据专用 lowering / 采样 / Canvas / WebGL 热路径（先保证语法正确，性能后续优化）；
- plot 内坐标复合之外的复杂跨域多图编排。

## 后续处理：架构权衡处置（backlog）

> 来源：[`plot-design.md §15~§16`](../../../architecture/plot-design.md)（与 ggplot/Vega/Highcharts 对比 + 6 条固有软肋复盘，2026-06-07）。
> 这些是「做完功能也甩不掉」的**架构性**软肋，非功能缺口。处置已定向，落地多在 **v0.1 之后的能力轴**（交互 / 性能），少数随阶段二语法轮（guide·legend 增强）。每条的关键约束以 plot-design §16.2 为准。

| #   | 软肋                                                     | 处置方向                                                                                                                                                                                                          | 落地节点                                                     |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | 散点/柱每行下沉成一个 `IRNode` → O(N) 物化、大数据天花板 | 配置化：**不需连接时不物化 N 个 Node，下沉成一个稠密 primitive**（`{type:'points', positions, style}` / 多段 Path）。**「可连接」与「物化成独立 Node」绑同一开关**，不是只摘 id。需先补 core 一个 Tier 1 稠密原语 | v0.1 之后·性能；core 原语走 `next-core`                      |
| 2   | JSON IR 无 typed-array / 无 in-spec 函数                 | typed-array 收益**跟随 #1**（稠密 primitive 扁平数组）；in-spec 函数**永不做**，扩展点在创作层（组件 / 新 mark 包）                                                                                               | 随 #1；函数扩展不排期                                        |
| 3   | 批量急切编译、无响应式/增量                              | 后续性能阶段处理。守住「纯函数 + 稳定 identity」（alpha.5 `transformedIndex`/`sourceIndex`/id 即 diff key，勿破坏）。**展示类交互用 locator+overlay 不重 lower**，仅数据过滤型交互需重 lower                      | v0.1 之后·交互                                               |
| 4   | 像素尺寸 lower 期钉死、响应式 resize = 重 lower          | viewBox 等比缩放兜底（免费）+ 必要时 debounce 重 lower（要 reflow 时）；API 讲清两种语义                                                                                                                          | v0.1 之后（按需）                                            |
| 5   | 纯函数 lowering 无文字度量 → tick/legend 排版上限        | 最终形态 = `measureText` 作**编译期 option/capability 注入**（不进 IR，不破坏 JSON 原则）；勿走两遍渲染回灌、勿长期停在估算                                                                                       | alpha.6 / alpha.8（数据模型 / 通道带来的 guide·legend 增强） |
| 6   | Tier1/Tier2 门控、表达力受 Kernel 词汇量限               | **不处理——设计原则**。守纪律：缺能力下沉补 core，不在 plot 绕开自造                                                                                                                                               | 持续                                                         |

**定位边界（自觉取舍，非缺陷）**：#1~#5 落实后，定位内架构风险基本覆盖；**仍逆风的唯一组合是「大数据 + 重度数据过滤型交互」同时要**（百万点 + 60fps brush/zoom-filter）——这不是 retikz/plot 的定位（publication/图解层，非大数据强交互 dashboard）。明确划为「不支持/逆风」，不作「待修」。详见 [plot-design §16.3](../../../architecture/plot-design.md)。

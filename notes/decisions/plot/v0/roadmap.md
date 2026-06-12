# plot v0 Roadmap

> 更新于 2026-06-07。本文件记录 `@retikz/plot` 的总体路线。**v0.1 承载整套图形语法（GoG 8 组件）**，分阶段一（alpha.1–5 基础架构，已完成）+ 阶段二（alpha.6–14 完善语法）；交互 / 动画 / 性能等能力轴留 v0.1 之后。alpha 级执行细节见 `v0.1/roadmap.md`。
> 具体执行计划放在同目录 `v0.*/roadmap.md`，设计决策放在 `notes/decisions/plot/`，里程碑详情以 [`plot-design.md §13`](../../../architecture/plot-design.md) 为准。

## 定位

`@retikz/plot` 是 retikz 之上的 grammar-of-graphics 层：把「数据 → 通道 → scale → 坐标系 → mark → guide」的声明式语法，经 lowering 产出 core 的 `Scope / Node / Path / Step / Coordinate` IR，交给 core / renderer 真正绘制。

- plot **只消费 core 能力、不反向依赖**，也不自带 renderer（见 [plot-design §2 / §8](../../../architecture/plot-design.md)）。
- plot **版本线独立于 core**，不与 core 版本号对齐；每个里程碑由「所需 core 能力是否就绪」gating。
- 上层 `@retikz/chart`（`type` + 配置的 preset 封装）依赖 `@retikz/plot`，preset 必须展开成 plot primitive，不得拥有底层无法表达的能力。

模块边界与 MVP 范围见 [plot-design §11](../../../architecture/plot-design.md)，里程碑拆分见 [§13](../../../architecture/plot-design.md)。

## 路线总览

**v0.1 承载整套图形语法**（GoG 8 组件，除交互 / 动画）。它分两阶段，**都在 v0.1 的 alpha 线**——不另起 v0.6+ minor（我们 v0.2 都未发，语法完善是继续在 v0.1 出 alpha）：

- **阶段一 · 基础架构搭建（v0.1 alpha.1–5，✅ 已完成）**：验证 8 段管线 / lowering / 坐标系抽象 / anchor·scope 等**架构能力端到端成立**，并搭起 6 个语法组件（Data / Aesthetics / Geometry / Statistics / Scales / Coordinates）的**最小骨架**（2 个二维坐标系、position + 基础 color、基础 mark）。是「搭骨架」，不求语法完备。
- **阶段二 · 完善图形语法（v0.1 alpha.6–14）**：在已验证的架构上**补全全部 8 组件**——含两个全新组件 **Facets / Theme**。
- **v0.1 发布 = 图形语法完整**。

**v0.1 之后 · 能力轴 minor**（**不属图形语法**，按 core 能力 gating 排，版本号待定）：

- 交互 / 动画（tooltip / hover / 事件 / 过渡）——依赖 core 水合 / runtime；
- AI 渐进生成（分层渐进产出 / 渲染）——依赖 core Progressive IR；
- 性能（大数据稠密 primitive 等，见本文「后续处理」段）——依赖 core Tier 1 原语。

> **阶段二排序原则**：上游先于下游、结构性先于增量、地基先于铺面。故 Data（数据模型，结构性地基）先行，Aesthetics + Scales（通道×scale×legend，语法核心）居中，Geometry / Coordinates（铺面、增量）随后，Statistics 配对几何，Facets / Theme 收尾。推导见 [plot-design §15~§16](../../../architecture/plot-design.md)。

### 图形语法 = GoG 8 组件（范围确认 2026-06-07）

经典 grammar of graphics（Wilkinson / ggplot 分层语法）的 8 组件，retikz 全部纳入 v0.1；**交互 / 动画不在 8 组件内**，属 v0.1 之后的能力轴。

| GoG 组件 | retikz 概念 | alpha.1–5 最小骨架 | 阶段二补全（alpha.6+） |
| --- | --- | --- | --- |
| **Data** 数据 | `data.ref` + `data.model` + field accessor | ref / accessor ✓ | **数据模型（字段语义类型层）** |
| **Aesthetics** 美学映射 | encoding 通道 | position(x/y) ✓、color 半成品 | **size / opacity / shape + color 真通道 + series 一等化** |
| **Geometry** 几何对象 | mark | point/line/area/bar/sector ✓ | **rect / rule / text / ribbon / boxplot** |
| **Statistics** 统计变换 | transform | sort/groupBy/stack ✓ | **bin / aggregate / density / smooth / quartile** |
| **Scales** 标度 | scale | linear/band/time/ordinal ✓ | **log/pow/sqrt/quantize/threshold/color gradient + type-driven 选型**（横切 Data/Aesthetics 两轮，非独立 alpha） |
| **Coordinates** 坐标系统 | coordinate | cartesian2D / polar2D ✓ | **cartesian1D / polar1D / ternary2D**（**地图坐标 = 独立 domain 包，[§2](../../../architecture/plot-design.md) 明确不进 plot**） |
| **Facets** 分面 | facet（复用 core `Scope`） | — | **全新：分面小多图** |
| **Theme** 主题样式 | theme | — | **全新：标题 / 字体 / 背景 / 网格 / 图例外观 / 调色板** |

阶段二把 8 组件按依赖拆成 **alpha.6–14**（薄片拆，每 alpha 一个可渲染薄片，延续「纵向薄片 + 三包 lockstep」）——**每个 alpha 具体做什么见内层 [v0.1/roadmap](./v0.1/roadmap.md) Milestones**（本外层只到版本 / 组件粒度，不复述 alpha 细节）。

> 📌 v0.1 共 14 alpha、是个大 minor，到首发布路较长，之后走 beta / rc 收口；若需中途预览发布（如 alpha.8「核心语法预览」）可另切，不影响本线。

## 参考来源

- 架构与里程碑详情：[`plot-design.md`](../../../architecture/plot-design.md)（§11 模块划分 / §13 里程碑）
- v0.1 执行计划：[`v0.1/roadmap.md`](./v0.1/roadmap.md)
- ADR：`notes/decisions/plot/`
- core 路线与能力：[`core v0 roadmap`](../../core/v0/roadmap.md)
- 横向对比分析：[`plot-compare-analysis.md`](../../../analysis/plot-compare-analysis.md)

本文件不再跟踪 alpha-by-alpha 细节。具体计划变化时，先改对应版本的 `v0.*/roadmap.md`；只有阶段主题或边界变化时，才更新本 roadmap。

## 范围边界

plot 聚焦坐标语法本身：transform / encoding / scale / coordinate / mark / relation / guide，以及 lowering 到 core IR。

以下不由 plot 承载：

- **渲染**：plot 不自带 renderer，绘制走 core / `@retikz/render` / 框架绑定包；
- **preset 封装**：`type` + 配置的快速出图属上层 `@retikz/chart`；
- **跨域内容组合**（plot 与 uml / table / 任意业务内容混排）：基于 core 现有 `Scope` 的通用能力，任意 Tier 2 内容共用同一套，plot 的义务仅是「可被组合」（lower 进可引用 scope + 暴露 anchor）；
- **core 通用图形能力**：Node / Path / Step / Coordinate / Scope 等留在 core，plot 只消费不重造。

以下能力暂不进 v0，除非后续阶段证明价值：

- ternary / 更多专门坐标系与 sankey / alluvial 完整支持；
- 大数据专用 lowering / 采样 / Canvas / WebGL 热路径（先保证语法正确，性能后续优化）；
- 完整 facet 之外的复杂多图编排。

## 后续处理：架构权衡处置（backlog）

> 来源：[`plot-design.md §15~§16`](../../../architecture/plot-design.md)（与 ggplot/Vega/Highcharts 对比 + 6 条固有软肋复盘，2026-06-07）。
> 这些是「做完功能也甩不掉」的**架构性**软肋，非功能缺口。处置已定向，落地多在 **v0.1 之后的能力轴**（交互 / 性能），少数随阶段二语法轮（guide·legend 增强）。每条的关键约束以 plot-design §16.2 为准。

| # | 软肋 | 处置方向 | 落地节点 |
| --- | --- | --- | --- |
| 1 | 散点/柱每行下沉成一个 `IRNode` → O(N) 物化、大数据天花板 | 配置化：**不需连接时不物化 N 个 Node，下沉成一个稠密 primitive**（`{type:'points', positions, style}` / 多段 Path）。**「可连接」与「物化成独立 Node」绑同一开关**，不是只摘 id。需先补 core 一个 Tier 1 稠密原语 | v0.1 之后·性能；core 原语走 `next-core` |
| 2 | JSON IR 无 typed-array / 无 in-spec 函数 | typed-array 收益**跟随 #1**（稠密 primitive 扁平数组）；in-spec 函数**永不做**，扩展点在创作层（组件 / 新 mark 包） | 随 #1；函数扩展不排期 |
| 3 | 批量急切编译、无响应式/增量 | 后续性能阶段处理。守住「纯函数 + 稳定 identity」（alpha.5 `transformedIndex`/`sourceIndex`/id 即 diff key，勿破坏）。**展示类交互用 locator+overlay 不重 lower**，仅数据过滤型交互需重 lower | v0.1 之后·交互 |
| 4 | 像素尺寸 lower 期钉死、响应式 resize = 重 lower | viewBox 等比缩放兜底（免费）+ 必要时 debounce 重 lower（要 reflow 时）；API 讲清两种语义 | v0.1 之后（按需） |
| 5 | 纯函数 lowering 无文字度量 → tick/legend 排版上限 | 最终形态 = `measureText` 作**编译期 option/capability 注入**（不进 IR，不破坏 JSON 原则）；勿走两遍渲染回灌、勿长期停在估算 | alpha.6 / alpha.8（数据模型 / 通道带来的 guide·legend 增强） |
| 6 | Tier1/Tier2 门控、表达力受 Kernel 词汇量限 | **不处理——设计原则**。守纪律：缺能力下沉补 core，不在 plot 绕开自造 | 持续 |

**定位边界（自觉取舍，非缺陷）**：#1~#5 落实后，定位内架构风险基本覆盖；**仍逆风的唯一组合是「大数据 + 重度数据过滤型交互」同时要**（百万点 + 60fps brush/zoom-filter）——这不是 retikz/plot 的定位（publication/图解层，非大数据强交互 dashboard）。明确划为「不支持/逆风」，不作「待修」。详见 [plot-design §16.3](../../../architecture/plot-design.md)。

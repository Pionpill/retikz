# plot v0 Roadmap

> 更新于 2026-06-07。本文件只记录 `@retikz/plot` 的总体路线，不承载 alpha 级任务清单。
> 具体执行计划放在同目录 `v0.*/roadmap.md`，设计决策放在 `notes/decisions/plot/`，里程碑详情以 [`plot-design.md §13`](../../../architecture/plot-design.md) 为准。

## 定位

`@retikz/plot` 是 retikz 之上的 grammar-of-graphics 层：把「数据 → 通道 → scale → 坐标系 → mark → guide」的声明式语法，经 lowering 产出 core 的 `Scope / Node / Path / Step / Coordinate` IR，交给 core / renderer 真正绘制。

- plot **只消费 core 能力、不反向依赖**，也不自带 renderer（见 [plot-design §2 / §8](../../../architecture/plot-design.md)）。
- plot **版本线独立于 core**，不与 core 版本号对齐；每个里程碑由「所需 core 能力是否就绪」gating。
- 上层 `@retikz/chart`（`type` + 配置的 preset 封装）依赖 `@retikz/plot`，preset 必须展开成 plot primitive，不得拥有底层无法表达的能力。

模块边界与 MVP 范围见 [plot-design §11](../../../architecture/plot-design.md)，里程碑拆分见 [§13](../../../architecture/plot-design.md)。

## 版本主题

| 版本 | 主题 | 说明 |
| --- | --- | --- |
| v0.1 | 基础纵向闭环 | 对 ≥1 个 mark 跑通全 8 段管线，在 **cartesian + polar** 两套坐标系下都成立；产出带轴与网格的基本图。模块：`ir` / `transform`(最小) / `scale` / `coordinate` / `mark`(point·line·bar) / `relation`(order) / `guide` / `lowering`。并预留 semantic anchor 与 scope-aware IR。 |
| v0.2 | 图形横向扩展（静态） | 铺开折线 / 柱状 / 散点 / 面积等；新增非位置通道 scale（color·size）、legend、stack / dodge、更多 mark。并行支线启动 `@retikz/chart` preset 层。 |
| v0.3 | 动态能力 | tooltip / hover / 函数回调等交互；靠 v0.1 预留的 anchor 做命中，事件绑定落在框架绑定包（`@retikz/plot-react` / `-vanilla`）。依赖 core hydration / runtime。 |
| v0.4 | AI 渐进生成 | 分层渐进产出 / 渲染（坐标轴 → 图元 → label）。依赖 core Progressive IR / JSON Patch stream 与分层 lowering（见 [plot-design §10 渐进式生成](../../../architecture/plot-design.md)）。 |
| v0.5 | facet 小多图 + 组合就绪 | plot 内 facet 小多图、跨图 connector / ribbon；验证 plot 可被通用组合能力编排（跨域组合复用 core 现有 `Scope`，不由 plot 实现）。 |

> 主线：纵向闭环 → 横向铺 mark → 动态 → AI 渐进 → 组合。
> **贯穿原则**：v0.1 的 IR 与 lowering 必须预留 semantic anchor / datum locator（v0.3 交互命中要用）与 scope-aware IR（v0.5 组合与 facet 要用）——现在预留近乎零成本，事后补极痛。

## 参考来源

- 架构与里程碑详情：[`plot-design.md`](../../../architecture/plot-design.md)（§11 模块划分 / §13 里程碑）
- v0.1 执行计划：[`v0.1/roadmap.md`](./v0.1/roadmap.md)
- ADR：`notes/decisions/plot/`
- core 路线与能力：[`core v0 roadmap`](../../core/v0/roadmap.md)
- TikZ gap 分析：[`tikz-gap-analysis.md`](../../../analysis/tikz-gap-analysis.md)

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
> 这些是「做完功能也甩不掉」的**架构性**软肋，非功能缺口。处置已定向，落地排进后续版本（多数 v0.2 / v0.3 性能与交互阶段）。每条的关键约束以 plot-design §16.2 为准。

| # | 软肋 | 处置方向 | 落地节点 |
| --- | --- | --- | --- |
| 1 | 散点/柱每行下沉成一个 `IRNode` → O(N) 物化、大数据天花板 | 配置化：**不需连接时不物化 N 个 Node，下沉成一个稠密 primitive**（`{type:'points', positions, style}` / 多段 Path）。**「可连接」与「物化成独立 Node」绑同一开关**，不是只摘 id。需先补 core 一个 Tier 1 稠密原语 | v0.2/v0.3 性能阶段；core 原语走 `next-core` |
| 2 | JSON IR 无 typed-array / 无 in-spec 函数 | typed-array 收益**跟随 #1**（稠密 primitive 扁平数组）；in-spec 函数**永不做**，扩展点在创作层（组件 / 新 mark 包） | 随 #1；函数扩展不排期 |
| 3 | 批量急切编译、无响应式/增量 | 后续性能阶段处理。守住「纯函数 + 稳定 identity」（alpha.5 `transformedIndex`/`sourceIndex`/id 即 diff key，勿破坏）。**展示类交互用 locator+overlay 不重 lower**，仅数据过滤型交互需重 lower | v0.3 交互阶段 |
| 4 | 像素尺寸 lower 期钉死、响应式 resize = 重 lower | viewBox 等比缩放兜底（免费）+ 必要时 debounce 重 lower（要 reflow 时）；API 讲清两种语义 | v0.2/v0.3 |
| 5 | 纯函数 lowering 无文字度量 → tick/legend 排版上限 | 最终形态 = `measureText` 作**编译期 option/capability 注入**（不进 IR，不破坏 JSON 原则）；勿走两遍渲染回灌、勿长期停在估算 | guide 增强阶段（v0.2+） |
| 6 | Tier1/Tier2 门控、表达力受 Kernel 词汇量限 | **不处理——设计原则**。守纪律：缺能力下沉补 core，不在 plot 绕开自造 | 持续 |

**定位边界（自觉取舍，非缺陷）**：#1~#5 落实后，定位内架构风险基本覆盖；**仍逆风的唯一组合是「大数据 + 重度数据过滤型交互」同时要**（百万点 + 60fps brush/zoom-filter）——这不是 retikz/plot 的定位（publication/图解层，非大数据强交互 dashboard）。明确划为「不支持/逆风」，不作「待修」。详见 [plot-design §16.3](../../../architecture/plot-design.md)。

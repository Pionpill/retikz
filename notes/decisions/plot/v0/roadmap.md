# plot v0 Roadmap

> 更新于 2026-06-02。本文件只记录 `@retikz/plot` 的总体路线，不承载 alpha 级任务清单。
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

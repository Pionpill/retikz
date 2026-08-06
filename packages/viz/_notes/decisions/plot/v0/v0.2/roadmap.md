# plot v0.2 Roadmap

> 本文件汇总 plot v0.2 minor 的路线与 milestone 索引。具体执行记录放各 milestone 的 `roadmap.md`，长期决策放同目录 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot v0.1 roadmap`](../v0.1/roadmap.md) · [`plot-design.md §5 / §10 / §13`](../../../../architecture/plot-design.md)
> ⚠️ 草案：本 minor 由 2026-07-05「v0.1 GoG 基座完成后的能力轴」讨论开出，并于 2026-08-04 按映射、Kernel 前置能力与交互顺序重排，待人工 review。

## 定位

**v0.2 先收回 Plot 领域主题所有权并重构空间映射关系，再在 Kernel 底层能力就绪后补性能与交互。**

v0.1 已完成 GoG 基座：data / encoding / scale / coordinate / mark / stat / coordinate composition / guide / theme 都已进入 PlotSpec 语义。v0.2 先修正早期 Chart-owned Plot token 的所有权倒置，再按三条有依赖的能力轴推进：

- **领域主题闭环**：Plot 消费 Core effective Theme，拥有 Plot surface、typography / label、Axis / Legend 视觉 token、palette、preset、resolver、mapping 与 inspection；Chart 只转发 Plot 公开 token / theme 输入。

- **空间映射重构**：把坐标系映射与结构化算法映射统一提升为 `Spatial Mapping` 概念，同时保留 `Coordinate Mapping` 与 `Structured Mapping` 的专门契约；允许 `nodes`、`links` 等任意命名内容，建立通用局部坐标契约，并从 dimension / axis 粒度扩展坐标系及其法向 / 切向组合关系。
- **性能优化**：待 Kernel 提供 identity、revision、transaction、incremental、retained Scene 等底层能力后，Plot 只负责自身领域依赖、最小失效边界、增量 lowering 与 provenance，不复制 Kernel Runtime。
- **交互优化**：待 Kernel 提供 headless interaction 的事件、ownership、behavior、presentation 与 intent 基础后，Plot 负责 datum / series / view / panel 等领域交互语义，不复制事件归一化或通用行为状态机。

`@retikz/chart v0.1` 与本 minor 并行迭代。Chart 需求不单独形成 Plot milestone：若需求暴露的是通用 Plot 缺口，就插入最匹配的 alpha；Chart-specific recipe、type、presentation 与默认值仍归 Chart。所有 Chart 能力必须继续 lower 成 PlotSpec，不能反向改变 Plot 的领域边界。

同时继续收敛 v0.1 的通用 decoration 呈现：Plot 拥有 axis / legend / label 的领域解析、coordinate view 绑定、guide resolve、provenance / locator 与交互意图；Standard alpha.2 就绪后，Plot 把外围 Box Layout 和 Legend 的视觉结构、内部布局与 layout-aware compile 迁到 `@retikz/standard`，不维护平行呈现主链。

## 前置能力

- **plot v0.1**：GoG 基座、thin Plot、guide / theme、scope identity、locator / provenance、layer zIndex 与 coordinate registry。
- **data v0.1 beta**：共享字段、数据引用、formatter、通用 transform 基础契约。
- **Kernel**：alpha.1 映射重构只消费现有静态 Core lowering；alpha.2 性能优化必须等待 Kernel 的同步原子增量链路；alpha.3 交互优化还必须等待 Kernel 的 headless interaction 基础。
- **standard v0.1**：alpha.2 Box Layout 与 Legend、直接 Definition 传递、领域无关 layout artifact；Plot 不在 Standard 缺口闭合前建立私有 fallback。

## Milestones

| Milestone                            | 主题                                       | 模块 / 产出                                                                                                                                             | 状态               |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [v0.2-alpha.1](./alpha.1/roadmap.md) | **Plot 主题所有权 + Spatial Mapping 重构** | 先冻结 Plot token / preset / resolver 与 Chart 转发边界，再建立 Coordinate Mapping / Structured Mapping、任意内容端口、通用局部坐标与自定义坐标扩展边界 | 草拟中             |
| [v0.2-alpha.2](./alpha.2/roadmap.md) | **性能优化**                               | 消费 Kernel 增量运行时，建立 Plot 领域依赖、失效、增量 lowering、fallback 与性能观测闭环                                                                | 待 Kernel 前置能力 |
| [v0.2-alpha.3](./alpha.3/roadmap.md) | **交互优化**                               | 消费 Kernel headless interaction，建立 Plot datum / series / view / panel 的交互目标、意图与 presentation 协作边界                                      | 待 Kernel 前置能力 |

具体结构化算法与 Chart type 不预先批量排入 Plot。只有 Chart 或其它下游提出通用缺口时，才在上述 alpha 中增加候选 ADR，并先确认能力归属。

## 版本顺序

```text
alpha.1 Spatial Mapping
  → alpha.2 Plot incremental performance
  → alpha.3 Plot interaction
```

alpha.2 与 alpha.3 可以提前规划，但在对应 Kernel 能力未 Accepted 前不进入 Plot 实现。alpha.3 依赖 alpha.2 的稳定 identity、依赖传播与增量提交边界；三包仍保持 Plot、Plot React、Plot Vanilla 的等价契约。

## 与 v0.1 / v0.3 的关系

v0.1 = GoG 基座完整；v0.2 = Plot 领域主题所有权修正、空间映射重构，以及 Kernel 能力就绪后的性能与交互；v0.3 = 渐进式 AI 生成与跨域复合候选。

v0.2 的复合范围只限 Plot 自身映射、性能 / 交互语义与 decoration 领域编排；复用 Standard 通用绘图 composite 不算 Plot / Table 领域耦合。具体 Chart type、业务 presentation、dashboard 状态与跨域 composition 不因本 roadmap 进入 Plot。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。

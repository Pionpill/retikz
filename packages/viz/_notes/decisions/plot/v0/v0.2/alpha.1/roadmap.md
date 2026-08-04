# plot v0.2-alpha.1：Spatial Mapping 重构

> milestone 执行路线。长期决策放同目录的 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.2 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design §1 / §2 / §8`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../../_template.md)
> ⚠️ 草案：本 milestone 原计划为「交互地基 + layout transform 地基」，现按 2026-08-04 方向重构为映射基础。原交互方向延后至 alpha.3，旧的 rows-only layout transform 方向不再作为契约输入。

## 目标

在 v0.1 GoG 基座之上，重构 Plot 的空间映射关系，为普通坐标可视化和结构化可视化提供同一条可扩展的映射主线：

1. **统一映射逻辑概念**：用 `Spatial Mapping` 表示“语义内容如何进入空间”的上层能力，但不把坐标映射和结构化算法强行压成一个万能输入输出接口。
2. **保留两类专门契约**：`Coordinate Mapping` 处理维度 / 角色值到空间位置的映射；`Structured Mapping` 处理 `nodes`、`links`、`groups`、`routes` 等命名内容及其结构关系的算法映射。
3. **允许任意结构化内容**：Structured Mapping 不限定为 `rows -> rows`，允许改变数量、顺序、拓扑，并产出位置、尺寸、路由、派生关系和布局元数据等空间化结果。
4. **建立通用局部坐标契约**：为 coordinate、mark、guide、locator 和 structured mapping 提供共同的局部空间语义，包括原点、维度角色、方向、切向 / 法向、边界 / clip 以及点、向量、路径等空间对象的关系。
5. **扩大自定义坐标表达力**：从 dimension、axis 粒度定义任意坐标系，并表达维度的法向 / 切向组合关系；自定义能力与内置坐标系走同一 registry、解析和诊断链路。
6. **保持可追溯与可 lower**：映射结果保留稳定 identity / provenance，并继续进入 Plot 的 channel、scale、coordinate、mark、guide 和 Core lowering 链路，不建立平行 IR 或 `@retikz/struct` 包。

Chart 在本 milestone 中只作为消费者。若 Chart 需求暴露通用映射缺口，可追加到本 milestone 的候选 ADR；Chart type、recipe、presentation 和默认值不进入 Plot。

## ADR 清单

| ADR | 主题                                                                                                                                  | Level | 依赖                                      | 状态   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------- | ------ |
| 01  | **Spatial Mapping 抽象与所有权**：统一映射逻辑概念，划分 Coordinate Mapping / Structured Mapping 的职责、输入输出边界与 registry 关系 | red   | plot v0.1 coordinate / transform registry | 待起草 |
| 02  | **Structured Mapping 内容契约**：命名内容端口、任意 JSON-safe 集合 / 关系、多输出空间化结果、identity / provenance 与确定性           | red   | ADR-01、data view / lineage               | 待起草 |
| 03  | **通用局部坐标与自定义坐标扩展**：局部 frame、维度 / 轴粒度、切向 / 法向组合、coordinate / mark / guide / locator 的共同消费边界      | red   | ADR-01、plot v0.1 coordinate registry     | 待起草 |

旧的 `01-chart-layering.md` 是已 Superseded 的 Chart 草案，保留为历史记录，不作为本 milestone 输入。

## 前置

- **plot v0.1**：Plot IR、channel / scale / coordinate / mark / guide、coordinate / transform registry、scope identity、locator / provenance 和 lowering。
- **data v0.1 beta**：字段解析、数据视图、通用 transform 基础契约和 lineage；Structured Mapping 的内容语义不复制 Data 的数据模型。
- **core / math**：继续提供 renderer-neutral Core IR、基础几何和 lowering 目标；只有移除 Plot 词汇后仍成立的通用几何缺口才下沉。
- **Kernel Runtime**：不是本 milestone 的前置；alpha.1 不实现 Plot 增量 Runtime、事件归一化或 behavior。

## 不在本 milestone 范围

- Plot 性能优化、增量 lowering、retained Scene、Runtime transaction 或缓存策略；这些进入 alpha.2，并等待 Kernel 底层能力。
- Plot 交互优化、事件 / ownership / behavior / presentation 运行时；这些进入 alpha.3，并等待 Kernel headless interaction 能力。
- 完整 tree、network、word cloud、treemap、circle packing、gauge、progress、pictogram 算法集合。
- ChartSpec、`<Chart>`、Chart type、Chart-level presentation 和业务默认值。
- table / geo 的独立包设计，以及跨域 dashboard / workspace 状态。
- 将所有映射统一为带 `unknown` 的万能 definition，或把 Structured Mapping 塞进 Data 的 row-only transform contract。

## 设计边界

```text
任意命名内容 / 关系
  → Structured Mapping（可选）
  → 空间角色、局部布局字段与空间化关系
  → Coordinate Mapping（可选）
  → Mark / Guide / Locator
  → Plot lowering
  → Core IR
```

上图表示共享的映射主线，不要求每个输入都同时经过两种 mapping：普通点图可以直接使用 Coordinate Mapping；network、tree 等可先经过 Structured Mapping，再把局部空间字段交给 Coordinate Mapping 或直接由 mark 消费。两类 mapping 共享 registry 治理、diagnostics、identity / provenance 和 determinism 要求，但保留各自的输入输出契约。

## 退出条件

- Plot 可以用统一的 Spatial Mapping 语言描述 coordinate mapping 与 structured mapping 的关系，同时保留两类专门契约。
- `nodes`、`links` 等命名内容可以作为结构化输入，不再被 rows-only transform 模型限制。
- 映射可以改变数量、顺序或拓扑时，identity、provenance、失败语义和确定性边界仍然清楚。
- coordinate、mark、guide、locator 和 structured mapping 可以消费同一套通用局部坐标语义，不依赖 x / y 或 polar 专用分支才能表达。
- 自定义坐标可以从 dimension、axis 粒度声明角色及法向 / 切向关系，并与内置坐标系走同一扩展路径。
- React、Vanilla 与手写 JSON 对同一映射契约保持等价；结果仍可 lower 到既有 Plot / Core 链路。
- 至少形成可验证的薄纵向闭环，但不以完成任何特定 Chart type 或全量结构化算法为退出条件。

## 执行模式

Plot 三包继续 lockstep：`@retikz/plot` 定义 schema / contract / registry / lowering，`@retikz/plot-react` 与 `@retikz/plot-vanilla` 提供等价 authoring 表面，docs 在公开契约确定后同步。ADR 只冻结版本目标、能力边界和公开契约；文件 scope、实现顺序和测试矩阵放入后续 plan。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../../../_template.md`](../../../../_template.md)。

# plot v0.2 Roadmap

> 本文件汇总 plot v0.2 minor 的路线与 milestone 索引。具体执行记录放各 milestone 的 `roadmap.md`，长期决策放同目录 `NN-*.md` ADR。
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot v0.1 roadmap`](../v0.1/roadmap.md) · [`plot-design.md §5 / §10 / §13`](../../../../architecture/plot-design.md)
> ⚠️ 草案：本 minor 由 2026-07-05「v0.1 GoG 基座完成后的能力轴」讨论开出，待人工 review。

## 定位

**v0.2 承载 plot 的运行时交互与 layout transform / structured visualization 能力。**

v0.1 已完成 GoG 基座：data / encoding / scale / coordinate / mark / stat / coordinate composition / guide / theme 都已进入 PlotSpec 语义。v0.2 不再补图形语法基础件，而是把两条后续能力轴落到可用：

- **交互能力补全**：tooltip、hover、selection、brush、legend interaction、事件回调、locator 与 provenance 的 runtime 消费；交互是 framework/runtime 能力，PlotSpec 只保留 JSON-safe 的意图和稳定 identity。
- **layout transform / structured visualization**：tree、network、word cloud、treemap、circle packing、gauge、progress、pictogram 等结构化算法先产出位置 / 尺寸 / 路由等派生字段，再统一进入 plot 的 channel / scale / coordinate / mark / guide / lowering；不新增 `@retikz/struct` 包。

同时收敛 v0.1 的通用 decoration 呈现：Plot 继续拥有 axis / legend / label 的领域解析、coordinate view 绑定、guide resolve、provenance / locator 与交互意图；Standard alpha.2 就绪后，Plot 把外围 Box Layout 和 Legend 的视觉结构、内部布局与 layout-aware compile 迁到 `@retikz/standard`，不再长期维护固定带宽或字符估算的平行呈现主链。

`@retikz/chart v0.1` 与本 minor 并行迭代：chart 可以拥有 Tier 3 `ChartSpec`，但必须 lower 成 PlotSpec。plot v0.2 新增的 interaction 与 layout transform 能力，可以被 chart v0.1 后续 alpha 消费；chart 不放在 plot v0.2 目录内。

## 前置能力

v0.1 beta 收口时先抽出最小 `@retikz/data`：字段类型、field model、数据引用、dataset normalization、field resolver / parser / formatter、通用 transform 基础接口，以及跨 plot / table / geo 都稳定复用的 channel / scale 词表。

v0.2 默认消费这层共享数据语义；plot 专属的统计 transform、layout transform、coordinate / mark / guide 仍留在 plot。

Standard v0.1 alpha.2 提供通用 Box Layout，并由 ADR-09 提供 Legend 呈现。Plot 可以在领域 schema 保持稳定的前提下，把解析后的 Legend 和外围 decoration item 交给 Standard；若 Standard capability loading、约束测量、artifact 或 provenance bridge 尚未闭环，对应迁移不得以 Plot 私有 fallback 提前实现。

## Milestones

| Milestone                            | 主题                                                     | 模块 / 产出                                                                                                                            | 状态   |
| ------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [v0.2-alpha.1](./alpha.1/roadmap.md) | **interaction foundation + layout transform foundation** | 接通 locator / provenance runtime 消费、交互事件与 overlay 基础；建立 plot layout transform registry 与首批结构化布局的输入 / 输出契约 | 草拟中 |

后续 alpha 依需求拆分：

- tooltip / hover / selection / brush / legend interaction；
- transition / animation 与数据过滤型交互的重 lower 策略；
- 增量 lowering / compile、共享解析上下文与分层物化、依赖失效模型，以及复用 Tier1 static / dynamic runtime 的按需渲染；v0.1 beta.2 只保留 plain spec、稳定 identity 与 owner 边界，不提前冻结 cache / patch API；
- decoration layout 收敛：Plot 统一领域 `LayoutClaim`、coordinate view target、稳定迭代、碰撞避让、优先级与溢出策略；通用 Box allocation、Legend 内部布局与 `IRChild` 测量 / replay 分别消费 Standard 与 Core，不在 Plot 建立第二套容器 solver。v0.1 beta.2 不提前公开未实现的 `maxIterations` / `collision` / `priority` / `overflow` / `target:'view'` 字段；
- Legend 呈现迁移：保留 Plot legend guide、scale / formatter resolution、theme mapping、provenance / locator 与 interaction，解析后构造 Standard Legend 输入；迁移前后可观察行为变化由独立 ADR 冻结；
- tree / network / word cloud / treemap / gauge / progress / pictogram 等 layout transform；
- layout transform 与 chart type 的消费边界。

## 依赖

- **plot v0.1**：GoG 基座、thin Plot、guide/theme、scope identity、locator/provenance、layer zIndex。
- **data v0.1 beta**：共享字段、数据引用、formatter、通用 transform 基础契约。
- **standard v0.1**：alpha.2 Box Layout 与 ADR-09 Legend、capability module 传递消费与领域无关 layout artifact。
- **chart v0.1**：并行消费 plot v0.2 能力，但不作为本 minor 的实现内容。
- **core**：交互 runtime 依赖 hydration / hit-test / event plumbing；layout transform 仍 lower 到既有 core Node / Path / Scope，不绕开 core。

## 与 v0.1 / v0.3 的关系

v0.1 = GoG 基座完整；v0.2 = 交互能力 + 结构化 layout transform；v0.3 = 渐进式 AI 生成 + 跨域复合。

v0.2 的复合范围只限 plot 自身交互 overlay、decoration 领域编排与 layout transform 生成的 mark 组合；复用 Standard 通用绘图 composite 不算 Plot/Table 领域耦合。plot 与 table / diagram / 任意业务内容的领域级 composition 留给 v0.3。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。

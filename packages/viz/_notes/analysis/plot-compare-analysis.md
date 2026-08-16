# Plot GoG 纵向能力对比：ggplot2 / Vega / Vega-Lite / Observable Plot / AntV G2 / VGrammar / VChart vs retikz

> **定位：** 本文只比较 Grammar of Graphics（GoG）底座如何建立并贯通纵向能力轴，为 `@retikz/plot` 的能力完备性、扩展契约和 roadmap 提供参照
>
> **边界：** 不比较传统 chart type 数量、最小配置、默认美观度、gallery 丰富度或新手学习成本；这些属于 [`Chart type-first 横向分析`](./chart-compare-analysis.md)
>
> **快照：** 2026-07-30。retikz 现状以 `@retikz/plot@0.1.0` 和当前 `next-plot` 工作区为基线；目标表示既有 Plot → Core 分层下的长期方向，不是已发布承诺
>
> 关联：[`Plot 总设计`](../architecture/plot-design.md) · [`Plot 可视化完备设计`](../architecture/plot-visualization-complete.md) · [`plot v0.1 roadmap`](../decisions/plot/v0/v0.1/roadmap.md)

## 1. 比较边界

Plot 是 Tier 2 GoG owner。本文所说的“纵向能力”是从数据到最终图形的稳定语法轴及其执行闭环：

```text
Data
  -> Transform / Statistics
  -> Encoding / Channel
  -> Scale
  -> Coordinate
  -> Mark
  -> Guide
  -> Composition / Facet
  -> Selection / Interaction / Animation
  -> IR / Compiler / Lowering
```

每个能力轴都需要同时回答三件事：

1. **表达完整度**：内建语法能否表达该层的常见问题
2. **横向扩展性**：能否通过稳定 contract / definition / registry 增加同类实现
3. **纵向闭环**：新增或内建能力能否经过 schema、解析、dataflow、lowering、diagnostics 与 provenance 到达最终 Scene

因此，Plot 比较的不是“有多少图表名称”。柱状图、气泡图或股票图只是多个纵向能力组合后的结果；传统 type 封装与上手体验由 Chart 负责。

## 2. 对比对象

| 项目                                                                                            | 纳入原因                                             | 本文关注点                                                                     | 不在本文评价的部分                                      |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [ggplot2](https://ggplot2.tidyverse.org/)                                                       | 分层图形语法的理论与实践范本                         | data、aes、stat、geom、scale、coordinate、facet、theme 的正交关系              | R 语言生态与 IDE 体验                                   |
| [Vega](https://vega.github.io/vega/docs/) / [Vega-Lite](https://vega.github.io/vega-lite/docs/) | JSON spec、dataflow 与高层到低层 grammar 编译的标杆  | 可序列化 spec、transform、encoding、scale、composition、selection 与 compiler  | gallery 和面向业务用户的图表选型                        |
| [Observable Plot](https://observablehq.com/plot/features/marks)                                 | mark-first、组合优先的轻量 JavaScript 图形语法       | mark、transform、scale、facet 与 concise authoring 之间的取舍                  | 传统 chart type 目录                                    |
| [AntV G2](https://g2.antv.antgroup.com/en/manual/core/mark/overview)                            | JavaScript 生态中完整 GoG 与 runtime 扩展的代表      | mark / transform / scale / coordinate / composition / interaction 的广度和扩展 | 上层业务图表产品                                        |
| [VGrammar](https://www.visactor.io/vgrammar) / [VChart](https://www.visactor.io/vchart)         | grammar runtime 与 type-first 产品协作的分层样本     | VGrammar 的 grammar / dataflow / animation 能力，以及 VChart 对底座的验证      | VChart 的 type 数量与开箱体验，后者不在两篇文档重复评分 |
| retikz Plot                                                                                     | JSON-safe Plot IR，经 registry 与 lowering 进入 Core | 能力轴归属、内建 / 自定义同路、跨 authoring 一致性和可追溯性                   | Canonical Type、Chart Pattern 与新手封装                |

Highcharts、ECharts、Recharts 不进入本文主表。它们的主要竞争力是 type-first 表层能力，与 Plot 的 GoG 纵向完备性不在同一评价坐标系。

## 3. 各项目的纵向结构

### 3.1 ggplot2：分层语法的概念基准

ggplot2 以 data、aesthetic mapping、stat、geom、position、scale、coordinate、facet 和 theme 建立清晰分层。它最值得借鉴的不是 API 形式，而是“统计语义、视觉映射与几何呈现相互独立”的建模纪律。

对 retikz 的启示：

- Transform / Statistics 不应藏进某个 Chart type 或 Mark renderer
- Mark 与 Scale / Coordinate 不应互相私有化
- facet / composition 是正式语法层，不是 demo 拼装
- 扩展应明确落在某个能力轴，而不是增加跨层特判

### 3.2 Vega / Vega-Lite：可序列化 grammar 与 compiler

Vega 提供较底层的声明式 dataflow / scene grammar，Vega-Lite 用更紧凑的 JSON spec 表达 encoding、transform、mark、selection 和 composition，再编译为 Vega。

对 retikz 的启示：

- JSON-safe spec 可以成为持久化、工具、LLM 与跨框架的共同真源
- 高层省略与智能默认必须在 compiler / lowering 中确定性展开
- interaction / selection 仍应是可描述、可分析的语法，而非 renderer 回调集合
- 高层编译产物需要 diagnostics、identity 与 provenance，不能成为黑盒

### 3.3 Observable Plot：mark-first 的组合效率

Observable Plot 不提供大型 chart type 目录，而是用 marks、transforms、scales 和 facets 直接组合常见图形。它证明 GoG 底座可以通过少量正交 primitive 获得很高的日常表达效率。

对 retikz 的启示：

- Plot 的内建 Mark 数量不应等同于可表达图表数量
- layering 与 mark-local transform 是高频组合能力
- concise authoring 可以由 sugar 提供，但不能替代正式 IR

### 3.4 AntV G2：工程化 GoG 与运行时广度

G2 在 JavaScript 运行时中提供 Mark、Transform、Scale、Coordinate、Composition、Interaction 等完整语法面，并覆盖较丰富的 specialized marks 与组合场景。

对 retikz 的启示：

- GoG 的竞争不只在 schema 设计，还在每个能力轴是否真正可用
- interaction、animation、guide 与 composition 不能长期停留在外围 helper
- registry 扩展必须进入正常 dataflow 与 rendering pipeline，而不是内建白名单后的补丁

### 3.5 VGrammar / VChart：grammar runtime 与产品层协作

VGrammar 提供 grammar、dataflow、interaction 与 animation 底座，VChart 在其上提供传统 type-first 产品体验。本文只把这组项目作为“纵向底座如何支撑上层产品”的参照，不在这里评价 VChart 的 chart type 目录。

对 retikz 的启示：

- Plot 的 animation / interaction contract 会直接限制 Chart 的长期上限
- Chart 可以横向提供类型专用 definition，但执行机制仍必须来自 Plot
- 底层 grammar 与上层 type 产品可以分包演进，不需要复制 pipeline

## 4. GoG 纵向能力矩阵

下表比较的是“该层是不是一等能力、如何与上下层闭环”，不是图表 gallery 的最终数量。

| 能力轴                     | ggplot2                               | Vega / Vega-Lite                               | Observable Plot                          | AntV G2                                | VGrammar / VChart                    | retikz Plot 目标                                                                          |
| -------------------------- | ------------------------------------- | ---------------------------------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Data / Dataflow            | data frame 为单图入口，生态数据处理强 | 内建 data source、transform 与 signal dataflow | JavaScript data 直接进入 mark            | runtime data 与 transform 较完整       | grammar dataflow 是核心底座          | `@retikz/data` 提供引用、model、transform、statistics 与 lineage，Plot 只消费正式数据契约 |
| Transform / Stat           | stat 与 position 是一等层             | transform 丰富，高层 spec 可编译               | mark transform 简洁高频                  | transform 目录和组合较广               | transform 与 animation dataflow 联动 | Data / Plot transform 分责，内建与自定义 definition 同路解析                              |
| Encoding / Channel         | aes mapping 是核心抽象                | encoding channel 是 Vega-Lite 核心             | channel options 接近 mark authoring      | encode / channel 能力完整              | mark encode 与 grammar element 联动  | 字段 / 常量、scale descriptor 与 Core delivery 共用 channel contract / registry           |
| Scale                      | scale 与 guide 联动成熟               | scale、resolve 与多视图联动强                  | 常用 scale 推断简洁                      | scale 类型与扩展较完整                 | grammar scale 支撑上层 type          | scale definition、domain / tick、palette、channel 与 legend 闭环                          |
| Coordinate                 | coord 与 geom 解耦，种类适中          | Vega-Lite 主干较克制，Vega 更底层              | 主要覆盖常用 Cartesian / projection 场景 | 坐标与变换广度强                       | grammar coordinate 支撑跨端图表      | coordinate 是 registry capability；多 view 共用 composition 语义，不由 Mark 私造空间      |
| Mark / Geometry            | geom 体系成熟且可扩展                 | primitive / composite mark 分层                | mark-first，组合效率高                   | primitive 与 specialized mark 都较丰富 | grammar mark 被 VChart type 复用     | 少量抽象 Mark + 横向 `MarkDefinition`；专用 Mark 仍走同一 registry / lowering             |
| Guide                      | scale / theme 联动成熟                | axis / legend 配置与 resolve 完整              | 常用 axis / legend 简洁                  | guide 与 interaction 较丰富            | 上层图表补充产品化 guide             | axis / legend 已成正式 IR；长期需要与核心能力同等级的扩展 contract                        |
| Composition / Facet        | facet 是标杆能力                      | layer、concat、repeat、facet 完整              | facet 与 layering 直接                   | composition / facet 广度强             | grammar layout 支撑 common chart     | facet、tracks、overlay、多轴与 resolve 共用 composition；继续补嵌套与 arrangement 扩展    |
| Selection / Interaction    | 原生较弱，通常由外部生态补充          | selection / parameter 可进入 spec              | 交互偏轻，常由宿主组合                   | interaction 是显著强项                 | grammar interaction 与上层事件能力强 | locator / provenance 是基础；仍需 selection state、hit-test、事件与视觉编码闭环           |
| Animation / Transition     | 非核心赛道                            | 支持有限，Vega signal 更底层                   | 非主要能力                               | 动画与运行时结合较成熟                 | animation 是主要强项                 | 应复用 Core animation，但需先定义数据身份及 enter / update / exit 语义                    |
| Spec / Compiler / Lowering | 运行时对象，不以纯 JSON 为目标        | JSON spec 与 compiler 是标杆                   | JavaScript options 可含函数              | runtime API 与 spec 混合               | grammar spec 最终进入自有 runtime    | JSON-safe operation 与 runtime definition 分离，唯一出口为 IRPlot → Core IR / Scene     |
| Extension mechanism        | ggproto / extension package 生态成熟  | compiler 内建为主，用户扩展相对受控            | JavaScript 函数组合灵活                  | runtime grammar extension 较强         | grammar component / transform 可扩展 | contract → definition → registry → pipeline → diagnostics → provenance 必须形成统一闭环   |

## 5. retikz Plot 纵向完备性审计

本节只评当前能力轴，不把 Chart 尚未提供 type 封装记为 Plot 缺陷。

| 能力轴                  | 当前基础                                                    | 横向扩展状态                                   | 主要纵向缺口                                                             |
| ----------------------- | ----------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Data                    | 外部数据引用、model / format、字段路径与 lineage 基础       | Data transform / statistics 有正式 definition  | 多源 join、命名派生 view、异步 / 流式 dataflow 尚非一等模型              |
| Transform / Statistics  | bin、stack、aggregate、density、smooth、relate 等主干已覆盖 | reducer、selector 与 transform registry 已建立 | filter / calculate、window、fold / pivot、join 等长尾 dataflow           |
| Scale                   | 定量、离散、时间、颜色与 palette 主干已覆盖                 | `defineScale` 与内建同路                       | 更多自动推断、长尾 scale 与复杂 guide 联动                               |
| Coordinate              | Cartesian / polar 主干与多个 coordinate view                | `defineCoordinate` 已建立                      | geo、parallel 等专用空间及高级 guide 协作                                |
| Encoding / Channel      | 位置与非位置通道、字段 / 常量、scale descriptor             | channel registry 与 Core delivery 统一         | 条件编码、交互状态编码、可复用 encoding 配方                             |
| Mark                    | point / path / interval / relation / reference 抽象主干     | `MarkDefinition` 支持类型专用横向实现          | candlestick、geo shape、层级 / graph 等具体 provider 与相应底层能力      |
| Guide                   | axis、legend、theme / palette / layout 已联动               | 尚未达到 Mark / Scale 同等级开放度             | `defineGuide`、自定义 legend item / template、交互 guide                 |
| Composition             | facet、tracks、overlay、多轴、resolve 与 provenance 已建立  | arrangement / composition 扩展仍有限           | 复杂嵌套、facet + tracks 协作、自定义布局 solver                         |
| Selection / Interaction | locator 可反查 datum、series、view、facet、track            | 已有可追溯基础，尚无完整 interaction registry  | selection grammar、hover / tooltip / brush / zoom、事件到状态与编码闭环  |
| Animation               | 可依赖 Core animation 能力                                  | Plot 尚未形成数据语义 contract                 | identity、interpolation、enter / update / exit 与 composition transition |
| IR / Lowering           | React、Vanilla、JSON 共用 IRPlot，统一 lower 到 Core      | runtime definition 不污染 JSON IR              | 复杂组合 diagnostics、definition 部署与完整 inspection 工具              |

## 6. 关键判断

### 6.1 已形成的结构优势

- **能力轴归属清晰**：Data、Transform、Scale、Coordinate、Channel、Mark、Guide、Composition 与 Interaction 不互相私有化
- **内建与自定义同路**：具体 provider 通过 definition / registry 被同一 pipeline 消费
- **可序列化边界稳定**：operation / spec 保持 JSON-safe，函数实现留在 runtime options
- **统一 lowering**：Plot 不拥有 renderer，所有图形最终进入 Core IR / Scene
- **可追溯**：locator、provenance 与 lineage 沿 dataflow / lowering 保留来源

这些优势决定 Plot 的扩展上限，但不能替代实际功能。一个 registry 存在，不代表对应能力轴已经完备。

### 6.2 优先缺口

1. **Selection / Interaction**：目前最明显的纵向断点；定位能力已经有了，状态语法、事件输入和视觉反馈还没有闭合
2. **Guide / Composition 横向扩展**：内建功能可用，但 extension contract 落后于 Mark / Scale / Coordinate
3. **Animation data semantics**：需要在复用 Core animation 前先定义数据身份和 transition 语义
4. **成熟 dataflow 长尾**：window、join、fold / pivot 等会影响统计与复合图形上限
5. **专用空间与 provider**：geo、parallel、candlestick、层级 / graph 应按既有能力轴补齐，不新增平行 pipeline

### 6.3 明确取舍

- 不用 Chart type 数量衡量 Plot 完整度
- 不把“最少几行画出柱状图”作为 Plot 的核心竞争指标
- 不追 ECharts / VChart 的极限大数据或 renderer 数量；性能定位仍是中等数据量 + Canvas 后端兜底
- 不因 Chart 需要某种专用图形，就把类型语义写进 Plot 核心 contract；能符合既有 contract 的具体 provider 可以横向加入
- 主攻方向是 Vega 式 JSON grammar / compiler 边界、G2 式能力轴广度与 retikz 自身的 Core IR / Scene 解耦

## 7. 与 Chart 分析的分工

Plot 文档回答：

> 从 Data 到 Scene 的每个 GoG 能力轴是否可表达、可扩展、可执行、可诊断、可追溯？

Chart 文档回答：

> 用户能否通过熟悉的 type 快速覆盖常见图表，并在低学习成本下获得完整配置？

两者只在边界处相接：Chart type 展开为 Plot 配方，Chart 提供或消费的具体 definitions 进入 Plot registry。Plot 不负责 Canonical Type / Pattern 目录，Chart 不重新定义 GoG 能力轴。

## 8. 更新记录

- **v0.1–v0.6**（2026-06-06 至 2026-07-15）：以综合绘图库评分为主，混合比较图表类型、性能、API、GoG、AI 与人群体验
- **v0.7**（2026-07-30）：按 Plot / Chart 分层重构；移除 Highcharts、ECharts、Recharts 及 type-first 体验评分，改为 GoG cohort 与纵向能力闭环分析；基线更新为 `@retikz/plot@0.1.0`

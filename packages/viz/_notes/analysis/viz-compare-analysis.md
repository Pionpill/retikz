# Viz 功能比较 Prompt

本文件统一维护 Viz 组 Data、Plot、Chart、Table 的比较 prompt、对象与维度，不保存比较结果。统一方法、能力状态、证据要求与报告格式遵循 [全仓功能比较方案](../../../../notes/feature-comparison.md)。

## 执行指令

> 请分别比较 Data 数据层、Plot 图形语法层、Chart 图表封装层与 Table 表格层的当前实现及下列同层框架，按本文边界逐项核验，遵循全仓方案生成含分类均分和总均分的 10 分制表格与最多五条简要总结。生成一份包含四部分的报告，结果写入 `notes/reports/feature-comparison/<YYYY-MM-DD>-viz-<short-commit>.md`，不写回本文件；仅调研，不修改实现或自动执行性能测试。

## 输出格式

- Data、Plot、Chart、Table 各一张独立的 10 分制评分表，各自计算分类均分、总均分与能力完备性；不计算跨领域总分。正文表后合计最多五条重要发现，评分锚点与证据要求遵循全仓方案。
- 列顺序：分类、比较项、各外部框架分数、Retikz 现状、Retikz 规划、备注。外部框架列只放分数或 `—`，差异、依据与限制集中在最后的备注栏。
- 同一分类只在第一行填写分类名称，后续行留空；分类末尾增加“分类名 · 均分”，分类汇总后增加“总均分”，其下增加“能力完备性”，汇总值加粗并保留一位小数。
- 分类均分是该分类有效分数的算术平均；总均分是有效分类均分的等权平均，使用未舍入值计算后统一保留一位小数。`—` 不按零分处理；整类无有效分数时不参与总均分。
- 备注注明未评分项及总均分的有效分类数 / 全部分类数。覆盖范围不同的总均分仅供概览，不作严格排名；规划分仅评估 roadmap 与明确长期计划完成后的预期程度，备注列列出依据、前提和不确定性；不将规划当作已实现能力。
- 详细证据放折叠区或同目录 ignored 附件，生成结果不写回 prompt。

## 分层范围

本文件统一维护四个独立比较任务，合并的是比较方案，不是代码包或职责。Data 是共享数据底座，Plot 是图形语法底座，Chart 是 Plot 的高层图表封装；Table 独立比较表格语义、排版与接入，不视为 Plot 的子层。各部分选择各自同类项目，不把封装图表库与图形语法库混排。

- Data：只评价宿主无关的数据模型、字段、变换、统计、执行和数据来源。
- Plot：只评价图形语法、视觉组合、领域运行时与输出；数据算法的广度归 Data，Plot 只评价数据结果与视觉语法的接入。
- Chart：只评价高层 recipe、图表家族、作者接口、默认外观和整图体验；可绘制不等于已有图表封装。
- Table：评价表格语义、行列布局、单元格与表格展示；通用数据操作归 Data，表格如何消费结果归 Table。
- 通用渲染归 Kernel / Render。报告可以评价宿主实际可消费的输出能力，但必须注明依赖，不把同一底层闭环在多层重复算作新增能力。
- 各层独立列项、定分母和计数；继承能力只描述接入体验，不重复统计底层算法、Scale 或后端本身。

## Data：数据处理比较

| 比较对象                                                                   | 参考角色                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Arquero](https://idl.uw.edu/arquero/api/)                                 | 表式数据变换、聚合、重塑与表达式扩展                              |
| [D3 数据模块](https://d3js.org/d3-array)                                   | d3-array 等轻量计算工具；逐项注明具体模块，不把整个 D3 当数据引擎 |
| [Vega transforms / dataflow](https://vega.github.io/vega/docs/transforms/) | 声明式数据处理与响应式数据流；仅比较数据子系统                    |

比较角度：数据模型与字段解析、排序/派生、分组聚合、统计采样、关联与重塑、开放算子、同步/异步及外部执行接入、lineage/provenance、诊断、增量数据流、耗时与内存。不要把普通 Promise 执行当作增量数据流，把外部 executor 契约当作已交付数据库连接器，或把 lineage 事件当作逐行来源证据。

先读 [Data roadmap](../decisions/data/v0/roadmap.md)、[Data 完备设计](../architecture/data-capability-complete.md) 与相关 ADR，再核对源码；已有本地/外部/hybrid 执行不得重复计入规划。各数据项目定位不同，不要求都采用 Retikz IR 或 registry。

## Plot：图形语法比较

范围是图形语法的纵向能力与扩展闭环；传统图表类型数量和新手默认体验在 Chart 部分比较。通用绘图及 runtime 能力标明真实依赖 owner。

| 比较对象                                                                                        | 参考角色                                              |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [ggplot2](https://ggplot2.tidyverse.org/)                                                       | 分层图形语法、统计与几何关系                          |
| [Vega](https://vega.github.io/vega/docs/) / [Vega-Lite](https://vega.github.io/vega-lite/docs/) | 分别比较底层 grammar 与高层编译，不合并成一个能力状态 |
| [Observable Plot](https://observablehq.com/plot/)                                               | Mark 组合、transform 与简洁作者接口                   |
| [AntV G2](https://g2.antv.antgroup.com/)                                                        | GoG 能力广度与 runtime 扩展                           |
| [VGrammar](https://www.visactor.io/vgrammar)                                                    | Grammar、dataflow 与动画                              |

比较角度：数据结果接入、Encoding / Channel、Scale、Coordinate、Mark、Guide、Facet / Composition、Selection / Interaction / Animation、IR / Compiler / Lowering，以及下述渲染性能与后端可行性。每条能力轴分别检查表达完整度、公开扩展入口、内置与自定义是否同路，以及解析、数据流、输出、诊断和追溯是否贯通。

## Chart：上层图表封装比较

| 比较对象                                                  | 参考角色                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| [Highcharts](https://www.highcharts.com/docs/)            | 成熟图表家族、配置与产品默认；注明可选模块，不合算 Stock/Maps/Gantt |
| [Apache ECharts](https://echarts.apache.org/handbook/en/) | 类型覆盖、组件配置与组合                                            |
| [Recharts](https://recharts.github.io/en-US/)             | React 声明式图表组合与渐进定制                                      |
| [VChart](https://www.visactor.io/vchart)                  | 基于图形语法的上层图表封装、呈现与跨端接入                          |

[Flint Chart Gallery](https://microsoft.github.io/flint-chart/#/gallery/vegalite) 只作 family、名称与跨库分类参考，不作为同级框架评分。

比较角度：图表家族与数据角色、内置类型与组合 Pattern、最小到高级配置的连续性、混合图与 Plot 扩展出口、主题与默认视觉、标题/注释/来源等完整展示、导出与可访问性、交互接入、文档与 gallery 发现性、不同作者接口的语义一致性。独立评价封装完成度，不以名称数量代替覆盖，不以 Plot 能画 Line/Bar 推断 Chart 已有 Line/Bar recipe。

先读 [Chart roadmap](../decisions/chart/v0/v0.1/roadmap.md)、[Chart 总设计](../architecture/chart-design.md) 与 [封装完备设计](../architecture/chart-encapsulation-complete.md)，再查公开入口与实际输出。区分内部 recipe Definition、公开 provider contribution 与第三方扩展入口，不把内部 registry 视作公开 recipe 注册机制。

## Table：表格能力比较

按静态排版、数据分析、Headless 接入三个问题域比较，不把编辑器功能与绘图底座混成总排名。

| 比较对象                                                                                                                              | 参考角色                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [Typst Table](https://typst.app/docs/reference/model/table/)                                                                          | 内容测量、轨道、合并与文档输出                 |
| [tabularray](https://ctan.org/pkg/tabularray)、[booktabs](https://ctan.org/pkg/booktabs)、[longtable](https://ctan.org/pkg/longtable) | 分别考察样式、出版表线、分页，注明组合使用条件 |
| [gt](https://gt.rstudio.com/) / [Great Tables](https://posit-dev.github.io/great-tables/)                                             | 表格语法、语义区域、格式化与样式选择           |
| [VTable](https://visactor.io/vtable/)                                                                                                 | List / Pivot、单元格内容与大表展示             |
| [AntV S2](https://s2.antv.vision/)                                                                                                    | 多维分析、行列头与指标语义                     |
| [TanStack Table](https://tanstack.com/table/latest)                                                                                   | Headless 行列模型与框架适配                    |

比较角度：语义区域、List / Pivot、数据与格式化、行列轨道与 span、内容测量、表线与样式、分页与重复表头、Cell 内容扩展、可视编码与 Legend、布局输出和追溯。滚动、虚拟化、排序筛选、选择编辑分别注明计算层与宿主职责；JSON-safe 契约和函数型 API 按各自用途评价，不直接互判优劣。

先读 [Table roadmap](../decisions/table/v0/roadmap.md)、[Table 总设计](../architecture/table-design.md) 与 [表格完备设计](../architecture/table-visualization-complete.md)，再核验公开入口与实际输出。Data 的统计变换不重复计分；分页排版、虚拟滚动和编辑能力分别评价，不把宿主能力记为 Table 原生能力。

## 渲染性能与后端可行性

本节维护 Plot 渲染性能比较任务；Chart / Table 只补充其封装或表格特有成本，不重复计算底层后端能力。不保存历史性能结论。先阅读 [性能与增量运行时设计](../../../../notes/architecture/performance-design.md)、[Plot roadmap](../decisions/plot/v0/roadmap.md) 及相关架构设计，再核验当前 Mark lowering、pipeline、Scene 契约和 Render 实现。历史阈值、图元数量与后端假设不得直接作为当前事实。

| 比较项           | 核验内容                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据到图元的规模 | 分别追踪 point、interval、sector、line、area 的数据量、series 数、IR 节点数、路径步数和 Scene 图元数；区分“一个长路径”和“大量独立图元”，不只比较图元数量        |
| Guide 与文字成本 | 单独统计 axis、grid、label、facet 和逐点标注；刻度固定时与数据量无关不代表所有文字成本恒定                                                                      |
| 静态编译与输出   | 分离数据变换、lowering、Core 编译、IR/Scene 序列化、首次渲染、内存与输出体积；更换 GPU 后端不能直接消除 CPU 编译或数据传输成本                                  |
| 动态更新与命中   | 区分增量计算、全量重绘、局部刷新、动画、pan/zoom 与 hit-test；核验缓存、空间索引和更新范围，不沿用旧实现的复杂度判断                                            |
| Canvas 合批      | 核验当前是否合批及可优化范围；分析 style、z-order、透明度/混合、裁剪、逐图元身份、动画与命中语义对合批的限制                                                    |
| 聚合与抽稀       | 比较 binning、密度聚合、LTTB 等现有能力或有依据的规划；说明视觉误差、极值保留、交互映射及图元规模变化，不把减少数据量当作无损优化                               |
| GPU 与混合后端   | 比较 SVG、Canvas 2D、WebGL、WebGPU 及 hybrid 的实际支持；核验 instancing、上传成本、文字/字形、曲线细分、渐变、虚线、连接样式、箭头和裁剪的实现难度与语义一致性 |
| 部署与输出约束   | 核验浏览器支持、依赖体积、资源生命周期、设备丢失、SSR、导出、分辨率、可访问性与命中映射；Canvas 2D 可能由浏览器 GPU 加速，不能等同软件渲染                      |

可将 [Plotly.js](https://plotly.com/javascript/)、[deck.gl](https://deck.gl/)、[ECharts](https://echarts.apache.org/) 作为 GPU、混合分层与大数据绘制的专项参考，不要求纳入全部图形语法维度。需要更多案例时再查 MapLibre、Three.js 文字 overlay、sigma.js 或 regl-scatterplot 的当前官方实现；区分原生支持、选装扩展与应用自行组合。

分析先定位实际瓶颈，再比较 Canvas 合批、Plot 聚合/抽稀与 GPU 后端的收益、成本和适用边界；不预先认定固定优化顺序、WebGPU 优于 WebGL、必须 hybrid，或某类图形不值得 GPU。Hybrid 需同时核验跨层变换、裁剪、顺序、事件、导出及文字同步，不能仅凭 Scene 后端中立就认定可以无成本分层。

职责边界：数据聚合与抽稀的算法覆盖计入 Data，Plot 只核验视觉接入与规模影响；绘制合批与后端执行归 Render；通用编译与 Scene 契约归 Kernel。Plot 通过公开契约消费，不建立平行渲染路径。新增 Scene 能力、GPU 包形态或降级策略必须有对应架构设计，不能由比较报告代替决策。

默认只做源码、官方资料和已有可比测量的分析，不运行性能测试。只有明确获得性能测试及范围授权后，才按已确认的数据规模、Mark/series、文本量、视口、设备像素比、浏览器/硬件、版本、预热与采样方法进行测试；可用 1k/10k/100k 作为待确认的规模梯度，不能当作性能阈值。报告分别给出编译、首次绘制、更新、命中、内存与体积数据；没有可比证据时不打速度分、不承诺帧率或加速比。

输出仍使用统一评分表、简短备注和表后最多五条重要发现；性能方法、环境、数据及 GPU 可行性细节放同目录 ignored 证据附件，不另维护独立的性能分析正文。

规划评分口径：先核对源码，roadmap 中已实现的项目计入现状，不重复加分。规划分保留现状基线，仅按尚未交付且有明确目标的 roadmap / 长期计划调整；没有新增计划时与现状相同，目标过泛或无法判断时写 `—`。候选方向须标为条件性预期，不能当作确定承诺。现状和规划分别计算分类均分与总均分。

规划评分前必须实际阅读所属模块的 roadmap、相关架构设计及命中 ADR 全文，并核对当前源码；备注或证据区列出具体文档、状态、目标与未实现部分。不得仅凭标题、用户提到的方向、通用经验或理论可扩展性猜测规划能力和分数。文档缺失、目标不明确或旧设计与当前架构冲突且未解决时，对受影响规划项写 `—` 并说明缺口；没有新增目标且现状证据充分的项目可维持现状分。

在“总均分”下一行增加“能力完备性”，格式为 `已实现项数/全部比较项数 → x.x/10`，计算公式为已实现项数 ÷ 全部比较项数 × 10，各项等权。按证据逐项判断是否已有可用能力闭环，不按评分阈值或有无评分机械计数；能力已实现但缺性能实测分仍可计入。明确缺失、仅有理论可扩展性或需另行开发闭环的项目不计入；未核验项保留在分母、不计入分子，因此有未知项时须标明“已确认下限”，不能据此认定其余均不支持。规划列以已实现能力为基线，再并入有 roadmap 与架构设计依据的新增闭环，去重计数，标注为目标覆盖而非已交付。详细计数依据放折叠区。

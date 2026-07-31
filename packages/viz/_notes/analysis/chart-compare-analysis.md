# Chart type-first 横向分析：Highcharts / ECharts / Recharts vs retikz

> **定位：** 本文只比较 type-first 图表库的横向覆盖、完整配置表面、默认体验、文档发现性和学习成本，为 `@retikz/chart` 的类型封装与 taxonomy 提供参照
>
> **边界：** 不比较 Transform、Scale、Coordinate、Mark、Guide、Composition 等 GoG 纵向能力是否完备；这些属于 [`Plot GoG 纵向能力对比`](./plot-compare-analysis.md)
>
> **快照：** 2026-07-30。`@retikz/chart` 尚未实现，retikz 列描述长期目标，不是当前能力评分或 v0.1 类型承诺
>
> 关联：[`Chart 总设计`](../architecture/chart-design.md) · [`Chart 封装完备设计`](../architecture/chart-encapsulation-complete.md) · [`chart v0.1 roadmap`](../decisions/chart/v0/v0.1/roadmap.md)

## 1. 分析问题

Chart 面向希望“先选择熟悉图表，再调整配置”的用户。它需要回答：

1. 常见分析目的能否快速映射到熟悉的 chart type 或文档 Pattern
2. 最小配置是否足够短，同时能否继续设置 mark、scale、guide、theme、Plot label、layout 与数据角色
3. 默认结果是否可用，类型专属约束是否清晰
4. 混合图、额外 Mark / Transform 与自定义 provider 是否有连续学习路径
5. React、Vanilla、JSON 与 LLM 是否共享同一份稳定语义
6. 类型目录如何保持丰富而不让 public `type` union 无限膨胀
7. 单个 Chart 能否选择绘制 title、caption、source 等完整展示内容，而不依赖宿主另行拼装

这里的“横向丰富度”不只等于 type 数量，而是：

```text
Canonical Type
  + Chart Pattern / modifier
  + 完整配置表面
  + Plot members / definitions
  + 文档与 gallery 发现路径
```

## 2. 对比对象

### 2.1 Highcharts：成熟 type 与产品化默认

[Highcharts Chart Types](https://www.highcharts.com/docs/chart-and-series-types/chart-types) 以 chart / series type 加完整配置对象覆盖 line、area、column、pie、stock、map 等成熟场景，并围绕 axis、tooltip、legend、data label、annotation 与 module 提供产品化能力。[Options Reference](https://api.highcharts.com/highcharts/) 还把 title、subtitle、caption、credits、chart background / border / spacing 建模为完整 Chart 的组成部分，其中 caption 会进入导出结果。

主要价值：

- type 入口与完整配置并不冲突
- 金融、区间、统计等场景可以拥有专属数据角色与默认
- 默认视觉和文档按 family 组织，传统用户容易检索
- 模块化扩展可以扩大横向覆盖，而不要求所有能力进入单个 core
- 单图展示内容与 plot area、交互模块可以分别配置

对 retikz 的限制：Highcharts 的配置和 renderer runtime 强绑定，没有 `ChartSpec -> Plot / Standard -> Core` 的分层，也不以 React / Vanilla / JSON 同一 IR 为目标。

### 2.2 Apache ECharts：横向广度与 option 完整性

[ECharts](https://echarts.apache.org/en/index.html) 以 option、series type、component 和大量智能默认覆盖基础、统计、金融、关系、层级、流动、地理等广泛图表。其 [Waterfall 示例](https://echarts.apache.org/handbook/en/how-to/chart-types/bar/waterfall/) 也说明常用市场名称可以由已有 series 组合，而不必全部成为新 type。顶层 option 把 title、legend、tooltip、toolbox、graphic、aria 等作为并列 component；title 同时支持 text、subtext、背景、边框和 padding，而 loading 由运行时实例方法控制。

主要价值：

- 大型 type / component 目录提供很强的“知道名称即可找到入口”体验
- series、axis、legend、tooltip、visualMap、dataset 等形成完整配置表面
- 文档会为组合出来的常用图表保留独立入口
- custom series 与 extension 为长尾场景提供出口
- 静态可绘制 component 与 loading 等运行时状态有明确区分

对 retikz 的限制：`series[]` 与 series-local data 不符合 Plot 的单根 data 结构；option 还可包含 callback 与运行时状态，不能直接作为纯 JSON Chart IR。

### 2.3 Recharts：React 组件树与渐进式组合

[Recharts](https://recharts.github.io/en-US/api/) 用 `<LineChart>`、`<BarChart>` 等容器和 `<Line>`、`<Bar>`、`<XAxis>`、`<Tooltip>` 等子组件组合图表。

主要价值：

- Chart 容器和子成员对 React 用户直观
- 用户可以从最小容器逐步增加 axis、legend、tooltip、reference 与额外 series
- 组件文档天然形成可搜索的配置目录
- 混合图通过 JSX composition 表达，探索成本低
- Legend、Tooltip、LabelList、ReferenceLine / Area 等图内成员完整，但 title / caption / credits 通常由 React 宿主组合

对 retikz 的限制：ReactNode、callback 和组件生命周期不能成为 framework-neutral、JSON-safe 的 IR。retikz 只能借鉴 authoring 手感，JSX children 必须落回正式 ChartSpec。

### 2.4 为什么不再比较 Vega / G2 / VChart

Vega / Vega-Lite、Observable Plot、AntV G2 与 VGrammar / VChart 在 [`Plot GoG 纵向能力对比`](./plot-compare-analysis.md) 中作为 grammar cohort 研究。Chart 文档不再重复评价它们的 Mark / Transform / Scale 或 compiler；这里仅研究 Highcharts、ECharts、Recharts 代表的 type-first 用户表面。

## 3. 横向图表覆盖

下表比较用户能否通过直接入口发现和表达常见图表家族。它不统计底层 Mark 数量，也不冻结 retikz 的首批 Canonical Type。

| 图表家族                                           | Highcharts                   | ECharts                                  | Recharts                            | retikz Chart 目标                                                                   |
| -------------------------------------------------- | ---------------------------- | ---------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| 基础 Cartesian：line / area / bar / scatter        | type / series 完整，默认成熟 | type / series 完整，组合丰富             | 对应 Chart + series 组件直接        | 用少量 Canonical Type 覆盖主干，方向、堆叠、平滑等优先作为 Pattern / modifier       |
| Part-to-whole / polar：pie / donut / radar / gauge | 常见类型完整                 | 类型和配置广度强                         | pie / radar 等组件可组合            | type 或 Pattern 必须映射到稳定 Plot 配方，不为纯样式别名扩张 type                   |
| 统计 / 分布：histogram / boxplot / density / error | series / module 覆盖较成熟   | type、dataset transform 或组合覆盖       | 常需手工数据预处理和 primitive 组合 | 用类型数据角色 + 隐式 Transform / Mark recipe 降低统计配置成本                      |
| 金融 / 区间：candlestick / OHLC / range            | Stock 产品线和 series 强     | candlestick 等直接入口                   | 通常依赖自定义 shape / 组合         | Canonical Type 可绑定 Chart 提供的 Plot `MarkDefinition`，但仍经 Plot registry 执行 |
| 关系 / 流动：graph / Sankey                        | 模块或专门 series            | graph、Sankey 等覆盖广                   | 非核心，需要第三方或手工组合        | 只在 Plot / Data / Core 能力闭环后提供 type；Chart 不私造 layout pipeline           |
| 层级：tree / treemap / sunburst                    | 模块覆盖                     | type 目录较完整                          | 非核心                              | 依赖 Plot layout transform 与 Mark；type 只封装已闭环配方                           |
| Geo / map                                          | Maps 产品线                  | geo / map 体系较完整                     | 非核心                              | geo owner 未确认前不承诺 type                                                       |
| 混合图 / 多系列                                    | series 组合成熟              | `series[]` 与多 coordinate 组合灵活      | JSX children 组合直观               | 保持某个 type 为明确主体时追加 Plot members；主要意图变化后直接使用 Plot            |
| Annotation / reference / labels                    | 完整配置与模块               | component / markLine / markArea 等丰富   | Reference 组件直观                  | 复用 Plot Guide / Reference Mark / Label，不建立 Chart 私有图元                     |
| Interaction / animation                            | 默认交互成熟                 | tooltip、dataZoom、brush、animation 等广 | 依赖 React 事件与组件能力           | Chart 只封装 Plot / Core 已有交互能力，不用 type 私造运行时路径                     |

横向覆盖的目标不是让 retikz 的 Canonical Type 数量追平 ECharts。完整覆盖应允许每个常见用户意图得到明确结论：

- 由 Canonical Type 直接支持
- 由某个 type + Chart Pattern / modifier 支持
- 在 type 核心配方上追加 Plot 内容支持
- 应直接使用 Plot
- 底层 capability 尚缺，明确不支持或延期

## 4. 配置完整性与上手难度

| 维度              | Highcharts                                                          | ECharts                                              | Recharts                                                 | retikz Chart 目标                                                            |
| ----------------- | ------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 第一心智模型      | 选择 series type，再填 chart options                                | 选择 series type，再组合 option components           | 选择 Chart 容器，再放 JSX children                       | 选择 Canonical Type，填写数据角色与差异配置                                  |
| 最小配置          | 较短，默认完成度高                                                  | 基础图较短，series / axis 配置直观                   | JSX 直观，但完整图通常需要多个子组件                     | sparse ChartSpec；type 隐式补齐完整 Plot recipe                              |
| 完整配置表面      | style、axis、legend、tooltip、label、annotation 与 Chart shell 成熟 | option surface 极广，静态 component 与运行时能力并存 | 每个子组件 props 清晰，但 title / caption 等依赖宿主组合 | 图本体沿用 Plot 结构；单图展示使用 Chart 语义并复用 Standard，不裁剪底层能力 |
| 默认质量          | 产品化程度高                                                        | 类型默认与主题成熟                                   | 默认较轻，常依赖应用样式                                 | type 提供结构配方与表现性默认；核心配方不可撤销，表现默认可关闭 / 替换       |
| 类型专属配置      | series options 清晰但目录较大                                       | 各 series / component option 很丰富                  | 由组件 props 分散表达                                    | type 只暴露数据角色与允许调整范围，隐式内容不在 IR 重复声明                  |
| 多系列 / 数据模型 | 多 series，可分别配置 data                                          | `dataset` + `series[]` 灵活但模型庞大                | 多 series children 直观                                  | 单一根 data；series / group / color 与额外 Mark 复用 Plot 语义               |
| 混合与扩展        | custom series / module                                              | custom series / extension                            | JSX composition                                          | Chart 可包含 Plot members，并提供或消费 Plot definitions；Plot 不包含 Chart  |
| Framework 范围    | JavaScript API 与 wrappers                                          | JavaScript API 与 wrappers                           | React-only 心智最自然                                    | JSON ChartSpec 是真源；React children 与 Vanilla builder 都是等价 sugar      |
| 可序列化性        | option 大体可描述，但 callback / formatter 会越界                   | option 可包含函数与运行时状态                        | JSX / callback 非 JSON                                   | ChartSpec 100% JSON-safe，runtime definitions 与 datasets 通过 options 注入  |
| 初次上手          | 低到中；类型和默认帮助明显                                          | 基础低、完整 option 中到高                           | React 用户低，非 React 不适用                            | 低；只学习 type、数据角色和常用样式                                          |
| 深度学习          | 需要掌握 series / chart / module 体系                               | option 层级和 component 关系复杂                     | 需要掌握组件组合和数据处理                               | 有意转向 Plot；Chart 不复制第二套高级扩展体系                                |
| 文档发现性        | 按 chart family 与 module 组织                                      | gallery、chart type 和 option manual 强              | 按组件 API 搜索                                          | 按分析目的导航，Canonical Type 为契约页，Chart Pattern 承担长尾名称          |

### 4.1 单图展示外壳

三个项目共同说明“Chart 除图本体外还可以包含什么”，但选择了不同边界：

| 内容                             | Highcharts                         | ECharts                                               | Recharts                          | retikz Chart 结论                                                              |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| title / subtitle                 | Chart 一级配置                     | title text / subtext component                        | 通常由宿主元素组合                | 可选 Chart presentation，Standard 布局                                         |
| caption / note / source / credit | caption / credits 直接进入完整图表 | 可借 title subtext / graphic 表达，但缺少稳定统一语义 | 通常由宿主组合                    | 提供固定语义槽位候选，不开放任意 graphic                                       |
| background / border / padding    | chart options                      | 全局 background + component box style                 | wrapper / SVG props               | Chart 配置整图语义，复用 Standard Frame / Box 能力                             |
| legend                           | series / point 领域内容            | 独立 legend component                                 | `<Legend>`                        | Plot 解析领域语义，Standard 呈现，不复制进 Chart presentation                  |
| axis / datum label、annotation   | plotOptions / annotations          | axisLabel、series label、markLine / markArea          | LabelList、Reference\*            | 与数据 / coordinate 强绑定，继续属于 Plot                                      |
| tooltip                          | hover runtime                      | tooltip component / runtime                           | `<Tooltip>`                       | Plot 拥有 locator 与领域语义，adapter 承担运行时 UI                            |
| export / toolbox / fullscreen    | exporting module                   | toolbox features                                      | 宿主自行实现                      | adapter / host chrome，不进入静态 ChartSpec                                    |
| loading / no-data                | loading overlay / no-data module   | instance `showLoading` / `hideLoading`                | 宿主状态                          | loading 属 runtime；no-data presentation 需以后单独设计状态 owner              |
| accessibility description        | accessibility options              | aria label / decal                                    | accessibility layer / host markup | Chart 可保存 semantic metadata，adapter / renderer 执行；不与可见 caption 混用 |

retikz 不选择 Highcharts 的单体 option 大包，也不选择 Recharts 的 DOM-only 外壳。推荐链路是：Chart 拥有单图展示语义，Standard 拥有领域无关布局与绘制，Plot 保持图本体语义，adapter / host 处理运行时 chrome。

## 5. retikz 的横向丰富度模型

### 5.1 Canonical Type：稳定且不可撤销的本体

Canonical Type 是 `ChartSpec.type` 的稳定判别值，选择一套完整 Plot recipe。它不是一个生成后可任意改写的 preset。

- type 核心配方必须始终存在
- 用户只能在该 type 允许范围内调整核心成员参数
- 表现性默认可以调整、关闭或替换
- 追加 Plot 内容不能成为删除、关闭或替换核心配方的入口

以 Bubble 为例，Point Mark 与维持气泡语义的数据角色 / size encoding 属于不可撤销核心配方。用户可以追加 Interval Mark 作为背景、参照或补充表达；若 Interval 已成为主要表达，应直接使用 Plot，而不是继续把结果称为 Bubble。

### 5.2 Chart Pattern：承接市场名称与常用变体

Chart Pattern 是 Canonical Type 加 modifier、表现配置或 Plot extension 的文档配方，不进入 `type` union。

```text
候选图表完整 Plot 配方
  - theme / style
  - 可跨类型复用的 modifier
  = 数据角色 + Mark 组合 + Transform 拓扑 + Coordinate / Composition 拓扑
```

归一化后与现有 type 相同的名称优先作为 Pattern，例如 horizontal bar、stacked bar、smooth line 或 donut。只有数据角色和配方拓扑形成稳定独立语义时，才考虑新增 Canonical Type。

### 5.3 Plot extension：高级用户的连续出口

Chart 不建立自己的扩展 registry，但保留 Plot 的完整横向扩展：

- 在核心配方上追加 Mark、Transform、Guide 等 Plot members
- type 可以隐式展开为多 view / facet / tracks / overlay 的完整 Plot composition，Chart 封装不隐藏内部空间 identity
- 使用宿主注入的 `MarkDefinition`、`TransformDefinition` 等 provider
- Chart 可以随官方 type 提供类型专用 Plot definition
- 所有 definition 仍进入 Plot registry，并由 Plot lowering 执行

这使学习路径保持单向：

```text
Chart type + data roles
  -> 完整 Chart 配置
  -> Plot members / definitions
  -> 直接使用 Plot
```

用户不需要再学习 `defineChart`、Chart registry 或第二套 recipe schema。

## 6. 文档与发现路径

参考 [Financial Times Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary)，Chart 文档应按用户意图而不是底层 primitive 作为主导航：

1. 比较与量级
2. 趋势与变化
3. 偏差与累计
4. 分布
5. 变量关系
6. 部分与整体
7. 不确定性
8. 流动、层级、空间随底层能力加入

Plot recipe family 只作为技术标签和交叉索引，例如 point、path、interval、relation、reference、composite / custom。

每个 Canonical Type 只维护一份契约页，至少说明：

- 适用问题与不适用场景
- 必需 / 可选数据角色
- 最小 ChartSpec
- 不可撤销的 type 核心配方
- 表现性默认和允许调整范围
- 常见 Chart Patterns
- 完整 style / mark / scale / guide 配置
- Plot members / definitions 混合
- diagnostics 与 capability requirements

## 7. 对 Chart 设计的结论

### 7.1 应学习的部分

- 学 Highcharts：type 入口仍然拥有完整、成熟的配置表面
- 学 ECharts：用 gallery、Pattern 与组件配置建立横向发现性，不让用户先学习 GoG
- 学 Recharts：Chart 容器允许渐进追加子成员，保持探索与组合手感
- 学三者的共同结果：单个 Chart 可以是完整可导出的展示单元，但静态内容、Plot guide 与宿主 runtime 必须分层

### 7.2 不直接复制的部分

- 不复制 ECharts / Highcharts 的 `series[]` 根模型，保持 Plot 单一根 data
- 不把 callback、ReactNode 或 renderer 状态写入 Chart IR
- 不为横向覆盖建立 Chart registry 或每 type 私有 pipeline
- 不以扩大 public `type` union 代替 Pattern 文档和 Plot extension
- 不允许扩展撤销 type 核心配方，把 Chart 降级成任意 Plot 容器
- 不复制 ECharts `graphic` 或 Recharts 任意 React child 作为 Chart presentation 扩展面
- 不把 export、toolbox、fullscreen、loading 等宿主状态写入 ChartSpec

### 7.3 完备标准

Chart 的横向完备不是“类型最多”，而是：

> 常见用户意图可发现、最小配置足够短、完整配置不缩水、type 本体始终成立、高级扩展能连续进入 Plot、单个 Chart 可选择形成完整展示单元，并且每个暂不支持的类别都有明确的底层缺口与流向。

## 8. 与 Plot 分析的分工

Chart 只评价“用户如何选图、配置和学习”。当某个 type 需要新的 Transform、Mark 或 Coordinate 时：

- 若既有 Plot contract 能表达，Chart 可以横向提供或消费具体 definition
- 若需要新的能力轴、contract、registry 或 pipeline，缺口回到 Plot / Data / Core

因此，Chart 文档不再给 Vega、G2 等 GoG 底座评分；Plot 文档也不再用 Highcharts、ECharts、Recharts 衡量 type 数量或上手体验。

## 9. 更新记录

- **2026-07-30 初稿**：混合比较 GoG 与 type-first 项目，用于确定 ChartSpec、Canonical Type / Pattern 和 Plot extension 关系
- **2026-07-30 重构**：移除 Vega-Lite、Observable Plot、AntV G2、VChart 的重复分析；聚焦 Highcharts、ECharts、Recharts 的横向覆盖、完整配置与学习成本
- **2026-07-31 单图展示补充**：比较 title、caption、source、frame、accessibility 与 host chrome，确认 Chart presentation / Plot / Standard / adapter 的分层

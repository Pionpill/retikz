# Table 表格语法与 lowering 总设计

> **状态：长期模型已确认；alpha.2 布局基线已落定，alpha.3 已实现到呈现与 Legend descriptor seed，ADR 仍待治理收口。** 本文维护 Grammar of Tables、Table Algebra、Constraint Grid Layout 与跨包边界，不冻结具体字段。当前公开契约以 [`packages/viz/table/AGENTS.md`](../../table/AGENTS.md)、公开类型和用户文档为准。
>
> 关联：[`Table 表格可视化完备设计`](./table-visualization-complete.md) · [`Table 竞品与能力差距分析`](../analysis/table-compare-analysis.md) · [`table v0.1 roadmap`](../decisions/table/v0/v0.1/roadmap.md)

---

本文定义 `@retikz/table`、`@retikz/table-react` 与 `@retikz/table-vanilla` 的长期设计方向。能力边界见 [Table 表格可视化完备设计](./table-visualization-complete.md)，外部参考见 [Table 竞品与能力差距分析](../analysis/table-compare-analysis.md)。

本文只确定指导思想和核心模型。具体 IR 字段、Definition 签名、算法细节与 manifest payload 由对应 milestone ADR 冻结；alpha.1 / alpha.2 已落地的契约不在本文重新定义。

## 1. 核心判断

Plot 以 Grammar of Graphics 组织图形；Table 不需要再增加一个类似 Chart 的 Tier 3 封装。Table 本身就是完整的 Tier 2 表格语法。

Table 的指导思想是：

> **Grammar of Tables + Table Algebra + Constraint Grid Layout。**

- Grammar of Tables：定义一张表由哪些正交部分构成
- Table Algebra：定义明细、分组、层级、汇总、交叉和转置如何组合
- Constraint Grid Layout：统一处理内容测量、轨道、跨度、表线和整体尺寸

## 2. 包定位

`@retikz/table` 消费 `@retikz/data`、`@retikz/standard` 与 `@retikz/core`，负责 Table IR、语义模型、表格 body 布局、Theme token resolver、Legend descriptor 与 lowering。它与 Plot 平行，不依赖 Plot；需要通用 Legend 与外围 Box Layout 时单向消费 Standard 的公开 capability。Core 负责 namespaced Theme 传递、ThemeTokenDefinition registry、owner schema validation 与 shared colors，Table 负责自己的 vocabulary、preset、mapping 与消费。

`@retikz/table-react` 与 `@retikz/table-vanilla` 只负责 authoring 和宿主接入，不拥有表格结构、规则、布局或 lowering 算法。

Table 家族以展示为核心。v0.1 先完成确定性的静态表格编译；后续大表展示由 `@retikz/table` 提供 window / viewport 计算，由 adapter 接入实际滚动容器和生命周期。

```text
Data ──▶ Table ──body lowering──────────────▶ Core IR ──▶ Renderer
           │
           └─Legend descriptor seed──▶ Standard composition（待接入）
           ▲
     React / Vanilla
```

## 3. 五个正交部分

Table grammar 分为五个部分：

| 部分         | 职责                                                        |
| ------------ | ----------------------------------------------------------- |
| Data         | 引用外部数据与 Data transform 结果                          |
| Structure    | 将输入组织为行、列、Cell 和语义区域                         |
| Presentation | 将值格式化、编码并呈现为 Core 内容                          |
| Layout       | 求解轨道、span、padding、alignment、fit、border 和 fragment |
| Rules        | 按 Cell 地址、位置、角色或值覆盖呈现与样式                  |

五部分保持正交：结构不私有格式化，style preset / tokens 不改变数据和拓扑，布局不重新计算业务聚合，规则不直接操作 lowering 后的图元。

实际数据集与 Plot 一样保持在 IR 之外，Table IR 只保存数据引用和结构配置。manual 表格可以直接声明少量显式值或内容。

## 4. 核心模型

Table 采用分阶段模型：

```text
TableSpec
  ──structure / operations──▶ SemanticTableModel
  ──formatter / presentation / rules──▶ PresentedTableModel
  ──measure / layout──▶ TableLayout
  ──lowering──▶ Core IR + traceability artifacts
```

### 4.1 SemanticTableModel

表示不带绝对几何的表格拓扑，包括稳定的行、列、Cell、位置、角色和来源关系。

它长期应成为公开的扩展边界，但具体形状和写入协议由 ADR 决定。Canonical model 由 Table pipeline 维护，扩展不能绕过地址、span、ID 和 lineage 等不变量。

### 4.2 PresentedTableModel

在语义结构上解析 formatter、presentation、rules、`tableThemeTokens`、shared categorical projection 和最终 Cell 内容，但还没有绝对几何。

### 4.3 TableLayout

保存轨道、Cell box、内容位置、表线和分片等确定性布局结果，为 lowering、locator 和宿主调试提供基础。

## 5. Structure 与 Table Algebra

基础结构包括：

- manual：显式二维结构
- detail：一条记录映射为一行明细
- pivot：行维度、列维度和指标构成交叉表
- matrix：消费已有二维矩阵

在基础结构上组合：

- group
- hierarchy
- summary
- transpose

因此“分组表”“层级表”“汇总表”是结构与操作的组合，不需要成为互不相通的根类型。

层级表头不是普通 body Cell 的几何拼接。Semantic model 需要保留 spanner、stub、corner、row group、header 与 footer 等区域角色，再由 layout 统一求解其 span 和重复策略。

通用 filter、sort、groupBy 和 aggregate 由 Data 提供；Table 负责结果如何进入行列结构。

## 6. Cell 与内容

Cell 是 Table 的语义与布局槽位，不是 Core Node。它拥有地址、span、location、role、来源和布局样式，内容统一使用 Core `IRChild`。

这意味着文字、图片、Scope、Plot 或未来其它 Tier 2 composite 都通过同一 Core 内容边界进入 Cell，Table 不建立 `text | image | plot` 之类的封闭内容枚举，也不为识别 Cell 内容依赖或特判其它领域 Tier 2 包。Table 可以单向依赖 Standard 的领域无关绘图 capability，这不改变 Cell 的通用 `IRChild` 边界。

Table 的 Cell 拓扑保持正交矩形：地址是行列坐标，span 覆盖连续的矩形行列区间，轨道、Cell box 与 Table 自己的 border conflict 都以此为前提。Presentation 可以在矩形 Cell 内呈现圆角、胶囊、六边形等视觉内容或装饰框，但不能改变 Cell 的分配几何、span 语义或边界拓扑。

真正的蜂窝、三角格或其它非矩形铺砌具有不同的坐标、邻接、边界和布局代数，不是 Table Cell 的可选形状。数据在此类格网上的编码属于 Plot 的 coordinate / mark；若未来需要复用多个非矩形铺砌的结构与布局，应抽象独立的离散格网能力，而不是将其并入 Table。

`Table<PlotCell>` 是合法组合：Table 管理行列语义与 Cell box，Plot 管理 Cell 内部图形。Table 可以测量、放置和裁剪 Plot composite，但不能读取或自动协调多个 Plot Cell 的 scale、axis、grid 和 legend；这些语义由作者显式配置 Plot，或交给 Plot facet / 外部 Figure composition。

Table 只拥有与网格拓扑有关的表头、行头、小计、总计和 Cell 注释关系。alpha.3 条件视觉编码截止于 Legend descriptor seed；Standard Legend / Flex 公共能力已经存在，但 Table body 的 JSON-safe composition boundary 与 occurrence-safe artifact join 尚未接入，统一由 alpha.6 收口。未来 Table 可以保留 right / bottom 等领域 placement sugar，但生成的 Legend 与 title、description、caption、source 等外围内容必须作为 `IRChild` 进入同一 Standard Flex / Grid / Overlay composition，不建立 Table 私有停靠或文字布局器。

## 7. 扩展机制

适合 Definition / registry 的能力包括：

- Structure
- Operation
- Formatter
- Presentation

内置与自定义能力经过相同的注册、解析和消费链路。

Style token 不属于 Table 行为 Definition，但 Table theme schema 必须通过 Core 的 `ThemeTokenDefinition<'table', ...>` registry 绑定 owner validation。Table 维护闭合、扁平、命名空间化的公开 token vocabulary；内置 preset 与用户 `tableThemeTokens` overlay 经过同一 strict schema、resolver 和消费链路。`theme.tokens.table` 由 Core Scope 继承，Table 不保存重复 `style` / `themeMode`，也不允许外部包注册未知 token 或 token consumer。

Core 只提供一套当前生效的非空 active `palette.categorical`。Table 将其 detached 投影为 `data.categorical` baseline；Table token、encoding range、rule 和 Cell configuration 由 Table resolver 按正式优先级覆盖。Standard 只消费 Table 已解析的 Legend / layout input 与 Core `InspectionAppearance`，不读取 Table token bag 或重建颜色分配。

地址、span 合法性、布局不变量、border conflict 和 lowering 正确性属于 Table 核心合同，不应为了扩展性暴露任意执行钩子。

## 8. Layout 与 lowering

Table body layout 是表格专用二维约束求解，不是逐 Cell 手工放置，也不是 Core Grid sugar。它需要统一考虑：

- 内容的 intrinsic / constrained size
- 基于内容真实 bounds 的 alignment 与 allocated content box
- `none` / `contain` / `cover` / `stretch` 等候选 fit 策略及 overflow / clip
- 固定、自动和弹性轨道
- 文本换行与行高
- row span / column span
- Cell box、padding 和 alignment
- collapsed / separate border
- 跨页或分片后的重复表头
- 大表 viewport、overscan 与可见 Cell window

任意 `IRChild` 的通用测量与受约束内容布局能力属于 Core；若当前能力不足，应先补 Core 合同，而不是在 Table 内建立私有测量系统或按 Plot 类型特判。

Table body 与 Legend、title、description、caption、source 等外围内容之间的排列是通用 Box Layout，属于 Standard。Table 只把领域位置、顺序和关联解析为 Standard layout item；Standard Flex / Grid / Overlay 负责 Box Layout 求解、间距、对齐、overflow 与整体 bounds，并通过 Core 的 probe、constrained measurement 与 replay 合同完成测量和回放。

Lowering 最终只输出 Core IR，renderer 不感知 Table。Table 同时保留 Cell、数据来源、布局实例和 Core visual contribution 之间的映射；alpha.2 已通过 Core layout-aware composite 的 typed artifact 公开这条映射，后续只能扩展同一链路，不能依赖隐藏 side channel。

## 9. 已实现基线与后续未决

alpha.1 / alpha.2 已落定；alpha.3 当前代码已经形成以下候选基线，仍需由对应 ADR 完成治理收口：

- Table IR 与外部数据绑定，manual / detail / custom 三种精确 spec 变体与 framework-neutral authoring helpers
- `SemanticTableModel` 纵向写入链路，以及 formatter / presentation 等统一 Definition / registry 消费方式
- fixed / auto / fraction / minmax 轨道、矩形 span、真实 `IRChild` intrinsic / constrained measurement、fit / overflow / clip 与 Border Graph
- layout-aware composite 同次 compile、typed manifest / occurrence，以及 React / Vanilla 共享 runtime contribution 与 artifact contract
- formatter / presentation、selector / rule、条件视觉 encoding、内置 Neutral、开放 style definition 与闭合 `tableThemeTokens` 沿同一 canonical pipeline 消费；Core inherited namespace 与 shared categorical projection 已接入，外围 composition 与 artifact join 由 alpha.6 收口

尚未闭环的能力继续由 ADR 处理：

1. 分组、层级、汇总、交叉、矩阵与转置等 Table Algebra
2. alpha.6 的 Table body JSON-safe composition boundary、Standard Legend / Flex 消费与 occurrence-safe artifact join，以及最终 adapter / SSR / docs 闭环
3. Fragmentation、重复 Cell instance 与跨页重复表头
4. 更完整的 lineage、locator 与 diagnostics 查询面
5. 大表 windowing、虚拟滚动与 adapter runtime 边界
6. 层级 header region、spanner / stub / corner 与重复策略

这些议题可以在 ADR 中调整本文的候选方向，但不能绕开已经落定的 schema、Core layout-aware composite、Definition / registry 与 artifact 主链。

## 10. 非目标

- 不成为以编辑、公式和协作为核心的 data-grid / spreadsheet 引擎
- 不把滚动位置、服务端分页、异步加载或缓存状态写入 Table IR
- 不复制 Data 的通用数据算法
- 不建立平行 Core IR 或专用 renderer
- 不依赖 Plot，也不在 Table 内实现 Plot mark
- 不演进为支持任意 Cell 拓扑的通用铺砌或格网系统
- 不用函数回调替代 JSON-safe IR 和 Definition
- 不在 React / Vanilla adapter 中实现领域算法

## 11. 总结

`@retikz/table` 是一个 renderer-agnostic 的 Tier 2 表格编译器：它以 Table grammar 描述结构，以 Table Algebra 组合表格形态，以 Constraint Grid Layout 解决二维排版，最终 lowering 为 Core IR。

Cell 是语义和布局槽位，`IRChild` 是统一内容边界，Definition / registry 是扩展机制。未完成的结构、呈现和 runtime 能力继续由后续 ADR 逐项验证，并复用 alpha.2 已建立的布局与产物主链。

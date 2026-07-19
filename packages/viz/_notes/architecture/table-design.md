# Table 表格语法与 lowering 总设计

本文定义 `@retikz/table`、`@retikz/table-react` 与 `@retikz/table-vanilla` 的长期设计方向。能力边界见 [Table 表格可视化完备设计](./table-visualization-complete.md)，外部参考见 [Table 竞品与能力差距分析](../analysis/table-compare-analysis.md)。

本文只确定指导思想和核心模型。具体 IR 字段、Definition 签名、布局算法、冲突规则、manifest 结构和首版范围均由后续 ADR 决定。

## 1. 核心判断

Plot 以 Grammar of Graphics 组织图形；Table 不需要再增加一个类似 Chart 的 Tier 3 封装。Table 本身就是完整的 Tier 2 表格语法。

Table 的指导思想是：

> **Grammar of Tables + Table Algebra + Constraint Grid Layout。**

- Grammar of Tables：定义一张表由哪些正交部分构成
- Table Algebra：定义明细、分组、层级、汇总、交叉和转置如何组合
- Constraint Grid Layout：统一处理内容测量、轨道、跨度、表线和整体尺寸

## 2. 包定位

`@retikz/table` 消费 `@retikz/data` 与 `@retikz/core`，负责 Table IR、语义模型、布局和 lowering。它与 Plot 平行，不依赖 Plot。

`@retikz/table-react` 与 `@retikz/table-vanilla` 只负责 authoring 和宿主接入，不拥有表格结构、规则、布局或 lowering 算法。

Table 家族以展示为核心。v0.1 先完成确定性的静态表格编译；后续大表展示由 `@retikz/table` 提供 window / viewport 计算，由 adapter 接入实际滚动容器和生命周期。

```text
Data ──▶ Table ──▶ Core IR ──▶ Renderer
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

五部分保持正交：结构不私有格式化，主题不改变数据和拓扑，布局不重新计算业务聚合，规则不直接操作 lowering 后的图元。

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

在语义结构上解析 formatter、presentation、rules、theme 和最终 Cell 内容，但还没有绝对几何。

### 4.3 TableLayout

保存轨道、Cell box、内容位置、表线和分片等确定性布局结果，为 lowering、locator 和宿主调试提供基础。

## 5. Structure 与 Table Algebra

基础结构包括：

- manual：显式二维结构
- list：记录映射为明细行
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

这意味着文字、图片、Scope、Plot 或未来其它 Tier 2 composite 都通过同一 Core 内容边界进入 Cell，Table 不建立 `text | image | plot` 之类的封闭内容枚举，也不直接依赖其它 Tier 2 包。

`Table<PlotCell>` 是合法组合：Table 管理行列语义与 Cell box，Plot 管理 Cell 内部图形。Table 可以测量、放置和裁剪 Plot composite，但不能读取或自动协调多个 Plot Cell 的 scale、axis、grid 和 legend；这些语义由作者显式配置 Plot，或交给 Plot facet / 外部 Figure composition。

Table 只拥有与网格拓扑有关的表头、行头、小计、总计和 Cell 注释关系。标题、caption、来源说明等外围内容优先由通用 Figure / composition 能力承担。

## 7. 扩展机制

适合 Definition / registry 的能力包括：

- Structure
- Operation
- Formatter
- Presentation
- Theme

内置与自定义能力经过相同的注册、解析和消费链路。

地址、span 合法性、布局不变量、border conflict 和 lowering 正确性属于 Table 核心合同，不应为了扩展性暴露任意执行钩子。

## 8. Layout 与 lowering

Table layout 是二维约束求解，不是逐 Cell 手工放置，也不是 Core Grid sugar。它需要统一考虑：

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

Lowering 最终只输出 Core IR，renderer 不感知 Table。Table 同时需要保留 Cell、数据来源、布局实例和 Core visual contribution 之间的映射；具体 artifact API 与 Core composite 的接线方式由 ADR 决定，不能依赖隐藏 side channel。

## 9. 待 ADR 决策

后续 ADR 至少需要分别讨论：

1. Table IR 与外部数据绑定
2. SemanticTableModel 的公开范围和扩展写入协议
3. Structure / Operation / Formatter / Presentation / Theme Definition
4. Selector、Rule、条件视觉编码、legend descriptor 与样式级联
5. Track sizing、span、内容 intrinsic / constrained measurement、fit 与 overflow 合同
6. Border Graph 与表线冲突规则
7. Fragmentation 与重复 Cell instance
8. Lowering、manifest、lineage、locator 和 diagnostics
9. React / Vanilla authoring 表面
10. 大表 windowing、虚拟滚动与 adapter runtime 边界
11. 首个 Alpha 的能力范围与实现顺序
12. 层级 header region、spanner / stub / corner 与重复策略

这些议题在 ADR 中可以调整或推翻本文的候选方向；本文只提供讨论坐标，不作为实现细节承诺。

## 10. 非目标

- 不成为以编辑、公式和协作为核心的 data-grid / spreadsheet 引擎
- 不把滚动位置、服务端分页、异步加载或缓存状态写入 Table IR
- 不复制 Data 的通用数据算法
- 不建立平行 Core IR 或专用 renderer
- 不依赖 Plot，也不在 Table 内实现 Plot mark
- 不用函数回调替代 JSON-safe IR 和 Definition
- 不在 React / Vanilla adapter 中实现领域算法

## 11. 总结

`@retikz/table` 是一个 renderer-agnostic 的 Tier 2 表格编译器：它以 Table grammar 描述结构，以 Table Algebra 组合表格形态，以 Constraint Grid Layout 解决二维排版，最终 lowering 为 Core IR。

Cell 是语义和布局槽位，`IRChild` 是统一内容边界，Definition / registry 是扩展机制。除此之外的具体设计留给后续 ADR 逐项验证。

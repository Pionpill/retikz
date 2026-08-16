# Table 表格可视化完备设计

> **状态：长期能力准入真源；alpha.2 布局基线已落定，alpha.3 已实现到呈现与 Legend descriptor seed，ADR 仍待治理收口。** 本文回答“什么属于 `@retikz/table`”以及“怎样才算形成表格能力闭环”，不维护具体公开字段。当前包职责与实现基线以 [`packages/viz/table/AGENTS.md`](../../table/AGENTS.md)、公开类型和用户文档为准。
>
> 关联：[`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md) · [`Data 能力完备设计`](./data-capability-complete.md) · [`Plot 可视化完备设计`](./plot-visualization-complete.md) · [`Core 绘图完备设计`](../../../kernel/_notes/architecture/core-drawing-complete.md) · [`Table 总设计`](./table-design.md)

---

本文只确定长期核心概念、包边界与闭环检查；具体 IR、Definition、算法和 API 由对应 milestone ADR 冻结，已实现能力不能在本文中重新打开为未决设计。

## 1. 定位与问题边界

Table 解决的是：

> 将结构化数据或显式内容组织为具有行、列、单元格和语义区域的二维表格，并 lowering 为 renderer-agnostic Core IR。

Table 是与 Plot 平行的 Tier 2 能力，不是 Plot 的封装层，也不是以编辑和公式计算为核心的 data-grid / spreadsheet 引擎。Table 家族以展示为核心，长期可以包含虚拟滚动等大表展示 runtime。

## 2. 包角色与端到端管线

| 角色                 | 主责包 / 协作包                 | 责任                                                                                                           | 不拥有                                                              |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 数据底座             | `@retikz/data`                  | 数据模型、字段解析、通用 transform / statistics 与 lineage                                                     | Table 结构、Cell 呈现、表格布局                                     |
| Table 主责           | `@retikz/table`                 | Table IR、结构与呈现、body 约束布局、Theme token resolver、外围 placement intent、lowering、manifest / lineage | 通用数据算法、Core Theme 传播、外围 Box Layout、Core 测量、renderer |
| 通用 Tier 2 图形能力 | `@retikz/standard`              | 接收 Table 已解析的领域无关绘图输入，提供 Legend、外围 Box Layout、lowering 与 artifact                        | Table structure、visual encoding、lineage 与交互                    |
| 图形与测量底座       | `@retikz/core` / `@retikz/math` | `IRChild` 测量、布局感知 composite、Core IR / Scene 与通用几何                                                 | Table 结构、Table track solver                                      |
| authoring / runtime  | table-react / table-vanilla     | 构造 Table 输入、聚合 Table definition、注入数据与 definitions、接入宿主生命周期和滚动容器                     | Table schema、Theme preset、布局算法、lowering 或 renderer 语义     |

依赖主链保持：

```text
Data ──▶ Table ──domain resolution──▶ Standard composite / Core IR
                                             │
                                             ▼
                                      Core compile ──▶ Renderer
           ▲
           │
    React / Vanilla adapter
```

Table 可以消费 Data、Standard 与 Core，但不依赖 Plot。Core 通过 `theme.tokens.table` 传递 inherited namespace、使用 `TableThemeTokenDefinition` 做 owner schema validation，并提供一套 shared colors；Table 负责自己的 vocabulary、preset、resolver、mapping 与消费。Plot 等 Tier 2 内容通过 Core 的通用 `IRChild` / composite 能力进入单元格；Table 负责 Cell box、测量请求、对齐、fit、裁剪和追溯，不解析内容内部的 mark、scale 或 guide。Table 自身的 visual encoding 当前产生 Legend descriptor seed，并在 body composition boundary 完成后解析领域无关 Legend 输入与 right / bottom placement intent；Standard 只消费 Table 已解析输入，不读取 Table token bag、field、selector、rule 或 lineage。

## 3. 能力边界与能力面

Table 拥有：

- 行、列、单元格、表头、表体、表尾，以及 spanner、stub、corner、row group 等层级区域语义
- 明细、分组、层级、汇总、交叉和显式矩阵等表格结构
- 表格专用的格式化、单元格呈现、条件视觉编码、规则、style preset、`tableThemeTokens` 与 mapping
- 条件视觉编码到通用 Legend 输入的 descriptor、领域解析、style token mapping 与 lineage / locator
- 列宽、行高、跨度、内边距、对齐、内容 fit、overflow、表线和分片等布局语义
- 大表展示所需的 viewport / window 计算、可见区布局映射与虚拟化契约
- Table 到 Core IR 的 lowering，以及必要的 manifest、lineage、locator 和 diagnostics

Table 不拥有：

- 通用数据解析、transform、statistics 和 aggregate；这些属于 Data
- 通用图元、几何、测量和 renderer；这些属于 Core、Math 或 renderer
- 通用 Legend 的视觉结构、内部布局、lowering 与领域无关 artifact；这些属于 Standard
- Table body 与 Legend、title、description、caption、source 等外围内容之间的通用 Flex / Grid / Overlay 排列；这些属于 Standard
- Plot 的 mark、scale、coordinate 和 guide
- 多个 Plot Cell 之间的 scale、axis、grid 和 legend 自动协调
- 单元格编辑、电子表格公式、依赖计算和协作编辑
- 服务端分页、异步加载和缓存状态
- React / Vanilla 的宿主状态和生命周期

虚拟滚动按“展示算法 + 宿主 runtime”拆分：Table 提供 renderer-agnostic 的 window / overscan / 布局映射合同，React / Vanilla adapter 负责滚动容器、viewport 观测和生命周期。该能力不写入 v0.1，也不把瞬时滚动状态写入 JSON IR。

### 3.1 Structure

Table 需要统一表达 manual、detail、pivot、matrix 等基础结构。detail 保持一条源记录对应一行明细；分组、层级、汇总和转置作为可组合的表格 operation，而不是各自形成封闭 structure kind。

通用聚合计算由 Data 提供；Table 负责聚合结果在行列结构中的位置和语义。

### 3.2 Cell Semantics

Cell 是 Table 的语义与布局槽位，具有地址、跨度、位置、角色和来源。Cell 不是 Core Node；它以 Core `IRChild` 作为统一内容边界，因此可以容纳文字、图片、Scope 或其它 Tier 2 composite。

显式 Plot Cell 属于这条通用内容链路。若多个 Plot Cell 需要共享 domain、轴显隐或单一图例，作者应显式配置对应 Plot，或通过独立 `IRChild` / Figure 组合；Table 不建立 Plot-specific 的跨 Cell 协调器。

Table 的结构 Cell 始终是正交矩形：行列地址、矩形 span、轨道尺寸和四边 border conflict 共同构成其合同。非矩形视觉内容或装饰框可以作为 Cell presentation，但不会改变 Cell 的分配几何与拓扑。

蜂窝、三角格等非矩形铺砌需要独立的坐标、邻接和边界规则。其数据可视化属于 Plot 的 coordinate / mark；若将来形成可复用的铺砌结构与布局需求，应建立独立能力，而不是扩展 Table 为任意 Cell 形状。

### 3.3 Presentation

Table 区分：

- Formatter：原始值到展示值
- Presentation：展示值到 `IRChild`
- Visual Encoding：把数值或状态映射到 Cell 视觉属性；可选 Legend descriptor seed 来自同次 resolution，后续由 Table 解析为 Standard Legend 输入，不复制通用呈现
- Style preset / token / Rule：决定单元格的视觉呈现和覆盖关系

具有算法 dispatch 的内置与自定义能力应经过统一的 Definition / registry，而不是分成内置白名单和扩展补丁。Table theme token 是 plain-data value vocabulary，通过 Core `ThemeTokenDefinition` registry 绑定 Table owner schema；它不建立 Table 私有行为 registry。内置 preset 与用户 `tableThemeTokens` overlay 必须经过同一 strict schema、resolver 与正式 consumer。

### 3.4 Layout

Table 需要拥有表格专用的二维约束布局，统一处理内容 intrinsic / constrained measurement、轨道尺寸、换行、跨度、基于真实 bounds 的对齐、内容 fit、overflow / clip、边框和分片。

Table 只拥有外围内容的领域 placement intent、稳定顺序与 lineage；Standard 拥有实际 Box Layout。Table 不对 Standard child 运行私有 probe / placement / bounds-union，也不复制 Flex / Grid / Overlay schema 或 solver。

后续大表展示在同一布局结果上增加 viewport window 与可见 Cell 映射，不重新建立一套 DOM-only 表格模型。

通用 `IRChild` 测量与受约束内容布局能力属于 Core；Table 只声明 Cell 可用盒并消费结果，不建立平行 bbox 或 composite 特判系统。

### 3.5 Lowering and Traceability

Table 最终只产生合法 Core IR，renderer 不认识 Table 私有类型。与此同时，Table 需要保留单元格语义、布局位置、数据来源和视觉贡献之间的映射。

Table alpha.2 已通过 Core layout-aware composite 在同一次 compile 内完成 body 的 measure、constrain、replay，并以 typed artifact 暴露 manifest；后续外围 Standard composition 通过同次 artifact tree 与 occurrence-safe join 扩展这条公开产物链路，不能依赖隐藏 side channel 或按全局 id 拼接产物。

## 4. 准入原则与完备性检测

一个 Table 能力只有同时回答以下问题，才算形成闭环：

1. 它是否确实属于表格结构、呈现或布局，而不是 Data、Core、Plot 或 adapter
2. 它是否能与已有结构和操作组合，而不是新增封闭特例
3. 它是否具有 JSON-safe 的表达；算法 dispatch 是否通过统一 Definition / registry 消费，闭合 plain-data vocabulary 是否通过 strict schema、resolver 与真实 consumer 消费
4. 它是否具有确定的布局、lowering 和错误语义
5. lowering 后是否仍能追溯到 Cell 和数据来源
6. React / Vanilla 是否只做 authoring 与宿主接入，而不复制领域算法

若能力只能通过 renderer 特判、adapter 私有实现、平行 IR 或私有测量系统完成，说明能力归属或底层合同仍未闭环。

## 5. 当前基线与完备性边界

当前 alpha.3 已在 alpha.2 布局基线上形成以下纵向闭环：

- `TableSchema` / `IRTable` 聚合 manual、detail、custom 三种精确 spec 变体
- manual / detail / custom 结构共用 `SemanticTableModel`，Cell value / content 经 formatter / presentation contract 进入布局
- auto / fraction / minmax 轨道、矩形 span、padding、alignment、fit / overflow / clip、文本换行、自动行高与 Border Graph 进入同一确定性约束布局
- lowering 在同次 Core compile 中产出 Scene 与 typed manifest，React / Vanilla adapter 共用 runtime contribution 与 artifact contract
- formatter / presentation、selector / rule、条件视觉 encoding、内置 Neutral、开放 style definition 与闭合 style tokens 沿同一 canonical pipeline 消费
- visual encoding 与 Legend descriptor / manifest seed 来自同一次 scale resolution；alpha.3 在此形成闭环，Table body composition、Standard Legend / Flex 消费与最终 occurrence-safe artifact join 由 alpha.6 收口

尚未实现的分组、层级、汇总、交叉、转置、复杂 header region 和大表 windowing 仍按本能力边界逐项进入后续 ADR；Table body 与 Standard Legend / Flex 的外围 composition、最终 artifact join、fragmentation、重复 header 和完整追溯明确进入 alpha.6。它们不能被当前基线默认为已完成。

“Table 完备”不等于实现所有 data grid 功能，而是保证：

- 新需求可以稳定归类到 Data、Table、Core、adapter 或 renderer
- Table 内的新结构和呈现可以沿统一模型扩展
- 表格布局与 lowering 具有确定、可测试和可追溯的语义
- 大表展示能力可以在同一语义模型和布局结果上扩展，由 adapter 承担 runtime 接线
- 不需要为单个场景建立平行底层机制

## 6. 设计检查模板

新 Table 能力进入 ADR 前至少填写：

```md
## Table 完备性检查

- 解决的表格问题：
- 是否属于 Structure / Cell Semantics / Presentation / Layout / Traceability：
- Data、Table、Core、adapter 分别负责什么：
- JSON-safe 表达，以及 Definition / registry 或闭合 schema / resolver 扩展点：
- layout、lowering、manifest / lineage 与 diagnostics 闭环：
- React / Vanilla 等价入口或不适用原因：
- 与当前实现基线的复用关系：
- 明确反例与最低测试层：
```

## 7. 与现有设计的关系

竞品取舍见 [Table 竞品与能力差距分析](../analysis/table-compare-analysis.md)，总体指导思想见 [Table 表格语法与 lowering 总设计](./table-design.md)。具体能力状态以 Table roadmap、Accepted ADR、当前公开类型与就近 `AGENTS.md` 为准；本文只维护长期边界与准入方法。

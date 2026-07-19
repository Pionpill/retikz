# Table 表格可视化完备设计

本文定义 Table 能力域的长期边界，回答“什么属于 `@retikz/table`”以及“怎样才算形成表格能力闭环”。它是 [capability-design](../../../../notes/architecture/capability-design.md) 在表格领域的细化，并与 [Data 能力完备设计](./data-capability-complete.md)、[Plot 可视化完备设计](./plot-visualization-complete.md) 和 [Core 绘图能力完备设计](../../../kernel/_notes/architecture/core-drawing-complete.md) 共同用于能力归属判断。

本文只确定核心概念，不表示 Table 包已经实现，也不冻结具体 IR、Definition、算法或 API；这些内容由后续 ADR 决定。

## 1. 根定义

Table 解决的是：

> 将结构化数据或显式内容组织为具有行、列、单元格和语义区域的二维表格，并 lowering 为 renderer-agnostic Core IR。

Table 是与 Plot 平行的 Tier 2 能力，不是 Plot 的封装层，也不是以编辑和公式计算为核心的 data-grid / spreadsheet 引擎。Table 家族以展示为核心，长期可以包含虚拟滚动等大表展示 runtime。

## 2. 能力边界

Table 拥有：

- 行、列、单元格、表头、表体、表尾，以及 spanner、stub、corner、row group 等层级区域语义
- 明细、分组、层级、汇总、交叉和显式矩阵等表格结构
- 表格专用的格式化、单元格呈现、条件视觉编码、规则和主题
- 列宽、行高、跨度、内边距、对齐、内容 fit、overflow、表线和分片等布局语义
- 大表展示所需的 viewport / window 计算、可见区布局映射与虚拟化契约
- Table 到 Core IR 的 lowering，以及必要的 manifest、lineage、locator 和 diagnostics

Table 不拥有：

- 通用数据解析、transform、statistics 和 aggregate；这些属于 Data
- 通用图元、几何、测量和 renderer；这些属于 Core、Math 或 renderer
- Plot 的 mark、scale、coordinate 和 guide
- 多个 Plot Cell 之间的 scale、axis、grid 和 legend 自动协调
- 单元格编辑、电子表格公式、依赖计算和协作编辑
- 服务端分页、异步加载和缓存状态
- React / Vanilla 的宿主状态和生命周期

虚拟滚动按“展示算法 + 宿主 runtime”拆分：Table 提供 renderer-agnostic 的 window / overscan / 布局映射合同，React / Vanilla adapter 负责滚动容器、viewport 观测和生命周期。该能力不写入 v0.1，也不把瞬时滚动状态写入 JSON IR。

依赖方向保持：

```text
Data ──▶ Table ──lowering──▶ Core IR ──▶ Renderer
           ▲
           │
    React / Vanilla adapter
```

Table 可以消费 Data 与 Core，但不依赖 Plot。Plot 等 Tier 2 内容通过 Core 的通用组合能力进入单元格；Table 负责 Cell box、测量、对齐、fit、裁剪和追溯，不解析内容内部的 mark、scale 或 guide。

## 3. 核心能力面

### 3.1 Structure

Table 需要统一表达 manual、list、pivot、matrix 等基础结构。分组、层级、汇总和转置应作为可组合的表格操作，而不是各自形成封闭根类型。

通用聚合计算由 Data 提供；Table 负责聚合结果在行列结构中的位置和语义。

### 3.2 Cell Semantics

Cell 是 Table 的语义与布局槽位，具有地址、跨度、位置、角色和来源。Cell 不是 Core Node；它以 Core `IRChild` 作为统一内容边界，因此可以容纳文字、图片、Scope 或其它 Tier 2 composite。

显式 Plot Cell 属于这条通用内容链路。若多个 Plot Cell 需要共享 domain、轴显隐或单一图例，作者应显式配置对应 Plot，或通过独立 `IRChild` / Figure 组合；Table 不建立 Plot-specific 的跨 Cell 协调器。

### 3.3 Presentation

Table 区分：

- Formatter：原始值到展示值
- Presentation：展示值到 `IRChild`
- Visual Encoding：数值或状态到 Cell 视觉属性，并与可选 legend descriptor 保持同源
- Style / Rule / Theme：决定单元格的视觉呈现和覆盖关系

内置与自定义能力应经过统一的 Definition / registry，而不是分成内置白名单和扩展补丁。

### 3.4 Layout

Table 需要拥有表格专用的二维约束布局，统一处理内容 intrinsic / constrained measurement、轨道尺寸、换行、跨度、基于真实 bounds 的对齐、内容 fit、overflow / clip、边框和分片。

后续大表展示在同一布局结果上增加 viewport window 与可见 Cell 映射，不重新建立一套 DOM-only 表格模型。

通用 `IRChild` 测量与受约束内容布局能力属于 Core；Table 只声明 Cell 可用盒并消费结果，不建立平行 bbox 或 composite 特判系统。

### 3.5 Lowering and Traceability

Table 最终只产生合法 Core IR，renderer 不认识 Table 私有类型。与此同时，Table 需要保留单元格语义、布局位置、数据来源和视觉贡献之间的映射。

Core composite 如何取得 lowering 节点、宿主如何取得 manifest / lineage / diagnostics 等附属产物，由后续 ADR 确定，不能依赖隐藏 side channel。

## 4. 完备性检测

一个 Table 能力只有同时回答以下问题，才算形成闭环：

1. 它是否确实属于表格结构、呈现或布局，而不是 Data、Core、Plot 或 adapter
2. 它是否能与已有结构和操作组合，而不是新增封闭特例
3. 它是否具有 JSON-safe 的表达，并能通过统一 Definition / registry 消费
4. 它是否具有确定的布局、lowering 和错误语义
5. lowering 后是否仍能追溯到 Cell 和数据来源
6. React / Vanilla 是否只做 authoring 与宿主接入，而不复制领域算法

若能力只能通过 renderer 特判、adapter 私有实现、平行 IR 或私有测量系统完成，说明能力归属或底层合同仍未闭环。

## 5. 完备性的边界

“Table 完备”不等于实现所有 data grid 功能，而是保证：

- 新需求可以稳定归类到 Data、Table、Core、adapter 或 renderer
- Table 内的新结构和呈现可以沿统一模型扩展
- 表格布局与 lowering 具有确定、可测试和可追溯的语义
- 大表展示能力可以在同一语义模型和布局结果上扩展，由 adapter 承担 runtime 接线
- 不需要为单个场景建立平行底层机制

竞品取舍见 [Table 竞品与能力差距分析](../analysis/table-compare-analysis.md)，总体指导思想见 [Table 表格语法与 lowering 总设计](./table-design.md)。

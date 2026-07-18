# Table 竞品与能力差距分析

本文只提炼主流 Table 项目中值得 retikz 借鉴的核心思想，为 [Table 完备设计](../architecture/table-visualization-complete.md) 和 [Table 总设计](../architecture/table-design.md) 提供参考。具体功能清单、API 对照和版本范围留给后续 ADR 与 roadmap。

> 快照日期：2026-07-19。Table 包尚未实现，本文描述的是参考方向，不是当前能力清单。

## 1. 参考项目

### 1.1 Typst Table

[Typst Table](https://typst.app/docs/reference/model/table/) 适合作为静态排版和布局参考。它统一处理任意单元格内容、行列尺寸、padding、alignment、stroke 和 span，并面向文档输出而不是 DOM table。

主要借鉴：内容测量、二维轨道、span 和静态分片的整体模型。

### 1.2 LaTeX table ecosystem

[tabularray](https://ctan.org/pkg/tabularray/)、[booktabs](https://ctan.org/pkg/booktabs/) 和 [longtable](https://ctan.org/pkg/longtable) 分别体现了内容与样式分离、出版级表线和跨页表格。

主要借鉴：表线应是表格级关系；分页和重复表头属于 Table 语义。

### 1.3 gt / Great Tables

[gt](https://posit.co/blog/great-looking-tables-gt-0-2/) 与 [Great Tables](https://posit-dev.github.io/great-tables/reference/index.html) 以 Grammar of Tables 组织 header、spanner、stub、body、footer、formatting 和 styling。

主要借鉴：表格由可组合的语义区域和操作构成，formatter、style targeting 与结构相互分离。

### 1.4 VisActor VTable

[VTable](https://visactor.io/vtable/guide/introduction) 同时覆盖 ListTable、PivotTable 和多种 Cell 类型，是明细表与交叉表统一产品域的重要参考。

主要借鉴：List / Pivot 共用 Table 根能力，以及清晰的 cell location 与 presentation 模型。

不借鉴其编辑、滚动、菜单和 Canvas runtime 状态，这些不属于 renderer-agnostic Table 内核。

### 1.5 AntV S2

[AntV S2](https://s2.antv.vision/en/) 聚焦多维交叉分析表，明确区分行头、列头、角头和数据单元格。

主要借鉴：Pivot 的行维度、列维度、指标、多层表头和 Cell 位置语义。

### 1.6 TanStack Table

[TanStack Table](https://tanstack.com/table/latest/docs/guide/tables) 是 framework-agnostic 的 headless table core，并通过 adapter 接入不同宿主。

主要借鉴：核心与 framework adapter 分离，以及 column / row model 的组合思路。

不直接采用其函数型 column callback 和 UI state 模型，因为 retikz IR 必须 JSON-safe，并且还需要确定性的 Scene layout 与 lowering。

## 2. 综合取舍

不同问题应参考不同项目，不选择一个项目整体复刻：

| 设计问题                 | 主要参考                        | retikz 取舍                                     |
| ------------------------ | ------------------------------- | ----------------------------------------------- |
| 表格语法与语义区域       | gt / Great Tables               | 建立正交、可组合的 Table grammar                |
| List / Pivot 统一模型    | VTable、AntV S2                 | 共享根 Table 能力，以结构定义区分来源           |
| 轨道、span 与测量        | Typst                           | 实现 renderer-agnostic 二维约束布局             |
| 表线与分片               | booktabs、tabularray、longtable | 表线和分页属于 Table 语义，不交给 renderer 猜测 |
| Headless core 与 adapter | TanStack Table                  | `table` 拥有领域算法，React / Vanilla 只做接入  |
| Cell 内容扩展            | retikz Core composite           | Cell 内容统一为 `IRChild`，不建立封闭内容枚举   |

## 3. retikz 的目标方向

竞品共同表明，Table 不应只是一个 Grid sugar。retikz 需要形成以下核心组合：

> **Grammar of Tables + Table Algebra + Constraint Grid Layout + Core IR lowering。**

其中：

- Grammar 描述数据、结构、呈现、布局和规则
- Algebra 组合明细、分组、层级、汇总、交叉和转置
- Constraint Layout 统一求解内容、轨道、span、border 和 fragment
- Core lowering 保持 renderer-agnostic，并保留语义追溯能力

## 4. 明确不追赶的领域

以下能力不是 `@retikz/table` 的竞争目标：

- 虚拟滚动和滚动同步
- 输入编辑、公式和撤销重做
- 行选择、列拖拽、resize 手柄和菜单
- 服务端分页、异步加载和缓存状态
- DOM table / ARIA grid 的宿主实现
- PivotChart 根类型

未来若建设交互式 data grid，应作为独立宿主产品消费 Table spec、Data 和 layout manifest，而不是扩大 Table 内核的根职责。

## 5. 结论

Table 最值得借鉴的不是某个项目的 API 表面，而是六类稳定思想：

1. gt / Great Tables 的表格语法与语义区域
2. VTable 的 List / Pivot 共同产品域
3. AntV S2 的 Pivot 维度与表头模型
4. Typst 的任意内容与二维布局
5. LaTeX ecosystem 的表线和跨页语义
6. TanStack Table 的 headless core 与 adapter 分离

具体 IR 字段、Definition 形式、布局算法和首版范围均留给后续 ADR 比较后决定。

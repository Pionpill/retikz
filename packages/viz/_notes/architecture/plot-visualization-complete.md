# Plot 可视化完备设计

> **状态：长期架构真源，不跟随单个版本维护功能清单。** 本文定义 Visualization Complete 能力域的边界与检测方法，主责包是 `@retikz/plot`。总纲见 [`notes/architecture/capability-design.md`](../../../../notes/architecture/capability-design.md)，当前包职责与公开契约以就近 `AGENTS.md`、Accepted ADR 和代码为准。通用数据与 transform 能力由 [`@retikz/data`](./data-capability-complete.md) 负责；本文不覆盖 chart type / presentation、table、geo、adapter UI 或具体 renderer。

---

## 1. 定位与问题边界

`@retikz/plot` 是 **Grammar-of-Graphics Layer of Retikz**，解决数据语义如何稳定映射成 core 图形语义的问题。它不是 chart type 目录、通用数据处理库或 renderer。

它的完备方向是 **Visualization Complete**：

> 在 grammar-of-graphics 边界内，新增同类可视化语义时，应能通过统一的 Plot IR、扩展契约和 lowering 管线映射到 Core IR，无需由 chart preset、adapter、demo 或 renderer 私造平行可视化模型。

Visualization Complete 不表示内置所有图表类型。它保证 Encoding、Scale、Coordinate、Mark、Guide、Layer / Scope 等语法轴可以组合和扩展，并能消费 Data Complete、下沉 Drawing Complete。

## 2. 包角色与端到端管线

| 角色                 | 包                        | 责任                                                                                                                                                                                     | 不拥有                                                   |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 上游数据能力         | `@retikz/data`            | 数据模型、字段与输入格式解析、通用 transform / statistics、lineage                                                                                                                       | scale、展示 formatter、mark、guide、可视化布局           |
| 主责包               | `@retikz/plot`            | Plot IR、可视化 contracts / providers、scale、coordinate、mark、guide、领域 theme token / preset / resolver、shared categorical projection、lowering、visualization provenance / locator | 通用数据算法、Chart presentation、Core IR 语义、renderer |
| 通用 Tier 2 图形能力 | `@retikz/standard`        | 接收 Plot 已解析的领域无关绘图输入，提供可复用 composite、布局、lowering 与 artifact                                                                                                     | Plot channel / scale / guide resolve、provenance 与交互  |
| 下游图形能力         | `@retikz/core`            | 接收 lowering 产物并编译 Scene / manifest                                                                                                                                                | Plot 数据映射语义                                        |
| authoring / runtime  | plot-react / plot-vanilla | 构造 spec、传入 definitions / datasets、接入 runtime                                                                                                                                     | adapter 私有 Plot IR 或可视化算法                        |

```text
Data IR / external data
  -> @retikz/data transform / lineage
  -> Plot IR: Encoding -> Scale -> Coordinate -> Mark -> Guide -> Layer / Scope
  -> plot providers / pipeline / lowering
  -> optional Standard composite for reusable presentation
  -> Core IR
  -> core Scene / manifest
  -> plot provenance / locator -> adapter runtime
```

plot 可以提供依赖 mark、geometry 或 layout 语义的 plot-specific transform definition，但必须复用 `@retikz/data` 的 transform contract 和 registry。通用 rows-in / rows-out 运算、字段解析和 lineage 真源不得复制回 plot。

## 3. 能力面

| 能力面                 | 目标                                                                                                                                                           | 所有权                                                                                                          | 不属于 Visualization Complete                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Data Consumption       | 组合 Data IR、external datasets 和 data view                                                                                                                   | data 拥有数据与字段解析语义，plot 拥有消费方式                                                                  | 数据库、业务数据源 SDK                                                     |
| Transform Consumption  | 消费通用 transform，提供必要的 plot-specific definitions                                                                                                       | data 拥有 contract / pipeline，plot 只拥有可视化特有实现                                                        | core geometry transform、UI state update                                   |
| Encoding / Channel     | 把字段、常量或派生值绑定到视觉通道                                                                                                                             | plot                                                                                                            | renderer 私有样式补丁                                                      |
| Scale                  | 把数据域映射到视觉范围或视觉值                                                                                                                                 | plot                                                                                                            | 坐标系本身、core transform                                                 |
| Coordinate             | 把位置通道解析到绘图空间                                                                                                                                       | plot                                                                                                            | core target / anchor、geo 底图系统                                         |
| Mark                   | 定义数据在坐标空间中的几何显现                                                                                                                                 | plot                                                                                                            | chart preset、单 demo 拼装                                                 |
| Guide                  | 解析 axis、grid、legend、axis / datum label 等解释语义并组织领域 provenance / locator                                                                          | plot 拥有领域解析；经跨领域验证的通用呈现由 standard 拥有                                                       | Chart title / caption / source、上层 UI 控件                               |
| Theme / Palette        | 在 Core effective Theme 下通过同名 Plot style definition 解析 Plot surface、typography、Axis / Legend 视觉 token 与 palette，并映射到正式 Plot / Standard 输入 | Core 负责 selector 与 shared colors；plot 拥有 style definition、token、preset、resolver、mapping 与 inspection | Chart canvas / presentation / recipe token、Core Theme 语义、renderer 默认 |
| Layer / Lowering       | 组织层、scope 与 provenance，并下沉 Core IR                                                                                                                    | plot                                                                                                            | 独立 renderer、平行 scene graph                                            |
| Spatial Addressability | 为 view、arrangement、panel、track、plotArea 等空间保留稳定 identity 与 handle                                                                                 | plot 生成领域 handle；core 提供模型、索引与 selector 基础                                                       | Chart 外层 frame、Standard 布局、dashboard 状态                            |
| Interaction Readiness  | 保留 datum / series / scope identity、locator、selection mapping 和诊断边界                                                                                    | plot 定义语义，core 承载 metadata，adapter 消费                                                                 | DOM 事件树、tooltip UI、高频 dashboard dataflow                            |

这些是检测维度，不要求一一对应目录；代码仍按 `schemas / contract / providers / pipeline / shared` 分层。

Plot 不拥有 Core Theme 的传播协议。Core 只传递 selector 和当前生效的 shared colors；Plot 通过同名 `PlotThemeStyleDefinition` 解析自己的 vocabulary、preset、resolver、mapping 与 inspection。style resolver 必须把 shared colors 纳入完整 Plot token 基线；局部 `plotThemeTokens`、`colors` 与 native `plotTheme` 在其后覆盖。Standard 只消费 Plot 已解析的领域无关绘图输入和 Core `InspectionAppearance`，不读取 Plot token bag 或重新分配 Inspector 颜色。

## 4. 准入原则

### 4.1 是否属于 Visualization Complete

通常应满足：

- 增强 grammar-of-graphics，而不是只服务一个 chart type、demo 或 adapter。
- 能用 Plot IR 或 runtime definition 描述。
- 能通过 lowering 下沉 Core IR，不要求 plot 拥有 renderer。
- 不复制 `@retikz/data` 的通用数据算法，也不复制 core 的图形、几何、target 或 style。
- 缺失时会迫使多个 preset / adapter 私造相同可视化语义。

通用数据能力先补 data；通用机制 / 几何能力先补 core / math；被多个领域消费的通用绘图 composite 进入 Standard；Chart type 与单图 presentation 留在 chart；运行时事件接线与宿主 chrome 留在 adapter。

文字内容不因使用同一种 Core Text / Node 就归同一 owner。与 scale、coordinate、datum、series 或 plot area 锚定的 axis title、tick label、datum / mark label、reference label 和 annotation 属于 Visualization Complete；描述整个独立 Chart 的 title、subtitle、caption、note、source、credit 不属于 Plot，由 Chart presentation 通过 Standard 与 Plot body 组合。

Chart 封装也不能缩小 Visualization Complete 的空间输出或主题闭环。Plot 负责生成 view、arrangement、facet panel、track、plotArea、axis region、series 与按需 datum 的 domain identity、handle、locator 和 provenance，并在任何宿主中独立消费 Core effective Theme。Chart 只可增加外层 namespace、转发 `plotThemeTokens` / `plotTheme` 与其它 Plot 公开输入，并通过 qualified selector 委托访问内部 Plot 空间；若 wrapper 复制 Plot token / preset / resolver、先物化完整 Plot theme，或只能定位整个 Chart body，就破坏了 Plot 的端到端闭环。

### 4.2 是否需要新语法能力

现有 Encoding / Scale / Coordinate / Mark / Guide / Layer 能组合时优先组合。只有出现以下情况才增加 Plot 语法：

- 现有语法轴无法自然表达同类可视化语义。
- 多个 preset、adapter 或文档示例重复手写同一映射规则。
- 自定义能力无法通过现有 definition / registry 接入。
- 缺口会迫使上层私造 Plot IR 或无法稳定 lowering。

### 4.3 是否形成闭环

```text
Data 能力可提供输入
Plot schema 可表达
contract 可扩展
provider / feature 可实现
pipeline / lowering 可消费
effective Theme + Plot token / native theme 可确定性解析
Core style registry 与 Plot style registry 的同名解析及 shared colors 消费可追踪
Core IR 可承载
spatial handles / selectors 可保留 Plot 内部 identity
provenance / locator 可追踪
React / Vanilla 可等价暴露
tests 可锁定
docs / notes 可解释
```

只加 schema、只加内置 mark、只能手写 IR、只有 React 能使用，或通过 plot 私造 data transform，都不能称为 Visualization Complete。

## 5. 设计检查模板

```md
## 可视化完备性检查

- 能力面与解决的问题：
- 是否属于 Visualization Complete：
- 主责包与协作包：
- 是否可由现有能力组合：
- 是否应先下沉到 data / core / math：
- Plot IR / contract / registry / lowering 变化：
- Plot theme token / preset / resolver / mapping 与 inspection 变化：
- Data Complete 与 Drawing Complete 如何衔接：
- spatial handle / qualified selector 如何保持 view / arrangement / panel / track / plotArea identity：
- provenance / locator / Interaction Readiness：
- plot-react / plot-vanilla 如何等价暴露：
- 不支持边界与本轮结论：
```

评审优先拒绝三类方案：能力放错层、闭环缺失，以及交互或数据语义只在某个 adapter 中成立。

## 6. 与现有设计的关系

- `architecture/plot-design.md` 定义 grammar-of-graphics、Plot IR 与 lowering 的具体语法设计。
- `packages/viz/plot/AGENTS.md` 是主责包硬约束；`packages/viz/AGENTS.md` 定义 data / plot / adapter 依赖方向。
- `standard-structure` 与适用的 `standard-*` skills 决定代码落层。
- plot roadmap / ADR 记录具体版本决策；Data 缺口进入 data roadmap / ADR。
- `develop-completeness` 用本文能力面做阶段性横向审计。

本文负责稳定 Visualization Complete 的问题范围与跨能力域交界，不维护具体图表清单。改变 Data / Plot / Core 的所有权边界必须先形成架构决策，不能用现存局部代码作为长期归属依据。

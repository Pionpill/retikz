# Standard v0.1 alpha.2 Roadmap：通用 Box Layout

> 状态：规划已重定，ADR 尚未启动
>
> 主题：建立 renderer-agnostic Box Layout Profile，补齐一维 Flex、二维 Grid 与叠层 Overlay，为后续逻辑图、UML、泳道和结构化文档提供通用布局底座
>
> 关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard library design](../../../../../architecture/standard-library-design.md) · [Core layout-aware composite ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md) · [Core proposal / probe ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md) · [Table track sizing ADR](../../../../../../../viz/_notes/decisions/table/v0/v0.1/alpha.2/02-track-sizing-schema-and-solver.md)

## 目标

alpha.2 让调用者以 JSON-safe Standard Tier 2 输入保留一维流式、二维轨道和叠层布局意图，使持久化文档、跨宿主工具链与 LLM 不必从 lowering 后的坐标反推布局关系。

本 milestone 不追求完整 CSS 兼容，而是从成熟布局模型中提取适合确定性绘图编译的有限 profile：

- Flex 负责单一主轴上的方向、换行、伸缩、自由空间分配和主轴 / 交叉轴对齐
- Grid 负责行列轨道、显式 / 自动放置、span、间隙和二维对齐
- Overlay 负责同一 allocation box 内的叠放、对齐、offset 和绘制顺序
- LayoutItem 保存 child 的布局角色与逐项约束，layout artifact 显式返回最终 item bounds、overflow 与定位信息

`Stack`、`Row`、`Column` 可以作为 Flex 的 convenience authoring，但不能拥有第二套布局算法。`Align / Distribute` 不再规划为独立顶层 composite；持久化布局意图由 Flex / Grid 的 container alignment、item alignment 与 free-space distribution 字段表达。一次性编辑器 Arrange 操作不属于本 milestone。

需要读取 children 真实尺寸的能力统一复用 Core layout-aware composite、`layoutChild()`、compile-local replay、typed artifacts 与 occurrence locator。Standard 只拥有 Box Layout schema、求解规则、artifact payload 和 capability 接线，不建立测量器、Scene 反推、replay、registry 或 renderer 分支。

## 参照模型与边界结论

- [CSS Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts) 与 [CSS Box Alignment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_alignment) 将主轴 / 交叉轴、换行、item alignment 和自由空间分配组织为一维 layout contract，而不是独立 Align / Distribute 容器
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Basic_concepts) 提供二维 tracks、固定 / 弹性尺寸、显式 / 自动 placement、隐式 tracks、areas、gutters、alignment 与 overlap
- [Yoga](https://www.yogalayout.dev/docs/about-yoga) 证明 Flexbox 子集可以脱离 DOM 成为跨平台布局引擎；[Flutter layout widgets](https://docs.flutter.dev/ui/widgets/layout) 则把 Row、Column、Stack、Wrap、Grid 和 Table 作为可组合布局积木
- [Graphviz dot](https://graphviz.org/docs/layouts/dot/)、[ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) 与 [GoJS Layouts](https://gojs.net/latest/intro/layouts.html) 处理 rank / layer、cluster、port constraint、crossing minimization、edge routing、tree / force / circular 等拓扑问题，不属于 Box Layout
- [Mermaid flowchart](https://mermaid.js.org/syntax/flowchart.html) 与 [D2 layouts](https://d2lang.com/tour/layouts/) 保存 node / edge / subgraph / direction 等高层语义并委托具体 layout engine；[React Flow layouting](https://reactflow.dev/learn/layouting/layouting) 也明确集成 Dagre、D3 与 ELK，而不是把全部图算法收进画布 adapter

因此 alpha.2 只补齐通用 Box Layout。后续 Logic / UML / Graph owner 可以把语义模型解析为 Box Layout 与 Core IR，或接入独立的 layered / tree / routing engine；Standard 不拥有 GraphModel 或拓扑算法。

## ADR 顺序

| ADR | 主题                                | 主要决策                                                                                                                                                                                                 | 依赖                                                    | 初始状态 |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| 01  | Box Layout Profile 与 Core Gate     | 冻结 alpha.2 能力矩阵、CSS 差异边界与 available space 语义，并以行为 Gate 确认 Core 双轴 proposal、resolved slot、真实 allocation / visual bounds、alignment guides、隔离 failure 与 replay wrapper 能力 | alpha.1 capability loading；Core layout-aware composite | 待启动   |
| 02  | Box、LayoutItem 与共享布局词汇      | 冻结 padding / gap、尺寸词汇、container / item alignment、overflow、LayoutItem、spacer / inset、item key 与 artifact 公共结构；不预建通用拓扑模型                                                        | ADR-01 PASS                                             | 待启动   |
| 03  | Flex Layout                         | 冻结 direction、wrap、grow / shrink / basis、主轴分布、交叉轴对齐、退化输入与嵌套约束；Stack / Row / Column 只复用同一 canonical Flex 输入和 solver                                                      | ADR-01～02                                              | 待启动   |
| 04  | Grid Layout                         | 冻结显式 tracks、fixed / content / fraction / minmax、row / column gap、placement、span、auto-flow、alignment、overlap 与 nested Grid；审计 Table track solver 的共享边界                                | ADR-01～03；Table alpha.2 track sizing audit            | 待启动   |
| 05  | Overlay 与布局角色                  | 冻结同盒叠放、z-order、container / item alignment、offset、fit / clip，以及 spacer / inset 等角色最终归属；不引入绝对画布或编辑器状态                                                                    | ADR-01～04                                              | 待启动   |
| 06  | Layout artifact、adapter 与文档收口 | 冻结 item key 到 allocation / visual bounds、overflow、alignment / anchor guide 的 artifact；接入 module / bundle / preset、React / Vanilla，并完成双语 docs 与真实逻辑图 dogfood                        | ADR-02～05                                              | 待启动   |

候选 capability 名称、discriminator、字段、默认值、canonical input 以及 Stack / Row / Column、Spacer / Inset 的公开形态由对应 Proposed ADR 决定；本 roadmap 不替代公开契约。

## Core Capability Gate

Core alpha.2 的 proposal / probe contract 已补齐并由 Standard owner 完成消费模型复核；Standard 必须直接复用：

- `CompositeDefinition.expand | compile` 互斥分支与唯一 composite registry
- 完整双轴 `LayoutProposal`：`intrinsic.minimum` / `intrinsic.natural`、`range` 与 `exact`，并严格区分显式 `0`、字段省略与无上限区间
- `layoutChild()` 的 `resolved | failed` probe；resolved 同时返回无原点 `slotSize`、真实 `allocationBounds`、最终 `visualBounds`、可选 alignment guides 与一次性 compile-local replay
- plain text 的上下文化 contribution 与宽度反馈高度；fixed geometry 可以拒绝 range / exact，并以 slot 与真实 allocation 的差异显式表达 overflow
- nested composite 的同合同传播、隔离 failure、`raise()`、provider key 与 occurrence-aware 诊断
- replay placement 的 transform / clip / runtime Scope、typed artifacts、occurrence locator 与同次 compile 原子提交
- `lowerIRToKernel()` 对 layout-aware composite fail-loud，以及 React / Vanilla 对同一 `CompileResult` 的接线

上述能力关闭了旧 roadmap 中的单轴 intrinsic / `maxWidth` 缺口。ADR-01 不再重新设计或私有补齐 Core contract；在可消费的 Kernel 版本可用后，以公开 API 和可观察行为执行以下 Gate：

1. **proposal truth table**：双轴 minimum / natural / range / exact、显式 `0` 与无上限 range 的求值符合合同
2. **上下文化 contribution**：给定 x proposal 后的 plain text 高度反馈可用于 Flex line 与 Grid track contribution；Mixed / TeX 的原子 contribution 边界被 Standard profile 接受
3. **slot 与真实占用**：`slotSize`、`allocationBounds`、`visualBounds` 不互相替代；fixed geometry 拒绝按 range / exact slot 重排或缩放时仍可确定 alignment、overflow 与 clip
4. **alignment guide**：baseline 等共享 guide 只消费 Core result，不从 Text primitive、Node 内部结构或 child 类型反推
5. **nested failure 与 replay**：候选 probe 可隔离比较，选中失败通过 `raise()` 提升；最终结果只 replay 一次，并按父坐标顺序组合 transform、clip 与 Scope

Core 不负责 Flex / Grid solver、LayoutItem schema、item key、free-space distribution、track placement 或 Standard artifact payload。现有 typed artifact 与 occurrence 已足够承载 Standard layout manifest，不为 alpha.2 新建 Scene metadata、layout registry 或 renderer API。

若任一必需 Core 能力未通过 Gate，Standard 只允许继续对应 ADR 的设计，不得实现 DOM fallback、私有 measurer、double compile 或按 Node / Path / TeX 建白名单。上游 Kernel ADR 实现、测试和发布依赖闭环后，相关 Standard ADR 才能进入实现。

## 执行与依赖

```text
Core layout-aware composite（已交付）
  + alpha.1 capability loading（已交付）
                │
                ▼
01 Box Layout Profile + Core Gate
                │
                ├──────────────▶ 必需 Kernel ADR / 实现 / 发布
                │                            │
                └────────────────────────────┘
                ▼
02 Box + LayoutItem vocabulary
                │
                ▼
03 Flex Layout
                │
                ▼
04 Grid Layout ─── Table track solver audit
                │
                ▼
05 Overlay + layout roles
                │
                ▼
06 artifact + adapters + docs
```

- ADR-02 只抽取 Flex、Grid 与 Overlay 确实共享的公开词汇和不变量，不建立可替换 solver registry 或未被本 milestone 消费的通用 framework
- ADR-03 先验证一维 Box Layout 与 Core Gate；未闭环前不实现二维 Grid
- ADR-04 必须逐项对照 Table alpha.2 的 track schema 与纯 solver。可复用的 capability-neutral 数值求解只有在包职责和依赖方向成立时才抽取；Standard 不依赖 Table，Table 也不因共享算法被迫采用 Standard composite schema
- alpha.1 的 `Grid` 是可视格线 composite；alpha.2 的二维布局工作名为 `GridLayout`，不得复用既有 definition key、混淆文档概念或把背景格线迁入 track solver
- ADR-05 只解决 container-local overlay，不负责全局绝对坐标、port、edge label、自动避让或 selection handles
- ADR-06 的 item key 是 layout container 内的 authored identity；它不替代 alpha.4 / alpha.5 的全局语义 identity、Target 或 Connector contract
- 每项 capability 都接入 alpha.1 已建立的 module、bundle、all preset 与 adapter 机制；不得使用包根导入副作用或隐式全局注册
- Frame 默认继续使用现有纯 `expand` 主链；Box Layout 可作为 Frame 的 child 组合使用，除非独立 ADR 证明 Frame 自身必须迁移

## Architecture Gate

每份 ADR 从 Proposed 开始，先补齐 ignored `test-contract` 矩阵，再完成 Architecture Gate 与人工设计确认；获得实现授权后才能修改产品代码。

Gate 至少证明：

- Flex、Grid、Overlay 与 LayoutItem 输入均为 JSON-safe plain data，Standard discriminator 和布局角色在 compile 前可持久化、diff 与生成
- 任意合法 `IRChild`、nested composite、文本重排与宿主 provider 都只经 Core `layoutChild()` 消费，不按 Node、Path、TeX 或 namespace 建立白名单
- contribution probe、proposal 求值与最终输出来自同一次 Core compile；Standard 不重复 compile、不从 Scene primitive 反推尺寸，也不保存跨 compile replay
- finite / indefinite available space 下的 grow、fraction、auto-flow、stretch 与 overflow 有确定语义；不能依赖 DOM viewport 或 renderer 回读
- allocation bounds、visual bounds、resolved slot、baseline / guide 与 clip 的选择有明确坐标空间和领域理由
- Flex 的 wrap / shrink 与 Grid 的 span / minmax solver 有终止性、确定性、顺序与数值有限性证据，不修改输入
- Grid 与 Table 的同名尺寸词汇逐项完成复用 / 分离审计，不因名称相同就复制或强行统一领域 contract
- 内置与自定义能力进入同一 Core composite registry，module、bundle、preset 与直接 definitions 的结果等价
- React 与 Vanilla 只负责 authoring / adapter 接线，相同 Standard 输入与 compile environment 产生等价 layout artifact、Scene 和诊断
- 空 children、单 child、零尺寸容器、零 gap、负值或非有限数、约束不足、内容溢出、重复 key / definition 与超深 nested layout 均有明确结果或 fail-loud 诊断

以下方案不能通过 Gate：

- 在 Standard、React、Vanilla、DOM 或 renderer 中新增 child 测量、字体估算或布局回读
- deep import Core compile 内部实现，或为 Flex / Grid / Overlay 新建平行 registry、Scene primitive、compile option
- 只保存最终坐标而丢失 Flex、Grid、Overlay 与 LayoutItem 的 Tier 2 布局意图
- 用 primitive scale 冒充 stretch，或让 probe 与 replay 使用不同的 definition、host capabilities、reference / resource environment
- 为统一表面 API 强迫无测量需求的 Frame 迁入 layout-aware compile
- 在 Box Layout 中加入 GraphModel、rank / cluster、edge crossing、port constraint、自动路由或 renderer / editor 私有状态

## 测试与文档策略

- contract / schema tests 锁定 JSON round-trip、strict object、definition key、LayoutItem union、错误路径、artifact schema 与公共类型推导
- Core Gate tests 使用任意合法 `IRChild`、nested layout-aware composite、文本 / TeX、custom provider、双轴 proposal、baseline / fallback、clip wrapper 和失败路径，不用 Standard 私有实现证明上游能力
- Flex tests 覆盖方向、reverse、wrap、grow / shrink / basis、free-space distribution、cross-axis alignment、indefinite size 和 overflow
- Grid tests 覆盖 fixed / content / fraction / minmax、显式 / 自动 placement、span、implicit tracks、gaps、nested Grid、overlap、alignment 和不足空间
- Overlay tests 覆盖非中心 bounds、逐项 alignment / offset、z-order、fit / clip、空 / 单项输入与 nested layout
- compile integration tests 验证 probe / replay 同源、一次性 replay、wrapper 坐标顺序、artifact occurrence、provider / reference / resource 环境不丢失
- capability loading tests 验证按项 definition、部分 bundle、all preset、React 静态 adapter 与 Vanilla adapters 的等价性和冲突诊断
- renderer parity 只比较同一 Scene 语义，不把 SVG / Canvas 回读当作布局 oracle
- 双语 docs 同步 Flex、Grid、Overlay 组件页、API 表、可运行示例、capability loading 用法和扩展说明，并用流程、UML class、泳道和带注释复合节点完成 dogfood

## 完成标准

- [ ] ADR-01～06 均完成 test contract、Architecture Gate、人工设计确认并进入 Accepted
- [ ] Core Gate 的必需 Kernel ADR、实现、测试、docs 与可消费版本依赖全部闭环
- [ ] Flex、Grid、Overlay、LayoutItem 与 layout artifact 的 schema、layout-aware compile、diagnostics 与公共 exports 形成闭环
- [ ] Stack / Row / Column convenience 与 Flex canonical input 等价，Align / Distribute 语义由共享 alignment / distribution contract 覆盖
- [ ] Grid 与 Table track sizing 的复用 / 分离边界有 ADR 和测试依据，不存在反向依赖或未说明的重复 solver
- [ ] 全部能力接入 module、bundle、all preset、React 与 Vanilla，不引入隐式注册或 adapter 私有语义
- [ ] 任意 `IRChild`、nested layout、文本双轴 proposal、空 / 单项输入、overflow / clip 和失败路径均有自动化证据
- [ ] Frame 复核结论有测试或 ADR 依据；没有真实需求时保持 alpha.1 的纯 `expand` 实现
- [ ] 中英文文档、示例、API、SourceLinks、changelog 与父级 roadmap 同步
- [ ] Standard 三包与 docs 完成受影响范围的格式、lint、类型、测试、构建和 package exports 验证
- [ ] adversarial testing 无未处理 BLOCKING，milestone 经人工确认可以收尾

## 不在 alpha.2 范围

- 完整 CSS layout、DOM / CSS intrinsic reflow、media / container query、writing mode、百分比链式求值、subgrid、masonry 与浏览器兼容细节
- Tree、Layered / Dagre、Force、Circular / Radial 等拓扑或图算法布局
- GraphModel、全局 nodes / edges、rank、cluster、Port / Group 关系、crossing minimization、自动 / 正交路由、避障或编辑器状态
- Table / Plot datum、scale、border conflict、formatter、Legend 领域解析或 panel solver；通用 Legend 呈现进入 Standard alpha.3，领域 owner 消费 Standard Box Layout / Legend 与 Core / Math 底座
- 新的 Scene primitive、renderer 语义、全局 layout registry 或 Standard 私有 compile pipeline
- 异步测量、renderer 回读、跨 compile cache、增量布局或 replay 持久化
- alpha.3 的 Legend，以及 alpha.4 的 Stage、Decision、Terminal、Junction 与 alpha.5 的 Connector、Callout 语义

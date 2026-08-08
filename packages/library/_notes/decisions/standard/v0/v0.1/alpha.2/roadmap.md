# Standard v0.1 alpha.2 Roadmap：通用布局、Legend 与 Presentation lower reuse

> 状态：Accepted；ADR-01～07、09～10 已 Accepted，ADR-08 已由 Kernel ADR-12 取代，Core ADR-11 已 Accepted，alpha.2 的通用 Legend 与 Presentation lower reuse 已完成收口
>
> 主题：由 Standard 提供 renderer-agnostic 的高层 Box/Flex/Overlay Layout 容器与已解析 Legend 呈现，让调用方复用确定性布局、视觉解释结构与 artifact
>
> 关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard library design](../../../../../architecture/standard-library-design.md) · [能力完备性与模块边界](../../../../../../../../notes/architecture/capability-design.md) · [Core layout-aware composite ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md) · [Core proposal / probe ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md) · [Core complete Scope output ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/11-layout-aware-scope-output.md)

## 定位

alpha.2 建设 Standard 自身的通用布局能力，并在该底座上增加领域无关 Legend。`@retikz/standard` 拥有布局容器与 Legend 的 JSON-safe IR、公共 Box 词汇、layout-aware compile、artifact 与 diagnostics；`@retikz/standard-react` 和 `@retikz/standard-vanilla` 等价暴露 authoring 入口。

Plot、Table、Gantt 与未来其它 Tier 2 可以在各自 milestone 内采用这些容器，并把已经解析好的视觉样本交给 Standard Legend。采用哪一种容器仍属于其内部技术实现；alpha.2 不迁移其它 Tier 2，也不把 field、channel、scale、Cell、relation role、provenance 或交互状态写入 Standard。

本 milestone 同时重新审计 Standard presentation 的 lower 复用边界：Axes、Grid、Frame、Legend 若拥有组合范围语义，就必须暴露并 lower 到 Core authored Scope；其生成的 Path、Node、RectangleStep 以及 Legend 的 layout / replay 结果直接复用对应 owner 的完整 contract。该审计只冻结 Standard 的消费方式，不提前迁移 Plot、Table 或其它 Tier 2。

依赖方向固定为：

```text
Plot / Table / Gantt / 其它 Tier 2
                  ↓
        @retikz/standard Layout
                  ↓
             @retikz/core
```

Standard Layout 直接使用时可以是持久化真源；被其它 Tier 2 使用时，只是其内部可重新生成的实现产物，不成为领域公开契约。

## 版本目标

- 提供 `FlexLayout`、`GridLayout`、`OverlayLayout` 三种一等布局容器
- 允许任意合法 `IRChild`、自定义 Composite 与 nested Layout 通过同一 Core 协议参与布局
- 建立一致的作者层尺寸、Box、alignment、distribution、overflow 与 item identity 词汇
- 以固定的 minimum / natural 两级上下文化 contribution 支撑文本重排、公式、固定图形与嵌套容器
- 明确区分 resolved slot、真实 allocation bounds 与 visual bounds，输出稳定的 `LayoutArtifact`
- 建立 `items | ramp` 两种 Legend 呈现 form，以任意 `IRChild` 作为视觉 sample，并输出稳定的 item / tick artifact
- 让 Axes、Grid、Frame、Legend 形成稳定的 root Scope / lower target contract，复用 Core 的 Scope、Path、Node、RectangleStep 与 layout-aware replay 语义
- 复用 alpha.1 的 definition 与 adapter 机制，直接使用 Core `CompileOptions.composites`，不建立新的 Standard 组合入口

本 milestone 不追求 CSS 兼容，而是从成熟布局模型中提取适合确定性绘图编译的有限 profile：

- Flex 负责单一主轴上的方向、换行、伸缩、自由空间分配和主轴 / 交叉轴对齐
- Grid 负责行列轨道、显式 / 自动放置、span、间隙和二维对齐
- Overlay 负责同一 allocation box 内的叠放、对齐、container-local position、offset 和绘制顺序
- LayoutItem 保存 child 的布局角色与逐项 Box 意图，layout artifact 显式返回最终 slot、bounds、overflow 与定位信息

Row、Column、Stack 若未来提供 convenience authoring，只能归一为已有 canonical container，不形成第二套布局算法；它们不是 alpha.2 的必交付公开组件。一次性编辑器 Align / Distribute、Arrange 操作不属于本 milestone。

## 能力边界

### Standard 拥有

- Layout IR schema 与 schema-derived public types
- LayoutItem、Box sizing、spacing、alignment、distribution 与 overflow 词汇
- Flex line formation 与 grow / shrink solver
- Legend 的 title/body/items 流式排版复用同一纯 Flex engine；Legend ramp 复用 Overlay positioned 语义，不引入第三套顺序流 solver
- Grid track sizing、span 与稳定 auto-placement solver
- Overlay alignment、container-local position 与 size participation
- Standard layout diagnostics 与 artifact payload
- 三种 layout composite definition、factory 与 direct-definition 接线
- React JSX 和 Vanilla builder 的等价 authoring

### Core 协作提供

- 双轴 layout proposal 与上下文化 minimum / natural contribution
- range / exact proposal 求值与无原点 resolved slot
- allocation bounds、visual bounds 与可选 alignment guides
- probe-local transaction、隔离 failure、一次性 replay、placement wrapper 与 clip
- nested layout-aware Composite 的 proposal 传播、occurrence 与诊断链路

Core 不拥有 Flex / Grid / Overlay IR、LayoutItem、solver、item key 或 Standard artifact。Standard 不以私有 measurer、DOM 回读、Scene 反推、double compile 或 child 类型白名单弥补 Core 缺口。

Core ADR-11 还提供完整 `ScopePropsSchema` / `IRScopeProps` 与 authored Scope output contract。Standard presentation 只组合该 Core fragment，不复制 Scope 字段；layout-aware Legend 的 authored Scope、allocation clip 和 replay wrapper 必须沿 Core 的同一 probe / replay 主链消费。

### Adapter 拥有

- React props / children 到规范 Standard 输入的同步转换
- Vanilla builder 到规范 Standard 输入的同步转换
- 复用各自 Kernel adapter 的 runtime 接线

adapter 不复制 Standard schema、solver、layout state、diagnostics 或 lowering。

### Legend 与领域包边界

- Standard 拥有 title、items、ramp、sample / label 布局、normalized tick、overflow 与领域无关 artifact
- Plot、Table、逻辑组件与未来 Tier 2 拥有领域解析、formatter、theme mapping、provenance / locator 与交互意图
- sample 使用 Core primitive 或既有 CompositeDefinition registry，不建立 Legend 专用 sample union、definition family 或 renderer 分支
- Legend 不拥有相对 Plot/Table 主体的停靠、碰撞、分页、滚动或自动 placement

## 关键设计不变量

- Layout 使用 Core 的屏幕物理坐标，容器内部以局部 allocation box 组织 child；领域数学坐标不改变 Layout 坐标语义
- 作者层尺寸围绕 content、fixed、fill 与 min/max 建模；Flex 比例由 grow/shrink 表达，Grid 比例由 fraction 表达
- Canonical LayoutItem 必须拥有显式、container-local、稳定且同层唯一的 key；不复用 child id，也不默认使用数组 index
- Standard 只提供一种包含 padding 的 allocation-box sizing；margin 位于尺寸之外，不支持负 margin 或 margin collapse
- Proposal 是输入条件，`slotSize` 是求值后的 resolved output，`allocationBounds` 是 child 真实占用，`visualBounds` 是视觉包络，四者不能互相替代
- 有确定几何结果的空间不足保留 slot 与真实 bounds，并由 Standard artifact / overflow policy 处理；定义歧义、非法输入和无法求值的 fill 必须 fail-loud
- Flex、Grid 与 Overlay 是三个明确 solver，不建立万能 Layout 或可替换 layout solver registry
- Generic container 只消费任意 `IRChild`，不理解 Plot、Table、Gantt、Graph 或文档领域语义
- Legend 只消费领域已解析的 visual sample、label 与 normalized tick，不理解 scale、channel、Cell 或 relation role
- Legend 不把公开 authoring schema lower 成嵌套 `IRFlexLayout`；共享 engine 是内部布局来源，`LegendDefinition` 的 loading 边界与 `LegendArtifact` 语义保持独立

具体 schema 字段、默认值、Box edge 口径、Flex freeze/redistribute、Grid track 求解、Overlay placement 与 artifact payload 由对应 ADR 冻结，roadmap 不替代公开契约或算法设计。

## Core Capability Gate

Core v0.5 alpha.2 的 proposal / probe contract 已由 ADR-08 实现并由 Standard 直接复用：

- 完整双轴 `LayoutProposal`：`intrinsic.minimum` / `intrinsic.natural`、`range` 与 `exact`
- `layoutChild()` 的 `resolved | failed` probe；resolved 同时返回 `slotSize`、真实 `allocationBounds`、`visualBounds`、可选 alignment guides 与一次性 compile-local replay
- plain text 的上下文化 contribution 与宽度反馈高度；fixed geometry 可以拒绝 range / exact，并以 slot 与真实 allocation 的差异表达 overflow
- nested Composite 的同合同传播、隔离 failure、`raise()`、provider key 与 occurrence-aware diagnostics
- replay placement 的 transform / clip / runtime Scope、typed artifacts、occurrence locator 与同次 compile 原子提交

ADR-01 不重新设计或私有补齐 Core contract；在可消费的 Kernel 版本可用后，只以公开 API 和可观察行为执行以下 Gate：

1. 双轴 minimum / natural / range / exact、显式零与无上限 range 的求值符合合同
2. 给定一轴 proposal 后的文本反馈可用于另一轴 contribution，fixed geometry 不被强制缩放
3. `slotSize`、`allocationBounds` 与 `visualBounds` 的坐标空间和拒绝语义足以支持 alignment、overflow 与 clip
4. baseline 等共享 guide 只消费 Core result，不从 Text primitive、Node 内部结构或 child 类型反推
5. 候选 probe 可以隔离比较，选中失败通过 `raise()` 提升，最终结果只 replay 一次

若任一能力未通过 Gate，Standard 只允许继续 ADR 或纯 solver 设计，不得实现 DOM fallback、私有 measurer、double compile 或 child 类型白名单。

## ADR 顺序

| ADR                                             | 主题                                     | 主要决策                                                                                                                        | 依赖                                                                                                                     | 最终状态   |
| ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 01                                              | Layout Profile 与 Core Gate              | 冻结 alpha.2 能力矩阵、坐标、proposal / contribution / solve / placement 边界，以行为测试确认 Core 前置能力                     | alpha.1 direct Definition loading；Core ADR-08 可消费版本                                                                | Accepted   |
| 02                                              | Box、LayoutItem 与共享词汇               | 冻结尺寸、spacing、alignment、distribution、overflow、key/path、artifact 公共结构与 diagnostics                                 | ADR-01 PASS                                                                                                              | Accepted   |
| 03                                              | FlexLayout                               | 冻结 schema、line formation、wrap、grow/shrink、free-space distribution、cross-axis feedback 与 nested Flex                     | ADR-01～02                                                                                                               | Accepted   |
| 04                                              | GridLayout                               | 冻结 tracks、span、implicit tracks、稳定 auto-placement、track sizing、双轴 feedback 与 nested Grid                             | ADR-01～03                                                                                                               | Accepted   |
| 05                                              | OverlayLayout                            | 冻结 aligned/positioned placement、anchor、offset、size participation、paint order、clip 与 nested Overlay                      | ADR-01～04                                                                                                               | Accepted   |
| 06                                              | Artifact、Definition、adapter 与文档收口 | 冻结 artifact schema，接入 direct Definition、React/Vanilla，完成 docs 与跨入口等价性                                           | ADR-02～05                                                                                                               | Accepted   |
| 07                                              | Layout Inspector                         | 冻结组件局部、Scope 子树与 Layout 全图策略，以独立 inspection plane 可视化真实 artifact 且不污染主 Scene                        | ADR-02～06；Kernel inspection Gate                                                                                       | Accepted   |
| [08](./08-layout-inspector-visual-semantics.md) | Layout Inspector 视觉语义                | 保留 occurrence 颜色、spacing 纹理、统一 dashed 边界、真实 gap / distributed space 与选项拆分目标；实现迁入 Standard `/inspect` | ADR-07；[Kernel ADR-12](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/12-extensible-inspector-content.md) | Superseded |
| [09](./09-generic-legend.md)                    | 通用 Legend 已解析呈现                   | 冻结 items / ramp、任意 IRChild sample、Core 引用语义、约束布局、typed artifact、Definition 冲突诊断与跨 adapter 等价           | ADR-02～06；Core ADR-11；Plot/Table 真实 descriptor                                                                      | Accepted   |
| [10](./10-presentation-composite-reuse.md)      | Presentation lower reuse                 | 冻结 Axes / Grid / Frame / Legend 的 root Scope、Core lower target mapping、identity、clip、style 与 adapter parity             | Core ADR-10～11；ADR-09                                                                                                  | Accepted   |

每份 ADR 均从 `Proposed` 完成 test-contract、Architecture Gate 与人工确认后进入实现，并在收尾时压缩为长期 `Accepted` 记录。

## 执行与依赖

```text
Core ADR-08 实现 / 出口审计 / 可消费版本
                    │
                    ▼
01 Layout Profile + Core Gate
                    │
                    ▼
02 Box + LayoutItem vocabulary
                    │
                    ▼
03 FlexLayout
                    │
                    ▼
04 GridLayout
                    │
                    ▼
05 OverlayLayout
                    │
                    ▼
06 artifacts + capability + adapters + docs
                    │
                    ▼
07 Layout Inspector + Kernel inspection Gate
            ┌───────┴────────┐
            ▼                ▼
Kernel ADR-12 package split    09 generic Legend
 + Standard /inspect          + resolved samples
```

- ADR-02 只抽取 Flex、Grid 与 Overlay 确认共享的公开词汇和不变量，不建立未被本 milestone 消费的通用 framework
- ADR-03 先验证一维 Box Layout 与 Core Gate；未闭环前不实现二维 Grid
- 现有 alpha.1 `Grid` 是可视格线 composite；新能力使用 `GridLayout` 工作名，不复用 definition key 或混淆文档概念
- Overlay 只解决 container-local 叠放，不负责全局绝对坐标、自动避让、port、edge label 或 selection handles
- LayoutItem key 是容器内 authored identity，不替代后续语义组件的全局 identity、Target 或 Connector contract
- 每项 capability 接入 alpha.1 已建立的 Definition 与 adapter 机制，直接使用 Core `CompileOptions.composites`，不使用包根导入副作用或隐式全局注册
- Frame 默认继续使用现有纯 `expand` 主链；没有独立 ADR 证明时不迁入 layout-aware compile
- ADR-09 依赖 Core ADR-11 的完整 authored Scope output；Legend 的流式部分复用共享 Flex engine，ramp 复用 Overlay positioned 语义，不等待独立 alpha.3
- ADR-10 依赖 Core ADR-11 与 ADR-09 的共同契约；Axes / Grid / Frame 的 expand root 和 Legend 的 authored root 在同一批次完成审计，不迁移其它 Tier 2
- ADR-08 的 spacing artifact、正交 Layout Inspect 选项与视觉目标继续保留；Inspector Definition、选择策略和辅助 IR 迁入 `@retikz/standard/inspect`，Standard 根入口只保留布局与 artifact，不静态导入 `@retikz/inspect`
- ADR-09 与 ADR-08 在 ADR-06 之后没有产品依赖，可以独立完成 Gate；Legend 复用已发布前的 Box Layout 底座，不等待独立 alpha.3
- ADR-09 只发布 Standard 可消费组件与跨包契约；Plot/Table/逻辑组件的实际迁移仍由各自 milestone 负责

## Architecture Gate

Gate 至少证明：

- Flex、Grid、Overlay 与 LayoutItem 输入均为 JSON-safe strict schema，公开类型由 schema 推导
- 任意合法 `IRChild`、nested Composite、文本重排与宿主 provider 都只经 Core `layoutChild()` 消费
- contribution probe、proposal 求值与最终输出来自同一次 Core compile，不保存跨 compile replay
- finite / indefinite available space 下的 grow、fraction、auto-placement、stretch 与 overflow 有确定语义
- slot、allocation bounds、visual bounds、alignment guide 与 clip 的坐标空间一致
- Flex 与 Grid solver 具有终止性、确定性、顺序与数值有限性证据，且不修改输入
- 内置与自定义能力进入同一 Core Composite registry，直接 definitions 的结果等价
- Standard、Standard React、Standard Vanilla 根入口不导出或静态加载 Inspector；三个 `/inspect` 是 root-only exports 规则的受控例外，通过可选 `@retikz/inspect` peer 使用独立 Inspector registry，缺少可选依赖时不影响普通 Layout
- React 与 Vanilla 只负责 authoring / adapter 接线，相同 Standard 输入与 compile environment 产生等价结果
- 空 children、单 child、零尺寸、非法数值、空间不足、重复 key 与超深 nested layout 均有明确结果或 fail-loud diagnostics
- Legend 的 items / ramp form、任意 IRChild sample、Core 引用语义、normalized tick、空内容与 typed artifact 具有确定契约
- Axes、Grid、Frame、Legend 的每个 root Scope prop、generated Path / Node / RectangleStep 字段和 layout / replay channel 都有明确 owner、canonical lower 入口、identity、clip、style/theme、diagnostics 与 empty/prune 语义
- Axes / Grid / Frame 的所有输入形态保持一个 authored `IRScope` 根；Legend 保持 authored root Scope 与内部 allocation / replay Scope 的稳定组合，不以 child 数量 snapshot 代替 root contract
- 领域传递与调用方直接提供同一 LegendDefinition 时，重复 composite key 继续交由 Core fail-loud 诊断

以下方案不能通过 Gate：

- 在 Standard、adapter、DOM 或 renderer 中新增 child 测量、字体估算或布局回读
- deep import Core compile 内部实现，或新增平行 registry、Scene primitive、compile option
- 用 primitive scale 冒充 stretch，或让 probe 与 replay 使用不同 provider / resource environment
- 为统一表面 API 强迫无测量需求的既有 composite 迁入 layout-aware compile
- 在 Box Layout 中加入领域模型、拓扑算法、自动路由或编辑器状态

## 测试与文档策略

- contract / schema tests 锁定 JSON round-trip、strict object、definition key、LayoutItem union、错误路径、artifact schema 与公共类型推导
- Core Gate tests 使用任意合法 `IRChild`、nested Composite、文本 / TeX、custom provider、双轴 proposal、baseline / fallback、clip wrapper 和失败路径
- Flex tests 覆盖方向、reverse、wrap、grow / shrink、free-space distribution、cross-axis feedback、indefinite size 和 overflow
- Grid tests 覆盖 content / fixed / fraction tracks、显式 / 自动 placement、span、implicit tracks、gaps、nested Grid、overlap policy、alignment 和不足空间
- Overlay tests 覆盖非中心 bounds、alignment / position / offset、paint order、size participation、clip、空 / 单项输入与 nested layout
- compile integration tests 验证 probe / replay 同源、一次性 replay、wrapper 坐标顺序、artifact occurrence 与 provider / reference / resource 环境
- presentation lower tests 验证 Scope props、Path / Node / RectangleStep canonical lowering、root shape、empty / nested / prune、identity / namespace、style/theme、placement / transform、两类 clip、metadata / animation 与下层诊断不漂移
- direct-definition tests 验证按项 Definition、React 静态 adapter 与 Vanilla adapters 的等价性和冲突诊断
- Legend tests 验证 line / node / registered composite sample、items / ramp、约束换行、normalized tick、引用失败、artifact 与 duplicate Definition 诊断
- renderer parity 只比较同一 Scene 语义，不把 SVG / Canvas 回读当作布局 oracle
- 双语 docs 同步三个 Layout、LayoutItem、direct Definition loading、nested layout 与 overflow 用法；不在其它 Tier 2 文档中承诺其内部 Layout 选型

## 完成标准

- [x] Core ADR-08 已 Accepted，并有 Standard 可消费的 Kernel 版本
- [x] ADR-01～07 均完成 test contract、Architecture Gate、人工设计确认并进入 Accepted
- [x] Kernel ADR-12 完成 `@retikz/inspect` 与 Core 观测底座；Standard Layout Inspector 迁入 `/inspect` 子入口并完成自测、双语文档与视觉验证；ADR-08 保持 Superseded
- [x] ADR-09 完成 test contract、Architecture Gate、实现、自测、双语文档与真实直接 authoring 消费并进入 Accepted
- [x] FlexLayout、GridLayout、OverlayLayout、LayoutItem 与 layout artifact 的 schema、solver、layout-aware compile、diagnostics 与公共 exports 形成闭环
- [x] 全部能力接入 direct Definition、React 与 Vanilla，不引入隐式注册或 adapter 私有语义
- [x] 任意 `IRChild`、nested layout、文本双轴 proposal、baseline、non-zero bounds、overflow / clip 和失败路径均有自动化证据
- [x] Flex/Grid/Overlay Inspector 在可选 `/inspect` 入口支持单组件、Scope 子树与 Layout 全图开关，SVG/Canvas、static/retained 等价且不污染主 Scene；Standard 根入口不加载 Inspect
- [x] Layout Inspector 用颜色区分 final occurrence；margin/padding/gap 只绘制无底色的 12-unit 斜线和单份 dashed boundary，distributed 仅绘制 dashed perimeter、内部保持透明；box 与内部结构统一 dashed 且共线不重画；bounds 与 spacing 可独立配置，推荐态显示 content outline、内部结构线与固定 gap，且 Flex/Grid 不再从相邻空白误判 gap
- [x] Core ADR-11、Standard ADR-10 与 ADR-09 完成 Architecture Gate、实现、自测、双语文档与人工确认；Legend 以 items / ramp 结构接收任意 IRChild sample，直接 IR、React、Vanilla 具有等价 Scene / artifact，且 nested Definition 依赖保持显式
- [x] Axes、Grid、Frame、Legend 的 root Scope surface 和所有已开放 lower-facing 字段均沿 Core / Standard canonical pipeline 消费，无静默丢字段、局部重写 lower 算法或 adapter 私有语义
- [x] 现有 `Grid` 与新 `GridLayout` 无概念、schema、definition key 或文档歧义
- [x] Standard 中英文文档和真实示例完整，不修改其它 Tier 2 的领域文档或公开契约
- [x] Standard 三包与 docs 完成受影响范围的格式、lint、类型、测试、构建和 package exports 验证
- [x] adversarial testing 无未处理 BLOCKING，milestone 经人工确认可以收口

## 不在 alpha.2 范围

- Plot、Table、Gantt、逻辑组件或其它 Tier 2 的实际适配、迁移、文档与领域 artifact 变化
- 完整 CSS layout、DOM / CSS intrinsic reflow、浏览器历史默认值、writing mode、百分比、`calc()`、viewport/container query
- subgrid、masonry、dense auto-placement、named area、named line、负 margin 与额外 canonical Row / Column / Stack IR
- Tree、Layered、Force、Circular、GraphModel、rank、cluster、port constraint、edge routing 与碰撞避让
- 自动 label placement、全局绝对画布、selection、history、viewport 与编辑器运行时
- 新的 Scene primitive、renderer 语义、全局 layout registry 或 Standard 私有 compile pipeline
- 异步测量、renderer 回读、跨 compile cache、增量 solver 或 replay 持久化
- Stage / Decision / Terminal / Junction、Connector / Callout 与其它逻辑语义组件

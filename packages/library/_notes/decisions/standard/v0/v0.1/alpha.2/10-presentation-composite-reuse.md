# ADR-10：Presentation Composite 的 lower target 完整复用

- 状态：Accepted
- 决策日期：2026-08-04
- 关联：[Standard alpha.2 roadmap](./roadmap.md) · [ADR-09：通用 Legend](./09-generic-legend.md) · [Core ADR-11：Layout-aware Composite 的完整 Scope 输出契约](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/11-layout-aware-scope-output.md) · [Core ADR-10：Core 原子契约](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/10-core-atomic-contracts.md) · [Standard library design](../../../../../architecture/standard-library-design.md) · [能力完备性与模块边界](../../../../../../../../notes/architecture/capability-design.md)

## 背景与目标

Standard presentation 下的 Axes、Grid、Frame 与 Legend 都不是孤立图元：它们分别组合 Scope、Path、Node、RectangleStep 或 layout-aware replay。当前实现已经复用了一部分 Core schema/type 和几何词汇，但 lower 结果仍可能变成 child 数组、内部匿名 Scope 或局部重建的 Path，导致根 identity、Scope cascade、placement、clip、style/theme、diagnostics、artifact 与 adapter 行为无法沿同一条 Core 主链闭环。

这类问题不是某一个字段的遗漏，而是 Tier 2 composite 对 lower target 的复用边界没有冻结。目标是：凡是 presentation composite 公开或生成一个已有 Core / Standard 元素，就直接复用该元素的 canonical schema、type、contract、pipeline、几何、布局、样式、identity、namespace、诊断、artifact / manifest 和 adapter 语义；Standard 只拥有领域配置、组合顺序、必要的领域默认与显式领域约束。

本 ADR 只处理 Standard presentation 的四个 composite。Plot、Table、Gantt 与其它 Tier 2 仍在各自 milestone 中按同一规则审计和迁移，不在本 ADR 中改动其领域契约。

## 决策：四个 presentation composite 都声明并复用稳定的 lower contract

Axes、Grid、Frame 是 `expand` composite，具有组合范围语义，因此始终输出一个 authored `IRScope`；Legend 是 layout-aware composite，始终输出一个 authored root Scope，并在其内部使用无 authored identity 的 allocation / replay Scope。四者的根 Scope surface 都是扁平组合的 Core `IRScopeProps`，不是 Standard 自己的 Scope 镜像，也不是额外的 `scope` 嵌套对象。

### 通用 root Scope contract

除固定的 `namespace` / `type` 和由 composite 自己生成的 Scope `children` 外，四个 schema 都直接承载 Core `IRScopeProps` 的完整 authored surface，不是 Standard 自己的 Scope 镜像，也不是额外的 `scope` 嵌套对象。Frame 的 `children` 仍是其领域 body Nodes 输入，不是 Scope fragment 的递归 `children`；Legend 的 `content` 同理是领域呈现输入：

- identity / group：`id`、`localNamespace`、`boundingShape`、`zIndex`、`meta`、`animations`
- geometry / placement：`transforms`、`placement`、`clip`
- Theme：`theme`
- inherited appearance：`color`、`stroke`、`fill`、`strokeWidth`、`opacity`、`fillOpacity`、`strokeOpacity`
- default channels：`nodeDefault`、`pathDefault`、`labelDefault`、`arrowDefault`、`resetStyle`

这些字段的约束、默认值、strict unknown-field、JSON 形态、style/theme 继承、identity / namespace、bounds、clip、z-order、metadata 和 animation 语义均由 Core `ScopePropsSchema` / `IRScopeProps` 与普通 Scope compile 定义。Standard 的 `IRAxes`、`IRGrid`、`IRFrame`、`IRLegend` 及其 input 类型继续从各自最终 schema 派生，不手写重复字段。

Axes、Grid、Legend 的 authored Scope `id` 可选；Frame 的 `id` 继续必填，因为它是 Frame 的领域 identity 和内部派生 identity 的根。宿主 occurrence、compile locator、Legend item / tick key 与 authored Scope `id` 始终是不同身份，React / Vanilla 不得用宿主 id、数组 index、hash 或自动 suffix 冒充 authored identity。

root Scope 属性只 lower 一次并覆盖其声明的组合范围，不复制到每条 Path、每个 Node 或每个 replay child。`meta` 和 `animations` 落在 root group，不自动传播为 child metadata；`zIndex` 排序整个 root group；root `clip` 与 root transforms / placement 按 Core 普通 Scope 语义执行。

### Lower target mapping

| lower target    | 权威 owner / canonical contract                                   | Axes                                                                          | Grid                                                                                           | Frame                                                                  | Legend                                                                                                                            |
| --------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| authored Scope  | Core `ScopePropsSchema` / `IRScope` / 普通 Scope compile          | 一个 root Scope 包住所有生成 child                                            | 一个 root Scope；center position 的内部平移使用匿名 Scope，不占用 authored root props          | 一个 root Scope，保留 Frame identity 与派生 identity                   | authored root Scope；内部 allocation / replay Scope 不产生用户 identity                                                           |
| Path            | Core `PathSchema`、Path style / stroke / fill / step contract     | 轴线、网格线、tick 使用 Core Path；Style 只做 Standard 到 Core 的最小字段转换 | grid line 和 border 使用 Core Path；line / border style 的字段全部进入对应 Path                | border 是 Core Path，边框 style 直接作用于该 Path                      | Legend 不创建 sample 私有 Path；sample / label 是任意合法 `IRChild`                                                               |
| Node            | Core `NodeSchema` 与 Node layout / anchor / text compile          | axis label、tick label、origin label 使用 Core Node                           | 不新增 Node 语义                                                                               | title、description 使用 Core Node 与 anchor placement                  | child 为 Node 时使用 Core Node；其它 sample / label 保持自身 Core child contract，并统一通过 `layoutChild()` / `replay()`         |
| RectangleStep   | Core `RectangleStepSchema` 与 Path compile                        | 不适用                                                                        | border 使用一个 canonical rectangle step，不继续维护 move + 多段 line + cycle 的第二套矩形表达 | border 使用一个 canonical rectangle step；corner radius 由该 step 消费 | 不适用                                                                                                                            |
| layout / replay | Core ADR-08 / ADR-11 与 Standard shared Box/Flex/Overlay contract | 不适用                                                                        | 不适用                                                                                         | 不适用                                                                 | `layoutChild()` 是唯一测量入口，`replay()` 是唯一 placement 提交入口，`context.scope()` 只承载 authored Scope 与 allocation Scope |

生成的 Path / Node 使用 Core 的公开 contract、provider、几何、style inheritance、identity / occurrence、diagnostics 和 Scene / manifest 输出。Standard 可以把领域值转换成固定几何或下层允许的样式子集，但不能重新实现下层的 Path、Node、Scope、anchor、rectangle、layout、clip、style 或 replay 算法。

## 各 composite 的领域契约与 lower 规则

### Axes

Axes 继续拥有 Cartesian origin、x / y extent、line、ticks、axis label、origin label 与每个方向的 grid 领域语义。`x.grid` / `y.grid`、`x.extent` / `y.extent` 保持在各自轴属性中；root Scope 不重新引入全局 `grid` 或 `extent`，也不把 axis-local style 误当作 root style。

lower 结果的 child 顺序和现有确定性语义保持稳定：网格线、轴线、ticks、tick labels、axis labels 与 origin label 都作为普通 Core Path / Node 进入同一个 root Scope。每个 Axis 的领域 lattice / tick enumeration 只负责产生确定的 Core 几何输入；Path / Node 的最终 compile、style、anchor、z-order、bounds 和 diagnostics 由 Core 负责。root `transforms`、`placement`、`clip`、style、defaults、Theme、identity 和 metadata 不得复制到每一条生成 child。

即使没有可见轴线或 labels，`lowerAxes()` 的 IR 根形状仍是 authored Scope；最终是否因没有 identity 或可见 Scope 属性而被 Core 普通 prune，遵循 Core Scope 规则。root `id` 只标识 Axes Scope，不替代生成 child 的 occurrence 或内部 Core identity。

### Grid

Grid 继续拥有 bounds normalization、vertical / horizontal line configuration、major line、includeBoundary、extendLines、padding 与 border order。line style 和 border style 直接 lower 到 Core Path 的对应 style contract；grid lattice 的枚举和方向转换仍是 Standard 的领域组合逻辑。

Grid 的 IR 根始终是 authored Scope。Cartesian bounds 的生成 Path 直接成为 root children；centered bounds 的位置解析和内部平移放在无 authored identity 的内部 Scope 中，不能覆盖或伪装用户 root `transforms` / `placement`。root Scope 的所有 lower-facing props 只作用于整个 Grid 组合范围。

Grid border 必须使用 Core canonical rectangle step。`border.padding`、`extendLines` 和 `order` 只决定边框几何、线段范围和兄弟顺序；`border.style` 的每个已开放字段都必须实际 lower 到 border Path，不能由固定 `zIndex`、adapter 或 Standard merge 静默覆盖。边框的圆角或未来 Core rectangle 能力也沿 RectangleStep contract 演进，不建立第二套 Grid 矩形算法。

### Frame

Frame 继续拥有 headerDirection、padding、gap、title、description、非空 Node body 与内部 identity 约束，但 root group 与 border / content / header 的职责分开：

- root authored Scope 使用必填 Frame `id`，并继续生成 `${id}/content`、`${id}/title`、`${id}/description` 的稳定派生 identity；root Scope `zIndex` 排序完整 Frame
- content 是普通 Core Scope，承载 body Nodes；title 与 description 是普通 Core Nodes，通过 Core anchor / Node layout 参与排布
- border 是普通 Core Path，使用一个 RectangleStep；`border.cornerRadius` 只属于该 step
- 边框视觉字段集中在 `border.style`，直接复用 Standard 的 canonical Path border style contract，并把包括 `zIndex` 在内的已开放 lower-facing 字段实际传给 border Path。默认层级保持现有顺序：border 为 `-1`、content 为 `0`、header 为 `1`；显式 `border.style.zIndex` 只改变 border Path 自身层级，root Scope `zIndex` 仍是整个 Frame 的兄弟层级

root Scope 的 graphic cascade、defaults、Theme 与 resetStyle 属于 Frame 组合范围；`border.style` 是 border Path 的显式 child style，按 Core 的 child-explicit-over-inherited 规则与 root cascade 共同解析。二者不是同一字段 owner，root `stroke` / `fill` / opacity 等不再兼作旧的顶层 border API。

本 ADR 采用 breaking migration：旧的 Frame 顶层 border style、顶层 `cornerRadius` 或同义 alias 不保留。Frame 的领域 `id` 与 root Scope identity 合并为一个真实 authored Scope id，不再维护第二个 Frame / Scope identity。

### Legend

Legend 的 items / ramp、title、normalized tick、Box sizing、artifact 和领域无关排版继续遵循 ADR-09。流式 title/body/items 使用与公开 FlexLayout 相同的纯 engine 语义；ramp 的 normalized tick 使用 Overlay positioned 语义，但不嵌套加载 FlexLayout 或 OverlayLayout definition。新增的 root Scope surface 直接与 Legend 领域字段并列；`id` 可选，item / tick key 仍只属于各自 form 的 authored identity。

Legend 的 layout-aware compile 遵循 Core ADR-11：

1. 所有 title、sample、label 先通过 Core `layoutChild()` probe；任何合法 Core child、nested Composite 和显式 definition 都走同一 Core contract
2. final slot 只通过 Core `replay()` 提交一次，replay wrapper 只包含布局产生的数值 translation 和 allocation-coordinate clip
3. authored root Scope 的完整 props 由 `context.scope()` 消费；root transforms、placement、style/defaults、Theme、identity、meta、animations、zIndex 与 authored clip 不写进 replay wrapper，也不复制到各个 sample / label
4. Legend 的 `overflow: 'clip'` 形成内部 allocation clip；root authored `clip` 仍是普通 Scope-local clip。两者都保留并形成嵌套交集，overflow policy 不覆盖用户 authored clip
5. authored root Scope 的 allocation / visual bounds、artifact、occurrence 与 Core diagnostics 分别沿各自 owner 的公共 contract 产生；内部 allocation Scope 不出现在 Legend item / tick identity 中

无 title、空 items、空 tick labels 或其它空内容形态不能改变 Legend 的 root output contract。是否保留一个没有可见 child 的 authored Scope 只由 Core 普通 prune predicate 决定；Standard 不用 placeholder、child 数量或 host occurrence 改写该规则。若 Core 产生 group，root 的 id、style、clip、metadata、animation 与 z-order 必须落在该 group 上；若 Core 正常 prune，则不为 Legend 私自制造空 group。

## 用户可观察行为、失败语义与兼容性

- 默认行为：四个 composite 省略 Scope props 时与普通 Core Scope 的省略字段语义一致；Standard 的领域默认只作用于自己的 domain fields，不覆盖用户显式的 lower-facing 值。`false`、`0`、空数组和 `undefined` 继续分别保持各自语义
- 失败与诊断：Standard schema 对 Scope fragment 和领域字段保持 strict；Core 负责 lower target 的字段校验、refinement、引用、identity、placement、layout、clip、style/theme、provider 与 Scene diagnostics。schema 接受而 pipeline 未消费的 lower-facing 字段是 contract error，不得静默丢弃
- 空、嵌套与顺序：有组合范围语义的 Axes / Grid / Frame / Legend 根形状稳定；嵌套 Scope、nested Composite、不同 Grid bounds 形态和 Legend form 不改变 authored root identity 的生命周期。领域 item key、Core occurrence、Frame 派生 id 和 host occurrence 不互换
- 兼容性 / breaking：Standard alpha.2 尚未发布，允许一次性移除 Axes / Grid 旧的数组根形状、为 Axes / Grid / Legend 增加可选 authored Scope props、把 Frame border 字段迁移到 `border.style`、把 Grid border 改为 canonical rectangle step，并让 Legend 的 layout-aware output 使用 authored root Scope。不保留错误契约的顶层 alias、Occurrence-to-id bridge 或旧 lower shape 兼容层
- React / Vanilla 等价性：直接 IR、Standard React 与 Standard Vanilla 表达同一 root Scope surface、领域 schema 和 definition loading；它们产生同一 canonical IR / Core contribution。React marker、Vanilla builder 和宿主 embed occurrence 不能复制 schema、lowering、layout、identity 或 diagnostics

## 功能与包边界

- 所属能力域与解决的问题：Standard Presentation / Drawing Composition；解决高层呈现组件对 Core / Standard lower target 的局部复用和字段漂移
- 主责包与协作包：`@retikz/standard` 主责 Axes、Grid、Frame、Legend 的领域 schema、定义、领域几何组合、Box/Flex/Overlay 排版和 Legend artifact；`@retikz/core` 主责 Scope、Path、Node、RectangleStep、layout-aware probe / replay、compile、identity、diagnostics 和 Scene contract；`@retikz/standard-react` / `@retikz/standard-vanilla` 只做等价 authoring；render 不增加 Standard 分支
- 拥有：Cartesian axes / grid 领域配置、Frame header 语义、Legend items / ramp 语义、必要的领域 refinement、排序与领域 artifact；这些领域语义在去除领域词汇后不应被误称为 Core capability
- 不拥有：Core Scope / Path / Node / rectangle 的平行 schema、type、provider、registry、测量、几何、style / theme merge、identity、diagnostics、Scene 输出或 replay 机制；不拥有 Plot / Table 的 scale、field、Cell、formatter、provenance 或交互状态
- 外部扩展与下游闭环：四个 composite 继续通过 Core `CompositeDefinition` registry 和显式 compile options 接入；Legend sample 的自定义 composite 由同一 Core registry 提供。下游接收 Core Scene / manifest、Standard artifact 与 adapter parity，不通过 Standard 私有发现或包根副作用注册
- 不支持边界：本 ADR 不自动迁移 Plot / Table / Gantt，不新增 renderer-specific presentation，不从 Scene 反推领域语义，不把领域数据模型下沉到 Core，也不提供 DOM / renderer measurement、全局停靠、碰撞、分页或交互 runtime

## 架构验证

- 是否可由现有能力组合：Axes / Grid / Frame 可以由 Core Scope、Path、Node、RectangleStep 与现有 Standard style fragments 组合；Legend 可以由 Core ADR-08 的 probe / replay 与 Standard shared Box/Flex/Overlay engine 组合。Core ADR-11 是 Legend 完整 root Scope surface 的前置 capability
- math / core / render / adapter 责任切分：lattice / 领域坐标和排版规则留在 Standard；通用 geometry / Path / Node / Scope / layout transaction 留在 Core / Math；render 只执行 Scene；React / Vanilla 只转换 authoring
- 是否需要新 IR / contract / registry：需要扩展四个 Standard schema 以组合 Core Scope props，并把现有 lower shape 冻结为稳定 root contract；不新增 parallel IR、renderer primitive、lower registry 或 sample registry
- Scene / manifest / renderer / diagnostics 如何闭环：root Scope、Path、Node、RectangleStep 和 replay 通过 canonical Core compile 输出既有 Scene / manifest；Standard artifact 只保存自身的 layout / Legend domain vocabulary；Core 处理 identity、namespace、resources、clip、z-order 与 diagnostics
- provenance / locator / Interaction Readiness 是否适用：Core occurrence、Frame authored identity、Legend item / tick key 和 host occurrence 继续分层；Standard 不复制 Plot / Table lineage，也不把 root id 误用为领域 locator
- 结论：扩展 Standard 当前 Presentation 域并补齐 Core ADR-11 的消费面；所有可 lower 的公共能力直接复用 lower owner，不上移领域语义，不在 adapter / renderer 旁路补齐

## 能力完备性检查

- 能力链路：Standard domain schema / definition → Core Scope / Path / Node / RectangleStep 或 Box / replay contract → canonical compile → Scene / manifest / artifact / diagnostics → React / Vanilla parity → 双语 docs
- 内置与自定义：四个 Standard definition 继续使用 Core 唯一 composite registry；Legend 的 nested sample / custom composite 依赖显式注入，内置与自定义走同一 resolver、provider、probe、replay 和 diagnostics
- lower surface：所有公开 root Scope props、border style、generated Core child 的已开放字段必须有直接 lower、明确领域转换或显式拒绝；没有“schema 接受但 pipeline 忽略”的隐含例外
- 阶段结论：本 ADR 是 alpha.2 的 Proposed architecture change。Core ADR-11、Standard ADR-10 与 Legend ADR-09 必须共同通过 Architecture Gate 并经人工确认后才允许实现；在此之前不把 presentation reuse 称为完成或 publish-ready

## 被否决方案

- **继续返回 Path / Node 数组**：无法表达共享 Scope 的 transform、style、clip、identity、z-order、metadata、animation 与 bounds
- **每个 composite 复制一份 Scope / Path / Node schema 或 lower 算法**：新增 Core 字段、默认值、诊断和 renderer 行为时必然漂移
- **把 Frame border style 留在 root 顶层或复用 root Scope style 作为 border style**：两个 owner 竞争同一字段，无法区分组级 cascade 与 border Path 显式样式
- **Grid 继续手写矩形 move / line / cycle**：维护第二套 Core rectangle geometry，绕开 RectangleStep 的 canonical compile 和后续 capability
- **把 Legend 的 placement / style / identity 放进 replay wrapper**：破坏 authored Scope 与 compile-local replay 的职责边界，并让 empty / nested / clip 语义依赖 Standard 私有实现
- **由 Vanilla occurrence 或 React key 生成 Standard root id**：把宿主生命周期错误地提升为持久化 identity
- **为 Plot / Table 提前迁移而扩大本 ADR**：会把领域 API、provenance 和产品排期混入 Standard presentation 的通用契约

## 测试策略摘要

需要 schema / type 证据锁定 Core Scope fragment 的组合、root identity、Frame border migration、strict unknown-field、默认值和 domain refinements；需要 lower / compile 证据锁定四个 root shape、Core Path / Node / RectangleStep canonical path、generated child 顺序、empty / nested / prune、transform / placement、两类 clip、style/theme/resetStyle、z-index、metadata、animation、identity / namespace 与 diagnostics；需要 Legend layout / artifact 证据锁定 probe / replay 单一主链和 root / allocation Scope 分离；需要 Definition / registry、React / Vanilla parity、Scene / renderer parity 与双语 docs 证据。不得以 child 数量 snapshot 代替 root / lower contract 证据。

## 不在本 ADR 范围

- Plot、Table、Gantt 或其它 Tier 2 的真实领域迁移、公开 API 与 artifact 变化
- Axes / Grid 的全新数学模型、自动布局、碰撞避让或交互语义
- Frame 的编辑器行为、全局停靠和外围 layout
- Legend 的 scale、formatter、locale、selection、tooltip、分页、滚动或宿主 UI
- Core renderer、Scene primitive、全局 registry、DOM measurement、跨 compile replay 或增量 solver
